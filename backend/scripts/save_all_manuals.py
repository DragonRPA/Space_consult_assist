# -*- coding: utf-8 -*-
"""
스페이스 공식 매뉴얼 및 카탈로그 일괄 수집/보존 스크립트
space-dust.com의 wr_id=1부터 25까지 전수 순회하여 PDF 다운로드 및 docs/manuals에 영구 저장
"""

import os
import re
import ssl
import sys
import io
import urllib.request
import http.cookiejar

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SAVE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "manuals"))
os.makedirs(SAVE_DIR, exist_ok=True)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cj),
    urllib.request.HTTPSHandler(context=ctx)
)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

downloaded_files = []

print(f"=== 공식 매뉴얼 다운로드 시작 (저장 경로: {SAVE_DIR}) ===")

# wr_id 1 to 25
for wr_id in range(1, 26):
    post_url = f"https://www.space-dust.com/manual/{wr_id}"
    try:
        req = urllib.request.Request(post_url, headers=headers)
        html = opener.open(req).read().decode("utf-8", errors="ignore")
        
        # 게시글 제목 추출
        title_match = re.search(r'<h\d[^>]*id=["\']bo_v_title["\'][^>]*>(.*?)</h\d>', html, re.DOTALL)
        if not title_match:
            title_match = re.search(r'<title>(.*?)</title>', html)
        
        post_title = f"DOC_{wr_id}"
        if title_match:
            raw_title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip()
            raw_title = raw_title.replace("스페이스 : ", "").replace(" - 스페이스", "").strip()
            raw_title = re.sub(r'[\\/*?:"<>|]', '_', raw_title)
            if raw_title:
                post_title = raw_title

        # 첨부파일 다운로드 링크 및 파일명 추출
        dl_match = re.search(r'href=["\'](https://www\.space-dust\.com/bbs/download\.php\?[^"\']+)["\']', html)
        file_name_match = re.search(r'class=["\']view_file_download["\'][^>]*>\s*<strong>(.*?)</strong>', html, re.DOTALL)
        
        if dl_match:
            dl_url = dl_match.group(1).replace("&amp;", "&")
            actual_fname = file_name_match.group(1).strip() if file_name_match else f"{post_title}.pdf"
            actual_fname = re.sub(r'[\\/*?:"<>|]', '_', actual_fname)
            
            dl_req = urllib.request.Request(dl_url, headers={
                "User-Agent": headers["User-Agent"],
                "Referer": post_url
            })
            pdf_data = opener.open(dl_req).read()
            if pdf_data[:4] == b"%PDF":
                out_filename = f"SPACE_{wr_id:02d}_{actual_fname}"
                out_path = os.path.join(SAVE_DIR, out_filename)
                with open(out_path, "wb") as f:
                    f.write(pdf_data)
                downloaded_files.append((out_filename, len(pdf_data), post_title))
                print(f"[{wr_id:02d}/25] ✅ 저장 완료: {out_filename} ({len(pdf_data):,} bytes)")
            else:
                print(f"[{wr_id:02d}/25] ⚠️ PDF 아님 (크기: {len(pdf_data)} bytes) - {post_title}")
        else:
            print(f"[{wr_id:02d}/25] ℹ️ 첨부파일 없음: {post_title}")
    except Exception as e:
        print(f"[{wr_id:02d}/25] ❌ 오류: {e}")

print(f"\n=======================================================")
print(f"총 {len(downloaded_files)}개 공식 매뉴얼/카탈로그 PDF 영구 보존 완료!")
print(f"저장 위치: {SAVE_DIR}")
