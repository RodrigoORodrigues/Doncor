-- =====================================================================================
-- SCRIPT DE DEPLOY SUPABASE COMPLETO - SISTEMA DONCOR
-- Este script unificado cria TODAS as tabelas (estruturadas e do Portal/Robô RPA em JSONB),
-- funções, triggers e políticas de RLS necessárias para o correto funcionamento do sistema.
-- Execute este script inteiro no editor SQL do seu painel Supabase.
-- =====================================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================
-- 2. FUNÇÕES AUXILIARES E TRIGGERS
-- =====================================================================================

-- Função para obter o papel (role) do usuário logado.
-- Essencial para as políticas de Row Level Security (RLS) das tabelas estruturadas.
CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS text 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  RETURN (SELECT role FROM public.perfis WHERE id = auth.uid());
END;
$$;

-- Função genérica para atualizar a coluna updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================================================
-- 3. CRIAÇÃO DAS TABELAS ESTRUTURADAS (SISTEMA LEGADO/PRINCIPAL)
-- =====================================================================================

-- Tabela: perfis
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

-- Triggers de atualização de data para tabelas estruturadas
DROP TRIGGER IF EXISTS set_updated_at ON public.perfis;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.perfis
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.apolices;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.apolices
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.boletos;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.boletos
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- =====================================================================================
-- 4. CRIAÇÃO DAS TABELAS EM FORMATO JSONB (PORTAL DE CLIENTES E ROBÔ RPA)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.contratos_adesao (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.contratos_empresarial (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.inclusoes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  cpf text GENERATED ALWAYS AS (payload->>'cpf') STORED,
  contrato text GENERATED ALWAYS AS (payload->>'contrato') STORED,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  CONSTRAINT fk_inclusoes_contratos_empresarial FOREIGN KEY (contrato) REFERENCES public.contratos_empresarial(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.exclusoes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.transferencias (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.faturas (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.comissoes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.seguradoras (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.produtos (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.colaboradores (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.tarefas_pendentes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_recentes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.portal_parceiros (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.portal_chat (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.portal_solicitacoes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.portal_formularios (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.portal_sinistralidade (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_config (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_aceites (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.robo_config (
  id text primary key default 'default',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.robo_estado (
  id text primary key default 'default',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.robo_execucoes_log (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.boletos_baixados (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.robo_arquivos (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.robo_diagnosticos (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================================
-- 5. ÍNDICES DE PERFORMANCE PARA JSONB
-- =====================================================================================
-- Migração incremental para garantir que as colunas e chaves estrangeiras existam em bancos já criados
ALTER TABLE public.inclusoes ADD COLUMN IF NOT EXISTS cpf text GENERATED ALWAYS AS (payload->>'cpf') STORED;
ALTER TABLE public.inclusoes ADD COLUMN IF NOT EXISTS contrato text GENERATED ALWAYS AS (payload->>'contrato') STORED;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_inclusoes_contratos_empresarial' 
          AND table_name = 'inclusoes'
    ) THEN
        ALTER TABLE public.inclusoes 
        ADD CONSTRAINT fk_inclusoes_contratos_empresarial 
        FOREIGN KEY (contrato) 
        REFERENCES public.contratos_empresarial(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX if not exists contratos_adesao_payload_gin on public.contratos_adesao using gin (payload);
CREATE INDEX if not exists contratos_empresarial_payload_gin on public.contratos_empresarial using gin (payload);
CREATE INDEX if not exists inclusoes_payload_gin on public.inclusoes using gin (payload);
CREATE INDEX if not exists inclusoes_cpf_contrato_idx on public.inclusoes (cpf, contrato);
CREATE INDEX if not exists exclusoes_payload_gin on public.exclusoes using gin (payload);
CREATE INDEX if not exists transferencias_payload_gin on public.transferencias using gin (payload);
CREATE INDEX if not exists faturas_payload_gin on public.faturas using gin (payload);
CREATE INDEX if not exists comissoes_payload_gin on public.comissoes using gin (payload);
CREATE INDEX if not exists seguradoras_payload_gin on public.seguradoras using gin (payload);
CREATE INDEX if not exists produtos_payload_gin on public.produtos using gin (payload);
CREATE INDEX if not exists colaboradores_payload_gin on public.colaboradores using gin (payload);
CREATE INDEX if not exists robo_execucoes_payload_gin on public.robo_execucoes_log using gin (payload);
CREATE INDEX if not exists portal_parceiros_payload_gin on public.portal_parceiros using gin (payload);
CREATE INDEX if not exists portal_chat_payload_gin on public.portal_chat using gin (payload);
CREATE INDEX if not exists portal_solicitacoes_payload_gin on public.portal_solicitacoes using gin (payload);
CREATE INDEX if not exists portal_formularios_payload_gin on public.portal_formularios using gin (payload);
CREATE INDEX if not exists portal_sinistralidade_payload_gin on public.portal_sinistralidade using gin (payload);
CREATE INDEX if not exists lgpd_config_payload_gin on public.lgpd_config using gin (payload);
CREATE INDEX if not exists lgpd_aceites_payload_gin on public.lgpd_aceites using gin (payload);
CREATE INDEX if not exists boletos_baixados_payload_gin on public.boletos_baixados using gin (payload);
CREATE INDEX if not exists robo_arquivos_payload_gin on public.robo_arquivos using gin (payload);
CREATE INDEX if not exists robo_diagnosticos_payload_gin on public.robo_diagnosticos using gin (payload);

-- Triggers de updated_at para tabelas JSONB
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contratos_adesao', 'contratos_empresarial', 'inclusoes', 'exclusoes', 'transferencias',
    'faturas', 'comissoes', 'seguradoras', 'produtos', 'colaboradores', 'tarefas_pendentes',
    'movimentacoes_recentes', 'portal_parceiros', 'portal_chat', 'portal_solicitacoes', 'portal_formularios',
    'portal_sinistralidade', 'lgpd_config', 'lgpd_aceites',
    'robo_config', 'robo_estado', 'robo_execucoes_log', 'boletos_baixados', 'robo_arquivos', 'robo_diagnosticos'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at()', t);
  END LOOP;
END $$;

-- =====================================================================================
-- 6. POLÍTICAS DE SEGURANÇA (RLS - ROW LEVEL SECURITY)
-- =====================================================================================

-- Tabelas JSONB (usadas pelo backend via service_role_key) - RLS Desativado por padrão
-- para evitar erros de permissão com chamadas do microsserviço.
ALTER TABLE public.contratos_adesao DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_empresarial DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inclusoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exclusoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguradoras DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_pendentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_recentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_parceiros DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_chat DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_solicitacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_formularios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_sinistralidade DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_aceites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.robo_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.robo_estado DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.robo_execucoes_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos_baixados DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.robo_arquivos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.robo_diagnosticos DISABLE ROW LEVEL SECURITY;

-- Tabelas Estruturadas - Habilitar RLS e aplicar políticas
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apolices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela: perfis
DROP POLICY IF EXISTS "Admins can view and update all profiles" ON public.perfis;
CREATE POLICY "Admins can view and update all profiles" ON public.perfis
FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Agents can view client profiles" ON public.perfis;
CREATE POLICY "Agents can view client profiles" ON public.perfis
FOR SELECT USING (get_user_role() = 'agente' AND role = 'cliente');

DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.perfis;
CREATE POLICY "Users can view and update their own profile" ON public.perfis
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Políticas para a tabela: apolices
DROP POLICY IF EXISTS "Admins can manage all policies" ON public.apolices;
CREATE POLICY "Admins can manage all policies" ON public.apolices
FOR ALL USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Agents can view all policies" ON public.apolices;
CREATE POLICY "Agents can view all policies" ON public.apolices
FOR SELECT USING (get_user_role() = 'agente');

DROP POLICY IF EXISTS "Users can view and update their own policies" ON public.apolices;
CREATE POLICY "Users can view and update their own policies" ON public.apolices
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para a tabela: boletos
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
-- FIM DO SCRIPT UNIFICADO
-- =====================================================================================
