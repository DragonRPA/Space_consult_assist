# -*- coding: utf-8 -*-
import urllib.request
import ssl
import http.cookiejar
import re
import sys
import io
import pdfplumber

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
}

# Posts to inspect:
# 6: S5 매뉴얼
# 7: S7P 매뉴얼
# 8: The New S7P 매뉴얼
# 15: J800 매뉴얼
# 21: R3 SCP
posts = [
    ("S5", 6),
    ("S7P", 7),
    ("J800", 15),
    ("R3", 21)
]

for name, pid in posts:
    post_url = f"https://www.space-dust.com/manual/{pid}"
    try:
        req = urllib.request.Request(post_url, headers=headers)
        html = opener.open(req).read().decode('utf-8', errors='ignore')
        match = re.search(r'href=["\'](https://www\.space-dust\.com/bbs/download\.php\?[^"\']+)["\']', html)
        if match:
            dl_url = match.group(1).replace('&amp;', '&')
            dl_req = urllib.request.Request(dl_url, headers={
                "User-Agent": headers["User-Agent"],
                "Referer": post_url
            })
            pdf_data = opener.open(dl_req).read()
            if pdf_data[:4] == b'%PDF':
                pdf_filename = f"{name}_manual.pdf"
                with open(pdf_filename, "wb") as f:
                    f.write(pdf_data)
                print(f"[OK] Downloaded {name} manual ({len(pdf_data)} bytes)")
                
                # Check for error codes in PDF
                with pdfplumber.open(pdf_filename) as pdf:
                    print(f"  Pages: {len(pdf.pages)}")
                    for pno, page in enumerate(pdf.pages, 1):
                        txt = page.extract_text() or ""
                        if any(kw in txt for kw in ["에러", "오류", "코드", "트러블", "0-C", "E0", "경고", "Error"]):
                            # check if specific code table exists
                            for line in txt.split("\n"):
                                if any(c in line for c in ["코드", "에러", "Error", "E0", "AL", "0-C", "F0"]):
                                    if len(line.strip()) > 5:
                                        print(f"    [P.{pno}] {line.strip()[:100]}")
            else:
                print(f"[WARN] {name} download is not a PDF")
        else:
            print(f"[WARN] No download link in {name} post")
    except Exception as e:
        print(f"[ERR] {name}: {e}")
