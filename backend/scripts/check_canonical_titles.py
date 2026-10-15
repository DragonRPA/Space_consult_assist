# -*- coding: utf-8 -*-
import sys
import io
import os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.app.api.v1.endpoints.canonical_symptoms import CANONICAL_FAILURE_TYPES

print("=== 16대 표준 장애 유형 단일 순수 감각 현상 타이틀 현황 ===")
for i, item in enumerate(CANONICAL_FAILURE_TYPES, 1):
    has_slash = "/" in item["title"]
    flag = "[SLASH]" if has_slash else "[CLEAN]"
    print(f"{i:02d}. {flag} [{item['category']}] {item['id']} -> {item['title']} (부품: {item['part_code']})")
