-- Esquema do Banco de Dados para Supabase

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

-- Função para obter o papel do usuário logado (necessário para RLS)
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT role FROM public.perfis WHERE id = auth.uid());
END;
$$;

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

-- Habilitar a extensão uuid-ossp para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
