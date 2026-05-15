# Passo 3: Arquitetura do Robô RPA Headless

Neste passo, detalharemos a arquitetura e forneceremos o código base para o robô RPA (Automação de Processos Robóticos) headless. Este robô, desenvolvido em Python com a biblioteca Playwright, será responsável por interagir com portais de operadoras de saúde/seguros, extrair boletos e integrá-los ao sistema Doncor de forma segura e automatizada.

## 3.1. Estrutura do Script RPA em Python (com Playwright)

O robô será executado em modo headless, ou seja, sem interface gráfica, em um ambiente de servidor. Ele receberá parâmetros necessários para o login e identificação do segurado, garantindo que as credenciais sensíveis não sejam expostas no frontend.

### Pré-requisitos

Para executar o script, você precisará instalar o Python e as bibliotecas `playwright` e `supabase-py`.

```bash
pip install playwright supabase-py
playwright install
```

### Código Base do Robô RPA

```python
# rpa_boleto_extractor.py
import asyncio
import os
import logging
from playwright.async_api import async_playwright, Playwright
from supabase import create_client, Client

# Configuração de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Variáveis de Ambiente para Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Usar service_role_key para acesso privilegiado no backend

# Variáveis de Ambiente para o portal da operadora (exemplo)
OPERADORA_URL = os.environ.get("OPERADORA_URL")
OPERADORA_USERNAME = os.environ.get("OPERADORA_USERNAME")
OPERADORA_PASSWORD = os.environ.get("OPERADORA_PASSWORD")

# Inicializa o cliente Supabase
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"Erro ao inicializar cliente Supabase: {e}")
    exit(1)

async def extract_and_upload_boleto(user_id: str, unique_login_code: str, apolice_id: str):
    """
    Função principal do robô RPA para extrair boletos e fazer upload para o Supabase.
    Args:
        user_id (str): ID do usuário no Supabase para associar o boleto.
        unique_login_code (str): Código único do segurado para match.
        apolice_id (str): ID da apólice para associar o boleto.
    """
    logging.info(f"Iniciando extração de boleto para user_id: {user_id}, apolice_id: {apolice_id}")

    if not all([OPERADORA_URL, OPERADORA_USERNAME, OPERADORA_PASSWORD]):
        logging.error("Variáveis de ambiente da operadora não configuradas. Abortando RPA.")
        return False

    async with async_playwright() as p:
        browser = None
        try:
            browser = await p.chromium.launch(headless=True) # Execução headless
            page = await browser.new_page()

            # 1. Fazer login no portal da operadora
            logging.info(f"Navegando para {OPERADORA_URL}...")
            await page.goto(OPERADORA_URL)

            # Exemplo de preenchimento de formulário de login (ajustar seletores)
            await page.fill("input#username", OPERADORA_USERNAME)
            await page.fill("input#password", OPERADORA_PASSWORD)
            await page.click("button#loginButton")
            await page.wait_for_load_state("networkidle")
            logging.info("Login tentado.")

            # Verificar se o login foi bem-sucedido (exemplo: verificar URL ou elemento)
            if "dashboard" not in page.url:
                logging.error("Falha no login do portal da operadora. Verifique as credenciais.")
                return False

            # 2. Navegar até a seção de extratos/boletos
            logging.info("Navegando para a seção de extratos...")
            # Exemplo: clicar em um link ou navegar diretamente
            await page.goto(f"{OPERADORA_URL}/extratos") # Ajustar URL
            await page.wait_for_load_state("networkidle")

            # 3. Extrair e baixar os boletos de pagamento
            # Esta parte é altamente dependente da estrutura HTML do portal da operadora.
            # Será necessário inspecionar o site para identificar os seletores corretos.
            logging.info("Buscando boletos...")

            # Exemplo: Encontrar links de download de boletos e baixar
            # Supondo que cada boleto tenha um link ou botão de download
            boleto_links = await page.locator("a.download-boleto").all()
            if not boleto_links:
                logging.warning("Nenhum link de boleto encontrado.")
                return False

            downloaded_files = []
            for link in boleto_links:
                # Exemplo: Filtrar boletos pelo unique_login_code ou data de vencimento
                # Isso exigirá lógica para ler o texto próximo ao link ou atributos do link
                # Para este exemplo, vamos baixar o primeiro que encontrar.
                async with page.expect_download() as download_info:
                    await link.click()
                download = await download_info.value
                file_path = f"/tmp/{download.suggested_filename}"
                await download.save_as(file_path)
                downloaded_files.append(file_path)
                logging.info(f"Boleto baixado: {file_path}")
                break # Baixa apenas o primeiro para o exemplo

            if not downloaded_files:
                logging.warning("Nenhum boleto relevante foi baixado.")
                return False

            # 4. Fazer o match do boleto com o cadastro do segurado (já feito via unique_login_code)
            # O `unique_login_code` é usado para identificar qual segurado corresponde ao boleto.
            # No contexto do RPA, o `unique_login_code` pode ser um parâmetro de busca no portal
            # ou um identificador presente no nome do arquivo do boleto ou em seu conteúdo.
            # Para este exemplo, assumimos que o `user_id` e `apolice_id` já foram fornecidos
            # e o boleto baixado será associado a eles.

            # 5. Salvar o documento no perfil do usuário no Supabase Storage e DB
            uploaded_urls = []
            for local_file_path in downloaded_files:
                try:
                    with open(local_file_path, "rb") as f:
                        file_content = f.read()

                    # Upload para o Supabase Storage
                    bucket_name = "boletos"
                    file_name = f"{user_id}/{os.path.basename(local_file_path)}"
                    response = supabase.storage.from_(bucket_name).upload(file_name, file_content, {"content-type": "application/pdf"})

                    if response.status_code == 200 or response.status_code == 201:
                        public_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
                        uploaded_urls.append(public_url)
                        logging.info(f"Boleto {os.path.basename(local_file_path)} enviado para Supabase Storage: {public_url}")

                        # Atualizar o banco de dados com a URL do boleto
                        # Assumindo que o boleto tem um número que pode ser extraído do nome do arquivo ou do próprio PDF
                        boleto_numero = os.path.basename(local_file_path).replace(".pdf", "") # Exemplo simples
                        
                        # Buscar informações da apólice para preencher os campos do boleto
                        apolice_data = supabase.from("apolices").select("seguradora, vigencia").eq("id", apolice_id).single().execute()
                        if apolice_data.data:
                            seguradora = apolice_data.data["seguradora"]
                            competencia = apolice_data.data["vigencia"] # Usar vigencia como competencia para o exemplo
                        else:
                            seguradora = "Desconhecida"
                            competencia = "2023-01-01" # Valor padrão

                        # Inserir registro na tabela 'boletos'
                        insert_data = {
                            "numero": boleto_numero,
                            "apolice_id": apolice_id,
                            "seguradora": seguradora,
                            "competencia": competencia,
                            "vencimento": "2023-12-31", # Placeholder, deve ser extraído do boleto
                            "valor": 0.00, # Placeholder, deve ser extraído do boleto
                            "url_boleto": public_url,
                            "user_id": user_id
                        }
                        response_db = supabase.from("boletos").insert([insert_data]).execute()
                        if response_db.data:
                            logging.info(f"Registro de boleto inserido no DB para {boleto_numero}.")
                        else:
                            logging.error(f"Erro ao inserir registro de boleto no DB: {response_db.error}")

                    else:
                        logging.error(f"Erro ao fazer upload do boleto {os.path.basename(local_file_path)}: {response.json()}")
                except Exception as e:
                    logging.error(f"Erro ao processar arquivo {local_file_path}: {e}")
                finally:
                    if os.path.exists(local_file_path):
                        os.remove(local_file_path) # Limpa o arquivo local

            return True if uploaded_urls else False

        except Exception as e:
            logging.error(f"Erro durante a execução do RPA: {e}")
            return False
        finally:
            if browser:
                await browser.close()

# Exemplo de como o robô seria acionado (em um ambiente de execução)
# if __name__ == "__main__":
#     # Estes valores viriam do backend/API
#     test_user_id = "<UUID_DO_USUARIO_TESTE>"
#     test_unique_login_code = "CODIGO123"
#     test_apolice_id = "<UUID_DA_APOLICE_TESTE>"
#     asyncio.run(extract_and_upload_boleto(test_user_id, test_unique_login_code, test_apolice_id))
```

