# Como Corrigir o Erro "ENOENT package.json" na Vercel

O erro `ENOENT: no such file or directory, open '/vercel/path0/package.json'` ocorre porque a Vercel, por padrão, procura o arquivo `package.json` na raiz do seu repositório.

No projeto **Doncor**, o código do frontend (e o `package.json` correspondente) está dentro da pasta `frontend/`.

Para corrigir isso, você precisa dizer à Vercel para usar a pasta `frontend` como o diretório principal (Root Directory) do projeto.

## Passo a Passo para a Correção

1.  **Acesse o Painel do seu Projeto na Vercel**:
    Vá para o dashboard da Vercel e clique no projeto Doncor que você acabou de criar.

2.  **Vá para as Configurações (Settings)**:
    No menu superior do projeto, clique na aba **Settings**.

3.  **Acesse a seção "General"**:
    No menu lateral esquerdo, certifique-se de estar na seção **General**.

4.  **Altere o "Root Directory"**:
    *   Role a página para baixo até encontrar a seção **Root Directory**.
    *   Clique no botão **Edit**.
    *   No campo de texto, digite: `frontend`
    *   Clique em **Save**.

5.  **Refaça o Deploy (Redeploy)**:
    *   Vá para a aba **Deployments** no menu superior.
    *   Encontre o deploy que falhou (estará marcado em vermelho).
    *   Clique nos três pontinhos (`...`) ao lado direito desse deploy.
    *   Selecione **Redeploy**.
    *   Confirme a ação.

A Vercel agora iniciará um novo processo de build, mas desta vez ela entrará na pasta `frontend/` antes de executar o `npm install`, encontrando o `package.json` corretamente e resolvendo o erro.
