#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ts = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'typescript'));
const { FILE_DESCRIPTIONS } = require('./code_file_descriptions.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(REPO_ROOT, 'docs', 'code_file_manifest.json');
const SPEC_MD_PATH = path.join(REPO_ROOT, 'docs', 'CODE_FILE_SPECIFICATION.md');
const PYTHON_AST_SCRIPT = path.join(__dirname, 'extract_python_ast.py');

const EXCLUDE_DIRS = new Set([
  '.git',
  'node_modules',
  '.venv',
  'venv',
  '__pycache__',
  'dist',
  'build',
  '.next',
  '.vercel',
  'recordings',
  'ollama_data',
  '구축안_기획서',
  'manuals',
]);

const EXCLUDE_PREFIXES = [
  'scripts/output_',
  'scripts/merged_',
  'scripts/stt_data/',
];

const EXCLUDE_FILENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  'package-lock.json',
]);

const CODE_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.cjs',
  '.mjs',
  '.py',
  '.sql',
  '.bat',
  '.ps1',
  '.css',
  '.yml',
  '.yaml',
  '.conf',
  '.ini',
  '.mako',
  '.bak',
]);

const SPECIAL_REL_PATHS = new Set([
  '.env.example',
  'backend/Dockerfile',
  'backend/requirements.txt',
  'tools/ConsultParser/requirements.txt',
  'scripts/Modelfile',
  'scripts/Modelfile.lora',
  'scripts/Modelfile.v2',
]);

const JSON_WHITELIST = new Set([
  'frontend/package.json',
  'frontend/vercel.json',
  'frontend/apps/desktop/package.json',
  'frontend/apps/desktop/tsconfig.json',
  'frontend/apps/desktop/tsconfig.app.json',
  'frontend/apps/desktop/tsconfig.node.json',
  'frontend/apps/desktop/.oxlintrc.json',
  'frontend/apps/mobile/package.json',
  'frontend/apps/mobile/tsconfig.json',
  'frontend/apps/mobile/tsconfig.app.json',
  'frontend/apps/mobile/tsconfig.node.json',
  'frontend/apps/mobile/.oxlintrc.json',
  'backend/scripts/package.json',
  'tools/ConsultParser/core/config.json',
]);

const LAYERS = [
  { id: 'L01', name: '프론트엔드 모노레포 인프라 및 Vercel Serverless API' },
  { id: 'L02', name: '데스크톱 상담·일정 웹 애플리케이션' },
  { id: 'L03', name: '모바일 현장정비 PWA 애플리케이션' },
  { id: 'L04', name: '백엔드 FastAPI 코어·ORM 모델·API 라우터' },
  { id: 'L05', name: '백엔드 비즈니스 서비스 및 공급자 계층' },
  { id: 'L06', name: '데이터베이스 마이그레이션 및 스키마·시드 SQL' },
  { id: 'L07', name: '백엔드 운영·데이터 파이프라인·UI 감사 스크립트' },
  { id: 'L08', name: '백엔드 단위·통합·E2E 테스트' },
  { id: 'L09', name: '데스크톱 배치 STT·LLM 파서 도구 (ConsultParser)' },
  { id: 'L10', name: 'AWS 세종텔레콤 비즈메시지 프로토타입' },
  { id: 'L11', name: 'SLM·STT 학습·평가 및 코드 명세 거버넌스 스크립트' },
  { id: 'L12', name: 'CI/CD·컨테이너 인프라·루트 검증 및 진단 스크립트' },
];

const BANNED_MODIFIERS = [
  '실시간',
  '직통',
  '영구',
  '원클릭',
  '스마트',
  '비주얼',
  '자유롭게',
  '강력한',
  '완벽한',
  '초고속',
  '똑똑한',
  '직관적',
  '깔끔한',
  '최적의',
  '혁신적',
];

const PLACEHOLDER_RE = /\b(TODO|TBD|FIXME)\b|추후\s*작성|임시\s*설명/i;

const EAGER_CONTAINER_FILES = new Set([
  'frontend/apps/desktop/src/App.tsx',
  'frontend/apps/desktop/src/LegacySttView.tsx',
  'frontend/apps/desktop/src/CounselAssistV2.tsx',
  'frontend/apps/desktop/src/CounselAssistV3.tsx',
  'frontend/apps/desktop/src/SchedulePage.tsx',
  'frontend/apps/desktop/src/SelfActionGuideModal.tsx',
  'frontend/apps/mobile/src/App.tsx',
]);

function compareCodepoint(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function shouldIncludeFile(relPath) {
  for (const prefix of EXCLUDE_PREFIXES) {
    if (relPath.startsWith(prefix)) return false;
  }
  const baseName = path.posix.basename(relPath);
  if (EXCLUDE_FILENAMES.has(baseName)) return false;
  if (SPECIAL_REL_PATHS.has(relPath)) return true;
  if (JSON_WHITELIST.has(relPath)) return true;
  const ext = path.posix.extname(baseName).toLowerCase();
  if (CODE_EXTS.has(ext)) return true;
  if (ext === '.html' && relPath.startsWith('frontend/apps/')) return true;
  return false;
}

function collectProjectFiles(repoRoot) {
  const results = [];
  function walk(absDir, relDir) {
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    for (const entry of entries) {
      const name = entry.name;
      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(name)) continue;
        const nextRel = relDir ? `${relDir}/${name}` : name;
        if (EXCLUDE_PREFIXES.some((prefix) => nextRel.startsWith(prefix))) continue;
        walk(path.join(absDir, name), nextRel);
      } else if (entry.isFile()) {
        const relPath = relDir ? `${relDir}/${name}` : name;
        if (shouldIncludeFile(relPath)) {
          results.push(relPath);
        }
      }
    }
  }
  walk(repoRoot, '');
  results.sort(compareCodepoint);
  return results;
}

