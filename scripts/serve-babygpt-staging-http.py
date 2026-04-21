#!/usr/bin/env python3
"""
HTTP static seed for Ubuntu autoinstall (no Windows HttpListener / URL ACL).
Usage: python scripts/serve-babygpt-staging-http.py --bind 10.0.0.228 --port 8080
"""
from __future__ import annotations

import argparse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parent.parent)
    ap.add_argument("--bind", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8080)
    args = ap.parse_args()

    staging = args.repo_root / "deploy" / "proliant" / "staging"
    nocloud = args.repo_root / "deploy" / "proliant" / "automation" / "nocloud"

    class H(BaseHTTPRequestHandler):
        def log_message(self, fmt: str, *a) -> None:
            print(f"[seed] {self.address_string()} - {fmt % a}")

        def do_GET(self) -> None:
            p = self.path.split("?", 1)[0].rstrip("/") or "/"
            if p == "/":
                body = (
                    f"BabyGPT seed. Use autoinstall ds=nocloud-net;s=http://<this-host>:{args.port}/\n"
                ).encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            mapping = {
                "/user-data": (nocloud / "user-data", "text/cloud-config; charset=utf-8"),
                "/meta-data": (nocloud / "meta-data", "text/plain; charset=utf-8"),
                "/babygpt-src.zip": (staging / "babygpt-src.zip", "application/zip"),
                "/bootstrap.sh": (staging / "bootstrap.sh", "application/x-sh"),
                "/bring-online.sh": (staging / "bring-online.sh", "application/x-sh"),
                "/babygpt.service": (staging / "babygpt.service", "text/plain; charset=utf-8"),
            }
            if p not in mapping:
                self.send_error(404, "Not found")
                return
            path, ctype = mapping[p]
            if not path.is_file():
                self.send_error(404, f"Missing file: {path}")
                return
            data = path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    httpd = ThreadingHTTPServer((args.bind, args.port), H)
    print(f"Serving seed on http://{args.bind}:{args.port}/")
    print(f"  staging: {staging}")
    print(f"  nocloud: {nocloud}")
    print("Ctrl+C to stop.")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
