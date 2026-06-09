-- ============================================================
-- Brushly Admin — seed the two admins
-- Run AFTER 0001_init.sql, and AFTER both users exist in
-- Authentication -> Users.
-- Edit the partner's display name below before running.
-- ============================================================

insert into public.admins (user_id, name)
select u.id, v.display_name
from (values
  ('ss7538dk@gmail.com',  'Gancho'),
  ('pstoya1@yahoo.co.uk', 'Partner')   -- <-- put his real first name here
) as v(email, display_name)
join auth.users u on lower(u.email) = lower(v.email)
on conflict (user_id) do nothing;

-- Verification: must return exactly 2 rows.
select a.name, u.email, a.user_id
from public.admins a
join auth.users u on u.id = a.user_id
order by a.created_at;
