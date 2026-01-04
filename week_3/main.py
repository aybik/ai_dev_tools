from urllib.parse import urlparse

import requests
from fastmcp import FastMCP

mcp = FastMCP("Demo 🚀")


@mcp.tool
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b


def fetch_markdown_content(url: str) -> str:
    """Download the markdown content of a web page using Jina Reader."""
    if not url or not url.strip():
        raise ValueError("URL must be provided")

    target = url.strip()
    parsed = urlparse(target)

    if parsed.scheme == "" and parsed.netloc == "":
        # Allow users to pass bare domains without scheme.
        target = f"https://{target}"
        parsed = urlparse(target)

    if parsed.scheme == "" or parsed.netloc == "":
        raise ValueError("URL is invalid or missing host")

    jina_url = (
        target
        if target.startswith("https://r.jina.ai/")
        else f"https://r.jina.ai/{target}"
    )

    response = requests.get(
        jina_url,
        timeout=30,
        headers={"User-Agent": "week_3_mcp_homework/1.0"},
    )
    response.raise_for_status()
    return response.text


@mcp.tool(name="fetch_markdown")
def fetch_markdown_tool(url: str) -> str:
    """Expose markdown fetching via MCP."""
    return fetch_markdown_content(url)


if __name__ == "__main__":
    mcp.run()
