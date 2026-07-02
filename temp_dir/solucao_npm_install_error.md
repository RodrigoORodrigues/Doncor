# Como Corrigir o Erro "npm install exited with 1" na Vercel

O erro `npm install exited with 1` no seu projeto ocorre devido a uma incompatibilidade entre as versões das dependências instaladas (especialmente o React 19) e o comando de instalação padrão da Vercel.

O React 19 é muito recente e alguns pacotes no seu `package.json` ainda podem ter restrições que causam conflitos de "peer dependencies" durante uma instalação limpa.

## Soluções Recomendadas

Você pode resolver isso de duas maneiras no painel da Vercel:

### Opção 1: Usar a flag `--legacy-peer-deps` (Mais Simples)

Esta opção diz ao npm para ignorar conflitos de versão de dependências de pares, o que geralmente resolve o problema em projetos com React 19.

1. Acesse o **Dashboard da Vercel** e selecione seu projeto.

1. Vá em **Settings** > **General**.

1. Localize a seção **Build & Development Settings**.

1. No campo **Install Command**, clique no botão para ativar a personalização (Override).

1. Digite o seguinte comando:

   ```bash
   npm install --legacy-peer-deps
   ```

1. Clique em **Save** e faça um novo **Redeploy**.

---

### Opção 2: Usar o Yarn (Recomendado)

Notei que o seu `package.json` especifica o `packageManager` como `yarn`. O Yarn costuma ser mais resiliente a esses conflitos.

1. Acesse o **Dashboard da Vercel** e selecione seu projeto.

1. Vá em **Settings** > **General**.

1. Localize a seção **Build & Development Settings**.

1. No campo **Install Command**, clique em **Override**.

1. Digite:

   ```bash
   yarn install
   ```

1. Clique em **Save**.

1. No campo **Build Command**, clique em **Override** e digite:

   ```bash
   yarn build
   ```

1. Clique em **Save** e faça um novo **Redeploy**.

---

### Dica Adicional: Erro de ESLint (Se o build falhar após o install)

Se a instalação passar, mas o **Build** falhar por causa de erros de linting (avisos do ESLint que a Vercel trata como erros), você pode desativar isso temporariamente para conseguir o deploy:

1. Em **Settings** > **Environment Variables**.

1. Adicione uma nova variável:
  - **Name**: `ESLINT_NO_DEV_ERRORS`
  - **Value**: `true`

1. Adicione outra variável:
  - **Name**: `DISABLE_ESLINT_PLUGIN`
  - **Value**: `true`

1. Salve e tente o deploy novamente.

Esses ajustes devem permitir que a Vercel instale as dependências e compile seu projeto com sucesso.