function classifyLayer(relPath) {
  if (
    relPath === 'frontend/package.json' ||
    relPath === 'frontend/vercel.json' ||
    relPath === 'frontend/build_monorepo.js' ||
    relPath === 'frontend/nginx.conf' ||
    relPath.startsWith('frontend/api/')
  ) {
    return 'L01';
  }
  if (relPath.startsWith('frontend/apps/desktop/')) return 'L02';
  if (relPath.startsWith('frontend/apps/mobile/')) return 'L03';
  if (
    relPath === 'backend/app/main.py' ||
    relPath === 'backend/app/__init__.py' ||
    relPath.startsWith('backend/app/core/') ||
    relPath.startsWith('backend/app/models/') ||
    relPath.startsWith('backend/app/api/')
  ) {
    return 'L04';
  }
  if (relPath.startsWith('backend/app/services/')) return 'L05';
  if (
    relPath === 'backend/alembic.ini' ||
    relPath.startsWith('backend/alembic/') ||
    (relPath.startsWith('backend/scripts/') && relPath.endsWith('.sql')) ||
    (relPath.startsWith('scratch/') && relPath.endsWith('.sql'))
  ) {
    return 'L06';
  }
  if (
    relPath === 'backend/Dockerfile' ||
    relPath === 'backend/requirements.txt' ||
    relPath === 'backend/run_server.py' ||
    relPath === 'backend/capture_impeccable_active.py' ||
    relPath === 'backend/check_cust.py' ||
    relPath === 'backend/fix_bat_crlf.py' ||
    (relPath.startsWith('backend/scripts/') && !relPath.endsWith('.sql'))
  ) {
    return 'L07';
  }
  if (
    relPath.startsWith('backend/tests/') ||
    /^backend\/test_[^/]+\.py$/.test(relPath)
  ) {
    return 'L08';
  }
  if (relPath.startsWith('tools/ConsultParser/')) return 'L09';
  if (relPath.startsWith('aws_sejong_prototype/')) return 'L10';
  if (relPath.startsWith('scripts/')) return 'L11';
  return 'L12';
}

function countLinesAndSize(absPath) {
  const stat = fs.statSync(absPath);
  const raw = fs.readFileSync(absPath, 'utf8');
  const lines = raw.length === 0 ? 0 : raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').length;
  const sizeKB = Number((stat.size / 1024).toFixed(1));
  return { raw, lines, sizeKB };
}

function resolveRelativeAsset(fromRelPath, specifier, allFilesSet) {
  if (!specifier || (!specifier.startsWith('./') && !specifier.startsWith('../'))) {
    return null;
  }
  const fromDir = path.posix.dirname(fromRelPath);
  const base = path.posix.normalize(path.posix.join(fromDir, specifier));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.cjs`,
    `${base}.mjs`,
    `${base}.css`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.cjs`,
  ];
  if (base.endsWith('.js')) {
    candidates.push(base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'));
  }
  for (const cand of candidates) {
    if (allFilesSet.has(cand) && cand !== fromRelPath) {
      return cand;
    }
  }
  return null;
}

function hasExportModifier(node) {
  return Boolean(
    node.modifiers &&
      node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function analyzeTsJsFile(relPath, content, allFilesSet) {
  const ext = path.posix.extname(relPath).toLowerCase();
  const scriptKind =
    ext === '.tsx'
      ? ts.ScriptKind.TSX
      : ext === '.ts'
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS;

  const sf = ts.createSourceFile(relPath, content, ts.ScriptTarget.Latest, true, scriptKind);
  const exportsList = [];
  const internalImports = new Set();
  const eagerComponentImports = new Set();
  const dbTables = new Set();

  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt)) {
      if (stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
        const spec = stmt.moduleSpecifier.text;
        const resolved = resolveRelativeAsset(relPath, spec, allFilesSet);
        if (resolved) {
          internalImports.add(resolved);
          const isTypeOnly = Boolean(stmt.importClause && stmt.importClause.isTypeOnly);
          if (
            !isTypeOnly &&
            EAGER_CONTAINER_FILES.has(relPath) &&
            resolved.endsWith('.tsx') &&
            /\/(?:CounselAssistV2|CounselAssistV3|CounselCompare|SchedulePage|LegacySttView|[A-Z][^/]*Modal)\.tsx$/.test(resolved)
          ) {
            eagerComponentImports.add(resolved);
          }
        }
      }
    } else if (ts.isExportDeclaration(stmt)) {
      if (stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
        const resolved = resolveRelativeAsset(relPath, stmt.moduleSpecifier.text, allFilesSet);
        if (resolved) internalImports.add(resolved);
      }
      if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          exportsList.push(el.name.text);
        }
      }
    } else if (ts.isExportAssignment(stmt)) {
      exportsList.push('default');
    } else if (hasExportModifier(stmt)) {
      if (
        (ts.isFunctionDeclaration(stmt) ||
          ts.isClassDeclaration(stmt) ||
          ts.isInterfaceDeclaration(stmt) ||
          ts.isTypeAliasDeclaration(stmt) ||
          ts.isEnumDeclaration(stmt)) &&
        stmt.name
      ) {
        const isDefault = stmt.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
        exportsList.push(isDefault ? `default ${stmt.name.text}` : stmt.name.text);
      } else if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exportsList.push(decl.name.text);
          }
        }
      }
    }
  }

  function walkAst(node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      const arg0 = node.arguments && node.arguments[0];
      if (arg0 && ts.isStringLiteralLike(arg0)) {
        const argText = arg0.text;
        if (
          (ts.isIdentifier(expr) && expr.text === 'require') ||
          expr.kind === ts.SyntaxKind.ImportKeyword
        ) {
          const resolved = resolveRelativeAsset(relPath, argText, allFilesSet);
          if (resolved) internalImports.add(resolved);
        } else if (ts.isPropertyAccessExpression(expr)) {
          const propName = expr.name.text;
          if (propName === 'from' && /^[a-zA-Z0-9_.-]+$/.test(argText)) {
            const exprText = expr.expression.getText(sf);
            if (exprText === 'supabase' || exprText.endsWith('.supabase')) {
              dbTables.add(argText);
            } else if (exprText.endsWith('.storage')) {
              dbTables.add(`storage:${argText}`);
            }
          } else if (propName === 'rpc' && /^[a-zA-Z0-9_.-]+$/.test(argText)) {
            dbTables.add(argText);
          }
        }
      }
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const leftText = node.left.getText(sf);
      if (leftText === 'module.exports') {
        if (ts.isFunctionExpression(node.right) && node.right.name) {
          exportsList.push(`module.exports (${node.right.name.text})`);
        } else if (ts.isObjectLiteralExpression(node.right)) {
          for (const prop of node.right.properties) {
            if (prop.name && ts.isIdentifier(prop.name)) {
              exportsList.push(prop.name.text);
            }
          }
        } else {
          exportsList.push('module.exports');
        }
      } else if (leftText.startsWith('module.exports.') || leftText.startsWith('exports.')) {
        exportsList.push(leftText.replace(/^(module\.)?exports\./, ''));
      }
    } else if (ts.isStringLiteralLike(node) && node.text.length <= 4000) {
      const spaceMatches = node.text.match(/\bspace_[a-z0-9_]+\b/g);
      if (spaceMatches) {
        for (const m of spaceMatches) dbTables.add(m);
      }
    }
    ts.forEachChild(node, walkAst);
  }
  walkAst(sf);

  // Also capture CJS module.exports.fn = ... or handler in Vercel API
  if (exportsList.length === 0 && /module\.exports\s*=/.test(content)) {
    exportsList.push('module.exports');
  }

  return {
    exports: Array.from(new Set(exportsList)).slice(0, 24),
    internalImports: Array.from(internalImports).sort(compareCodepoint),
    eagerComponentImports: Array.from(eagerComponentImports).sort(compareCodepoint),
    dbTables: Array.from(dbTables).sort(compareCodepoint),
  };
}

