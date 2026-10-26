-- Owner Studio and administrator API.

create or replace function app.owned_property(v app.accounts, p_property uuid) returns app.properties
language plpgsql stable set search_path = app as $$
declare p app.properties;
begin
  select * into p from app.properties where id = p_property;
  if p.id is null then raise exception 'not found' using errcode = '22023'; end if;
  if not (v.role = 'admin' or p.owner_id = v.id) then raise exception 'forbidden' using errcode = '42501'; end if;
  return p;
end $$;

create or replace function public.api_owner_dashboard(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts;
begin
  v := app.require_role(p_token, array['owner']);
  perform app.expire_holds(null);
  return jsonb_build_object(
    'profile', (select jsonb_build_object('business_name', business_name, 'verification_status', verification_status) from app.owner_profiles where account_id = v.id),
    'properties', coalesce((select jsonb_agg(app.property_card(p) || jsonb_build_object('review_note', p.review_note, 'updated_at', p.updated_at,
        'is_seed', p.seed_key is not null) order by p.created_at) from app.properties p where p.owner_id = v.id and p.status <> 'archived'), '[]'::jsonb),
    'stats', jsonb_build_object(
      'listings', (select count(*) from app.properties where owner_id = v.id and status = 'published'),
      'pending_review', (select count(*) from app.properties where owner_id = v.id and status = 'pending_review'),
      'upcoming', (select count(*) from app.bookings b join app.units u on u.id = b.unit_id join app.properties p on p.id = u.property_id
                    where p.owner_id = v.id and b.status = 'confirmed' and lower(b.stay) >= current_date),
      'revenue_confirmed', (select coalesce(sum(b.total), 0) from app.bookings b join app.units u on u.id = b.unit_id join app.properties p on p.id = u.property_id
                    where p.owner_id = v.id and b.status in ('confirmed','completed')),
      'nights_booked_30d', (select coalesce(sum(b.nights), 0) from app.bookings b join app.units u on u.id = b.unit_id join app.properties p on p.id = u.property_id
                    where p.owner_id = v.id and b.status in ('confirmed','completed') and lower(b.stay) between current_date - 30 and current_date + 30)));
end $$;

create or replace function public.api_owner_bookings(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts;
begin
  v := app.require_role(p_token, array['owner']);
  return coalesce((select jsonb_agg(app.booking_json(b, true) order by lower(b.stay))
    from app.bookings b join app.units u on u.id = b.unit_id join app.properties p on p.id = u.property_id
   where p.owner_id = v.id and b.status in ('pending','confirmed','completed','cancelled')), '[]'::jsonb);
end $$;

create or replace function public.api_owner_property(p_token text, p_property uuid) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; p app.properties;
begin
  v := app.require_role(p_token, array['owner','admin']);
  p := app.owned_property(v, p_property);
  return app.property_detail(p) || jsonb_build_object('review_note', p.review_note, 'is_seed', p.seed_key is not null,
    'blocks', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'unit_id', a.unit_id, 'from', lower(a.stay), 'to', upper(a.stay), 'reason', a.reason) order by lower(a.stay))
      from app.availability_blocks a join app.units u on u.id = a.unit_id where u.property_id = p.id and upper(a.stay) >= current_date), '[]'::jsonb),
    'rates', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'unit_id', r.unit_id, 'from', lower(r.stay), 'to', upper(r.stay), 'nightly_rate', r.nightly_rate))
      from app.rate_overrides r join app.units u on u.id = r.unit_id where u.property_id = p.id), '[]'::jsonb));
end $$;

