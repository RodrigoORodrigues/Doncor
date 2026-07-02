# Como Corrigir o Erro "No Output Directory named `build` found" na Vercel

O erro "No Output Directory named `build` found after the Build completed" significa que o processo de build da sua aplicação foi bem-sucedido, mas a Vercel não conseguiu encontrar a pasta onde os arquivos estáticos compilados foram gerados.

No seu projeto, que utiliza **CRACO** (uma ferramenta para configurar o Create React App), a pasta de saída padrão para o build é geralmente `build`.

Para resolver isso, você precisa configurar explicitamente o **Output Directory** nas configurações do seu projeto na Vercel.

## Passo a Passo para a Correção

1.  **Acesse o Painel do seu Projeto na Vercel**:
    Vá para o dashboard da Vercel e clique no projeto Doncor.

2.  **Vá para as Configurações (Settings)**:
    No menu superior do projeto, clique na aba **Settings**.

3.  **Acesse a seção "General"**:
    No menu lateral esquerdo, certifique-se de estar na seção **General**.

4.  **Altere o "Output Directory"**:
    *   Role a página para baixo até encontrar a seção **Build & Development Settings**.
    *   Localize o campo **Output Directory**.
    *   Clique no botão para ativar a personalização (Override), se necessário.
    *   Digite o valor: `build`
    *   Clique em **Save**.

5.  **Refaça o Deploy (Redeploy)**:
    *   Vá para a aba **Deployments** no menu superior.
    *   Encontre o deploy que falhou.
    *   Clique nos três pontinhos (`...`) ao lado direito desse deploy.
    *   Selecione **Redeploy**.
    *   Confirme a ação.

Após seguir esses passos, a Vercel saberá onde procurar os arquivos estáticos gerados pelo seu build e o deploy deverá ser concluído com sucesso.
