# Guia de Execução: Deploy do Supabase para o Sistema Doncor

Este guia detalha como executar o script `deploy_supabase.sql` para configurar o banco de dados do Supabase com as tabelas, funções e políticas de Row Level Security (RLS) necessárias para o sistema Doncor.

## Pré-requisitos

*   Uma conta Supabase ativa e um projeto criado.
*   Acesso ao painel do Supabase ou à Supabase CLI configurada.

## Opção 1: Execução via SQL Editor do Supabase (Recomendado para iniciantes)

Esta é a maneira mais simples de aplicar o esquema do banco de dados.

1.  **Acesse o Painel do Supabase**: Faça login no seu projeto Supabase.
2.  **Navegue até o SQL Editor**: No menu lateral esquerdo, clique em **SQL Editor** (o ícone de `< >`).
3.  **Crie um Novo Query**: Clique em **+ New query**.
4.  **Cole o Conteúdo do Script**: Abra o arquivo `deploy_supabase.sql` que foi gerado e copie todo o seu conteúdo.
5.  **Execute o Script**: Cole o conteúdo no editor de texto do Supabase e clique no botão **RUN**.

    *   **Verificação**: Após a execução, verifique a seção **Tables** em **Database** para confirmar que as tabelas `perfis`, `apolices` e `boletos` foram criadas. Verifique também as políticas de RLS em cada tabela.

## Opção 2: Execução via Supabase CLI (Para automação e ambientes de produção)

Para desenvolvedores que preferem a linha de comando ou para automação de CI/CD, a Supabase CLI é uma excelente opção.

### 1. Instale a Supabase CLI (se ainda não tiver)

```bash
brew install supabase/supabase/supabase # macOS
# ou
sudo snap install supabase --classic # Linux
# ou siga as instruções em: https://supabase.com/docs/guides/cli/getting-started
```

### 2. Faça Login na Supabase CLI

```bash
supabase login
```

Isso abrirá uma página no seu navegador para autenticação.

### 3. Link seu Projeto Local ao Projeto Supabase Remoto

Navegue até a raiz do seu projeto Doncor no terminal e linke-o ao seu projeto Supabase.

```bash
cd /caminho/para/seu/projeto/Doncor
supabase link --project-ref <YOUR_PROJECT_REF>
```

Substitua `<YOUR_PROJECT_REF>` pelo ID de referência do seu projeto Supabase, que pode ser encontrado na URL do seu painel Supabase (ex: `https://app.supabase.com/project/<YOUR_PROJECT_REF>/...`).

### 4. Execute o Script SQL

Você pode usar o comando `supabase sql` para executar o script diretamente.

```bash
supabase sql --file deploy_supabase.sql
```

Ou, se você quiser aplicar o script como uma migração (recomendado para controle de versão):

1.  **Crie uma nova migração**: Crie um novo arquivo de migração e copie o conteúdo do `deploy_supabase.sql` para ele.

    ```bash
supabase migration new init_doncor_schema
    ```

    Isso criará um arquivo em `supabase/migrations/<timestamp>_init_doncor_schema.sql`. Copie o conteúdo de `deploy_supabase.sql` para este novo arquivo.

2.  **Aplique as migrações**: Aplique as migrações ao seu banco de dados remoto.

    ```bash
supabase db push
    ```

    *   **Verificação**: Após a execução, verifique o painel do Supabase para confirmar que as tabelas e políticas de RLS foram aplicadas.

## Configuração do Superusuário "Donfim"

Lembre-se que a criação do superusuário "Donfim" e a atribuição da role `admin` devem ser feitas manualmente no painel do Supabase, conforme detalhado no `Passo2_Autenticacao_RBAC.md`.

1.  Acesse o painel do Supabase.
2.  Vá para a seção **Authentication** -> **Users**.
3.  Crie um novo usuário (ex: `donfim@example.com`).
4.  Copie o `ID` (UUID) deste usuário.
5.  Vá para a seção **Database** -> **Table Editor**.
6.  Selecione a tabela `public.perfis`.
7.  Encontre o perfil correspondente ao `ID` do usuário "Donfim" e edite a coluna `role` para `admin`.

Com este script e guia, você terá o ambiente do Supabase configurado e pronto para a integração com o frontend e o robô RPA. Em caso de dúvidas, consulte a documentação oficial do Supabase [^1].

## Referências

[^1]: [Supabase Documentation](https://supabase.com/docs)
