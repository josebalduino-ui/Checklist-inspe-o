-- Esquema inicial do Checklist de Inspeção para Supabase / PostgreSQL.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_usuario text not null unique,
  perfil text not null default 'operador' check (perfil in ('admin', 'operador')),
  telefone text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create or replace function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists perfis_definir_atualizado_em on public.perfis;
create trigger perfis_definir_atualizado_em
before update on public.perfis
for each row execute function public.definir_atualizado_em();

-- Novas contas começam como operador. A promoção a administrador é manual.
create or replace function public.criar_perfil_usuario_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nome_usuario_escolhido text;
begin
  nome_usuario_escolhido := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if nome_usuario_escolhido is null then
    nome_usuario_escolhido := coalesce(split_part(new.email, '@', 1), 'usuario') || '-' || substr(new.id::text, 1, 8);
  end if;

  insert into public.perfis (id, nome_usuario, perfil, telefone)
  values (
    new.id,
    nome_usuario_escolhido,
    'operador',
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_checklist on auth.users;
create trigger on_auth_user_created_checklist
after insert on auth.users
for each row execute function public.criar_perfil_usuario_auth();

create or replace function public.usuario_e_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.perfil = 'admin'
  );
$$;

-- Cadastro mestre dos veículos/equipamentos selecionados no formulário.
create table if not exists public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  placa text,
  ativo boolean not null default true,
  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

drop trigger if exists equipamentos_definir_atualizado_em on public.equipamentos;
create trigger equipamentos_definir_atualizado_em
before update on public.equipamentos
for each row execute function public.definir_atualizado_em();