function analyzeNonTsPythonFile(relPath, rawContent, allFilesSet) {
  const content = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const ext = path.posix.extname(relPath).toLowerCase();
  const baseName = path.posix.basename(relPath);
  const exportsList = [];
  const internalImports = new Set();
  const dbTables = new Set();

  if (ext === '.sql') {
    const tblRe = /(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE(?:\s+ONLY)?)\s+(?:public\.)?([a-zA-Z0-9_."]+)/gi;
    let m;
    while ((m = tblRe.exec(content)) !== null) {
      const tbl = m[1].replace(/"/g, '').trim();
      if (tbl) {
        dbTables.add(tbl);
        exportsList.push(`TABLE ${tbl}`);
      }
    }
    const insRe = /INSERT\s+INTO\s+(?:public\.)?([a-zA-Z0-9_."]+)/gi;
    while ((m = insRe.exec(content)) !== null) {
      const tbl = m[1].replace(/"/g, '').trim();
      if (tbl) dbTables.add(tbl);
    }
    const fnRe = /CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)/gi;
    while ((m = fnRe.exec(content)) !== null) {
      const fn = m[1].trim();
      if (fn) {
        dbTables.add(fn);
        exportsList.push(`FN ${fn}`);
      }
    }
  } else if (ext === '.html') {
    const srcRe = /<script[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = srcRe.exec(content)) !== null) {
      const src = m[1].replace(/^\//, '');
      const appPrefix = relPath.startsWith('frontend/apps/desktop/')
        ? 'frontend/apps/desktop/'
        : 'frontend/apps/mobile/';
      const cand = `${appPrefix}${src}`;
      if (allFilesSet.has(cand)) internalImports.add(cand);
    }
    if (content.includes("register('/sw.js')") && allFilesSet.has('frontend/apps/mobile/public/sw.js')) {
      internalImports.add('frontend/apps/mobile/public/sw.js');
    }
  } else if (ext === '.css') {
    const impRe = /@import\s+["']([^"']+)["']/g;
    let m;
    while ((m = impRe.exec(content)) !== null) {
      const resolved = resolveRelativeAsset(relPath, m[1], allFilesSet);
      if (resolved) internalImports.add(resolved);
    }
    const rootVars = content.match(/--[a-z0-9-]+(?=\s*:)/gi);
    if (rootVars) {
      for (const v of rootVars.slice(0, 12)) exportsList.push(v);
    }
  } else if (ext === '.json') {
    try {
      const parsed = JSON.parse(content);
      if (parsed.scripts && typeof parsed.scripts === 'object') {
        for (const [k, v] of Object.entries(parsed.scripts)) {
          exportsList.push(`script:${k}`);
          if (typeof v === 'string') {
            const jsRefs = v.match(/(?:node\s+|(?:\.\.?\/))([^\s"']+\.(?:js|cjs|mjs))/g);
            if (jsRefs) {
              for (const rawRef of jsRefs) {
                const ref = rawRef.replace(/^node\s+/, '');
                const spec = ref.startsWith('.') ? ref : `./${ref}`;
                const resolved = resolveRelativeAsset(relPath, spec, allFilesSet);
                if (resolved) internalImports.add(resolved);
              }
            }
          }
        }
      }
      if (parsed.functions && typeof parsed.functions === 'object') {
        for (const fnKey of Object.keys(parsed.functions)) {
          exportsList.push(fnKey);
          const cand = path.posix.join(path.posix.dirname(relPath), fnKey);
          if (allFilesSet.has(cand)) internalImports.add(cand);
        }
      }
      if (exportsList.length === 0) {
        for (const k of Object.keys(parsed).slice(0, 14)) exportsList.push(k);
      }
    } catch (_) {
      // Ignore malformed JSON
    }
  } else if (ext === '.yml' || ext === '.yaml') {
    if (relPath === 'docker-compose.yml') {
      exportsList.push('service:fastapi', 'service:nginx', 'service:ollama');
      if (allFilesSet.has('backend/Dockerfile')) internalImports.add('backend/Dockerfile');
      if (allFilesSet.has('frontend/nginx.conf')) internalImports.add('frontend/nginx.conf');
    } else {
      const nameM = content.match(/^name:\s*(.+)$/m);
      if (nameM) exportsList.push(nameM[1].trim());
      for (const candidate of allFilesSet) {
        if (candidate.length > 5 && content.includes(candidate)) {
          internalImports.add(candidate);
        }
      }
    }
  } else if (ext === '.bat' || ext === '.ps1') {
    if (relPath === 'start_backend_stt.bat' && allFilesSet.has('backend/app/main.py')) {
      internalImports.add('backend/app/main.py');
    }
    for (const candidate of allFilesSet) {
      if (content.includes(candidate) || content.includes(path.posix.basename(candidate))) {
        if (
          relPath.startsWith('tools/ConsultParser/') &&
          candidate === 'tools/ConsultParser/main.py'
        ) {
          internalImports.add(candidate);
        } else if (
          relPath.startsWith('backend/scripts/') &&
          candidate === 'backend/scripts/batch_analyze_stt.py'
        ) {
          internalImports.add(candidate);
        }
      }
    }
  } else if (baseName === 'Dockerfile') {
    exportsList.push('EXPOSE 8000', 'CMD uvicorn app.main:app');
    if (allFilesSet.has('backend/requirements.txt')) internalImports.add('backend/requirements.txt');
  } else if (baseName === 'requirements.txt') {
    const pkgs = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split(/[=<>!~[]/)[0].trim());
    exportsList.push(...pkgs.slice(0, 20));
  } else if (baseName.startsWith('Modelfile')) {
    const fromM = content.match(/^FROM\s+(.+)$/m);
    if (fromM) exportsList.push(`FROM ${fromM[1].trim()}`);
  } else if (baseName === 'nginx.conf') {
    exportsList.push('location /api/', 'location /mobile', 'location /');
  } else if (baseName === 'alembic.ini') {
    exportsList.push('[alembic]', 'script_location');
    if (allFilesSet.has('backend/alembic/env.py')) internalImports.add('backend/alembic/env.py');
  }

  return {
    exports: Array.from(new Set(exportsList)).slice(0, 20),
    internalImports: Array.from(internalImports).sort(compareCodepoint),
    eagerComponentImports: [],
    dbTables: Array.from(dbTables).sort(compareCodepoint),
  };
}

function runPythonAstBatch(repoRoot, pyFiles, allFiles) {
  if (pyFiles.length === 0) return {};
  const payload = JSON.stringify({ targetFiles: pyFiles, allFiles });
  const stdout = execFileSync('python', [PYTHON_AST_SCRIPT, repoRoot], {
    input: payload,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

function findCircularCycles(recordsByPath) {
  const adjacency = new Map();
  for (const [relPath, rec] of Object.entries(recordsByPath)) {
    adjacency.set(relPath, rec.internalImports);
  }

  let index = 0;
  const indices = new Map();
  const lowlink = new Map();
  const onStack = new Set();
  const stack = [];
  const cycles = [];

  function strongConnect(v) {
    indices.set(v, index);
    lowlink.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);

    const neighbors = adjacency.get(v) || [];
    for (const w of neighbors) {
      if (!indices.has(w)) {
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v), lowlink.get(w)));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v), indices.get(w)));
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      if (scc.length > 1) {
        scc.sort(compareCodepoint);
        cycles.push(scc);
      }
    }
  }

  const allNodes = Object.keys(recordsByPath).sort(compareCodepoint);
  for (const node of allNodes) {
    if (!indices.has(node)) strongConnect(node);
  }
  cycles.sort((a, b) => compareCodepoint(a[0], b[0]));
  return cycles;
}

function buildManifestData() {
  const diskFiles = collectProjectFiles(REPO_ROOT);
  const allFilesSet = new Set(diskFiles);
  const pyFiles = diskFiles.filter((f) => f.endsWith('.py') || f.endsWith('.py.bak'));
  const pyAstMap = runPythonAstBatch(REPO_ROOT, pyFiles, diskFiles);

  const records = {};
  for (const relPath of diskFiles) {
    const absPath = path.join(REPO_ROOT, relPath);
    const { raw, lines, sizeKB } = countLinesAndSize(absPath);
    const descMeta = FILE_DESCRIPTIONS[relPath] || {};
    const layerId = classifyLayer(relPath);

    let parsed = {
      exports: [],
      internalImports: [],
      eagerComponentImports: [],
      dbTables: [],
    };

    if (relPath.endsWith('.py') || relPath.endsWith('.py.bak')) {
      const pyRes = pyAstMap[relPath] || {};
      parsed = {
        exports: pyRes.exports || [],
        internalImports: (pyRes.internalImports || []).filter((p) => allFilesSet.has(p)),
        eagerComponentImports: [],
        dbTables: pyRes.dbTables || [],
      };
    } else if (/\.(ts|tsx|js|cjs|mjs)$/i.test(relPath)) {
      parsed = analyzeTsJsFile(relPath, raw, allFilesSet);
    } else {
      parsed = analyzeNonTsPythonFile(relPath, raw, allFilesSet);
    }

    records[relPath] = {
      path: relPath,
      layerId,
      lines,
      sizeKB,
      menuId: descMeta.menuId || '-',
      symmetryPair: descMeta.symmetryPair || null,
      roleKind: descMeta.roleKind || 'module',
      exports: parsed.exports,
      internalImports: parsed.internalImports,
      importedBy: [],
      fanIn: 0,
      fanOut: parsed.internalImports.length,
      eagerComponentImports: parsed.eagerComponentImports,
      dbTables: parsed.dbTables,
      externalApis: descMeta.externalApis || [],
      signals: [],
      description: descMeta.description || '',
    };
  }

  // Reverse dependency graph (importedBy / fanIn)
  for (const relPath of diskFiles) {
    for (const target of records[relPath].internalImports) {
      if (records[target]) {
        records[target].importedBy.push(relPath);
      }
    }
  }
  for (const relPath of diskFiles) {
    records[relPath].importedBy.sort(compareCodepoint);
    records[relPath].fanIn = records[relPath].importedBy.length;
  }

  // Circular dependencies
  const circularCycles = findCircularCycles(records);
  const circularMemberSet = new Set();
  for (const cycle of circularCycles) {
    for (const member of cycle) circularMemberSet.add(member);
  }

  // Optimization signals (Constitution 15.3)
  for (const relPath of diskFiles) {
    const rec = records[relPath];
    const sigs = [];
    if (rec.roleKind === 'sql_seed' && (rec.lines >= 1500 || rec.sizeKB > 80)) {
      sigs.push('SQL_BULK_SEED');
    } else if (
      relPath !== 'scripts/code_file_descriptions.cjs' &&
      (rec.lines >= 1500 || rec.sizeKB > 80)
    ) {
      sigs.push('GOD_FILE');
    }
    if (rec.eagerComponentImports.length > 0) {
      sigs.push('EAGER_ROUTE_IMPORT');
    }
    if (rec.fanIn >= 8) {
      sigs.push('HIGH_COUPLING_HUB');
    }
    if (circularMemberSet.has(relPath)) {
      sigs.push('CIRCULAR_IMPORT');
    }
    if ((rec.roleKind === 'module' || rec.roleKind === 'backup') && rec.fanIn === 0) {
      sigs.push('ORPHAN_CANDIDATE');
    }
    rec.signals = sigs;
  }

  // Summary statistics
  const layerCounts = {};
  for (const layer of LAYERS) {
    layerCounts[layer.id] = { id: layer.id, name: layer.name, count: 0, totalLines: 0, totalKB: 0 };
  }
  const signalCounts = {
    GOD_FILE: 0,
    SQL_BULK_SEED: 0,
    EAGER_ROUTE_IMPORT: 0,
    HIGH_COUPLING_HUB: 0,
    CIRCULAR_IMPORT: 0,
    ORPHAN_CANDIDATE: 0,
  };

  let totalLines = 0;
  let totalKB = 0;
  for (const relPath of diskFiles) {
    const rec = records[relPath];
    totalLines += rec.lines;
    totalKB += rec.sizeKB;
    const lc = layerCounts[rec.layerId];
    lc.count += 1;
    lc.totalLines += rec.lines;
    lc.totalKB = Number((lc.totalKB + rec.sizeKB).toFixed(1));
    for (const sig of rec.signals) {
      if (Object.prototype.hasOwnProperty.call(signalCounts, sig)) {
        signalCounts[sig] += 1;
      }
    }
  }

  return {
    schemaVersion: '1.0.0',
    projectName: 'Space_consult_assist',
    summary: {
      totalFiles: diskFiles.length,
      totalLines,
      totalSizeKB: Number(totalKB.toFixed(1)),
      layerCount: LAYERS.length,
      signalCounts,
      circularCycles,
    },
    layers: LAYERS.map((l) => layerCounts[l.id]),
    files: records,
  };
}

function escapePipe(text) {
  return String(text).replace(/\|/g, '\\|');
}

function formatListPreview(items, emptyText = '-', limit = 10) {
  if (!items || items.length === 0) return emptyText;
  if (items.length <= limit) return items.map((x) => `\`${x}\``).join(', ');
  const shown = items.slice(0, limit).map((x) => `\`${x}\``).join(', ');
  return `${shown} 외 ${items.length - limit}건`;
}

function renderMarkdownWithRanges(manifest, tocRanges) {
  const { summary, layers, files } = manifest;
  const allPaths = Object.keys(files).sort(compareCodepoint);
  const lines = [];

  lines.push('# Space Consult Assist 코드 파일 목록 및 기능 명세서 (SSOT)');
  lines.push('');
  lines.push('> 본 문서는 전사 개발 표준 헌장 **1.5조**, **3.1조**, **카테고리 XV**에 따라 결정론적 AST 분석 엔진(`scripts/generate_code_file_spec.cjs`, `scripts/extract_python_ast.py`)으로 생성·검증된 단일 진실의 원천(SSOT)이다.');
  lines.push('> 정량 메타데이터(`code_file_manifest.json`)와 100% 동기화되며, 무수식어 건조한 명사·동사 표준으로 전 파일의 역할·의존성·최적화 지표를 관리한다.');
  lines.push('');

  // Chapter 1: Overview & TOC
  lines.push('## 1. 아키텍처 개요 및 계층별 목차');
  lines.push('');
  lines.push(`- **총 관리 대상 코드·설정 파일 수**: ${summary.totalFiles}개`);
  lines.push(`- **총 코드 라인 / 용량**: ${summary.totalLines.toLocaleString('en-US')}줄 / ${summary.totalSizeKB.toLocaleString('en-US')} KB`);
  lines.push('- **의존성 매니페스트**: [code_file_manifest.json](file:///d:/01.AntiGravity/Space_consult_assist/docs/code_file_manifest.json)');
  lines.push('- **명세 동기화·검증·영향도 조회 명령**: `npm --prefix frontend run spec:sync` / `npm --prefix frontend run spec:verify` / `npm --prefix frontend run spec:query -- <검색어>`');
  lines.push('');
  lines.push('| 구분 / 계층 ID | 계층명 | 파일 수 | 총 라인 수 | 총 용량 (KB) | 문서 라인 범위 |');
  lines.push('| :---: | :--- | :---: | :---: | :---: | :---: |');
  lines.push(`| ` + '`SEC-2`' + ` | 코드 구조 최적화 레이더 (헌장 15.3조) | - | - | - | ${tocRanges['SEC-2'] || 'L0~L0'} |`);
  for (const layer of layers) {
    lines.push(
      `| \`${layer.id}\` | ${layer.name} | ${layer.count} | ${layer.totalLines.toLocaleString('en-US')} | ${layer.totalKB.toLocaleString('en-US')} | ${tocRanges[layer.id] || 'L0~L0'} |`
    );
  }
  lines.push('');

  // Chapter 2: Optimization Radar (Constitution 15.3)
  lines.push('## 2. 코드 구조 최적화 레이더 (헌장 15.3조 5대 기준)');
  lines.push('');
  lines.push('| 지표 코드 | 판정 기준 | 검출 건수 | 대상 요약 |');
  lines.push('| :--- | :--- | :---: | :--- |');
  lines.push(`| \`GOD_FILE\` | 비시드 코드 1,500줄 이상 또는 80KB 초과 | ${summary.signalCounts.GOD_FILE} | ${formatListPreview(allPaths.filter((p) => files[p].signals.includes('GOD_FILE')), '-', 8)} |`);
  lines.push(`| \`SQL_BULK_SEED\` | 대용량 적재 SQL (1,500줄 이상 또는 80KB 초과) | ${summary.signalCounts.SQL_BULK_SEED} | ${formatListPreview(allPaths.filter((p) => files[p].signals.includes('SQL_BULK_SEED')), '-', 8)} |`);
  lines.push(`| \`EAGER_ROUTE_IMPORT\` | React.lazy 미적용 정적 라우트·모달 import 컨테이너 | ${summary.signalCounts.EAGER_ROUTE_IMPORT} | ${formatListPreview(allPaths.filter((p) => files[p].signals.includes('EAGER_ROUTE_IMPORT')), '-', 8)} |`);
  lines.push(`| \`HIGH_COUPLING_HUB\` | 역방향 피참조 Fan-In 8 이상 허브 모듈 | ${summary.signalCounts.HIGH_COUPLING_HUB} | ${formatListPreview(allPaths.filter((p) => files[p].signals.includes('HIGH_COUPLING_HUB')), '-', 8)} |`);
  lines.push(`| \`CIRCULAR_IMPORT\` | 상호 순환 참조 사이클 포함 모듈 | ${summary.signalCounts.CIRCULAR_IMPORT} | ${formatListPreview(allPaths.filter((p) => files[p].signals.includes('CIRCULAR_IMPORT')), '-', 8)} |`);
  lines.push(`| \`ORPHAN_CANDIDATE\` | 미참조 모듈·백업 파일 (Fan-In = 0) | ${summary.signalCounts.ORPHAN_CANDIDATE} | ${formatListPreview(allPaths.filter((p) => files[p].signals.includes('ORPHAN_CANDIDATE')), '-', 8)} |`);
  lines.push('');

  // 2.1 GOD_FILE table
  const godFiles = allPaths
    .filter((p) => files[p].signals.includes('GOD_FILE'))
    .sort((a, b) => files[b].lines - files[a].lines || compareCodepoint(a, b));
  lines.push('### 2.1 비대 모듈 (`GOD_FILE`) 분할 대상');
  lines.push('');
  lines.push('| 파일 경로 | 계층 | 라인 수 | 용량 (KB) | Fan-In | 최적화 권고 |');
  lines.push('| :--- | :---: | :---: | :---: | :---: | :--- |');
  for (const p of godFiles) {
    const f = files[p];
    lines.push(`| \`${p}\` | ${f.layerId} | ${f.lines} | ${f.sizeKB} | ${f.fanIn} | 도메인 순수 헬퍼·커스텀 훅·하위 패널 컴포넌트 분리 |`);
  }
  lines.push('');

  // 2.2 EAGER_ROUTE_IMPORT table
  const eagerContainers = allPaths.filter((p) => files[p].signals.includes('EAGER_ROUTE_IMPORT'));
  lines.push('### 2.2 정적 라우트·모달 로드 (`EAGER_ROUTE_IMPORT`) 코드 분할 대상');
  lines.push('');
  lines.push('| 컨테이너 파일 | 정적 import 컴포넌트 수 | 대상 컴포넌트 목록 |');
  lines.push('| :--- | :---: | :--- |');
  for (const p of eagerContainers) {
    const f = files[p];
    lines.push(`| \`${p}\` | ${f.eagerComponentImports.length} | ${formatListPreview(f.eagerComponentImports, '-', 16)} |`);
  }
  lines.push('');

  // 2.3 HIGH_COUPLING_HUB + Top Fan-In Hubs table
  const topHubs = allPaths
    .filter((p) => files[p].fanIn >= 4)
    .sort((a, b) => files[b].fanIn - files[a].fanIn || compareCodepoint(a, b));
  lines.push('### 2.3 고결합 허브 (`HIGH_COUPLING_HUB`, Fan-In >= 8 및 주요 피참조 모듈 Fan-In >= 4)');
  lines.push('');
  lines.push('| 파일 경로 | 계층 | Fan-In | 시그널 | 주요 호출부 상위 목록 |');
  lines.push('| :--- | :---: | :---: | :--- | :--- |');
  for (const p of topHubs) {
    const f = files[p];
    const sigStr = f.signals.length > 0 ? f.signals.map((s) => `\`${s}\``).join(', ') : '-';
    lines.push(`| \`${p}\` | ${f.layerId} | ${f.fanIn} | ${sigStr} | ${formatListPreview(f.importedBy, '-', 6)} |`);
  }
  lines.push('');

  // 2.4 Circular Dependencies & Orphan Candidates
  lines.push('### 2.4 순환 참조 (`CIRCULAR_IMPORT`) 및 미참조 후보 (`ORPHAN_CANDIDATE`)');
  lines.push('');
  if (summary.circularCycles.length > 0) {
    lines.push('- **검출된 순환 참조 사이클**:');
    for (const cycle of summary.circularCycles) {
      lines.push(`  - ${cycle.map((c) => `\`${c}\``).join(' ↔ ')}`);
    }
  } else {
    lines.push('- **검출된 순환 참조 사이클**: 없음 (0건)');
  }
  lines.push('');
  const orphans = allPaths.filter((p) => files[p].signals.includes('ORPHAN_CANDIDATE'));
  lines.push('| 미참조 후보 경로 | 계층 | 구분 | 규모 | 기능 요약 |');
  lines.push('| :--- | :---: | :---: | :---: | :--- |');
  for (const p of orphans) {
    const f = files[p];
    lines.push(`| \`${p}\` | ${f.layerId} | ${f.roleKind} | ${f.lines}줄 / ${f.sizeKB}KB | ${escapePipe(f.description)} |`);
  }
  lines.push('');

  // Chapter 3: Detailed Specification per Layer
  lines.push('## 3. 계층별 전체 코드 파일 기능 명세 (6대 필수 스키마)');
  lines.push('');

  for (const layer of layers) {
    const layerFiles = allPaths.filter((p) => files[p].layerId === layer.id);
    lines.push(`### ${layer.id}. ${layer.name} (${layerFiles.length}개)`);
    lines.push('');
    for (const relPath of layerFiles) {
      const f = files[relPath];
      const symStr = f.symmetryPair ? `\`${f.symmetryPair}\`` : '-';
      const expStr = formatListPreview(f.exports, '-', 12);
      const outStr = formatListPreview(f.internalImports, '-', 10);
      const inStr = formatListPreview(f.importedBy, '-', 10);
      const dbStr = formatListPreview(f.dbTables, '-', 12);
      const extStr = f.externalApis.length > 0 ? f.externalApis.map((x) => `\`${x}\``).join(', ') : '-';
      const sigStr = f.signals.length > 0 ? ` | 시그널: ${f.signals.map((s) => `\`${s}\``).join(', ')}` : '';

      lines.push(`#### \`${relPath}\``);
      lines.push(`- **규모 / 구분**: ${f.lines}줄 / ${f.sizeKB} KB (${f.roleKind})${sigStr}`);
      lines.push(`- **계층 / Menu ID / 대칭 쌍**: \`${f.layerId}\` / \`${f.menuId}\` / ${symStr}`);
      lines.push(`- **주요 Export 심볼**: ${expStr}`);
      lines.push(`- **정·역방향 의존성**: Out(${f.fanOut}): ${outStr} | In(${f.fanIn}): ${inStr}`);
      lines.push(`- **접근 DB 테이블 · 외부 연동**: DB: ${dbStr} | 외부: ${extStr}`);
      lines.push(`- **핵심 기능 명세**: ${f.description}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function computeLineRanges(markdownText) {
  const lines = markdownText.split('\n');
  const markers = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === '## 2. 코드 구조 최적화 레이더 (헌장 15.3조 5대 기준)') {
      markers.push({ id: 'SEC-2', start: i + 1 });
    } else if (line === '## 3. 계층별 전체 코드 파일 기능 명세 (6대 필수 스키마)') {
      markers.push({ id: 'SEC-3', start: i + 1 });
    } else {
      const m = line.match(/^### (L\d{2})\. /);
      if (m) {
        markers.push({ id: m[1], start: i + 1 });
      }
    }
  }

  const ranges = {};
  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i];
    const nextStart = i + 1 < markers.length ? markers[i + 1].start - 1 : lines.length;
    if (cur.id === 'SEC-3') continue;
    ranges[cur.id] = `L${cur.start}~L${nextStart}`;
  }
  return ranges;
}

function generateDeterministicOutputs() {
  const manifest = buildManifestData();
  let tocRanges = {};
  let markdown = renderMarkdownWithRanges(manifest, tocRanges);
  for (let pass = 0; pass < 4; pass++) {
    const computed = computeLineRanges(markdown);
    const nextMarkdown = renderMarkdownWithRanges(manifest, computed);
    tocRanges = computed;
    if (nextMarkdown === markdown) {
      break;
    }
    markdown = nextMarkdown;
  }
  const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
  return { manifest, manifestJson, markdown, tocRanges };
}

function cmdSync() {
  const { manifest, manifestJson, markdown } = generateDeterministicOutputs();
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, manifestJson, 'utf8');
  fs.writeFileSync(SPEC_MD_PATH, markdown, 'utf8');

  console.log(`[spec:sync] 완료: 총 ${manifest.summary.totalFiles}개 파일, ${manifest.summary.totalLines}줄`);
  console.log(`[spec:sync] 시그널: GOD_FILE=${manifest.summary.signalCounts.GOD_FILE}, SQL_BULK_SEED=${manifest.summary.signalCounts.SQL_BULK_SEED}, EAGER_ROUTE_IMPORT=${manifest.summary.signalCounts.EAGER_ROUTE_IMPORT}, HIGH_COUPLING_HUB=${manifest.summary.signalCounts.HIGH_COUPLING_HUB}, CIRCULAR_IMPORT=${manifest.summary.signalCounts.CIRCULAR_IMPORT}, ORPHAN_CANDIDATE=${manifest.summary.signalCounts.ORPHAN_CANDIDATE}`);
  console.log(`[spec:sync] 산출물: docs/code_file_manifest.json, docs/CODE_FILE_SPECIFICATION.md`);
}

function cmdVerify() {
  const errors = [];
  const diskFiles = collectProjectFiles(REPO_ROOT);
  const diskSet = new Set(diskFiles);
  const descKeys = Object.keys(FILE_DESCRIPTIONS).sort(compareCodepoint);
  const descSet = new Set(descKeys);

  for (const f of diskFiles) {
    if (!descSet.has(f)) {
      errors.push(`미기재 파일(FILE_DESCRIPTIONS 누락): ${f}`);
    }
  }
  for (const k of descKeys) {
    if (!diskSet.has(k)) {
      errors.push(`유령 항목(디스크 미존재 키): ${k}`);
    }
  }

  for (const k of descKeys) {
    const entry = FILE_DESCRIPTIONS[k];
    const desc = (entry && entry.description ? String(entry.description) : '').trim();
    if (!desc || desc.length < 8) {
      errors.push(`빈 설명 또는 길이 미달(${k}): "${desc}"`);
    }
    if (PLACEHOLDER_RE.test(desc)) {
      errors.push(`플레이스홀더 문구 포함(${k}): "${desc}"`);
    }
    for (const banned of BANNED_MODIFIERS) {
      if (desc.includes(banned)) {
        errors.push(`금지 수식어 '${banned}' 검출(${k}): "${desc}"`);
      }
    }
  }

  const { manifestJson, markdown, tocRanges } = generateDeterministicOutputs();

  if (!fs.existsSync(MANIFEST_PATH)) {
    errors.push('docs/code_file_manifest.json 파일이 존재하지 않습니다.');
  } else {
    const existingManifest = fs.readFileSync(MANIFEST_PATH, 'utf8').replace(/\r\n/g, '\n');
    if (existingManifest !== manifestJson) {
      errors.push('docs/code_file_manifest.json 내용이 최신 AST 분석 결과와 일치하지 않습니다.');
    }
  }

  if (!fs.existsSync(SPEC_MD_PATH)) {
    errors.push('docs/CODE_FILE_SPECIFICATION.md 파일이 존재하지 않습니다.');
  } else {
    const existingMd = fs.readFileSync(SPEC_MD_PATH, 'utf8').replace(/\r\n/g, '\n');
    if (existingMd !== markdown) {
      errors.push('docs/CODE_FILE_SPECIFICATION.md 내용이 최신 명세 렌더링 결과와 일치하지 않습니다.');
    } else {
      // Verify TOC line numbers point to real headings
      const mdLines = existingMd.split('\n');
      for (const [id, rangeStr] of Object.entries(tocRanges)) {
        const m = rangeStr.match(/^L(\d+)~L(\d+)$/);
        if (!m) {
          errors.push(`목차 범위 형식 오류(${id}): ${rangeStr}`);
          continue;
        }
        const startLineIdx = Number(m[1]) - 1;
        const headerLine = mdLines[startLineIdx] || '';
        const expectedPrefix = id === 'SEC-2' ? '## 2. ' : `### ${id}. `;
        if (!headerLine.startsWith(expectedPrefix)) {
          errors.push(`목차 라인번호 불일치(${id}): ${rangeStr} -> "${headerLine}"`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`[spec:verify] FAIL (${errors.length}건 불일치):`);
    for (const err of errors.slice(0, 50)) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`[spec:verify] ALL CHECKS PASSED (대상 ${diskFiles.length}개 파일, 미기재 0건, 금지 수식어 0건, AST·목차 라인번호 100% 일치)`);
}

function cmdQuery(queryArgs) {
  const rawQuery = queryArgs.join(' ').trim().toLowerCase();
  if (!rawQuery) {
    console.error('사용법: node scripts/generate_code_file_spec.cjs query <검색어>');
    process.exit(1);
  }
  let manifest;
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } else {
    manifest = generateDeterministicOutputs().manifest;
  }

  const allPaths = Object.keys(manifest.files).sort(compareCodepoint);
  const matches = [];
  for (const relPath of allPaths) {
    const f = manifest.files[relPath];
    const haystack = [
      f.path,
      f.layerId,
      f.menuId,
      f.symmetryPair || '',
      f.exports.join(' '),
      f.dbTables.join(' '),
      f.externalApis.join(' '),
      f.signals.join(' '),
      f.description,
    ]
      .join(' ')
      .toLowerCase();
    if (haystack.includes(rawQuery)) {
      matches.push(f);
    }
  }

  console.log(`[spec:query] 검색어 "${queryArgs.join(' ')}" 매칭: ${matches.length}건`);
  for (const f of matches) {
    console.log(`\n▶ ${f.path} [${f.layerId} | ${f.lines}줄 / ${f.sizeKB}KB]`);
    console.log(`  menuId: ${f.menuId} | 대칭쌍: ${f.symmetryPair || '-'}`);
    console.log(`  Out(${f.fanOut}): ${f.internalImports.join(', ') || '-'}`);
    console.log(`  In(${f.fanIn}): ${f.importedBy.join(', ') || '-'}`);
    console.log(`  DB: ${f.dbTables.join(', ') || '-'} | 시그널: ${f.signals.join(', ') || '-'}`);
    console.log(`  명세: ${f.description}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'sync';
  if (cmd === 'sync') {
    cmdSync();
  } else if (cmd === 'verify') {
    cmdVerify();
  } else if (cmd === 'query') {
    cmdQuery(args.slice(1));
  } else {
    console.error(`알 수 없는 명령: ${cmd} (sync | verify | query 중 선택)`);
    process.exit(1);
  }
}

main();
