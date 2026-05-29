FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# Pacotes básicos para permitir que o Playwright instale as dependências Linux corretas.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Instala o Chromium e TODAS as dependências Linux exigidas pelo Playwright.
# Isso cobre tanto a API quanto o serviço RPA quando a Railway usa o Dockerfile da raiz.
RUN python -m playwright install --with-deps chromium

COPY backend/ ./

RUN chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
