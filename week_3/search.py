import io
from pathlib import Path
from zipfile import ZipFile

import requests
from minsearch import Index


ZIP_URL = "https://github.com/jlowin/fastmcp/archive/refs/heads/main.zip"
DATA_DIR = Path(__file__).parent / "data"
ZIP_PATH = DATA_DIR / "fastmcp-main.zip"


def ensure_zip_downloaded() -> Path:
    """Download the ZIP archive if it's not already present locally."""
    DATA_DIR.mkdir(exist_ok=True)
    if ZIP_PATH.exists():
        return ZIP_PATH

    resp = requests.get(ZIP_URL, timeout=60)
    resp.raise_for_status()
    ZIP_PATH.write_bytes(resp.content)
    return ZIP_PATH


def load_markdown_files(zip_path: Path) -> list[dict]:
    """Read markdown files from the archive, stripping the top-level folder."""
    docs: list[dict] = []
    with ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            if name.endswith("/"):
                continue
            lower = name.lower()
            if not (lower.endswith(".md") or lower.endswith(".mdx")):
                continue

            path = Path(name)
            parts = path.parts[1:] if len(path.parts) > 1 else path.parts
            relative_path = Path(*parts)

            with zf.open(name) as f:
                content_bytes = f.read()
            try:
                content = content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                content = content_bytes.decode("utf-8", errors="ignore")

            docs.append({"filename": str(relative_path), "content": content})
    return docs


def build_index(docs: list[dict]) -> Index:
    """Create a minsearch index for the provided documents."""
    index = Index(
        text_fields=["content"],
        keyword_fields=["filename"],
    )
    index.fit(docs)
    return index


# Build the index at import time so search() is ready to use.
_zip_path = ensure_zip_downloaded()
_docs = load_markdown_files(_zip_path)
_index = build_index(_docs)


def search(query: str, num_results: int = 5) -> list[dict]:
    """Return the top matching documents for the query."""
    if not query:
        return []
    return _index.search(query, num_results=num_results)


if __name__ == "__main__":
    import sys

    query = " ".join(sys.argv[1:]).strip() or "fastmcp"
    for doc in search(query):
        print(doc["filename"])