## 3.2. Acionamento Seguro do Robô pelo Painel React

Para acionar o robô de forma segura a partir do Painel React, é crucial que as credenciais do portal da operadora e a `SUPABASE_SERVICE_ROLE_KEY` não sejam expostas no frontend. A abordagem recomendada é criar um endpoint de API no backend que o frontend possa chamar. Este endpoint, por sua vez, invocará o script RPA.

### Opção 1: Supabase Edge Functions (Recomendado)

As Edge Functions do Supabase são ideais para isso, pois são funções serverless que podem ser acionadas via HTTP e têm acesso seguro às variáveis de ambiente do Supabase. Elas podem ser escritas em TypeScript/JavaScript e podem chamar o script Python RPA (se o ambiente permitir a execução de processos externos ou se o RPA for refatorado para JS).

**Fluxo:**

1.  O Painel React (Admin) faz uma requisição autenticada para uma Edge Function do Supabase (ex: `/api/trigger-rpa`).
2.  A Edge Function verifica a autorização do usuário (se é `admin`).
3.  A Edge Function coleta os parâmetros necessários (user_id, unique_login_code, apolice_id) do corpo da requisição.
4.  A Edge Function invoca o script Python RPA. Isso pode ser feito de algumas maneiras:
    *   **Chamada HTTP para um serviço externo**: Se o robô Python estiver hospedado como um serviço separado (ex: em um servidor dedicado ou outra plataforma serverless como AWS Lambda/Google Cloud Functions), a Edge Function faria uma requisição HTTP para este serviço. Esta é a abordagem mais desacoplada e escalável.
    *   **Execução direta (se possível)**: Em alguns ambientes serverless, é possível executar processos externos. No entanto, Edge Functions do Supabase são baseadas em Deno e JavaScript, então a execução direta de Python pode ser complexa ou inviável. Uma alternativa seria reescrever o RPA em JavaScript/TypeScript usando Playwright para Deno.

