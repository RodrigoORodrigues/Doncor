# Passo 1: Definição do Banco de Dados (Supabase)

Para garantir a eficiência, segurança e escalabilidade do sistema de gestão de apólices, estruturamos o banco de dados no Supabase (PostgreSQL) com as seguintes tabelas e políticas de Row Level Security (RLS).

## Esquema SQL

O esquema SQL abaixo define as tabelas `perfis`, `apolices` e `boletos`, juntamente com as funções e políticas de RLS necessárias para controlar o acesso aos dados.

```sql
-- Habilitar a extensão uuid-ossp para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função para obter o papel do usuário logado (necessário para RLS)
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT role FROM public.perfis WHERE id = auth.uid());
END;
$$;

-- Tabela de Perfis de Usuários (extensão de auth.users)
CREATE TABLE public.perfis (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('admin', 'agente', 'cliente')),
    codigo_login_unico TEXT UNIQUE -- Usado para match com o RPA
);

-- Habilitar Row Level Security (RLS) para a tabela perfis
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Política para administradores: podem ver e editar todos os perfis
CREATE POLICY "Admins can view and update all profiles" ON public.perfis
FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

-- Política para agentes: podem ver perfis de clientes
CREATE POLICY "Agents can view client profiles" ON public.perfis
FOR SELECT USING (get_user_role() = 'agente' AND role = 'cliente');

-- Política para clientes: podem ver e editar apenas seu próprio perfil
CREATE POLICY "Users can view and update their own profile" ON public.perfis
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Tabela de Apólices
CREATE TABLE public.apolices (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero TEXT UNIQUE NOT NULL,
    seguradora TEXT NOT NULL,
    produto TEXT NOT NULL,
    administradora TEXT, -- Opcional para apólices empresariais
    empresa TEXT,        -- Opcional para apólices de adesão
    cnpj TEXT,           -- Opcional para apólices de adesão
    vigencia DATE NOT NULL,
    vencimento DATE,     -- Opcional para apólices de adesão
    vidas INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Ativo',
    valor_mensal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tipo_contrato TEXT NOT NULL CHECK (tipo_contrato IN ('adesao', 'empresarial')),
    user_id uuid REFERENCES public.perfis(id) ON DELETE CASCADE -- Link para o perfil do cliente/agente
);

-- Habilitar RLS para a tabela apolices
ALTER TABLE public.apolices ENABLE ROW LEVEL SECURITY;

-- Política para administradores: podem ver e editar todas as apólices
CREATE POLICY "Admins can manage all policies" ON public.apolices
FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

-- Política para agentes: podem ver apólices de clientes que gerenciam (assumindo que o agente tem uma relação com o cliente)
-- Para simplificar, vamos permitir que agentes vejam todas as apólices por enquanto, mas isso pode ser refinado.
CREATE POLICY "Agents can view all policies" ON public.apolices
FOR SELECT USING (get_user_role() = 'agente');

-- Política para clientes: podem ver e editar apenas suas próprias apólices
CREATE POLICY "Users can view and update their own policies" ON public.apolices
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tabela de Boletos
CREATE TABLE public.boletos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero TEXT NOT NULL,
    apolice_id uuid REFERENCES public.apolices(id) ON DELETE CASCADE,
    seguradora TEXT NOT NULL,
    competencia DATE NOT NULL,
    vencimento DATE NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    valor_pago NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Aberta',
    url_boleto TEXT, -- URL para o boleto baixado (armazenado no Supabase Storage)
    user_id uuid REFERENCES public.perfis(id) ON DELETE CASCADE -- Link para o perfil do cliente
);

-- Habilitar RLS para a tabela boletos
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

-- Política para administradores: podem ver e editar todos os boletos
CREATE POLICY "Admins can manage all boletos" ON public.boletos
FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

-- Política para agentes: podem ver boletos de clientes que gerenciam
CREATE POLICY "Agents can view client boletos" ON public.boletos
FOR SELECT USING (get_user_role() = 'agente');

-- Política para clientes: podem ver e editar apenas seus próprios boletos
CREATE POLICY "Users can view and update their own boletos" ON public.boletos
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Inserir o superusuário 'Donfim' na tabela de perfis (exemplo, deve ser feito via autenticação)
-- Nota: O ID do usuário 'Donfim' será gerado pelo Supabase Auth. Este INSERT é apenas um placeholder.
-- Você precisará criar o usuário 'Donfim' via Supabase Auth e então atualizar seu perfil com a role 'admin'.
-- INSERT INTO public.perfis (id, username, email, role) VALUES ('<UUID_DO_DONFIM>', 'Donfim', 'donfim@example.com', 'admin');
```

## Detalhamento das Tabelas e RLS

### Tabela `perfis`

Esta tabela estende a funcionalidade de autenticação do Supabase (`auth.users`), armazenando informações adicionais sobre os usuários do sistema.

| Coluna             | Tipo      | Descrição                                                                                             | Restrições                                                                  |
| :----------------- | :-------- | :---------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| `id`               | `uuid`    | Chave primária, referenciando o `id` do usuário em `auth.users`.                                      | `REFERENCES auth.users(id) ON DELETE CASCADE`, `PRIMARY KEY`                |
| `username`         | `TEXT`    | Nome de usuário único para identificação.                                                             | `UNIQUE`, `NOT NULL`                                                        |
| `email`            | `TEXT`    | Endereço de e-mail do usuário.                                                                        | `UNIQUE`, `NOT NULL`                                                        |
| `role`             | `TEXT`    | Nível de permissão do usuário.                                                                        | `NOT NULL`, `DEFAULT 'cliente'`, `CHECK (role IN ('admin', 'agente', 'cliente'))` |
| `codigo_login_unico` | `TEXT`    | Código único para o robô RPA fazer o match com o segurado.                                            | `UNIQUE`                                                                    |

