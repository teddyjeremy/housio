-- Internal helpers: sessions, roles, pricing, cancellation, availability.

create or replace function app.hash_token(p_token text) returns text
language sql immutable set search_path = app, extensions as $$
  select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

create or replace function app.try_actor(p_token text) returns app.accounts
language plpgsql set search_path = app, extensions as $$
declare v app.accounts; v_hash text := app.hash_token(p_token);
begin
  if p_token is null or length(p_token) < 32 then return null; end if;
  select a.* into v from app.sessions s join app.accounts a on a.id = s.account_id
   where s.token_hash = v_hash and s.expires_at > now() and a.status = 'active';
  if not found then return null; end if;
  update app.sessions set last_seen_at = now(), expires_at = greatest(expires_at, now() + interval '8 hours')
   where token_hash = v_hash and last_seen_at < now() - interval '5 minutes';
  return v;
end $$;

create or replace function app.require_role(p_token text, p_roles text[]) returns app.accounts
language plpgsql set search_path = app, extensions as $$
declare v app.accounts;
begin
  v := app.try_actor(p_token);
  if v.id is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  if not (v.role = any(p_roles)) then raise exception 'forbidden' using errcode = '42501'; end if;
  return v;
end $$;

create or replace function app.audit(p_actor app.accounts, p_action text, p_type text, p_id text, p_details jsonb default '{}'::jsonb)
returns void language sql set search_path = app as $$
  insert into app.audit_logs(actor_id, actor_role, action, target_type, target_id, details)
  values (p_actor.id, p_actor.role, p_action, p_type, p_id, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function app.notify(p_account uuid, p_kind text, p_message text, p_link text default null)
returns void language sql set search_path = app as $$
  insert into app.notifications(account_id, kind, message, link) values (p_account, p_kind, p_message, p_link);
$$;

-- Mark stale pending holds as expired so they stop blocking dates.
create or replace function app.expire_holds(p_unit uuid default null) returns void
language sql set search_path = app as $$
  update app.bookings set status = 'expired'
   where status = 'pending' and expires_at < now() and (p_unit is null or unit_id = p_unit);
$$;

-- Units that share physical space: the unit itself, its parent, and its children.
create or replace function app.unit_family(p_unit uuid) returns setof uuid
language sql stable set search_path = app as $$
  select p_unit
  union select parent_unit_id from app.units where id = p_unit and parent_unit_id is not null
  union select id from app.units where parent_unit_id = p_unit
$$;

create or replace function app.is_available(p_unit uuid, p_in date, p_out date, p_ignore uuid default null) returns boolean
language sql stable set search_path = app as $$
  select not exists (
      select 1 from app.bookings b
       where b.unit_id in (select app.unit_family(p_unit))
         and b.status in ('pending','confirmed','completed')
         and not (b.status = 'pending' and b.expires_at < now())
         and b.stay && daterange(p_in, p_out, '[)')
         and (p_ignore is null or b.id <> p_ignore))
     and not exists (
      select 1 from app.availability_blocks a
       where a.unit_id in (select app.unit_family(p_unit)) and a.stay && daterange(p_in, p_out, '[)'))
$$;

-- Authoritative price quote. Mirrors lib/pricing.ts, which is covered by unit tests.
create or replace function app.quote(p_unit uuid, p_in date, p_out date, p_guests int) returns jsonb
language plpgsql stable set search_path = app as $$
declare
  u app.units;
  v_nights int := p_out - p_in;
  v_sub int := 0;
  v_d date;
  v_rate int;
  v_disc_pct int := 0;
  v_disc int;
  v_service int;
begin
  select * into u from app.units where id = p_unit;
  if u.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if p_in is null or p_out is null or v_nights < 1 then return jsonb_build_object('ok', false, 'error', 'invalid_dates'); end if;
  if p_in < (now() at time zone 'Africa/Nairobi')::date then return jsonb_build_object('ok', false, 'error', 'past_dates'); end if;
  if v_nights < u.min_nights then return jsonb_build_object('ok', false, 'error', 'min_nights', 'min_nights', u.min_nights); end if;
  if v_nights > u.max_nights then return jsonb_build_object('ok', false, 'error', 'max_nights', 'max_nights', u.max_nights); end if;
  if p_guests is null or p_guests < 1 or p_guests > u.max_guests then return jsonb_build_object('ok', false, 'error', 'capacity', 'max_guests', u.max_guests); end if;
  v_d := p_in;
  while v_d < p_out loop
    select nightly_rate into v_rate from app.rate_overrides where unit_id = p_unit and stay @> v_d;
    v_sub := v_sub + coalesce(v_rate, u.nightly_rate);
    v_rate := null;
    v_d := v_d + 1;
  end loop;
  if v_nights >= 28 then v_disc_pct := u.monthly_discount_pct; elsif v_nights >= 7 then v_disc_pct := u.weekly_discount_pct; end if;
  v_disc := round(v_sub * v_disc_pct / 100.0);
  v_service := round((v_sub - v_disc) * 0.05);
  return jsonb_build_object('ok', true, 'nights', v_nights, 'subtotal', v_sub, 'discount_pct', v_disc_pct, 'discount', v_disc,
    'cleaning_fee', u.cleaning_fee, 'service_fee', v_service, 'total', v_sub - v_disc + u.cleaning_fee + v_service,
    'deposit', u.deposit, 'currency', u.currency, 'available', app.is_available(p_unit, p_in, p_out));
end $$;

-- Refund rules. Mirrors lib/cancellation.ts.
create or replace function app.refund_for(p_policy text, p_total int, p_service int, p_checkin date, p_at timestamptz) returns int
language plpgsql immutable as $$
declare v_hours numeric := extract(epoch from ((p_checkin::timestamp at time zone 'Africa/Nairobi') + interval '14 hours' - p_at)) / 3600;
begin
  if v_hours <= 0 then return 0; end if;
  if p_policy = 'flexible' then
    return case when v_hours >= 24 then p_total else round((p_total - p_service) * 0.5) end;
  elsif p_policy = 'moderate' then
    return case when v_hours >= 120 then p_total else round((p_total - p_service) * 0.5) end;
  else
    return case when v_hours >= 336 then p_total when v_hours >= 168 then round((p_total - p_service) * 0.5) else 0 end;
  end if;
end $$;

create or replace function app.new_reference() returns text
language plpgsql set search_path = app, extensions as $$
declare v text;
begin
  loop
    v := 'HS-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from app.bookings where reference = v);
  end loop;
  return v;
end $$;

-- Demo bookings may only exist on demo units, and real units only take real bookings.
create or replace function app.bookings_demo_guard() returns trigger
language plpgsql set search_path = app as $$
declare v_demo boolean;
begin
  select p.is_demo into v_demo from app.units u join app.properties p on p.id = u.property_id where u.id = new.unit_id;
  if new.is_demo is distinct from v_demo then raise exception 'demo flag mismatch' using errcode = '23514'; end if;
  if new.is_demo and new.payment_mode <> 'demo_simulated' then raise exception 'demo bookings use simulated payment' using errcode = '23514'; end if;
  if not new.is_demo and new.payment_mode <> 'provider' then raise exception 'real bookings need a payment provider' using errcode = '23514'; end if;
  return new;
end $$;
create trigger bookings_demo_guard before insert or update on app.bookings for each row execute function app.bookings_demo_guard();

-- Property card shape used by search, compare and collections.
create or replace function app.property_card(p app.properties, p_in date default null, p_out date default null, p_guests int default null) returns jsonb
language sql stable set search_path = app as $$
  select jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'name', p.name, 'property_type', p.property_type, 'neighbourhood', n.name,
    'neighbourhood_slug', n.slug, 'summary', p.summary, 'lat', p.anchor_lat, 'lon', p.anchor_lon,
    'anchor_is_exact', p.anchor_is_exact, 'is_demo', p.is_demo, 'status', p.status,
    'cancellation_policy', p.cancellation_policy, 'stay_types', p.stay_types,
    'cover', (select jsonb_build_object('url', coalesce(a.url, '/api/assets/' || a.id), 'trust_label', a.trust_label, 'caption', a.caption)
                from app.assets a where a.property_id = p.id and a.kind in ('photo','render') order by a.sort limit 1),
    'rating', (select round(avg(r.rating)::numeric, 2) from app.reviews r where r.property_id = p.id and r.status = 'published'),
    'review_count', (select count(*) from app.reviews r where r.property_id = p.id and r.status = 'published'),
    'nearby_count', (select count(*) from app.nearby_places np where np.property_id = p.id),
    'nearby_closest', (select jsonb_object_agg(category, d) from (select category, min(distance_m) d from app.nearby_places np where np.property_id = p.id group by category) x),
    'units', coalesce((select jsonb_agg(jsonb_build_object(
        'id', u.id, 'code', u.code, 'name', u.name, 'unit_type', u.unit_type, 'max_guests', u.max_guests,
        'bedrooms', u.bedrooms, 'bathrooms', u.bathrooms, 'sleeping', u.sleeping,
        'floor_area_m2', u.floor_area_m2, 'floor_area_verified', u.floor_area_verified,
        'nightly_rate', u.nightly_rate, 'weekly_discount_pct', u.weekly_discount_pct, 'monthly_discount_pct', u.monthly_discount_pct,
        'cleaning_fee', u.cleaning_fee, 'deposit', u.deposit, 'min_nights', u.min_nights, 'max_nights', u.max_nights,
        'parent_unit_id', u.parent_unit_id, 'is_bookable', u.is_bookable, 'scene_style', u.scene_style,
        'amenities', coalesce((select jsonb_object_agg(ua.amenity_code, ua.value) from app.unit_amenities ua where ua.unit_id = u.id), '{}'::jsonb),
        'quote', case when p_in is not null and p_out is not null then app.quote(u.id, p_in, p_out, coalesce(p_guests, 1)) else null end
      ) order by u.parent_unit_id nulls first, u.code) from app.units u where u.property_id = p.id), '[]'::jsonb)
  ) from app.neighbourhoods n where n.slug = p.neighbourhood
$$;
