import urllib.request
import re

url = "https://space-consult-assist.vercel.app/"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

css_match = re.search(r'href=[\'"](/assets/index-[^\'"]+\.css)[\'"]', html)
js_match = re.search(r'src=[\'"](/assets/index-[^\'"]+\.js)[\'"]', html)

print("CSS matched:", css_match.group(1) if css_match else "None")
print("JS matched:", js_match.group(1) if js_match else "None")

if css_match:
    css_url = "https://space-consult-assist.vercel.app" + css_match.group(1)
    css_req = urllib.request.Request(css_url, headers={'User-Agent': 'Mozilla/5.0'})
    css_content = urllib.request.urlopen(css_req).read().decode('utf-8')
    print("Paper texture in live CSS?", "paperNoise" in css_content)
    print("bg-app in live CSS?", "--bg-app" in css_content)