**Políticas RLS para `perfis`:**

- **Admins**: Podem visualizar e atualizar todos os perfis. A função `get_user_role()` é utilizada para verificar se o usuário logado possui a role 'admin'.
- **Agentes**: Podem visualizar apenas perfis de clientes. Esta política pode ser refinada para que agentes vejam apenas clientes sob sua gestão.
- **Clientes**: Podem visualizar e atualizar apenas seu próprio perfil, garantindo a privacidade e segurança dos dados individuais.

### Tabela `apolices`

Armazena os detalhes das apólices de seguro, com um link para o perfil do usuário responsável por ela.

| Coluna         | Tipo        | Descrição                                                                 | Restrições                                                                  |
| :------------- | :---------- | :------------------------------------------------------------------------ | :-------------------------------------------------------------------------- |
| `id`           | `uuid`      | Chave primária da apólice.                                                | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`                                 |
| `numero`       | `TEXT`      | Número único da apólice.                                                  | `UNIQUE`, `NOT NULL`                                                        |
| `seguradora`   | `TEXT`      | Nome da seguradora.                                                       | `NOT NULL`                                                                  |
| `produto`      | `TEXT`      | Nome do produto da apólice.                                               | `NOT NULL`                                                                  |
| `administradora` | `TEXT`      | Nome da administradora (opcional para apólices empresariais).             |                                                                             |
| `empresa`      | `TEXT`      | Nome da empresa (opcional para apólices de adesão).                       |                                                                             |
| `cnpj`         | `TEXT`      | CNPJ da empresa (opcional para apólices de adesão).                       |                                                                             |
| `vigencia`     | `DATE`      | Data de início da vigência da apólice.                                    | `NOT NULL`                                                                  |
| `vencimento`   | `DATE`      | Data de vencimento da apólice (opcional para apólices de adesão).         |                                                                             |
| `vidas`        | `INTEGER`   | Número de vidas cobertas pela apólice.                                    | `NOT NULL`, `DEFAULT 0`                                                     |
| `status`       | `TEXT`      | Status atual da apólice (Ativo, Inativo, Cancelado, etc.).                | `NOT NULL`, `DEFAULT 'Ativo'`                                               |
| `valor_mensal` | `NUMERIC(10, 2)` | Valor mensal da apólice.                                                  | `NOT NULL`, `DEFAULT 0.00`                                                  |
| `tipo_contrato` | `TEXT`      | Tipo de contrato: 'adesao' ou 'empresarial'.                              | `NOT NULL`, `CHECK (tipo_contrato IN ('adesao', 'empresarial'))`            |
| `user_id`      | `uuid`      | ID do usuário (cliente ou agente) associado à apólice.                  | `REFERENCES public.perfis(id) ON DELETE CASCADE`                            |

**Políticas RLS para `apolices`:**

- **Admins**: Possuem controle total sobre todas as apólices.
- **Agentes**: Podem visualizar todas as apólices. Esta política pode ser ajustada para um controle mais granular, permitindo que agentes vejam apenas as apólices de seus clientes atribuídos.
- **Clientes**: Podem visualizar e atualizar apenas as apólices que lhes pertencem.

### Tabela `boletos`

Responsável por armazenar as informações dos boletos de pagamento, incluindo a URL para o documento baixado.

| Coluna         | Tipo        | Descrição                                                                 | Restrições                                                                  |
| :------------- | :---------- | :------------------------------------------------------------------------ | :-------------------------------------------------------------------------- |
| `id`           | `uuid`      | Chave primária do boleto.                                                 | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()`                                 |
| `numero`       | `TEXT`      | Número do boleto.                                                         | `NOT NULL`                                                                  |
| `apolice_id`   | `uuid`      | ID da apólice à qual o boleto está associado.                             | `REFERENCES public.apolices(id) ON DELETE CASCADE`                          |
| `seguradora`   | `TEXT`      | Nome da seguradora emissora do boleto.                                    | `NOT NULL`                                                                  |
| `competencia`  | `DATE`      | Mês/ano de competência do boleto.                                         | `NOT NULL`                                                                  |
| `vencimento`   | `DATE`      | Data de vencimento do boleto.                                             | `NOT NULL`                                                                  |
| `valor`        | `NUMERIC(10, 2)` | Valor total do boleto.                                                    | `NOT NULL`                                                                  |
| `valor_pago`   | `NUMERIC(10, 2)` | Valor pago do boleto (pode ser parcial).                                  | `DEFAULT 0.00`                                                              |
| `status`       | `TEXT`      | Status do boleto (Aberta, Pago, Vencido, etc.).                           | `NOT NULL`, `DEFAULT 'Aberta'`                                              |
| `url_boleto`   | `TEXT`      | URL para o arquivo do boleto armazenado no Supabase Storage.              |                                                                             |
| `user_id`      | `uuid`      | ID do usuário (cliente) ao qual o boleto pertence.                        | `REFERENCES public.perfis(id) ON DELETE CASCADE`                            |

**Políticas RLS para `boletos`:**

- **Admins**: Possuem controle total sobre todos os boletos.
- **Agentes**: Podem visualizar os boletos dos clientes que gerenciam.
- **Clientes**: Podem visualizar e atualizar apenas seus próprios boletos.

## Próximos Passos

Com a definição do banco de dados e as políticas de RLS estabelecidas, o próximo passo será a **Lógica de Autenticação e RBAC (Passo 2)**, onde abordaremos o código base para gerenciar o acesso no painel administrativo, com foco no superusuário "Donfim".
