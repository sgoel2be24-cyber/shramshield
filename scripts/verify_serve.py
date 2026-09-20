#!/usr/bin/env python3
"""Deploy smoke test: serve dist/ and assert the built app actually responds.

A green local build is not evidence that the deployed product works, but neither is a
curl of a status code. This asserts the served HTML carries the app's marker text and that
the hashed JS bundle is fetchable.

Usage:
    python3 scripts/verify_serve.py [--port 4173] [--expect "ShramShield"]
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request


def wait_for(url: str, timeout: float = 40.0) -> str:
    deadline = time.time() + timeout
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if response.status == 200:
                    return response.read().decode("utf-8", "replace")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:  # pragma: no cover
            last_error = exc
        time.sleep(0.5)
    raise SystemExit(f"server never came up at {url}: {last_error}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--expect", default="ShramShield")
    args = parser.parse_args()

    base = f"http://127.0.0.1:{args.port}"
    process = subprocess.Popen(
        ["npx", "--no-install", "vite", "preview", "--port", str(args.port), "--strictPort"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        html = wait_for(base + "/")
        checks: list[tuple[str, bool, str]] = []

        checks.append(("index serves marker text", args.expect in html, f"looked for {args.expect!r}"))

        scripts = re.findall(r'src="(/assets/[^"]+)"', html)
        checks.append(("bundle referenced", bool(scripts), f"found {len(scripts)} script tag(s)"))
        if scripts:
            with urllib.request.urlopen(base + scripts[0], timeout=10) as response:
                body = response.read().decode("utf-8", "replace")
            checks.append(
                (
                    "bundle fetches and is non-empty",
                    response.status == 200 and len(body) > 10_000,
                    f"{response.status}, {len(body)} bytes",
                )
            )

        failed = [name for name, ok, _ in checks if not ok]
        for name, ok, detail in checks:
            print(f"[{'PASS' if ok else 'FAIL'}] {name} ({detail})")
        if failed:
            raise SystemExit(f"FAILED: {', '.join(failed)}")
        print("deploy smoke test: OK")
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:  # pragma: no cover
            process.kill()


if __name__ == "__main__":
    main()
