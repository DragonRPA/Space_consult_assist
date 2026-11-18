#!/usr/bin/env python3
"""Python AST static extractor for Space_consult_assist code specification SSOT."""

from __future__ import annotations

import ast
import json
import os
import re
import sys
from pathlib import Path

ROUTER_HTTP_METHODS = {
    "get": "GET",
    "post": "POST",
    "put": "PUT",
    "patch": "PATCH",
    "delete": "DELETE",
    "options": "OPTIONS",
    "head": "HEAD",
    "websocket": "WS",
    "api_route": "ROUTE",
}

SPACE_TABLE_RE = re.compile(r"\bspace_[a-z0-9_]+\b")
EXPLICIT_TABLE_RE = re.compile(
    r"\b(private_vault\.system_secrets|consult_knowledge|stt_audio_archives|symptom_synonyms|"
    r"symptom_rules|consult_records|consult_items|schedule_events|transfer_centers|"
    r"match_similar_openai|match_similar_bge|match_similar_nomic|match_similar_calls)\b"
)
SQL_CONTEXT_TABLE_RE = re.compile(
    r"(?:FROM|JOIN|INTO|UPDATE|TABLE|POLICY\s+\S+\s+ON|INDEX\s+\S+\s+ON|table_name\s*=)\s+['\"]?"
    r"((?:public\.)?(?:assets|asset_history|audit_log_minimal|classification_attempts|"
    r"consult_keywords|consult_logs|customers|employees|llm_logs|part_codes|parts|"
    r"sales_inquiries|visit_parts|visit_status_history|visits))\b",
    re.IGNORECASE,
)


def _resolve_module_path(
    repo_root: Path,
    search_roots: list[Path],
    module_parts: list[str],
    existing_files: set[str],
) -> str | None:
    if not module_parts:
        return None
    for base in search_roots:
        candidate_dir = base.joinpath(*module_parts)
        py_candidate = candidate_dir.with_suffix(".py")
        init_candidate = candidate_dir / "__init__.py"
        for cand in (py_candidate, init_candidate):
            try:
                rel = cand.resolve().relative_to(repo_root.resolve()).as_posix()
            except ValueError:
                continue
            if rel in existing_files:
                return rel
    return None


def _extract_route_decorator(dec: ast.expr) -> str | None:
    if not isinstance(dec, ast.Call):
        return None
    func = dec.func
    if isinstance(func, ast.Attribute) and func.attr in ROUTER_HTTP_METHODS:
        method = ROUTER_HTTP_METHODS[func.attr]
        route_path = ""
        if dec.args and isinstance(dec.args[0], ast.Constant) and isinstance(dec.args[0].value, str):
            route_path = dec.args[0].value
        return f"{method} {route_path}".strip()
    return None


def _collect_db_tables_from_text(text: str, out: set[str]) -> None:
    for m in SPACE_TABLE_RE.findall(text):
        out.add(m)
    for m in EXPLICIT_TABLE_RE.findall(text):
        out.add(m)
    for m in SQL_CONTEXT_TABLE_RE.findall(text):
        out.add(m.replace("public.", ""))