-- Catálogo contém os itens padrão RF/RNF e os itens personalizados.
create table if not exists public.itens_checklist (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text not null default '',
  categoria text not null check (categoria in ('operacao', 'manutencao', 'seguranca', 'rnf')),
  personalizado boolean not null default false,
  ativo boolean not null default true,
  criado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

drop trigger if exists itens_checklist_definir_atualizado_em on public.itens_checklist;
create trigger itens_checklist_definir_atualizado_em
before update on public.itens_checklist
for each row execute function public.definir_atualizado_em();

insert into public.itens_checklist (codigo, nome, descricao, categoria) values
  ('calibragem-pneus', 'Calibragem dos pneus', 'Registrar a pressão de cada pneu e verificar os limites', 'manutencao'),
  ('cortes-rasgos-bolhas', 'Cortes, rasgos e bolhas', 'Registrar a condição de cada pneu', 'manutencao'),
  ('desgaste-pneus', 'Desgaste dos pneus', 'Registrar e avaliar a condição', 'manutencao'),
  ('freios', 'Freios', 'Registrar o resultado da verificação', 'seguranca'),
  ('direcao', 'Direção', 'Registrar o resultado da verificação', 'operacao'),
  ('nivel-oleo', 'Nível de óleo', 'Registrar a medição e verificar o limite', 'manutencao'),
  ('liquido-arrefecimento', 'Líquido de arrefecimento', 'Registrar e verificar a condição', 'manutencao'),
  ('vazamentos', 'Vazamentos', 'Registrar a ocorrência', 'manutencao'),
  ('iluminacao', 'Iluminação', 'Registrar cada item como conforme ou não conforme', 'seguranca'),
  ('buzina', 'Buzina', 'Registrar o resultado do teste', 'seguranca'),
  ('giroflex', 'Giroflex', 'Registrar o resultado do teste', 'seguranca'),
  ('estrutura-chassi', 'Estrutura/chassi', 'Registrar danos ou anormalidades', 'manutencao'),
  ('cacamba-implemento', 'Caçamba/implemento', 'Registrar a condição', 'manutencao'),
  ('cinto-seguranca', 'Cinto de segurança', 'Registrar a verificação', 'seguranca'),
  ('extintor', 'Extintor', 'Registrar validade e condição', 'seguranca'),
  ('camera-re', 'Câmera de ré', 'Registrar o funcionamento', 'seguranca'),
  ('alarme-re', 'Alarme de ré', 'Registrar o funcionamento', 'seguranca'),
  ('horimetro-odometro', 'Horímetro/odômetro', 'Registrar a leitura', 'operacao'),
  ('combustivel', 'Combustível', 'Registrar o nível', 'operacao'),
  ('fotos', 'Fotos', 'Permitir anexar fotos às não conformidades', 'seguranca'),
  ('nao-conformidade', 'Não conformidade', 'Registrar o problema encontrado', 'seguranca'),
  ('ordem-servico', 'Ordem de serviço', 'Abrir uma OS quando houver necessidade de manutenção', 'manutencao'),
  ('usabilidade', 'Usabilidade', 'O sistema deve ser simples de utilizar pelo operador em campo', 'rnf'),
  ('desempenho', 'Desempenho', 'O sistema deve registrar uma resposta em até X segundos', 'rnf'),
  ('disponibilidade', 'Disponibilidade', 'O sistema deve estar disponível X% do tempo', 'rnf'),
  ('seguranca', 'Segurança', 'Somente usuários autorizados podem alterar uma inspeção concluída', 'rnf'),
  ('rastreabilidade', 'Rastreabilidade', 'O sistema deve registrar usuário, data e hora das alterações', 'rnf'),
  ('offline', 'Operação offline', 'O sistema deve permitir inspeções sem conexão e sincronizar posteriormente', 'rnf'),
  ('integridade', 'Integridade', 'O sistema deve impedir alterações não rastreadas em inspeções encerradas', 'rnf'),
  ('compatibilidade', 'Compatibilidade', 'O sistema deve funcionar nos dispositivos definidos para a operação', 'rnf')
on conflict (codigo) do nothing;

-- Cada registro representa uma inspeção; os dados do veículo são copiados
-- para snapshots para manter o histórico mesmo se o cadastro mestre mudar.
create table if not exists public.inspecoes (
  id uuid primary key default gen_random_uuid(),
  equipamento_id uuid references public.equipamentos (id) on delete set null,
  nome_veiculo_snapshot text not null default '',
  nome_equipamento text not null default '',
  placa text not null default '',
  data_inspecao date,
  responsavel text not null default '',
  horimetro numeric(14, 1),
  horimetro_desabilitado boolean not null default false,
  quilometragem_km bigint,
  quilometragem_desabilitada boolean not null default false,
  observacoes_nao_conformidade text not null default '',
  ordem_servico_necessaria boolean not null default false,
  aptidao text not null default 'Apto'
    check (aptidao in ('Apto', 'Apto com ressalvas', 'Não apto')),
  criado_por uuid references public.perfis (id) on delete set null,
  atualizado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (horimetro is null or horimetro >= 0),
  check (quilometragem_km is null or quilometragem_km >= 0),
  check (not horimetro_desabilitado or horimetro is null),
  check (not quilometragem_desabilitada or quilometragem_km is null)
);

create index if not exists inspecoes_data_idx on public.inspecoes (data_inspecao desc);
create index if not exists inspecoes_criado_por_idx on public.inspecoes (criado_por);
create index if not exists inspecoes_equipamento_idx on public.inspecoes (equipamento_id);

drop trigger if exists inspecoes_definir_atualizado_em on public.inspecoes;
create trigger inspecoes_definir_atualizado_em
before update on public.inspecoes
for each row execute function public.definir_atualizado_em();

-- Guarda a resposta/situacao e o snapshot do texto do item no momento da inspeção.
create table if not exists public.respostas_inspecao (
  id uuid primary key default gen_random_uuid(),
  inspecao_id uuid not null references public.inspecoes (id) on delete cascade,
  item_checklist_id uuid references public.itens_checklist (id) on delete set null,
  codigo_item_snapshot text not null,
  nome_item_snapshot text not null,
  categoria_item_snapshot text not null check (categoria_item_snapshot in ('operacao', 'manutencao', 'seguranca', 'rnf')),
  situacao text not null check (situacao in ('conforme', 'nao-conforme', 'apto-ressalvas', 'n-a')),
  criado_em timestamptz not null default now(),
  unique (inspecao_id, codigo_item_snapshot)
);

create index if not exists respostas_inspecao_inspecao_idx on public.respostas_inspecao (inspecao_id);
create index if not exists respostas_inspecao_situacao_idx on public.respostas_inspecao (situacao);

-- Fotos devem ser armazenadas no Supabase Storage. Esta tabela guarda metadados
-- e o caminho do objeto, nunca o conteúdo Base64 da imagem.
create table if not exists public.fotos_inspecao (
  id uuid primary key default gen_random_uuid(),
  inspecao_id uuid not null references public.inspecoes (id) on delete cascade,
  codigo_item text,
  caminho_storage text not null unique,
  nome_arquivo text not null,
  tipo_conteudo text not null,
  tamanho_bytes bigint check (tamanho_bytes is null or tamanho_bytes >= 0),
  enviado_por uuid references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists fotos_inspecao_inspecao_idx on public.fotos_inspecao (inspecao_id);

-- Registro de logins, alterações cadastrais e ações em inspeções.
create table if not exists public.registros_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.perfis (id) on delete set null,
  nome_usuario_snapshot text not null default 'Sistema',
  acao text not null,
  tipo_entidade text,
  entidade_id uuid,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists registros_auditoria_criado_em_idx on public.registros_auditoria (criado_em desc);
create index if not exists registros_auditoria_usuario_idx on public.registros_auditoria (usuario_id);

-- Permissões de tabela para a API do Supabase; RLS continua restringindo linhas.
grant usage on schema public to authenticated;
grant select, update on public.perfis to authenticated;
grant select, insert, update, delete on public.equipamentos to authenticated;
grant select, insert, update, delete on public.itens_checklist to authenticated;
grant select, insert, update, delete on public.inspecoes to authenticated;
grant select, insert, update, delete on public.respostas_inspecao to authenticated;
grant select, insert, delete on public.fotos_inspecao to authenticated;
grant select, insert on public.registros_auditoria to authenticated;

revoke all on public.perfis, public.equipamentos, public.itens_checklist,
  public.inspecoes, public.respostas_inspecao, public.fotos_inspecao,
  public.registros_auditoria from anon;

-- Função usada nas políticas das tabelas relacionadas para verificar acesso
-- sem recursão nas políticas de inspeções.
create or replace function public.usuario_pode_acessar_inspecao(inspecao_alvo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.inspecoes i
    where i.id = inspecao_alvo_id
      and (i.criado_por = (select auth.uid()) or public.usuario_e_admin())
  );
$$;

grant execute on function public.usuario_e_admin() to authenticated;
grant execute on function public.usuario_pode_acessar_inspecao(uuid) to authenticated;

alter table public.perfis enable row level security;
alter table public.equipamentos enable row level security;
alter table public.itens_checklist enable row level security;
alter table public.inspecoes enable row level security;
alter table public.respostas_inspecao enable row level security;
alter table public.fotos_inspecao enable row level security;
alter table public.registros_auditoria enable row level security;

drop policy if exists "perfis_leitura_propria_ou_admin" on public.perfis;
create policy "perfis_leitura_propria_ou_admin" on public.perfis
for select to authenticated
using (id = (select auth.uid()) or (select public.usuario_e_admin()));

drop policy if exists "perfis_edicao_admin" on public.perfis;
create policy "perfis_edicao_admin" on public.perfis
for update to authenticated
using ((select public.usuario_e_admin()))
with check ((select public.usuario_e_admin()));

drop policy if exists "equipamentos_leitura_autenticada" on public.equipamentos;
create policy "equipamentos_leitura_autenticada" on public.equipamentos
for select to authenticated using (true);

drop policy if exists "equipamentos_gestao_admin" on public.equipamentos;
create policy "equipamentos_gestao_admin" on public.equipamentos
for all to authenticated
using ((select public.usuario_e_admin()))
with check ((select public.usuario_e_admin()));

drop policy if exists "itens_checklist_leitura_ativos_ou_admin" on public.itens_checklist;
create policy "itens_checklist_leitura_ativos_ou_admin" on public.itens_checklist
for select to authenticated
using (ativo or (select public.usuario_e_admin()));

drop policy if exists "itens_checklist_gestao_admin" on public.itens_checklist;
create policy "itens_checklist_gestao_admin" on public.itens_checklist
for all to authenticated
using ((select public.usuario_e_admin()))
with check ((select public.usuario_e_admin()));

drop policy if exists "itens_checklist_criar_personalizado" on public.itens_checklist;
create policy "itens_checklist_criar_personalizado" on public.itens_checklist
for insert to authenticated
with check (personalizado and criado_por = (select auth.uid()));

drop policy if exists "inspecoes_leitura_propria_ou_admin" on public.inspecoes;
create policy "inspecoes_leitura_propria_ou_admin" on public.inspecoes
for select to authenticated
using (criado_por = (select auth.uid()) or (select public.usuario_e_admin()));

drop policy if exists "inspecoes_criar_como_proprio_usuario" on public.inspecoes;
create policy "inspecoes_criar_como_proprio_usuario" on public.inspecoes
for insert to authenticated
with check (criado_por = (select auth.uid()));

drop policy if exists "inspecoes_edicao_propria_ou_admin" on public.inspecoes;
create policy "inspecoes_edicao_propria_ou_admin" on public.inspecoes
for update to authenticated
using (criado_por = (select auth.uid()) or (select public.usuario_e_admin()))
with check (criado_por = (select auth.uid()) or (select public.usuario_e_admin()));

drop policy if exists "inspecoes_exclusao_propria_ou_admin" on public.inspecoes;
create policy "inspecoes_exclusao_propria_ou_admin" on public.inspecoes
for delete to authenticated
using (criado_por = (select auth.uid()) or (select public.usuario_e_admin()));

drop policy if exists "respostas_leitura_inspecoes_acessiveis" on public.respostas_inspecao;
create policy "respostas_leitura_inspecoes_acessiveis" on public.respostas_inspecao
for select to authenticated
using ((select public.usuario_pode_acessar_inspecao(inspecao_id)));

drop policy if exists "respostas_criar_inspecoes_acessiveis" on public.respostas_inspecao;
create policy "respostas_criar_inspecoes_acessiveis" on public.respostas_inspecao
for insert to authenticated
with check ((select public.usuario_pode_acessar_inspecao(inspecao_id)));

drop policy if exists "respostas_editar_inspecoes_acessiveis" on public.respostas_inspecao;
create policy "respostas_editar_inspecoes_acessiveis" on public.respostas_inspecao
for update to authenticated
using ((select public.usuario_pode_acessar_inspecao(inspecao_id)))
with check ((select public.usuario_pode_acessar_inspecao(inspecao_id)));

drop policy if exists "respostas_excluir_inspecoes_acessiveis" on public.respostas_inspecao;
create policy "respostas_excluir_inspecoes_acessiveis" on public.respostas_inspecao
for delete to authenticated
using ((select public.usuario_pode_acessar_inspecao(inspecao_id)));

drop policy if exists "fotos_leitura_inspecoes_acessiveis" on public.fotos_inspecao;
create policy "fotos_leitura_inspecoes_acessiveis" on public.fotos_inspecao
for select to authenticated
using ((select public.usuario_pode_acessar_inspecao(inspecao_id)));

drop policy if exists "fotos_criar_inspecoes_acessiveis" on public.fotos_inspecao;
create policy "fotos_criar_inspecoes_acessiveis" on public.fotos_inspecao
for insert to authenticated
with check (
  enviado_por = (select auth.uid())
  and (select public.usuario_pode_acessar_inspecao(inspecao_id))
);

drop policy if exists "fotos_excluir_inspecoes_acessiveis" on public.fotos_inspecao;
create policy "fotos_excluir_inspecoes_acessiveis" on public.fotos_inspecao
for delete to authenticated
using ((select public.usuario_pode_acessar_inspecao(inspecao_id)));

drop policy if exists "auditoria_leitura_admin" on public.registros_auditoria;
create policy "auditoria_leitura_admin" on public.registros_auditoria
for select to authenticated using ((select public.usuario_e_admin()));

drop policy if exists "auditoria_criar_como_proprio_usuario" on public.registros_auditoria;
create policy "auditoria_criar_como_proprio_usuario" on public.registros_auditoria
for insert to authenticated
with check (usuario_id = (select auth.uid()));

-- Auditoria é append-only para usuários autenticados: sem UPDATE/DELETE policies.

-- Bucket privado para fotos. Use caminho_storage no formato:
-- <inspection_uuid>/<nome-do-arquivo>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspection-photos', 'inspection-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "fotos_storage_leitura" on storage.objects;
create policy "fotos_storage_leitura" on storage.objects
for select to authenticated
using (
  bucket_id = 'inspection-photos'
  and (select public.usuario_pode_acessar_inspecao(((storage.foldername(name))[1])::uuid))
);

drop policy if exists "fotos_storage_insercao" on storage.objects;
create policy "fotos_storage_insercao" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'inspection-photos'
  and (select public.usuario_pode_acessar_inspecao(((storage.foldername(name))[1])::uuid))
);

drop policy if exists "fotos_storage_exclusao" on storage.objects;
create policy "fotos_storage_exclusao" on storage.objects
for delete to authenticated
using (
  bucket_id = 'inspection-photos'
  and (select public.usuario_pode_acessar_inspecao(((storage.foldername(name))[1])::uuid))
);

-- Após criar sua conta no Supabase Auth, promova o primeiro administrador:
-- update public.perfis set perfil = 'admin' where nome_usuario = 'seu_usuario';
