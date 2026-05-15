# Guia de Configuração e Deploy do Sistema Doncor na Vercel

Este guia detalha os passos para configurar e realizar o deploy do frontend do sistema **Doncor** na plataforma Vercel, garantindo que as variáveis de ambiente do Supabase sejam configuradas corretamente para o ambiente de produção.

## 1. Pré-requisitos

*   Uma conta Vercel ativa.
*   O repositório GitHub do projeto Doncor (`RodrigoORodrigues/Doncor`) conectado à sua conta Vercel.
*   As chaves `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` do seu projeto Supabase.

## 2. Deploy do Frontend na Vercel

### 2.1. Importar o Projeto

1.  Acesse o [Vercel Dashboard](https://vercel.com/dashboard).
2.  Clique em **Add New...** e selecione **Project**.
3.  Escolha o repositório **`RodrigoORodrigues/Doncor`** da sua lista de repositórios GitHub conectados.
4.  Clique em **Import**.

### 2.2. Configurações de Build e Root Directory

Como o frontend do projeto Doncor está localizado em um subdiretório (`frontend/`), você precisará ajustar a configuração do **Root Directory**.

1.  Na tela de configuração do projeto, localize a seção **Root Directory**.
2.  Clique em **Edit** e defina o valor como **`frontend`**.
3.  A Vercel geralmente detecta automaticamente o framework (React, Next.js, etc.) e as configurações de build. Verifique se as seguintes configurações estão corretas:
    *   **Framework Preset**: `Create React App` (ou `Next.js` se você estiver usando Next.js dentro do subdiretório `frontend`).
    *   **Build Command**: `npm run build` ou `yarn build` (dependendo do gerenciador de pacotes que você usa).
    *   **Output Directory**: `build` (ou `dist`, dependendo da configuração do seu projeto React).

## 3. Configurando Variáveis de Ambiente (Supabase Keys)

As variáveis de ambiente são cruciais para conectar seu frontend ao Supabase de forma segura. Elas **NÃO** devem ser expostas no código-fonte público.

1.  Na mesma tela de configuração do projeto na Vercel, localize a seção **Environment Variables**.
2.  Adicione as seguintes variáveis:
    *   **Name**: `NEXT_PUBLIC_SUPABASE_URL`
        *   **Value**: `https://qomfybmjrwowavvjyfgc.supabase.co` (o URL do seu projeto Supabase)
    *   **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
        *   **Value**: `sb_publishable_CB5hMGI_c3199c617C1g3g_uBoaXI5Z` (sua chave `anon` ou `publishable` do Supabase)

    *   **Nota**: Se o seu projeto React não for Next.js e usar `REACT_APP_` como prefixo para variáveis de ambiente, use `REACT_APP_SUPABASE_URL` e `REACT_APP_SUPABASE_ANON_KEY` como nomes das variáveis na Vercel.

3.  Certifique-se de que essas variáveis estejam configuradas para os ambientes **Production**, **Preview** e **Development** (se aplicável).

## 4. Deploy Inicial

Após configurar o Root Directory e as Environment Variables, clique em **Deploy**.

A Vercel irá clonar seu repositório, instalar as dependências, executar o comando de build e fazer o deploy da sua aplicação. Você poderá acompanhar o progresso no log de deploy.

## 5. Configuração do Backend/RPA (Considerações Adicionais)

É importante notar que a Vercel é primariamente para o deploy de frontends (ou backends serverless leves). O robô RPA em Python e um possível backend FastAPI (conforme discutido no Passo 3 da documentação) **NÃO** serão implantados automaticamente pela Vercel com esta configuração de frontend.

*   **Supabase Edge Functions**: Se você optar por usar Supabase Edge Functions para acionar o RPA, elas devem ser implantadas diretamente no Supabase. As variáveis de ambiente para as Edge Functions (incluindo `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e as credenciais da operadora) serão configuradas no painel do Supabase para as funções específicas.
*   **Backend Dedicado (FastAPI)**: Se você tiver um backend FastAPI separado, ele precisará ser implantado em um serviço de hospedagem que suporte Python (ex: Heroku, AWS EC2, Google Cloud Run, Railway, etc.). As variáveis de ambiente para este backend (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, credenciais da operadora) serão configuradas no ambiente de hospedagem desse backend.

**Atenção**: A `SUPABASE_SERVICE_ROLE_KEY` é uma chave altamente privilegiada e **NUNCA** deve ser exposta no frontend ou em ambientes de build públicos. Ela deve ser usada apenas em ambientes de backend seguros (servidores, funções serverless) onde o acesso é restrito.

## 6. Verificação Pós-Deploy

Após o deploy ser concluído com sucesso:

1.  Acesse o URL fornecido pela Vercel para sua aplicação.
2.  Teste as funcionalidades de login e registro para garantir que a integração com o Supabase está funcionando.
3.  Verifique o console do navegador para quaisquer erros relacionados ao Supabase ou variáveis de ambiente.

## 7. Referências

*   [Vercel Documentation](https://vercel.com/docs)
*   [Supabase Documentation](https://supabase.com/docs)
