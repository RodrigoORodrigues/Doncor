"""Regras de competência para boletos e faturas do RPA.

Regra principal:
- Uma competência MM/AAAA continua válida até o dia 10 do mês seguinte.
- Exemplo: competência 06/2026 deve ser procurada até 10/07/2026.
- Depois da data limite, a busca avança para a próxima competência.
"""

from __future__ import annotations

import datetime as _dt
import re
from typing import Any, Dict, Optional, Tuple


def _as_int(value: Any, default: int) -> int:
    try:
        return int(str(value).strip())
    except Exception:
        return default


def _add_months(year: int, month: int, delta: int) -> Tuple[int, int]:
    absolute = (year * 12) + (month - 1) + delta
    return absolute // 12, (absolute % 12) + 1


def _normalize_year(value: Any) -> Optional[int]:
    text = str(value or "").strip()
    if not text:
        return None
    year = _as_int(text, 0)
    if 1 <= year <= 99:
        year += 2000
    return year if year >= 2000 else None


def _normalize_month(value: Any) -> Optional[int]:
    text = str(value or "").strip()
    if not text:
        return None
    month = _as_int(text, 0)
    return month if 1 <= month <= 12 else None


def _parse_competencia_text(raw: Any) -> Optional[Tuple[int, int]]:
    text = str(raw or "").strip()
    if not text:
        return None

    # Aceita 06/2026, 6/26, 2026-06, 2026/06.
    match = re.search(r"\b(0?[1-9]|1[0-2])\s*[/-]\s*(20\d{2}|\d{2})\b", text)
    if match:
        month = _normalize_month(match.group(1))
        year = _normalize_year(match.group(2))
        return (year, month) if year and month else None

    match = re.search(r"\b(20\d{2})\s*[/-]\s*(0?[1-9]|1[0-2])\b", text)
    if match:
        year = _normalize_year(match.group(1))
        month = _normalize_month(match.group(2))
        return (year, month) if year and month else None

    return None


def _extract_configured_competencia(operadora: Dict[str, Any]) -> Optional[Tuple[int, int]]:
    for key in ("competencia", "mesAno", "mes_ano", "periodo", "competenciaBusca", "competencia_boleto"):
        parsed = _parse_competencia_text(operadora.get(key))
        if parsed:
            return parsed

    month = _normalize_month(operadora.get("mes") or operadora.get("mesBoleto") or operadora.get("boletoMes"))
    year = _normalize_year(operadora.get("ano") or operadora.get("anoBoleto") or operadora.get("boletoAno"))
    if month and year:
        return year, month

    return None


def competencia_cutoff_date(year: int, month: int, cutoff_day: int = 10) -> _dt.date:
    next_year, next_month = _add_months(year, month, 1)
    return _dt.date(next_year, next_month, max(1, min(cutoff_day, 28)))


def resolve_competencia_window(operadora: Dict[str, Any], hoje: Optional[_dt.date] = None) -> Dict[str, Any]:
    """Resolve a competência que o robô deve procurar.

    Se a operadora tiver competência configurada, ela será mantida até o dia
    limite do mês seguinte. Se a data atual passou desse limite, a competência
    avança mês a mês até ficar dentro da janela válida.

    Se não houver competência configurada, usa a janela operacional padrão:
    até o dia 10, procura a competência do mês anterior; após o dia 10, procura
    a competência do mês atual.
    """

    hoje = hoje or _dt.datetime.now().date()
    cutoff_day = _as_int(
        operadora.get("diaLimiteCompetencia")
        or operadora.get("dia_limite_competencia")
        or operadora.get("buscarAteDiaMesSeguinte")
        or operadora.get("buscar_ate_dia_mes_seguinte"),
        10,
    )
    cutoff_day = max(1, min(cutoff_day, 28))

    configured = _extract_configured_competencia(operadora)
    origem = "configurada"

    if configured:
        year, month = configured
        advanced = False
        while hoje > competencia_cutoff_date(year, month, cutoff_day):
            year, month = _add_months(year, month, 1)
            advanced = True
        if advanced:
            origem = "configurada_avancada_por_limite"
    else:
        origem = "automatica_janela_dia_10"
        if hoje.day <= cutoff_day:
            year, month = _add_months(hoje.year, hoje.month, -1)
        else:
            year, month = hoje.year, hoje.month

    cutoff = competencia_cutoff_date(year, month, cutoff_day)
    return {
        "mes": f"{month:02d}",
        "ano": str(year),
        "competencia": f"{month:02d}/{year}",
        "data_limite_busca": cutoff.strftime("%d/%m/%Y"),
        "cutoff_day": cutoff_day,
        "origem": origem,
    }