-- Create or update a property and its primary unit in one call.
create or replace function public.api_owner_save_property(p_token text, p_property uuid, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; p app.properties; d jsonb := coalesce(p_data, '{}'::jsonb); v_pid uuid; v_uid uuid; n app.neighbourhoods; v_slug text; k text;
begin
  v := app.require_role(p_token, array['owner']);
  select * into n from app.neighbourhoods where slug = d->>'neighbourhood';
  if n.slug is null then return jsonb_build_object('ok', false, 'error', 'invalid_neighbourhood'); end if;
  if p_property is not null then
    p := app.owned_property(v, p_property);
    if p.seed_key is not null and v.is_protected then return jsonb_build_object('ok', false, 'error', 'demo_restricted'); end if;
    update app.properties set name = d->>'name', property_type = d->>'property_type', neighbourhood = n.slug,
      summary = coalesce(d->>'summary', ''), description = coalesce(d->>'description', ''), house_rules = coalesce(d->>'house_rules', ''),
      cancellation_policy = d->>'cancellation_policy',
      stay_types = coalesce((select array_agg(x) from jsonb_array_elements_text(d->'stay_types') x), array['short']),
      updated_at = now(),
      status = case when status = 'rejected' then 'draft' else status end
     where id = p.id;
    v_pid := p.id;
    select id into v_uid from app.units where property_id = v_pid and parent_unit_id is null order by code limit 1;
  else
    if (select count(*) from app.properties where owner_id = v.id and status in ('draft','pending_review')) >= 10 then
      return jsonb_build_object('ok', false, 'error', 'limit');
    end if;
    v_slug := trim(both '-' from regexp_replace(lower(d->>'name'), '[^a-z0-9]+', '-', 'g'));
    v_slug := left(v_slug, 60) || '-' || substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 5);
    insert into app.properties(slug, owner_id, name, property_type, neighbourhood, summary, description, house_rules, anchor_lat, anchor_lon,
                               cancellation_policy, stay_types, status, is_demo)
    values (v_slug, v.id, d->>'name', d->>'property_type', n.slug, coalesce(d->>'summary', ''), coalesce(d->>'description', ''),
            coalesce(d->>'house_rules', ''), n.lat, n.lon, d->>'cancellation_policy',
            coalesce((select array_agg(x) from jsonb_array_elements_text(d->'stay_types') x), array['short']), 'draft', v.is_demo)
    returning id into v_pid;
    insert into app.units(property_id, code, name, unit_type, max_guests, nightly_rate)
    values (v_pid, 'U-1', d->>'name', coalesce(d->>'unit_type', 'apartment'), 2, 5000) returning id into v_uid;
    insert into app.verification_records(entity_type, entity_id, field, status, method, notes)
    values ('property', v_pid, 'listing', 'owner_provided', 'owner_submission', 'Details supplied by the owner; not independently verified.');
  end if;
  update app.units set
    unit_type = coalesce(d->>'unit_type', unit_type), max_guests = coalesce((d->>'max_guests')::int, max_guests),
    bedrooms = case when d ? 'bedrooms' then nullif(d->>'bedrooms', '')::int else bedrooms end,
    bathrooms = case when d ? 'bathrooms' then nullif(d->>'bathrooms', '')::numeric else bathrooms end,
    floor_area_m2 = case when d ? 'floor_area_m2' then nullif(d->>'floor_area_m2', '')::numeric else floor_area_m2 end,
    floor_area_verified = false,
    nightly_rate = coalesce((d->>'nightly_rate')::int, nightly_rate), weekly_discount_pct = coalesce((d->>'weekly_discount_pct')::int, weekly_discount_pct),
    monthly_discount_pct = coalesce((d->>'monthly_discount_pct')::int, monthly_discount_pct), cleaning_fee = coalesce((d->>'cleaning_fee')::int, cleaning_fee),
    deposit = coalesce((d->>'deposit')::int, deposit), min_nights = coalesce((d->>'min_nights')::int, min_nights)
   where id = v_uid;
  if d ? 'amenities' then
    for k in select jsonb_object_keys(d->'amenities') loop
      if exists (select 1 from app.amenities where code = k) and d->'amenities'->>k in ('yes','no','unknown') then
        insert into app.unit_amenities(unit_id, amenity_code, value, info_source) values (v_uid, k, d->'amenities'->>k, 'owner')
          on conflict (unit_id, amenity_code) do update set value = excluded.value, info_source = 'owner';
      end if;
    end loop;
  end if;
  perform app.audit(v, case when p_property is null then 'property.create' else 'property.update' end, 'property', v_pid::text);
  return jsonb_build_object('ok', true, 'id', v_pid, 'slug', (select slug from app.properties where id = v_pid));
