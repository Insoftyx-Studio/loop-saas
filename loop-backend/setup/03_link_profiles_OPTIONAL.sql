-- Run AFTER you've created the 4 users in Authentication -> Users.
-- Links each auth user to their Loop profile by email. No trigger needed.
insert into public.users (id, organization_id, role, full_name, email, client_id)
select u.id, m.org, m.role, m.full_name, u.email, m.client_id
from auth.users u
join (values
  ('sam@northwind.studio', '10000000-0000-0000-0000-000000000001'::uuid, 'agency_admin'::app.user_role, 'Sam Rourke',      null::uuid),
  ('dana@meridian.coffee', '10000000-0000-0000-0000-000000000001',       'client',       'Dana Whitfield', '20000000-0000-0000-0000-000000000001'),
  ('marco@atlasfit.com',   '10000000-0000-0000-0000-000000000001',       'client',       'Marco Reyes',    '20000000-0000-0000-0000-000000000002'),
  ('priya@verdanthome.co', '10000000-0000-0000-0000-000000000001',       'client',       'Priya Anand',    '20000000-0000-0000-0000-000000000003')
) as m(email, org, role, full_name, client_id) on m.email = u.email
on conflict (id) do update set
  organization_id=excluded.organization_id, role=excluded.role,
  full_name=excluded.full_name, email=excluded.email, client_id=excluded.client_id;

select email, role, client_id from public.users order by role, email;