**Exemplo de Edge Function (TypeScript - Chamando um serviço externo):**

```typescript
// supabase/functions/trigger-rpa/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  // Verificar autenticação e role do usuário
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("perfis")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403 });
  }

  try {
    const { user_id, unique_login_code, apolice_id } = await req.json();

    // Chamar o serviço RPA externo (ex: um endpoint onde o script Python está rodando)
    const rpaServiceUrl = Deno.env.get("RPA_SERVICE_URL");
    if (!rpaServiceUrl) {
      return new Response(JSON.stringify({ error: "RPA Service URL not configured" }), { status: 500 });
    }

    const rpaResponse = await fetch(rpaServiceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, unique_login_code, apolice_id }),
    });

    if (!rpaResponse.ok) {
      const errorText = await rpaResponse.text();
      throw new Error(`RPA Service error: ${rpaResponse.status} - ${errorText}`);
    }

    const rpaResult = await rpaResponse.json();
    return new Response(JSON.stringify({ message: "RPA triggered successfully", result: rpaResult }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

### Opção 2: Backend Dedicado (FastAPI/Python)

Se a complexidade do RPA ou a necessidade de um ambiente Python específico for alta, um backend dedicado (por exemplo, com FastAPI) pode ser mais adequado. Este backend seria responsável por expor um endpoint que o frontend consumiria e que, por sua vez, executaria o script RPA.

**Fluxo:**

1.  O Painel React (Admin) faz uma requisição autenticada para o backend FastAPI (ex: `/api/v1/trigger-rpa`).
2.  O backend FastAPI verifica a autorização do usuário (usando o token JWT do Supabase ou outro mecanismo).
3.  O backend coleta os parâmetros necessários (user_id, unique_login_code, apolice_id).
4.  O backend invoca o script Python RPA como um processo separado ou diretamente como uma função Python.
5.  O backend retorna o status da operação para o frontend.

**Exemplo de Endpoint FastAPI (Python):**

```python
# backend/server.py (Exemplo de adição de endpoint)
from fastapi import FastAPI, HTTPException, Depends, Header
from supabase import create_client, Client
import os
import asyncio
import logging

# Importar a função do robô RPA
from rpa_boleto_extractor import extract_and_upload_boleto # Assumindo que o arquivo está no mesmo diretório ou acessível

app = FastAPI()

# Configuração de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Variáveis de Ambiente para Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Usar service_role_key para acesso privilegiado

# Inicializa o cliente Supabase
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logging.error(f"Erro ao inicializar cliente Supabase no FastAPI: {e}")
    # Em um ambiente real, você pode querer parar a aplicação ou ter um fallback

# Dependência para verificar se o usuário é admin
async def verify_admin_role(authorization: str = Header(...)):
    try:
        # O token JWT do Supabase vem no cabeçalho Authorization: Bearer <token>
        token = authorization.split(" ")[1]
        
        # Verificar o token com o Supabase Auth
        # Nota: A verificação de JWT em um backend pode ser mais complexa e envolver a validação da assinatura.
        # Para simplificar, vamos tentar obter o usuário e seu perfil.
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        if not user:
            raise HTTPException(status_code=401, detail="Não autorizado")

        profile_response = supabase.from("perfis").select("role").eq("id", user.id).single().execute()
        profile = profile_response.data

        if not profile or profile["role"] != "admin":
            raise HTTPException(status_code=403, detail="Acesso negado: Requer papel de administrador")
        return user
    except Exception as e:
        logging.error(f"Erro na verificação de admin: {e}")
        raise HTTPException(status_code=401, detail=f"Não autorizado: {e}")

