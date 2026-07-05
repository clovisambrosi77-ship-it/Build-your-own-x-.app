import json
import re
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent.resolve()
README_URL = "https://raw.githubusercontent.com/codecrafters-io/build-your-own-x/master/README.md"

FALLBACK_TUTORIALS = [
    {
        "category": "3D Renderer",
        "language": "C++",
        "title": "Introduction to Ray Tracing",
        "url": "https://www.scratchapixel.com/lessons/3d-basic-rendering/introduction-to-ray-tracing/how-does-it-work",
        "tags": ["tutorial"],
    },
    {
        "category": "AI Model",
        "language": "Python",
        "title": "A Large Language Model (LLM)",
        "url": "https://github.com/rasbt/LLMs-from-scratch",
        "tags": ["tutorial"],
    },
    {
        "category": "Database",
        "language": "Go",
        "title": "Build your own database",
        "url": "https://build-your-own.org/database/",
        "tags": ["tutorial"],
    },
]


def fetch_readme():
    req = urllib.request.Request(README_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as response:
        return response.read().decode("utf-8")


def parse_readme(text: str):
    tutorials = []
    current_category = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        heading_match = re.match(r"^#### Build your own `(.+?)`$", line)
        if heading_match:
            current_category = heading_match.group(1).strip()
            continue

        if not current_category or not line.startswith("* ["):
            continue

        match = re.match(
            r"^\* \[\*\*(.+?)\*\*: _(.+?)_\]\((https?://[^)]+)\)(?:\s+\[(.+?)\])?$",
            line,
        )
        if not match:
            continue

        language = match.group(1).strip()
        title = match.group(2).strip()
        url = match.group(3).strip()
        tags = [match.group(4).strip()] if match.group(4) else []

        tutorials.append(
            {
                "category": current_category,
                "language": language,
                "title": title,
                "url": url,
                "tags": tags,
            }
        )

    tutorials.sort(key=lambda item: (item["category"].lower(), item["title"].lower()))
    return tutorials


class AppHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path == "/api/tutorials":
            self._send_json(self._load_tutorials())
            return

        if path in {"/", "/index.html"}:
            file_path = ROOT / "index.html"
        else:
            safe_path = path.lstrip("/")
            file_path = (ROOT / safe_path).resolve()
            if ROOT not in file_path.parents:
                self.send_error(403)
                return

        if file_path.exists() and file_path.is_file():
            self._send_static(file_path)
        else:
            self.send_error(404)

    def _load_tutorials(self):
        try:
            data = fetch_readme()
            tutorials = parse_readme(data)
            return {"source": README_URL, "count": len(tutorials), "tutorials": tutorials}
        except Exception:
            return {"source": README_URL, "count": len(FALLBACK_TUTORIALS), "tutorials": FALLBACK_TUTORIALS, "fallback": True}

    def _send_json(self, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_static(self, file_path: Path):
        content = file_path.read_bytes()
        mime_type = "text/html; charset=utf-8" if file_path.suffix == ".html" else "text/css; charset=utf-8" if file_path.suffix == ".css" else "application/javascript; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format, *args):
        return


def main():
    server = HTTPServer(("127.0.0.1", 8000), AppHandler)
    print("Serveur lancé sur http://127.0.0.1:8000")
    server.serve_forever()


if __name__ == "__main__":
    main()