end $$;

create or replace function public.api_owner_save_space(p_token text, p_unit uuid, p_space uuid, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; v_prop uuid; p app.properties; d jsonb := coalesce(p_data, '{}'::jsonb); v_id uuid := p_space;
begin
  v := app.require_role(p_token, array['owner']);
  select property_id into v_prop from app.units where id = p_unit;
  p := app.owned_property(v, v_prop);
  if p.seed_key is not null and v.is_protected then return jsonb_build_object('ok', false, 'error', 'demo_restricted'); end if;
  if d ? 'delete' and v_id is not null then delete from app.spaces where id = v_id and unit_id = p_unit; return jsonb_build_object('ok', true); end if;
  if v_id is null then
    insert into app.spaces(unit_id, name, kind, sort, plan_x, plan_z, width_m, depth_m)
    values (p_unit, d->>'name', d->>'kind', coalesce((d->>'sort')::int, 0), coalesce((d->>'x')::numeric, 0), coalesce((d->>'z')::numeric, 0),
            (d->>'width')::numeric, (d->>'depth')::numeric) returning id into v_id;
  else
    update app.spaces set name = d->>'name', kind = d->>'kind', plan_x = coalesce((d->>'x')::numeric, plan_x), plan_z = coalesce((d->>'z')::numeric, plan_z),
      width_m = (d->>'width')::numeric, depth_m = (d->>'depth')::numeric, dimensions_verified = false where id = v_id and unit_id = p_unit;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.api_owner_block_dates(p_token text, p_unit uuid, p_from date, p_to date, p_remove uuid) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; v_prop uuid;
begin
  v := app.require_role(p_token, array['owner']);
  select property_id into v_prop from app.units where id = p_unit;
  perform app.owned_property(v, v_prop);
  if p_remove is not null then
    delete from app.availability_blocks where id = p_remove and unit_id = p_unit;
    return jsonb_build_object('ok', found);
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > 366 then return jsonb_build_object('ok', false, 'error', 'invalid_dates'); end if;
  if not app.is_available(p_unit, p_from, p_to) then return jsonb_build_object('ok', false, 'error', 'conflict'); end if;
  insert into app.availability_blocks(unit_id, stay) values (p_unit, daterange(p_from, p_to, '[)'));
  perform app.audit(v, 'availability.block', 'unit', p_unit::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_owner_set_rate(p_token text, p_unit uuid, p_from date, p_to date, p_rate int, p_remove uuid) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; v_prop uuid;
begin
  v := app.require_role(p_token, array['owner']);
  select property_id into v_prop from app.units where id = p_unit;
  perform app.owned_property(v, v_prop);
  if p_remove is not null then delete from app.rate_overrides where id = p_remove and unit_id = p_unit; return jsonb_build_object('ok', found); end if;
  if p_from is null or p_to is null or p_to <= p_from or p_rate not between 500 and 2000000 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  begin
    insert into app.rate_overrides(unit_id, stay, nightly_rate) values (p_unit, daterange(p_from, p_to, '[)'), p_rate);
  exception when exclusion_violation then return jsonb_build_object('ok', false, 'error', 'overlap'); end;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_owner_add_asset(p_token text, p_property uuid, p_kind text, p_mime text, p_base64 text, p_caption text, p_is_exact_model boolean)
returns jsonb language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; p app.properties; v_id uuid; v_data bytea; v_label text;
begin
  v := app.require_role(p_token, array['owner']);
  p := app.owned_property(v, p_property);
  if p.seed_key is not null and v.is_protected then return jsonb_build_object('ok', false, 'error', 'demo_restricted'); end if;
  if p_kind not in ('photo','model','floor_plan') then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if not ((p_kind in ('photo','floor_plan') and p_mime in ('image/jpeg','image/png','image/webp')) or (p_kind = 'model' and p_mime = 'model/gltf-binary')) then
    return jsonb_build_object('ok', false, 'error', 'unsupported_type');
  end if;
  if (select count(*) from app.assets where property_id = p.id) >= 20 then return jsonb_build_object('ok', false, 'error', 'limit'); end if;
  v_data := decode(p_base64, 'base64');
  if octet_length(v_data) > 4194304 then return jsonb_build_object('ok', false, 'error', 'too_large'); end if;
  v_label := case p_kind when 'photo' then 'actual_photo' when 'floor_plan' then 'owner_floor_plan'
                         else case when coalesce(p_is_exact_model, false) then 'verified_model' else 'illustrative_model' end end;
  -- Owners can claim a model is property-specific, but it only shows as verified once an administrator verifies it.
  if v_label = 'verified_model' then v_label := 'illustrative_model'; end if;
  insert into app.assets(property_id, kind, trust_label, mime, bytes, caption, source, sort)
  values (p.id, p_kind, v_label, p_mime, octet_length(v_data), left(coalesce(p_caption, ''), 200), 'owner',
          (select coalesce(max(sort), 0) + 1 from app.assets where property_id = p.id)) returning id into v_id;
  insert into app.asset_files(asset_id, data) values (v_id, v_data);
  if p_kind = 'model' and coalesce(p_is_exact_model, false) then
    insert into app.verification_records(entity_type, entity_id, field, status, method, notes)
    values ('property', p.id, 'model:' || v_id, 'owner_provided', 'owner_claim', 'Owner states this model is property-specific; awaiting verification.');
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.api_owner_delete_asset(p_token text, p_asset uuid) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; a app.assets; p app.properties;
begin
  v := app.require_role(p_token, array['owner']);
  select * into a from app.assets where id = p_asset;
  if a.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  p := app.owned_property(v, a.property_id);
  if a.source <> 'owner' then return jsonb_build_object('ok', false, 'error', 'demo_restricted'); end if;
  delete from app.assets where id = a.id;
  return jsonb_build_object('ok', true);
end $$;

-- Asset bytes for /api/assets/[id]. Owner uploads on unpublished listings stay private.
create or replace function public.api_asset_file(p_asset uuid, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = app, extensions as $$
declare a app.assets; p app.properties; v app.accounts;
begin
  select * into a from app.assets where id = p_asset;
  if a.id is null then return null; end if;
  select * into p from app.properties where id = a.property_id;
  if p.status <> 'published' then
    v := app.try_actor(p_token);
    if v.id is null or not (v.role = 'admin' or v.id = p.owner_id) then return null; end if;
  end if;
  return (select jsonb_build_object('mime', a.mime, 'data', encode(f.data, 'base64')) from app.asset_files f where f.asset_id = a.id);
end $$;

create or replace function public.api_owner_submit(p_token text, p_property uuid) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; p app.properties;
begin
  v := app.require_role(p_token, array['owner']);
  p := app.owned_property(v, p_property);
  if p.status not in ('draft','rejected') then return jsonb_build_object('ok', false, 'error', 'invalid_state'); end if;
  if length(p.summary) < 10 or length(p.description) < 30 then return jsonb_build_object('ok', false, 'error', 'incomplete'); end if;
  update app.properties set status = 'pending_review', review_note = null, updated_at = now() where id = p.id;
  perform app.notify(a.id, 'listing_review', 'New listing to review: ' || p.name, '/admin/listings') from app.accounts a where a.role = 'admin';
  perform app.audit(v, 'property.submit', 'property', p.id::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_owner_delete_property(p_token text, p_property uuid) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; p app.properties;
begin
  v := app.require_role(p_token, array['owner']);
  p := app.owned_property(v, p_property);
  if p.seed_key is not null then return jsonb_build_object('ok', false, 'error', 'demo_restricted'); end if;
  if exists (select 1 from app.bookings b join app.units u on u.id = b.unit_id where u.property_id = p.id) then
    update app.properties set status = 'archived' where id = p.id;
  else
    delete from app.properties where id = p.id;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Administrators ----------
create or replace function public.api_admin_overview(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts;
begin
  v := app.require_role(p_token, array['admin']);
  return jsonb_build_object(
    'counts', jsonb_build_object(
      'published', (select count(*) from app.properties where status = 'published'),
      'published_demo', (select count(*) from app.properties where status = 'published' and is_demo),
      'pending_review', (select count(*) from app.properties where status = 'pending_review'),
      'owners', (select count(*) from app.accounts where role = 'owner'),
      'guests', (select count(*) from app.accounts where role = 'guest'),
      'bookings_live', (select count(*) from app.bookings where status in ('confirmed','pending')),
      'bookings_demo', (select count(*) from app.bookings where is_demo),
      'reviews_pending', (select count(*) from app.reviews where status = 'pending'),
      'nearby_places', (select count(*) from app.nearby_places)),
    'by_neighbourhood', (select jsonb_object_agg(n.name, (select count(*) from app.properties p where p.neighbourhood = n.slug and p.status = 'published')) from app.neighbourhoods n),
    'pending', coalesce((select jsonb_agg(app.property_card(p) || jsonb_build_object('owner', (select display_name from app.accounts where id = p.owner_id),
        'submitted_at', p.updated_at, 'description', p.description) order by p.updated_at) from app.properties p where p.status = 'pending_review'), '[]'::jsonb),
    'owners_list', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.display_name, 'email', a.email, 'business_name', op.business_name,
        'verification_status', op.verification_status, 'is_demo', a.is_demo) order by a.created_at) from app.accounts a join app.owner_profiles op on op.account_id = a.id), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'rating', r.rating, 'body', r.body, 'status', r.status, 'property', p.name,
        'author', a.display_name, 'created_at', r.created_at) order by r.created_at desc)
      from app.reviews r join app.properties p on p.id = r.property_id join app.accounts a on a.id = r.author_id where r.status = 'pending'), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(x order by (x->>'at') desc) from (select jsonb_build_object('action', action, 'role', actor_role, 'target', target_type, 'at', created_at) x
      from app.audit_logs order by created_at desc limit 30) y), '[]'::jsonb));