@app.post("/api/v1/trigger-rpa")
async def trigger_rpa(payload: dict, current_user: dict = Depends(verify_admin_role)):
    """
    Endpoint para acionar o robô RPA de extração de boletos.
    Requer autenticação de administrador.
    """
    try:
        user_id = payload.get("user_id")
        unique_login_code = payload.get("unique_login_code")
        apolice_id = payload.get("apolice_id")

        if not all([user_id, unique_login_code, apolice_id]):
            raise HTTPException(status_code=400, detail="Parâmetros user_id, unique_login_code e apolice_id são obrigatórios.")

        logging.info(f"Acionando RPA para user_id: {user_id}, apolice_id: {apolice_id}")
        
        # Executar o robô RPA em um processo separado ou diretamente
        # Para execução assíncrona e não bloqueante, use asyncio.create_task
        success = await extract_and_upload_boleto(user_id, unique_login_code, apolice_id)

        if success:
            return {"message": "RPA acionado com sucesso e boletos processados.", "status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Falha na execução do RPA.")

    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Erro inesperado ao acionar RPA: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {e}")

# Para rodar o FastAPI localmente:
# uvicorn server:app --reload
```

### Acionamento do Frontend (React)

No Painel Administrativo do React, um botão ou ação pode disparar a chamada para o endpoint do backend/Edge Function.

```javascript
// src/pages/AdminPanel.jsx (Exemplo de acionamento do RPA)
import React from 'react';
import { supabase } from '../supabaseClient';
// ... (outros imports e código do AdminPanel)

const handleTriggerRPA = async (userId, uniqueLoginCode, apoliceId) => {
  try {
    // Obter a sessão atual para pegar o token de autenticação
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("Usuário não autenticado.");
    }

    // URL do seu endpoint (Edge Function ou FastAPI)
    const rpaEndpoint = process.env.REACT_APP_RPA_TRIGGER_URL || "/api/v1/trigger-rpa";

    const response = await fetch(rpaEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}` // Enviar o token JWT para autenticação no backend
      },
      body: JSON.stringify({
        user_id: userId,
        unique_login_code: uniqueLoginCode,
        apolice_id: apoliceId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.error || 'Erro ao acionar o RPA');
    }

    const result = await response.json();
    alert(result.message);
  } catch (error) {
    console.error('Erro ao acionar RPA:', error.message);
    alert('Erro ao acionar RPA: ' + error.message);
  }
};

// ... dentro do componente AdminPanel, onde você renderiza a lista de usuários/apólices
// <button onClick={() => handleTriggerRPA(profile.id, profile.codigo_login_unico, apolice.id)}>Acionar RPA</button>
```

## 3.3. Considerações de Segurança e Robustez

-   **Credenciais**: Nunca armazene credenciais de portais de operadoras diretamente no código. Use variáveis de ambiente seguras no servidor onde o RPA será executado.
-   **Supabase Service Role Key**: A `SUPABASE_SERVICE_ROLE_KEY` deve ser usada APENAS no backend (Edge Function ou FastAPI) e nunca exposta no frontend, pois ela concede acesso total ao seu banco de dados Supabase.
-   **Tratamento de Erros**: O script RPA deve ter tratamento de erros robusto para lidar com falhas de login, mudanças na estrutura do site da operadora, falhas de download, etc.
-   **Logs**: Implemente um sistema de logging detalhado para monitorar a execução do robô e diagnosticar problemas.
-   **Idempotência**: O processo de upload e registro de boletos deve ser idempotente, ou seja, a execução repetida não deve causar duplicação de dados (ex: verificar se o boleto já existe antes de inserir).
-   **Agendamento**: Para automações recorrentes, considere agendar a execução do robô (ex: via cron jobs no servidor, ou recursos de agendamento do Supabase/plataforma serverless).
-   **Notificações**: Implemente notificações (e-mail, Slack) para administradores em caso de falhas críticas do RPA.
-   **Variáveis de Ambiente**: No ambiente de execução do robô (servidor, Edge Function, etc.), configure as variáveis de ambiente necessárias (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPERADORA_URL`, `OPERADORA_USERNAME`, `OPERADORA_PASSWORD`).

## Próximos Passos

Com a arquitetura do robô RPA definida e a explicação de como ele será acionado de forma segura, todos os passos críticos foram abordados. O próximo passo será consolidar toda a documentação e entregá-la ao usuário.
