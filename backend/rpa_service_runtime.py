"""Entrada runtime do serviço RPA com correções aplicadas após o import.

Este módulo importa o serviço original e substitui a função de competência do
ASSIM diretamente no namespace usado pelo Playwright. Assim evita o bug antigo
que preenchia mês atual + 1, por exemplo 07/2026 em 01/06/2026.
"""

from __future__ import annotations

from typing import Any, Dict

import rpa_service_example as service
from competencia_utils import resolve_competencia_window


def _infer_assim_period(op: Dict[str, Any]) -> Dict[str, str]:
    window = resolve_competencia_window(op)
    try:
        service.logger.info(
            "ASSIM: competência resolvida pela regra dia 10: competencia=%s mes=%s ano=%s limite=%s origem=%s",
            window.get("competencia"),
            window.get("mes"),
            window.get("ano"),
            window.get("data_limite_busca"),
            window.get("origem"),
        )
    except Exception:
        pass
    return {"mes": window["mes"], "ano": window["ano"]}


# A função _submit_assim_period_with_script está no módulo original e faz lookup
# global de _infer_assim_period. Substituir o atributo do módulo muda o lookup.
service._infer_assim_period = _infer_assim_period
service._DONCOR_COMPETENCIA_PATCHED = True

app = service.app
