import re
from main import fetch_markdown_content

url = "https://datatalks.club/"
text = fetch_markdown_content(url)

print("LENGTH:", len(text))
print("HEAD:\n", text[:400])

# Whole-word, case-insensitive
whole_word = len(re.findall(r"\bdata\b", text, flags=re.IGNORECASE))

# Substring, case-insensitive (includes DataTalks, database, etc.)
substring = text.lower().count("data")

print("\nwhole-word (\\bdata\\b, IGNORECASE):", whole_word)
print("substring ('data', case-insensitive):", substring)
