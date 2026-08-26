-- 1) Tighten profiles SELECT: self, superadmin, or org admins of a shared org (email is PII)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  user_id = auth.uid()
  or public.is_superadmin()
  or exists (
    select 1
    from public.organization_members om1
    join public.organization_members om2 on om2.organization_id = om1.organization_id
    where om1.user_id = auth.uid()
      and om1.status = 'active'
      and om1.role = 'admin'
      and om2.user_id = profiles.user_id
      and om2.status = 'active'
  )
);

-- 2) Non-sensitive directory view (no email) for org-mate display names
create or replace view public.member_profiles
with (security_barrier = true) as
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
   );

grant select on public.member_profiles to authenticated;

-- 3) Prevent organization_id changes on emergency_attendance updates
create or replace function public.emergency_attendance_enforce_scope()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  if NEW.organization_id is distinct from OLD.organization_id then
    raise exception 'organization_id cannot be changed on emergency_attendance';
  end if;
  return NEW;
end;
$$;

drop trigger if exists emergency_attendance_scope_trg on public.emergency_attendance;
create trigger emergency_attendance_scope_trg
before update on public.emergency_attendance
for each row execute function public.emergency_attendance_enforce_scope();