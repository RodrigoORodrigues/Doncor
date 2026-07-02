# Configuração do Serviço RPA na Railway

## Arquitetura

```
Railway Backend Doncor (doncor-api)
  ├── FastAPI principal
  ├── Rotas /api/*
  └── Chama → Railway RPA Worker

Railway RPA Worker (doncor-rpa)
  ├── Playwright + Chromium
  ├── Login em sites reais
  ├── Download de boletos
  └── Retorna resultado para backend
```

## Por que separar?

- Backend leve e estável
- RPA isolado e escalável
- Se RPA travar, backend continua operacional
- Cada serviço pode ter seus próprios resources

## Passo a Passo

### 1. Backend (já configurado)

No serviço `doncor-api` (o que já existe):

- **Root Directory**: `backend`
- **Start Command**: `sh -c 'python -m uvicorn rpa_service_example:app --host 0.0.0.0 --port ${PORT:-9000}'`
- **Healthcheck**: `/health`
- **Railway Variables** necessárias:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_SERVICE_KEY` (alternativa)

### 2. Novo Serviço RPA na Railway

#### Criar novo serviço:

1. Acesse seu projeto no Railway
2. Clique em **New Service** → **GitHub Repo**
3. Selecione repo: `RodrigoORodrigues/Doncor`
4. Configure:
   - **Service Name**: `doncor-rpa`
   - **Root Directory**: `backend`
   - **Start Command**: 
     ```
     sh -c 'python -m playwright install && python -m uvicorn rpa_service_example:app --host 0.0.0.0 --port ${PORT:-8000}'
     ```
   - **Port**: `8000`
   - **Healthcheck Path**: `/api/rpa/health`
   - **Healthcheck Timeout**: `120s`

#### Por que `python -m playwright install`?

O Playwright precisa baixar o Chromium (browser real). Este comando:
- Roda uma única vez no deploy
- Instala todas as dependências do navegador
- Depois a app fica pronta para usar

### 3. Configurar variável de ambiente no Backend

No serviço `doncor-api`, adicione:

- **RPA_SERVICE_URL**: `https://doncor-rpa.up.railway.app`

(Obtenha a URL no painel do Railway, aba Deployments → URL)

### 4. Testar saúde do RPA

```bash
curl https://doncor-rpa.up.railway.app/api/rpa/health
# Resposta esperada:
# {"status":"ok","service":"rpa"}
```

### 5. Configurar operadora no Painel Doncor

No painel Doncor, em **Configuração do Robô**, cadastre:

```json
{
  "ambienteExecucao": "servico_externo",
  "rpaServiceUrl": "https://doncor-rpa.up.railway.app/run-rpa",
  "timeoutSegundos": 120,
  "operadoras": [
    {
      "nome": "Operadora Teste",
      "url": "https://portal.operadora.com.br/login",
      "usuario": "seu_usuario_teste",
      "senha": "sua_senha_teste"
    }
  ],
  "supabaseUrl": "sua_url_supabase",
  "supabaseServiceRoleKey": "sua_chave_service_role",
  "supabaseBucketBoletos": "boletos"
}
```

### 6. Acionar RPA de teste

```bash
curl -X POST "https://doncor-api.up.railway.app/api/robo/trigger-real" \
  -H "Content-Type: application/json" \
  -H "X-User-Role: master" \
  -d '{
    "user_id": "admin",
    "unique_login_code": "teste-001",
    "apolice_id": "APOLICE-123",
    "operadora_nome": "Operadora Teste"
  }'
```

## Melhorias Futuras

### 1. Seletores personalizados por operadora

**Problema atual**: O RPA usa seletores genéricos que podem não funcionar em todos os sites.

**Solução futura**: 

```json
{
  "nome": "Operadora X",
  "url": "https://portal.operadorax.com.br",
  "usuario": "usuario",
  "senha": "senha",
  "selectors": {
    "usuario": "#login",
    "senha": "#senha", 
    "entrar": "button.btn-login",
    "boleto": "a[href*='segunda-via']"
  }
}
```

Código a adaptar em `rpa_service_example.py`:

```python
username_selector = op.get("selectors", {}).get("usuario", 'input[name="username"], input#username, input[type="email"]')
await page.fill(username_selector, username)
```

### 2. Upload de boletos para Supabase Storage

**Problema atual**: Boletos salvos em pasta temporária do servidor (vai ser deletado).

**Solução futura**:

```python
# Em _run_playwright_flow():
from supabase import create_client

supabase = create_client(payload.supabase["url"], payload.supabase["serviceRoleKey"])

for path in downloaded_files:
    with open(path, "rb") as f:
        file_data = f.read()
    
    bucket_name = payload.supabase.get("bucket", "boletos")
    file_path = f"{payload.apolice_id}/boleto_{uuid.uuid4()}.pdf"
    
    supabase.storage.from_(bucket_name).upload(file_path, file_data)
    # Gravar URL no banco de dados
```

### 3. Sistema de retry e fila

**Futuro**: Se RPA falhar, colocar em fila de retry com backoff exponencial.

## Segurança

⚠️ **Importante**: 

- **NÃO** armazene senhas em Supabase (ficam visíveis nos logs)
- Prefira armazenar credenciais em Railway Variables como `OPERADORA_USUARIO` e `OPERADORA_SENHA`
- Idealmente, use OAuth ou API key da operadora

Exemplo seguro:

```python
# Em vez de:
password = op.get("senha")  # ❌ Armazenado em texto claro

# Fazer:
password = os.getenv(f"OPERADORA_{op.get('nome').upper()}_SENHA")  # ✅ Vem de variável de ambiente
```

## Troubleshooting

### "Playwright não instalado no serviço RPA"

**Solução**: Verifique se o Start Command inclui `python -m playwright install`

### Timeout no health check

**Solução**: Aumentar timeout em Healthcheck Timeout para 180s no Railway

### "RPA Executado mas retornou arquivo vazio"

**Possibilidades**:
1. Seletores CSS errados para o site
2. Site requer autenticação de 2FA
3. Painel da operadora bloqueou a requisição

**Debug**: Adicionar screenshot em caso de erro:

```python
if not downloaded_files:
    await page.screenshot(path=f"debug_{payload.apolice_id}.png")
```

Depois baixar screenshot do Railway Storage para diagnosticar.

---

**Status**: ✅ Backend + RPA separados e prontos para testar
