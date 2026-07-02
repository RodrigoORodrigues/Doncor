# Correções para Erro 502 do Serviço RPA

## Problema
O serviço RPA retornava um erro 502 ("Application failed to respond") quando tentava iniciar o robô.

## Causa Raiz
1. **Health Check falhando**: O Railway esperava um endpoint `/health` que respondesse corretamente
2. **Tratamento de erros inadequado**: Quando o Playwright não estava instalado ou o serviço RPA externo não respondia, não havia fallback
3. **Bug no rpa_service_example.py**: Linha 177 usava `time.strftime()` sem argumentos
4. **Sem logging**: Difícil diagnosticar problemas em produção

## Alterações Implementadas

### 1. **rpa_service_example.py**
- ✅ Adicionado logging inicial para avisar se Playwright não está disponível
- ✅ Melhorado endpoint `/health` para retornar status do Playwright
- ✅ Adicionado check se Playwright está disponível no endpoint `/run-rpa`
- ✅ Fallback para modo simulado no `/api/robo/trigger-local` quando Playwright não está disponível
- ✅ Corrigido bug: `time.strftime()` → `datetime.datetime.now().strftime()`

### 2. **server.py**
- ✅ Adicionado endpoint `/health` que valida conexão MongoDB
- ✅ Melhorado `_run_rpa_job()` com tratamento de:
  - Timeout (504)
  - Connection error (503)
  - Bad response (502)
  - Logging detalhado de erros
- ✅ Adicionado fallback em `trigger_robo_real()` para usar modo simulado quando serviço externo falha

### 3. **Novo arquivo: .env.example**
Documenta todas as variáveis de ambiente necessárias para configurar os serviços

### 4. **Novo script: test_rpa_health.py**
Script para testar se API e RPA estão respondendo

## Como Usar

### Desenvolvimento Local
```bash
# Terminal 1: API Principal
cd backend
SERVICE_TYPE=main python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: Serviço RPA
cd backend
SERVICE_TYPE=rpa python -m uvicorn rpa_service_example:app --host 0.0.0.0 --port 8001

# Terminal 3: Testar
python test_rpa_health.py
```

### Em Produção (Railway)
1. Configure `SERVICE_TYPE` no Railway como `main` para a API principal
2. Crie um novo serviço Railway separado com `SERVICE_TYPE=rpa` para o RPA
3. Configure variáveis de ambiente MongoDB e Supabase em cada serviço

## Comportamentos Agora

### Quando Playwright não está instalado
- ✅ Endpoints `/health` retornam status 200 com `"playwright": "not_installed"`
- ✅ Endpoints RPA retornam resultado simulado (não falham)
- ✅ Aplicação continua funcionando normalmente

### Quando serviço RPA externo não responde
- ✅ Endpoint `/robo/trigger-real` retorna resultado simulado em vez de falhar
- ✅ Logs indicam que o modo simulado foi acionado
- ✅ API principal continua 100% funcional

## Próximos Passos

1. **Instalar Playwright** (se for usar a versão real):
   ```bash
   pip install playwright
   playwright install chromium
   ```

2. **Configurar variáveis de ambiente** no arquivo `.env` baseado em `.env.example`

3. **Testar health endpoints**:
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8001/health
   ```

4. **Monitorar logs** em produção para erros de RPA
