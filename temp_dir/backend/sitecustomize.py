"""Runtime compatibility defaults and small RPA runtime patches.

Python importa `sitecustomize` automaticamente na inicialização quando este
arquivo está no PYTHONPATH.
"""

from __future__ import annotations

import os
import sys
import threading
import time
from typing import Any, Dict

os.environ.setdefault("MONGO_URL", "supabase://adapter")
os.environ.setdefault("DB_NAME", "doncor")


def _patch_competencia_rpa(module) -> bool:
    """Aplica a regra: competência MM/AAAA vale até dia 10 do mês seguinte."""
    if getattr(module, "_DONCOR_COMPETENCIA_PATCHED", False):
        return True

    try:
        from competencia_utils import resolve_competencia_window
    except Exception:
        return False

    def _infer_assim_period(op: Dict[str, Any]) -> Dict[str, str]:
        window = resolve_competencia_window(op)
        return {"mes": window["mes"], "ano": window["ano"]}

    setattr(module, "_infer_assim_period", _infer_assim_period)
    setattr(module, "_DONCOR_COMPETENCIA_PATCHED", True)
    return True


def _wait_and_patch() -> None:
    for _ in range(300):
        module = sys.modules.get("rpa_service_example")
        if module is not None and _patch_competencia_rpa(module):
            return
        time.sleep(0.1)


threading.Thread(target=_wait_and_patch, daemon=True).start()
