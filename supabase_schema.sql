-- =========================================
-- Doncor / Supabase - Schema + RLS + Permissões
-- Compatível com login Master (Donfim) e perfis Diretoria/Gerencia/Analista
-- =========================================

create extension if not exists "pgcrypto";

-- -------------------------------
-- Tipos auxiliares
-- -------------------------------
do $$ begin
  create type public.user_role as enum ('Master','Diretoria','Gerencia','Analista');
exception when duplicate_object then null;
end $$;

-- -------------------------------
-- Perfis (1:1 com auth.users)
-- -------------------------------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  role public.user_role not null default 'Analista',
  status text not null default 'Ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_perfis_updated_at on public.perfis;
create trigger trg_perfis_updated_at
before update on public.perfis
for each row execute function public.set_updated_at();

-- -------------------------------
-- Configuração de acesso por perfil (RBAC)
-- -------------------------------
create table if not exists public.role_page_access (
  id bigserial primary key,
  role public.user_role not null,
  page_key text not null,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  unique(role, page_key)
);

-- -------------------------------
-- Configuração do Robô (somente Master)
-- -------------------------------
create table if not exists public.robo_config (
  id bigserial primary key,
  intervalo_minutos integer not null default 15,
  tentativas integer not null default 3,
  notificacoes boolean not null default true,
  modo_seguro boolean not null default true,
  atualizado_por uuid references public.perfis(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.robo_execucoes (
  id uuid primary key default gen_random_uuid(),
  processo text not null,
  inicio timestamptz not null default now(),
  duracao text,
  status text not null,
  detalhes text,
  created_at timestamptz not null default now()
);

-- -------------------------------
-- Dados de domínio da aplicação
-- -------------------------------
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  tipo_contrato text not null check (tipo_contrato in ('adesao','empresarial')),
  numero text not null unique,
  seguradora text not null,
  produto text not null,
  administradora text,
  empresa text,
  cnpj text,
  vigencia date,
  vencimento date,
  vidas integer not null default 0,
  status text not null default 'Ativo',
  valor_mensal numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('Inclusao','Exclusao','Transferencia')),
  contrato_numero text,
  beneficiario text,
  data_mov date,
  status text,
  prioridade text,
  created_at timestamptz not null default now()
);

create table if not exists public.faturas (
  id uuid primary key default gen_random_uuid(),
  numero text,
  seguradora text,
  competencia date,
  vencimento date,
  valor numeric(14,2) not null default 0,
  status text not null default 'Aberta',
  created_at timestamptz not null default now()
);

-- -------------------------------
-- Funções de segurança
-- -------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.perfis where id = auth.uid()
$$;

-- -------------------------------
-- Habilitar RLS
-- -------------------------------
alter table public.perfis enable row level security;
alter table public.role_page_access enable row level security;
alter table public.robo_config enable row level security;
alter table public.robo_execucoes enable row level security;
alter table public.contratos enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.faturas enable row level security;

-- -------------------------------
-- Políticas: perfis
-- -------------------------------
drop policy if exists perfis_self_select on public.perfis;
create policy perfis_self_select on public.perfis
for select using (auth.uid() = id or public.current_user_role() = 'Master');

drop policy if exists perfis_master_manage on public.perfis;
create policy perfis_master_manage on public.perfis
for all using (public.current_user_role() = 'Master')
with check (public.current_user_role() = 'Master');

-- -------------------------------
-- Políticas: acesso por página
-- -------------------------------
drop policy if exists role_access_read on public.role_page_access;
create policy role_access_read on public.role_page_access
for select using (auth.uid() is not null);

drop policy if exists role_access_master_manage on public.role_page_access;
create policy role_access_master_manage on public.role_page_access
for all using (public.current_user_role() = 'Master')
with check (public.current_user_role() = 'Master');

-- -------------------------------
-- Políticas: robô
-- -------------------------------
drop policy if exists robo_exec_read on public.robo_execucoes;
create policy robo_exec_read on public.robo_execucoes
for select using (auth.uid() is not null);

drop policy if exists robo_exec_master_write on public.robo_execucoes;
create policy robo_exec_master_write on public.robo_execucoes
for all using (public.current_user_role() = 'Master')
with check (public.current_user_role() = 'Master');

drop policy if exists robo_cfg_read on public.robo_config;
create policy robo_cfg_read on public.robo_config
for select using (auth.uid() is not null);