end $$;

create or replace function public.api_admin_review_listing(p_token text, p_property uuid, p_decision text, p_note text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; p app.properties;
begin
  v := app.require_role(p_token, array['admin']);
  select * into p from app.properties where id = p_property for update;
  if p.id is null or p.status <> 'pending_review' then return jsonb_build_object('ok', false, 'error', 'invalid_state'); end if;
  if p_decision not in ('approve','reject') then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if p_decision = 'reject' and length(trim(coalesce(p_note, ''))) < 5 then return jsonb_build_object('ok', false, 'error', 'note_required'); end if;
  update app.properties set status = case when p_decision = 'approve' then 'published' else 'rejected' end,
    review_note = nullif(trim(coalesce(p_note, '')), ''), published_at = case when p_decision = 'approve' then now() else published_at end
   where id = p.id;
  perform app.notify(p.owner_id, 'listing_' || p_decision, 'Your listing ' || p.name || case when p_decision = 'approve' then ' was approved and is live.' else ' needs changes: ' || trim(p_note) end, '/owner');
  perform app.audit(v, 'property.' || p_decision, 'property', p.id::text, jsonb_build_object('note', p_note));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_admin_verify_owner(p_token text, p_owner uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts;
begin
  v := app.require_role(p_token, array['admin']);
  if p_status not in ('verified','rejected','pending','unverified') then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if exists (select 1 from app.accounts where id = p_owner and is_protected) then return jsonb_build_object('ok', false, 'error', 'demo_restricted'); end if;
  update app.owner_profiles set verification_status = p_status, verified_at = case when p_status = 'verified' then now() end,
    verified_by = case when p_status = 'verified' then v.id end where account_id = p_owner;
  perform app.audit(v, 'owner.' || p_status, 'account', p_owner::text);
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.api_admin_moderate_review(p_token text, p_review uuid, p_decision text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts;
begin
  v := app.require_role(p_token, array['admin']);
  if p_decision not in ('published','rejected') then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  update app.reviews set status = p_decision, moderated_by = v.id where id = p_review and status = 'pending';
  perform app.audit(v, 'review.' || p_decision, 'review', p_review::text);
  return jsonb_build_object('ok', found);
end $$;

-- Lock down: only the api_* functions are callable from the Data API.
revoke execute on all functions in schema app from public, anon, authenticated;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'api\_%' loop
    execute format('revoke all on function %s from public', f.sig);
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;
end $$;
