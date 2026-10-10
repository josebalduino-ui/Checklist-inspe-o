-- O Auth do Supabase não deve ser criado com INSERT direto em auth.users.
-- Primeiro, cadastre o usuário pela tela da aplicação (aba Cadastrar) ou pelo
-- Dashboard > Authentication > Users. Depois, substitua o e-mail abaixo e rode
-- este arquivo no SQL Editor para promover a conta de teste a administradora.

do $$
declare
  email_teste text := 'jose.balduino@mensa.org.br';
  perfil_id uuid;
begin
  select p.id
    into perfil_id
    from public.perfis p
    join auth.users u on u.id = p.id
   where lower(u.email) = lower(email_teste);

  if perfil_id is null then
    raise exception 'Usuário % não encontrado. Cadastre-o primeiro no Supabase Auth e tente novamente.', email_teste;
  end if;

  update public.perfis
     set perfil = 'admin'
   where id = perfil_id;
end;
$$;

-- Confirma a conta promovida.
select u.email, p.nome_usuario, p.perfil
  from public.perfis p
  join auth.users u on u.id = p.id
 where lower(u.email) = lower('jose.balduino@mensa.org.br');
