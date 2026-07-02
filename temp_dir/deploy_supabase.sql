-- =====================================================================================
-- SCRIPT DE DEPLOY SUPABASE - SISTEMA DONCOR
-- Este script cria as tabelas, funções e políticas RLS necessárias para o sistema.
-- Pode ser executado diretamente no SQL Editor do Supabase.
-- =====================================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================================
-- 2. FUNÇÕES AUXILIARES
-- =====================================================================================

-- Função para obter o papel (role) do usuário logado.
-- Essencial para as políticas de Row Level Security (RLS).
CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS text 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  RETURN (SELECT role FROM public.perfis WHERE id = auth.uid());
END;
$$;

-- =====================================================================================
-- 3. CRIAÇÃO DE TABELAS
-- =====================================================================================

-- Tabela: perfis
-- Estende a tabela auth.users do Supabase para armazenar dados adicionais.
CREATE TABLE IF NOT EXISTS public.perfis (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('admin', 'agente', 'cliente')),
    codigo_login_unico TEXT UNIQUE, -- Usado para match com o RPA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: apolices
-- Armazena os detalhes das apólices de seguro.
CREATE TABLE IF NOT EXISTS public.apolices (
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
    user_id uuid REFERENCES public.perfis(id) ON DELETE CASCADE, -- Link para o perfil do cliente/agente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: boletos
-- Armazena as informações dos boletos de pagamento e URLs dos arquivos.
CREATE TABLE IF NOT EXISTS public.boletos (
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
    user_id uuid REFERENCES public.perfis(id) ON DELETE CASCADE, -- Link para o perfil do cliente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================================================
-- 4. TRIGGERS PARA UPDATED_AT
-- =====================================================================================

-- Função genérica para atualizar a coluna updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela perfis
DROP TRIGGER IF EXISTS set_updated_at ON public.perfis;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.perfis
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Aplicar trigger na tabela apolices
DROP TRIGGER IF EXISTS set_updated_at ON public.apolices;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.apolices
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Aplicar trigger na tabela boletos
DROP TRIGGER IF EXISTS set_updated_at ON public.boletos;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.boletos
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- =====================================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apolices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------------------
-- Políticas para a tabela: perfis
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view and update all profiles" ON public.perfis;
CREATE POLICY "Admins can view and update all profiles" ON public.perfis
FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Agents can view client profiles" ON public.perfis;
CREATE POLICY "Agents can view client profiles" ON public.perfis
FOR SELECT USING (get_user_role() = 'agente' AND role = 'cliente');

DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.perfis;
CREATE POLICY "Users can view and update their own profile" ON public.perfis
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- -------------------------------------------------------------------------------------
-- Políticas para a tabela: apolices
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage all policies" ON public.apolices;
CREATE POLICY "Admins can manage all policies" ON public.apolices
FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Agents can view all policies" ON public.apolices;
CREATE POLICY "Agents can view all policies" ON public.apolices
FOR SELECT USING (get_user_role() = 'agente');

DROP POLICY IF EXISTS "Users can view and update their own policies" ON public.apolices;
CREATE POLICY "Users can view and update their own policies" ON public.apolices
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------------------------------------
-- Políticas para a tabela: boletos
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage all boletos" ON public.boletos;
CREATE POLICY "Admins can manage all boletos" ON public.boletos
FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Agents can view client boletos" ON public.boletos;
CREATE POLICY "Agents can view client boletos" ON public.boletos
FOR SELECT USING (get_user_role() = 'agente');

DROP POLICY IF EXISTS "Users can view and update their own boletos" ON public.boletos;
CREATE POLICY "Users can view and update their own boletos" ON public.boletos
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================================================
-- FIM DO SCRIPT
-- =====================================================================================
