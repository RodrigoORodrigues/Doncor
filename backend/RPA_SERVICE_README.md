# RPA Service (Playwright) - Doncor

## 1) Instalação

```bash
cd backend
pip install fastapi uvicorn playwright
playwright install chromium
```

## 2) Executar serviço

```bash
uvicorn rpa_service_example:app --host 0.0.0.0 --port 9000 --reload
```

## 3) Configurar no Doncor (RoboConfig)

- Ambiente de execução: `Serviço Externo RPA`
- `RPA_SERVICE_URL`: `http://localhost:9000/run-rpa`
- Preencher Operadora + Supabase
- Salvar parâmetros

## 4) Teste direto

```bash
curl -X POST http://localhost:9000/run-rpa \
  -H "Content-Type: application/json" \
  -d '{
    "user_id":"USER_001",
    "unique_login_code":"ABC123",
    "apolice_id":"APOLICE_999",
    "operadora":{"nome":"AMIL","url":"https://portal.exemplo","usuario":"u","senha":"s"},
    "supabase":{"url":"https://xxx.supabase.co","serviceRoleKey":"xxx","bucket":"boletos"}
  }'
```

## 5) Ajustes obrigatórios para produção

- Ajustar seletores de login em `rpa_service_example.py`:
  - `input[name="username"]`, `input[name="password"]`, botão submit
- Ajustar navegação e seletor de links de boleto:
  - `a[href*="boleto"]`, `a.download-boleto`
- Implementar upload real para Supabase Storage
- Implementar gravação de metadados de boletos no banco
- Configurar timeout/retry e logs estruturados

## 6) Healthcheck

```bash
curl http://localhost:9000/health
```
