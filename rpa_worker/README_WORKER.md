# Doncor RPA Worker Local

> Roda o Playwright **no seu PC**, usando a sua rede/VPN.  
> A AMIL vê o **seu IP**, não o IP do Railway.

---

## Arquitetura

```
Painel Doncor
    ↓  POST /api/robo/trigger-real
Railway API
    → cria job { status: "pending" } no MongoDB
    → retorna { job_id } imediatamente

Worker (seu PC)  ← este repositório
    → polling GET /api/worker/jobs/next  (a cada 5s)
    → executa Playwright localmente
    → AMIL vê SEU IP ✔
    → faz upload do PDF para Supabase
    → POST /api/worker/jobs/{job_id}/result
    → Railway grava resultado + boleto no histórico

Painel Doncor
    → GET /api/robo/jobs/{job_id}  → "completed" + URL do PDF
```

---

## Instalação (1 vez)

```bat
cd rpa_worker
install_worker.bat
```

O script irá:
1. Criar `.venv`
2. Instalar `requests`, `playwright`, `python-dotenv`
3. Baixar o Chromium
4. **Gerar um `WORKER_TOKEN` seguro**
5. Criar o `.env` com o token gerado

---

## Configuração

Abra `rpa_worker/.env` e preencha:

```env
RAILWAY_API_URL=https://SEU-APP.up.railway.app
WORKER_TOKEN=<token gerado pelo install_worker.bat>

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_BUCKET_BOLETOS=boletos
```

### Configurar o Railway

No painel do Railway → seu serviço → **Variables**, adicione:

| Variável | Valor |
|---|---|
| `WORKER_TOKEN` | (mesmo token do `.env` local) |

Depois faça **Redeploy** para aplicar.

---

## Rodar

```bat
cd rpa_worker
.venv\Scripts\activate
python worker.py
```

Você verá:
```
2026-06-22 10:45:00  INFO     Doncor RPA Worker Local — iniciando
2026-06-22 10:45:00  INFO     Railway API : https://SEU-APP.up.railway.app
2026-06-22 10:45:00  INFO     Playwright  : OK
2026-06-22 10:45:00  INFO     Worker pronto. Aguardando jobs... (Ctrl+C para parar)
```

Quando um job aparecer, o Chromium abrirá visível na tela para que você possa monitorar.

---

## Rodar em background (sem janela visível)

Edite `worker.py` e mude:

```python
headless=False,   # ← mude para True
```

Depois execute em uma janela PowerShell minimizada ou use o Agendador de Tarefas do Windows.

---

## Dúvidas frequentes

**O worker parou de receber jobs?**  
Verifique se o `WORKER_TOKEN` no `.env` local é igual ao `WORKER_TOKEN` no Railway.

**"Playwright não instalado"?**  
Rode: `python -m playwright install chromium`

**A AMIL ainda bloqueia?**  
Confirme que o Playwright está abrindo pela sua rede (não por VPN de datacenter).  
Se usar VPN corporativa, desative-a antes de rodar o worker.

**Como ver os boletos?**  
No painel Doncor → Robô → Histórico de boletos.

---

## Estrutura de arquivos

```
rpa_worker/
├── worker.py                 ← script principal
├── requirements_worker.txt   ← dependências mínimas
├── .env.example              ← template de configuração
├── .env                      ← sua configuração (não commitar!)
├── install_worker.bat        ← instalação com 1 clique
└── README_WORKER.md          ← este arquivo
```
