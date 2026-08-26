-- Replace security-definer view with app_private function + invoker wrapper (project pattern)
drop view if exists public.member_profiles;

create or replace function app_private.get_member_profiles()
returns table(user_id uuid, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = 'public'
as $$
  select p.user_id, p.display_name, p.avatar_url
  from public.profiles p
  where p.user_id = auth.uid()
     or public.is_superadmin()
     or exists (
       select 1
       from public.organization_members om1
       join public.organization_members om2 on om2.organization_id = om1.organization_id
       where om1.user_id = auth.uid()
         and om1.status = 'active'
         and om2.user_id = p.user_id
         and om2.status = 'active'
     )
$$;

create or replace function public.get_member_profiles()
returns table(user_id uuid, display_name text, avatar_url text)
language sql
stable
set search_path = 'public'
as $$
  select * from app_private.get_member_profiles()
$$;

revoke all on function public.get_member_profiles() from public, anon;
grant execute on function public.get_member_profiles() to authenticated, service_role;