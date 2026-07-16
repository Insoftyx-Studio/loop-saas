-- ============================================================================
-- seed.sql — Northwind Studio demo data (business rows only)
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor (or via psql) BEFORE creating the demo
-- logins with scripts/seed_demo_users.mjs. It has no dependency on auth users:
-- comment/request/update authors are stored by name, so the data stands alone
-- and the login script can run afterward without ordering problems.
-- Runs as the table owner, so RLS is bypassed for seeding.
-- ============================================================================
begin;

-- ---- organization ---------------------------------------------------------
insert into public.organizations (id, name, slug, accent) values
  ('10000000-0000-0000-0000-000000000001', 'Northwind Studio', 'northwind', '99 91 255')
on conflict (id) do nothing;

-- ---- clients --------------------------------------------------------------
insert into public.clients (id, organization_id, name, contact, email, accent, initials, since) values
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Meridian Coffee','Dana Whitfield','dana@meridian.coffee','196 108 58','MC','2025-11-04'),
  ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Atlas Fitness','Marco Reyes','marco@atlasfit.com','36 132 120','AF','2026-01-19'),
  ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Verdant Home','Priya Anand','priya@verdanthome.co','104 132 58','VH','2026-03-02')
on conflict (id) do nothing;

-- ---- projects -------------------------------------------------------------
insert into public.projects (id, organization_id, client_id, name, summary, status) values
  ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Brand refresh','New identity system and packaging for the spring line.','on_track'),
  ('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Website redesign','A calmer storefront with a faster checkout.','at_risk'),
  ('40000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','Mobile app UI','Onboarding and workout tracking screens.','on_track'),
  ('40000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','Homepage redesign','A warmer, plant-forward landing experience.','delivered')
on conflict (id) do nothing;

-- ---- milestones -----------------------------------------------------------
insert into public.milestones (organization_id, project_id, client_id, title, due, done, position) values
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Discovery & moodboard','2026-05-20',true,0),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Logo system','2026-06-12',true,1),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Packaging artwork','2026-07-15',false,2),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Brand guidelines','2026-07-30',false,3),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Sitemap & wireframes','2026-06-28',true,0),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Visual design','2026-07-18',false,1),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Build & launch','2026-08-08',false,2),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','User flows','2026-06-10',true,0),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','Onboarding screens','2026-07-05',true,1),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','Tracking dashboard','2026-07-22',false,2),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000003','Concepts','2026-04-10',true,0),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000003','Final design','2026-05-02',true,1),
  ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000003','Handoff','2026-05-20',true,2);

-- ---- deliverables ---------------------------------------------------------
insert into public.deliverables (id, organization_id, project_id, client_id, title, kind, status, thumb_seed, shared_at) values
  ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Packaging artwork — round 2','PDF','shared','coffeebag','2026-07-06 15:20+00'),
  ('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Logo system','PDF','approved','logomark','2026-06-10 10:00+00'),
  ('50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Homepage hero concepts','Figma','changes_requested','heroui','2026-07-02 09:30+00'),
  ('50000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','Onboarding flow','Figma','shared','onboard','2026-07-05 12:00+00'),
  ('50000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000003','Homepage final','PNG','approved','plants','2026-05-01 14:00+00')
on conflict (id) do nothing;

-- ---- comments (author stored by name; author_id left null for the demo) ----
insert into public.comments (deliverable_id, organization_id, client_id, author_name, role, body, created_at) values
  ('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Dana Whitfield','client','Love it — approved! The monogram is perfect.','2026-06-11 08:15+00'),
  ('50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Dana Whitfield','client','Can we try a warmer background and larger headline?','2026-07-02 16:40+00'),
  ('50000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Sam Rourke','agency_admin','On it — round 2 tomorrow with both changes.','2026-07-03 09:05+00');

-- ---- requests (created_by left null for the demo) --------------------------
insert into public.requests (organization_id, client_id, title, detail, status, created_at) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Holiday banner for the homepage','Something festive for December, matching the new brand.','open','2026-07-06 11:00+00'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','Add a dark mode to the app mockups','Members asked for it a lot.','in_progress','2026-07-01 13:30+00'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','Export social templates','Instagram + story sizes from the new look.','done','2026-05-18 10:10+00');

-- ---- invoices -------------------------------------------------------------
insert into public.invoices (organization_id, client_id, number, amount_cents, status, issued, due) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','NW-1042',480000,'paid','2026-06-01','2026-06-15'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','NW-1051',360000,'pending','2026-07-01','2026-07-15'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','NW-1048',540000,'overdue','2026-06-10','2026-06-24'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','NW-1039',420000,'paid','2026-05-05','2026-05-19')
on conflict (organization_id, number) do nothing;

-- ---- updates (author_id left null for the demo) ---------------------------
insert into public.updates (organization_id, client_id, title, body, created_at) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Packaging round 2 is ready to review','Applied the warmer palette from our call — take a look when you can.','2026-07-06 15:25+00'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','Onboarding screens shared','First pass at the sign-up flow is in your portal.','2026-07-05 12:05+00'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','Project wrapped','Everything is handed off. It was a joy working with you!','2026-05-20 17:00+00');

commit;
