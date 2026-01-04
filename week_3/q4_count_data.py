import re
from main import fetch_markdown_content

if __name__ == "__main__":
    text = fetch_markdown_content("https://datatalks.club/")
    count = len(re.findall(r"\bdata\b", text, flags=re.IGNORECASE))
    print(count)
