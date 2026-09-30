"""Vercel serverless entry point: expose the FastAPI app."""
import os
import sys

CURRENT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(CURRENT, ".."))
BACKEND = os.path.join(ROOT, "backend")

for path in (ROOT, BACKEND):
    if path not in sys.path:
        sys.path.insert(0, path)

from backend.app.main import app  # noqa: E402  (path setup above)
