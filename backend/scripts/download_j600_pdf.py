# -*- coding: utf-8 -*-
import urllib.request
import urllib.parse
import ssl
import http.cookiejar

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

# 1. First visit the post page to get cookies and fresh nonce
post_url = "https://www.space-dust.com/manual/13"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.space-dust.com/bbs/board.php?bo_table=manual"
}
req = urllib.request.Request(post_url, headers=headers)
html = opener.open(req).read().decode('utf-8', errors='ignore')

# find download link
import re
match = re.search(r'href=["\'](https://www\.space-dust\.com/bbs/download\.php\?[^"\']+)["\']', html)
if match:
    dl_url = match.group(1).replace('&amp;', '&')
    print("Found download URL:", dl_url)
    dl_req = urllib.request.Request(dl_url, headers={
        "User-Agent": headers["User-Agent"],
        "Referer": post_url
    })
    data = opener.open(dl_req).read()
    print("Downloaded size:", len(data))
    if data[:4] == b'%PDF':
        with open("j600_manual_real.pdf", "wb") as f:
            f.write(data)
        print("SUCCESS! Saved real PDF:", len(data), "bytes")
    else:
        print("Not a PDF, first 200 bytes:", data[:200])
else:
    print("Could not find download link in post page")
