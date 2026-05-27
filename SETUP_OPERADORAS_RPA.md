# Configurar Operadoras para RPA Real

## Pré-requisitos

1. **Playwright instalado localmente**:
```bash
cd backend
pip install playwright>=1.40.0
playwright install chromium
```

2. **MongoDB configurado** com credenciais das operadoras

## Como Funciona o RPA

O Playwright automatiza a navegação em portais de operadoras:
1. Acessa a URL do portal
2. Faz login com as credenciais fornecidas
3. Navega até a seção de boletos
4. Baixa os PDFs
5. Salva os arquivos em `/tmp`

## Configurar Operadora

Você precisa adicionar operadoras no MongoDB com os seguintes dados:

```javascript
db.robo_config.updateOne(
  {},
  {
    $set: {
      "operadoras": [
        {
          "nome": "Operadora XYZ",
          "url": "https://portal.operadora.com.br/login",
          "usuario": "seu_usuario",
          "senha": "sua_senha",
          "loginWaitMs": 3000,
          "maxDownloads": 5,
          "downloadTimeoutMs": 30000,
          "selectors": {
            "usuario": "input[name='cpf']",           // Campo do CPF/usuário
            "senha": "input[name='senha']",          // Campo da senha
            "entrar": "button[type='submit']",       // Botão login
            "boleto": "a:has-text('Boleto')"        // Link/botão de boletos
          },
          "steps": [
            // Passos opcionais adicionais após login
            // {
            //   "action": "click",
            //   "selector": "a[href*='boletos']",
            //   "timeout": 5000
            // }
          ]
        }
      ]
    }
  },
  { upsert: true }
);
```

## Encontrar os Seletores Corretamente

1. Acesse o portal da operadora em um navegador
2. Abra DevTools (F12)
3. Procure pelos elementos:
   - **Campo de usuário**: clique, veja o input e copie o `name` ou `id`
   - **Campo de senha**: mesma coisa
   - **Botão de login**: clique, copie o seletor
   - **Link de boleto**: procure por "Boleto", "2ª via", "Segunda via"

### Exemplo de Seletores Comuns

```javascript
// Banco do Brasil
"usuario": "input#userId",
"senha": "input#password",
"entrar": "button#acessar",
"boleto": "a[href*='cobranca']"

// Caixa
"usuario": "input[placeholder='CPF/CNPJ']",
"senha": "input[type='password']",
"entrar": "button[class*='login']",
"boleto": "span:has-text('Boleto')"

// Genérico
"usuario": "input[type='email'], input[type='text']",
"senha": "input[type='password']",
"entrar": "button[type='submit']",
"boleto": "a, button"
```

## Testar Localmente

### 1. Iniciar o Serviço RPA

```bash
cd backend
SERVICE_TYPE=rpa python -m uvicorn rpa_service_example:app --host 0.0.0.0 --port 8001 --reload
```

Você verá logs detalhados:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO: Playwright instalado e disponível.
```

### 2. Iniciar a API Principal

```bash
# Em outro terminal
cd backend
SERVICE_TYPE=main python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Testar o Health Check

```bash
curl http://localhost:8001/health
# Resposta esperada:
# {"status":"ok","service":"rpa","playwright":"available"}
```

### 4. Acionar o RPA

```bash
curl -X POST http://localhost:8000/robo/trigger-real \
  -H "Content-Type: application/json" \
  -H "X-User-Role: admin" \
  -d '{
    "user_id": "user123",
    "unique_login_code": "ABC123",
    "apolice_id": "AP123456",
    "operadora_nome": "Operadora XYZ"
  }'
```

## Debug - Visualizar o Navegador

Para ver o que o Playwright está fazendo durante testes:

```python
# Em rpa_service_example.py, mude:
browser = await p.chromium.launch(headless=False)  # Abre janela do navegador
```

Você verá exatamente o que o bot está fazendo.

## Troubleshooting

### "Nenhum botão/link de boleto encontrado"
- ✓ Verifique o seletor `boleto` - pode estar inválido
- ✓ Pode haver JavaScript que modifica o DOM após login
- ✓ Use seletor mais genérico: `"a, button"`

### "Timeout ao preencher usuário"
- ✓ A página pode estar lenta para carregar
- ✓ Aumente `loginWaitMs` para 5000-10000
- ✓ Verifique se o seletor do usuário está correto

### "Login inválido"
- ✓ Confirme as credenciais no banco de dados
- ✓ Alguns portais bloqueiam múltiplas tentativas
- ✓ Alguns portais têm CAPTCHA (Playwright não consegue resolver)

### Download não funciona
- ✓ Verifique se há pop-up de confirmação (adicione um `step` para clicar)
- ✓ Alguns downloads podem estar em nova aba (setup de `context` precisa mudar)
- ✓ Limite de tempo baixo: aumentar `downloadTimeoutMs`

## Estrutura de Passos Avançados

Para casos mais complexos, use `steps` para automações adicionais:

```javascript
"steps": [
  {
    "action": "wait",
    "ms": 2000
  },
  {
    "action": "click",
    "selector": "a[href='/boletos']",
    "timeout": 10000
  },
  {
    "action": "wait_for_selector",
    "selector": ".boleto-list",
    "timeout": 15000
  },
  {
    "action": "fill",
    "selector": "input[name='mes']",
    "value": "202505"
  },
  {
    "action": "click",
    "selector": "button[class*='filtrar']"
  }
]
```

## Monitorar em Produção

Os logs mostram cada etapa:
```
INFO: Iniciando fluxo RPA para operadora: Operadora XYZ
INFO: Portal carregado: https://portal.operadora.com.br/login
INFO: Usuário preenchido
INFO: Senha preenchida
INFO: Botão de login clicado
INFO: Login concluído, aguardando carregamento
INFO: Encontrados 5 boleto(s)
INFO: Boleto 1 baixado: /tmp/boleto_AP123456_0_xyz.pdf
INFO: RPA concluído: 5 arquivo(s) baixado(s)
```

Monitore esses logs para garantir que está funcionando corretamente.