def analyze_python_file(repo_root: Path, rel_path: str, existing_files: set[str]) -> dict:
    abs_path = repo_root / rel_path
    source = abs_path.read_text(encoding="utf-8-sig", errors="replace")
    result = {
        "exports": [],
        "endpoints": [],
        "internalImports": [],
        "dbTables": [],
        "parseError": None,
    }

    try:
        tree = ast.parse(source, filename=rel_path)
    except SyntaxError as exc:
        result["parseError"] = f"SyntaxError line {exc.lineno}: {exc.msg}"
        return result

    exports: list[str] = []
    endpoints: list[str] = []
    constants: list[str] = []
    internal_imports: set[str] = set()
    db_tables: set[str] = set()

    file_dir = abs_path.parent
    search_roots: list[Path] = [file_dir]
    if rel_path.startswith("backend/"):
        search_roots.append(repo_root / "backend")
    if rel_path.startswith("tools/ConsultParser/") or rel_path.startswith("scripts/"):
        search_roots.append(repo_root / "tools" / "ConsultParser")
    if rel_path.startswith("aws_sejong_prototype/"):
        search_roots.append(repo_root / "aws_sejong_prototype")
    search_roots.append(repo_root)

    # Top-level classes, functions, endpoints, and constants
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            exports.append(node.name)
            for item in node.body:
                if isinstance(item, ast.Assign):
                    for target in item.targets:
                        if isinstance(target, ast.Name) and target.id == "__tablename__":
                            if isinstance(item.value, ast.Constant) and isinstance(item.value.value, str):
                                db_tables.add(item.value.value)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            exports.append(node.name)
            for dec in node.decorator_list:
                route_sig = _extract_route_decorator(dec)
                if route_sig:
                    endpoints.append(f"{route_sig} ({node.name})")
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if (
                    isinstance(target, ast.Name)
                    and re.match(r"^[A-Z][A-Z0-9_]{2,}$", target.id)
                    and target.id not in ("TYPE_CHECKING",)
                ):
                    constants.append(target.id)
        elif isinstance(node, ast.AnnAssign):
            target = node.target
            if isinstance(target, ast.Name) and re.match(r"^[A-Z][A-Z0-9_]{2,}$", target.id):
                constants.append(target.id)

    # Imports and string literals across full AST
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                parts = alias.name.split(".")
                resolved = _resolve_module_path(repo_root, search_roots, parts, existing_files)
                if resolved and resolved != rel_path:
                    internal_imports.add(resolved)
        elif isinstance(node, ast.ImportFrom):
            module_parts = node.module.split(".") if node.module else []
            if node.level > 0:
                base = file_dir
                for _ in range(node.level - 1):
                    base = base.parent
                rel_roots = [base]
                if module_parts:
                    resolved = _resolve_module_path(repo_root, rel_roots, module_parts, existing_files)
                    if resolved and resolved != rel_path:
                        internal_imports.add(resolved)
                    for alias in node.names:
                        if alias.name != "*":
                            sub = _resolve_module_path(
                                repo_root, rel_roots, module_parts + [alias.name], existing_files
                            )
                            if sub and sub != rel_path:
                                internal_imports.add(sub)
                else:
                    for alias in node.names:
                        if alias.name != "*":
                            sub = _resolve_module_path(repo_root, rel_roots, [alias.name], existing_files)
                            if sub and sub != rel_path:
                                internal_imports.add(sub)
            else:
                resolved = _resolve_module_path(repo_root, search_roots, module_parts, existing_files)
                if resolved and resolved != rel_path:
                    internal_imports.add(resolved)
                for alias in node.names:
                    if alias.name != "*":
                        sub = _resolve_module_path(
                            repo_root, search_roots, module_parts + [alias.name], existing_files
                        )
                        if sub and sub != rel_path:
                            internal_imports.add(sub)
        elif isinstance(node, ast.Constant) and isinstance(node.value, str):
            if len(node.value) <= 20000:
                _collect_db_tables_from_text(node.value, db_tables)

    combined_exports = endpoints + exports + constants
    dedup_exports = list(dict.fromkeys(combined_exports))

    result["exports"] = dedup_exports[:24]
    result["endpoints"] = list(dict.fromkeys(endpoints))
    result["internalImports"] = sorted(internal_imports)
    result["dbTables"] = sorted(db_tables)
    return result


def main() -> int:
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: extract_python_ast.py <repo_root>\n")
        return 1

    repo_root = Path(sys.argv[1]).resolve()
    raw_input = sys.stdin.buffer.read().decode("utf-8-sig")
    payload = json.loads(raw_input)
    target_files: list[str] = payload.get("targetFiles", [])
    all_files: set[str] = set(payload.get("allFiles", []))

    output: dict[str, dict] = {}
    for rel_path in target_files:
        output[rel_path] = analyze_python_file(repo_root, rel_path, all_files)

    sys.stdout.buffer.write(json.dumps(output, ensure_ascii=False).encode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
