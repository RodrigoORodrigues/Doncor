-- Doncor Supabase/Postgres schema
-- Execute este arquivo no Supabase SQL Editor antes de subir o backend.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Tabelas em formato compatível com o backend atual.
-- Cada registro de negócio fica dentro da coluna payload (jsonb), mantendo os nomes usados pelo React/Python.

create table if not exists public.contratos_adesao (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contratos_empresarial (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inclusoes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exclusoes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transferencias (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faturas (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comissoes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seguradoras (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.produtos (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.colaboradores (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tarefas_pendentes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movimentacoes_recentes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_parceiros (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_chat (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_solicitacoes (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_formularios (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.robo_config (
  id text primary key default 'default',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.robo_estado (
  id text primary key default 'default',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.robo_execucoes_log (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boletos_baixados (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.robo_arquivos (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.robo_diagnosticos (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices úteis para busca e filtros em JSONB
create index if not exists contratos_adesao_payload_gin on public.contratos_adesao using gin (payload);
create index if not exists contratos_empresarial_payload_gin on public.contratos_empresarial using gin (payload);
create index if not exists inclusoes_payload_gin on public.inclusoes using gin (payload);
create index if not exists exclusoes_payload_gin on public.exclusoes using gin (payload);
create index if not exists transferencias_payload_gin on public.transferencias using gin (payload);
create index if not exists faturas_payload_gin on public.faturas using gin (payload);
create index if not exists comissoes_payload_gin on public.comissoes using gin (payload);
create index if not exists seguradoras_payload_gin on public.seguradoras using gin (payload);
create index if not exists produtos_payload_gin on public.produtos using gin (payload);
create index if not exists colaboradores_payload_gin on public.colaboradores using gin (payload);
create index if not exists robo_execucoes_payload_gin on public.robo_execucoes_log using gin (payload);
create index if not exists portal_parceiros_payload_gin on public.portal_parceiros using gin (payload);
create index if not exists portal_chat_payload_gin on public.portal_chat using gin (payload);
create index if not exists portal_solicitacoes_payload_gin on public.portal_solicitacoes using gin (payload);
create index if not exists portal_formularios_payload_gin on public.portal_formularios using gin (payload);
create index if not exists boletos_baixados_payload_gin on public.boletos_baixados using gin (payload);
create index if not exists robo_arquivos_payload_gin on public.robo_arquivos using gin (payload);
create index if not exists robo_diagnosticos_payload_gin on public.robo_diagnosticos using gin (payload);

-- Triggers de updated_at
do $$
declare
  t text;
begin
  foreach t in array array[
    'contratos_adesao', 'contratos_empresarial', 'inclusoes', 'exclusoes', 'transferencias',
    'faturas', 'comissoes', 'seguradoras', 'produtos', 'colaboradores', 'tarefas_pendentes',
    'movimentacoes_recentes', 'portal_parceiros', 'portal_chat', 'portal_solicitacoes', 'portal_formularios',
    'robo_config', 'robo_estado', 'robo_execucoes_log', 'boletos_baixados', 'robo_arquivos', 'robo_diagnosticos'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', t);
  end loop;
end $$;

-- Como o backend usa SERVICE_ROLE_KEY, ele ignora RLS. Para evitar bloqueio acidental via cliente público,
-- deixamos RLS desativado nessas tabelas de backend.
alter table public.contratos_adesao disable row level security;
alter table public.contratos_empresarial disable row level security;
alter table public.inclusoes disable row level security;
alter table public.exclusoes disable row level security;
alter table public.transferencias disable row level security;
alter table public.faturas disable row level security;
alter table public.comissoes disable row level security;
alter table public.seguradoras disable row level security;
alter table public.produtos disable row level security;
alter table public.colaboradores disable row level security;
alter table public.tarefas_pendentes disable row level security;
alter table public.movimentacoes_recentes disable row level security;
alter table public.portal_parceiros disable row level security;
alter table public.portal_chat disable row level security;
alter table public.portal_solicitacoes disable row level security;
alter table public.portal_formularios disable row level security;
alter table public.robo_config disable row level security;
alter table public.robo_estado disable row level security;
alter table public.robo_execucoes_log disable row level security;
alter table public.boletos_baixados disable row level security;
alter table public.robo_arquivos disable row level security;
alter table public.robo_diagnosticos disable row level security;
