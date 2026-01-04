from main import fetch_markdown_content


def main() -> None:
    url = "https://github.com/alexeygrigorev/minsearch"
    content = fetch_markdown_content(url)
    print(f"Fetched characters: {len(content)}")


if __name__ == "__main__":
    main()
