import os
import subprocess
import sys

import uvicorn

# Keep browser binaries in a predictable location inside the container.
# This avoids Playwright looking in /root/.cache/ms-playwright while the
# Docker image has browsers elsewhere.
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/ms-playwright")


def ensure_playwright_browser() -> None:
    """Install the Chromium browser expected by the installed Playwright package.

    Railway can reuse Docker layers or run an image whose Python package version
    differs from the browser cache. Running this at startup is idempotent and
    prevents BrowserType.launch errors caused by missing Chromium binaries.
    """
    print("Verificando navegador Chromium do Playwright...")
    subprocess.run(
        [sys.executable, "-m", "playwright", "install", "chromium"],
        check=True,
    )
    print("Chromium do Playwright pronto.")


raw_port = os.getenv("PORT", "8000")
try:
    port = int(raw_port)
except (TypeError, ValueError):
    port = 8000

ensure_playwright_browser()
print(f"Starting Doncor RPA Service on port {port}")
uvicorn.run("rpa_service_example:app", host="0.0.0.0", port=port)