drop policy if exists robo_cfg_master_manage on public.robo_config;
create policy robo_cfg_master_manage on public.robo_config
for all using (public.current_user_role() = 'Master')
with check (public.current_user_role() = 'Master');

-- -------------------------------
-- Políticas: domínio
-- -------------------------------
drop policy if exists contratos_read on public.contratos;
create policy contratos_read on public.contratos
for select using (auth.uid() is not null);

drop policy if exists contratos_write_gestao on public.contratos;
create policy contratos_write_gestao on public.contratos
for all using (public.current_user_role() in ('Master','Diretoria','Gerencia'))
with check (public.current_user_role() in ('Master','Diretoria','Gerencia'));

drop policy if exists mov_read on public.movimentacoes;
create policy mov_read on public.movimentacoes
for select using (auth.uid() is not null);

drop policy if exists mov_write_gestao on public.movimentacoes;
create policy mov_write_gestao on public.movimentacoes
for all using (public.current_user_role() in ('Master','Diretoria','Gerencia','Analista'))
with check (public.current_user_role() in ('Master','Diretoria','Gerencia','Analista'));

drop policy if exists faturas_read on public.faturas;
create policy faturas_read on public.faturas
for select using (auth.uid() is not null);

drop policy if exists faturas_write_gestao on public.faturas;
create policy faturas_write_gestao on public.faturas
for all using (public.current_user_role() in ('Master','Diretoria','Gerencia'))
with check (public.current_user_role() in ('Master','Diretoria','Gerencia'));

-- -------------------------------
-- Grants
-- -------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.perfis, public.role_page_access, public.robo_config, public.robo_execucoes, public.contratos, public.movimentacoes, public.faturas to authenticated;
grant insert, update, delete on public.perfis, public.role_page_access, public.robo_config, public.robo_execucoes, public.contratos, public.movimentacoes, public.faturas to authenticated;

-- -------------------------------
-- Seed inicial de permissões por perfil
-- -------------------------------
insert into public.role_page_access (role, page_key, allowed)
values
('Master','dashboard',true),('Master','adesao',true),('Master','empresarial',true),('Master','inclusao',true),('Master','exclusao',true),('Master','transferencia',true),('Master','faturas',true),('Master','comissoes',true),('Master','seguradoras',true),('Master','produtos',true),('Master','colaboradores',true),('Master','relatorios',true),('Master','robo',true),('Master','robo-config',true),('Master','perfil',true),('Master','configuracoes',true),('Master','suporte',true),
('Diretoria','dashboard',true),('Diretoria','adesao',true),('Diretoria','empresarial',true),('Diretoria','inclusao',true),('Diretoria','exclusao',true),('Diretoria','transferencia',true),('Diretoria','faturas',true),('Diretoria','comissoes',true),('Diretoria','seguradoras',true),('Diretoria','produtos',true),('Diretoria','colaboradores',true),('Diretoria','relatorios',true),('Diretoria','robo',true),('Diretoria','perfil',true),('Diretoria','configuracoes',true),('Diretoria','suporte',true),
('Gerencia','dashboard',true),('Gerencia','adesao',true),('Gerencia','empresarial',true),('Gerencia','inclusao',true),('Gerencia','exclusao',true),('Gerencia','transferencia',true),('Gerencia','faturas',true),('Gerencia','comissoes',true),('Gerencia','seguradoras',true),('Gerencia','produtos',true),('Gerencia','relatorios',true),('Gerencia','perfil',true),('Gerencia','configuracoes',true),('Gerencia','suporte',true),
('Analista','dashboard',true),('Analista','adesao',true),('Analista','inclusao',true),('Analista','exclusao',true),('Analista','transferencia',true),('Analista','perfil',true),('Analista','configuracoes',true),('Analista','suporte',true)
on conflict (role, page_key) do update set allowed = excluded.allowed;

insert into public.robo_config (intervalo_minutos, tentativas, notificacoes, modo_seguro)
select 15, 3, true, true
where not exists (select 1 from public.robo_config);

-- IMPORTANTE:
-- 1) Crie o usuário Master no Supabase Auth (email/senha).
-- 2) Pegue o UUID dele e rode:
--    insert into public.perfis (id, nome, email, role, status)
--    values ('UUID_DO_AUTH_USER', 'Donfim', 'donfim@doncor.local', 'Master', 'Ativo')
--    on conflict (id) do update set role='Master', nome='Donfim', status='Ativo';
