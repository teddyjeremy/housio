-- Public API: authentication, search, property detail, quotes. Callable with the
-- publishable key; every function pins search_path and trusts nothing from the browser.

create or replace function public.api_login(p_email text, p_password text, p_client text)
returns jsonb language plpgsql security definer set search_path = app, extensions as $$
declare v_acc app.accounts; v_token text; v_ok boolean := false; v_email text := lower(trim(coalesce(p_email, '')));
  v_client text := left(coalesce(p_client, 'unknown'), 80);
begin
  if length(v_email) > 200 or p_password is null or length(p_password) > 200 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if (select count(*) from app.login_attempts where identifier = v_email and attempted_at > now() - interval '15 minutes') >= 8
     or (select count(*) from app.login_attempts where client_key = v_client and attempted_at > now() - interval '15 minutes') >= 40 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  select * into v_acc from app.accounts where email = v_email::extensions.citext;
  if v_acc.id is not null then
    v_ok := extensions.crypt(p_password, v_acc.password_hash) = v_acc.password_hash and v_acc.status = 'active';
  else
    perform extensions.crypt(p_password, extensions.gen_salt('bf', 10));
  end if;
  if not v_ok then
    insert into app.login_attempts(identifier, client_key) values (v_email, v_client);
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  delete from app.login_attempts where identifier = v_email or attempted_at < now() - interval '1 day';
  delete from app.sessions where expires_at < now();
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into app.sessions(token_hash, account_id, expires_at) values (app.hash_token(v_token), v_acc.id, now() + interval '12 hours');
  update app.accounts set last_login_at = now() where id = v_acc.id;
  return jsonb_build_object('ok', true, 'token', v_token, 'role', v_acc.role);
end $$;

create or replace function public.api_register(p_email text, p_password text, p_name text, p_role text, p_client text)
returns jsonb language plpgsql security definer set search_path = app, extensions as $$
declare v_id uuid; v_email text := lower(trim(coalesce(p_email, ''))); v_token text;
begin
  if p_role not in ('guest','owner') then return jsonb_build_object('ok', false, 'error', 'invalid_role'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then return jsonb_build_object('ok', false, 'error', 'invalid_email'); end if;
  if v_email like '%@demo.housio.local' then return jsonb_build_object('ok', false, 'error', 'reserved'); end if;
  if length(coalesce(p_password, '')) < 10 or length(p_password) > 128 then return jsonb_build_object('ok', false, 'error', 'weak_password'); end if;
  if length(trim(coalesce(p_name, ''))) < 1 or length(p_name) > 80 then return jsonb_build_object('ok', false, 'error', 'invalid_name'); end if;
  if (select count(*) from app.accounts where created_at > now() - interval '1 hour') > 200 then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  if exists (select 1 from app.accounts where email = v_email::extensions.citext) then return jsonb_build_object('ok', false, 'error', 'exists'); end if;
  insert into app.accounts(email, password_hash, role, display_name)
  values (v_email, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), p_role, trim(p_name)) returning id into v_id;
  if p_role = 'owner' then insert into app.owner_profiles(account_id, business_name) values (v_id, trim(p_name)); end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into app.sessions(token_hash, account_id, expires_at) values (app.hash_token(v_token), v_id, now() + interval '12 hours');
  perform app.notify(v_id, 'welcome', 'Welcome to Housio.', null);
  return jsonb_build_object('ok', true, 'token', v_token, 'role', p_role);
end $$;

create or replace function public.api_logout(p_token text) returns void
language sql security definer set search_path = app, extensions as $$
  delete from app.sessions where token_hash = app.hash_token(p_token);
$$;

create or replace function public.api_me(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts;
begin
  v := app.try_actor(p_token);
  if v.id is null then return null; end if;
  return jsonb_build_object('id', v.id, 'role', v.role, 'display_name', v.display_name, 'email', v.email,
    'is_demo', v.is_demo, 'is_protected', v.is_protected,
    'unread', (select count(*) from app.notifications where account_id = v.id and read_at is null),
    'owner_verification', (select verification_status from app.owner_profiles where account_id = v.id));
end $$;

create or replace function public.api_neighbourhoods() returns jsonb
language sql stable security definer set search_path = app as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', n.slug, 'name', n.name, 'lat', n.lat, 'lon', n.lon,
    'count', (select count(*) from app.properties p where p.neighbourhood = n.slug and p.status = 'published')) order by n.name), '[]'::jsonb)
  from app.neighbourhoods n
$$;

-- Search published listings. Filters are optional; dates and guests produce quotes and availability.
create or replace function public.api_search(p_filters jsonb) returns jsonb
language plpgsql stable security definer set search_path = app as $$
declare
  f jsonb := coalesce(p_filters, '{}'::jsonb);
  v_in date := nullif(f->>'checkin', '')::date;
  v_out date := nullif(f->>'checkout', '')::date;
  v_guests int := coalesce(nullif(f->>'guests', '')::int, 1);
  v_hood text := nullif(f->>'neighbourhood', '');
  v_type text := nullif(f->>'type', '');
  v_q text := nullif(trim(f->>'q'), '');
  v_max int := nullif(f->>'max_price', '')::int;
  v_min int := nullif(f->>'min_price', '')::int;
  v_amen text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(f->'amenities', '[]'::jsonb)) x), array[]::text[]);
  v_stay text := nullif(f->>'stay', '');
begin
  if v_in is not null and v_out is not null and v_out <= v_in then v_in := null; v_out := null; end if;
  return coalesce((
    select jsonb_agg(app.property_card(p, v_in, v_out, v_guests) order by p.name)
      from app.properties p
     where p.status = 'published'
       and (v_hood is null or p.neighbourhood = v_hood)
       and (v_type is null or p.property_type = v_type)
       and (v_stay is null or v_stay = any(p.stay_types))
       and (v_q is null or p.name ilike '%' || v_q || '%' or p.summary ilike '%' || v_q || '%'
            or exists (select 1 from app.neighbourhoods n where n.slug = p.neighbourhood and n.name ilike '%' || v_q || '%'))
       and exists (select 1 from app.units u where u.property_id = p.id and u.is_bookable
                    and u.max_guests >= v_guests
                    and (v_max is null or u.nightly_rate <= v_max)
                    and (v_min is null or u.nightly_rate >= v_min)
                    and (cardinality(v_amen) = 0 or (select count(*) from app.unit_amenities ua where ua.unit_id = u.id
                          and ua.amenity_code = any(v_amen) and ua.value = 'yes') = cardinality(v_amen)))
  ), '[]'::jsonb);
end $$;

create or replace function app.property_detail(p app.properties) returns jsonb
language sql stable set search_path = app as $$
  select app.property_card(p) || jsonb_build_object(
    'description', p.description, 'house_rules', p.house_rules, 'anchor_note', p.anchor_note,
    'owner', (select jsonb_build_object('name', op.business_name, 'verification_status', op.verification_status)
                from app.owner_profiles op where op.account_id = p.owner_id),
    'spaces', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'unit_id', s.unit_id, 'name', s.name, 'kind', s.kind, 'sort', s.sort,
        'x', s.plan_x, 'z', s.plan_z, 'width', s.width_m, 'depth', s.depth_m, 'height', s.height_m,
        'dimensions_verified', s.dimensions_verified, 'features', s.features, 'separately_bookable_unit_id', s.separately_bookable_unit_id) order by s.sort)
      from app.spaces s join app.units u on u.id = s.unit_id where u.property_id = p.id), '[]'::jsonb),
    'assets', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'unit_id', a.unit_id, 'kind', a.kind, 'trust_label', a.trust_label,
        'url', coalesce(a.url, '/api/assets/' || a.id), 'caption', a.caption, 'source', a.source, 'licence', a.licence) order by a.sort)
      from app.assets a where a.property_id = p.id), '[]'::jsonb),
    'amenity_details', coalesce((select jsonb_agg(jsonb_build_object('unit_id', ua.unit_id, 'code', am.code, 'label', am.label,
        'category', am.category, 'value', ua.value, 'detail', ua.detail, 'info_source', ua.info_source) order by am.category, am.label)
      from app.unit_amenities ua join app.amenities am on am.code = ua.amenity_code join app.units u on u.id = ua.unit_id
     where u.property_id = p.id), '[]'::jsonb),
    'nearby', coalesce((select jsonb_agg(jsonb_build_object('id', np.id, 'name', np.name, 'category', np.category, 'subtype', np.subtype,
        'lat', np.lat, 'lon', np.lon, 'distance_m', np.distance_m, 'distance_kind', np.distance_kind,
        'source_provider', np.source_provider, 'source_id', np.source_id, 'source_url', np.source_url, 'licence', np.licence,
        'retrieved_at', np.retrieved_at, 'address', np.address, 'phone', np.phone, 'website', np.website,
        'opening_hours', np.opening_hours, 'verification_status', np.verification_status) order by np.category, np.distance_m)
      from app.nearby_places np where np.property_id = p.id), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'rating', r.rating, 'body', r.body,
        'author', split_part(a.display_name, ' ', 1), 'created_at', r.created_at) order by r.created_at desc)
      from app.reviews r join app.accounts a on a.id = r.author_id where r.property_id = p.id and r.status = 'published'), '[]'::jsonb),
    'verification', coalesce((select jsonb_agg(jsonb_build_object('field', v.field, 'status', v.status, 'method', v.method, 'notes', v.notes, 'at', v.created_at))
      from app.verification_records v where v.entity_id = p.id), '[]'::jsonb)
  )
$$;

create or replace function public.api_property(p_slug text, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = app, extensions as $$
declare p app.properties; v app.accounts;
begin
  select * into p from app.properties where slug = p_slug;
  if p.id is null then return null; end if;
  if p.status <> 'published' then
    -- Owners preview their own drafts; administrators review any listing.
    v := app.try_actor(p_token);
    if v.id is null or not (v.role = 'admin' or (v.role = 'owner' and v.id = p.owner_id)) then return null; end if;
  end if;
  return app.property_detail(p);
end $$;

create or replace function public.api_compare(p_slugs text[], p_checkin date, p_checkout date, p_guests int) returns jsonb
language sql stable security definer set search_path = app as $$
  select coalesce(jsonb_agg(app.property_detail(p) || jsonb_build_object('card', app.property_card(p, p_checkin, p_checkout, coalesce(p_guests, 1)))
         order by array_position(p_slugs, p.slug)), '[]'::jsonb)
    from app.properties p where p.slug = any(p_slugs[1:3]) and p.status = 'published'
$$;

create or replace function public.api_quote(p_unit uuid, p_checkin date, p_checkout date, p_guests int) returns jsonb
language sql stable security definer set search_path = app as $$
  select case when exists (select 1 from app.units u join app.properties p on p.id = u.property_id where u.id = p_unit and p.status = 'published' and u.is_bookable)
    then app.quote(p_unit, p_checkin, p_checkout, p_guests) else jsonb_build_object('ok', false, 'error', 'not_found') end
$$;

-- Booked or blocked nights for the calendar. Never reveals who booked.
create or replace function public.api_unavailable_dates(p_unit uuid, p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = app as $$
  select coalesce(jsonb_agg(distinct d::date order by d::date), '[]'::jsonb) from (
    select generate_series(greatest(lower(r), p_from), least(upper(r), p_to) - 1, interval '1 day') d from (
      select b.stay r from app.bookings b where b.unit_id in (select app.unit_family(p_unit))
        and b.status in ('pending','confirmed','completed') and not (b.status = 'pending' and b.expires_at < now())
      union all select a.stay from app.availability_blocks a where a.unit_id in (select app.unit_family(p_unit))
    ) x where x.r && daterange(p_from, p_to, '[)')
  ) y where p_to - p_from <= 400
$$;

create or replace function public.api_amenities() returns jsonb
language sql stable security definer set search_path = app as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', code, 'label', label, 'category', category) order by category, label), '[]'::jsonb) from app.amenities
$$;

create or replace function public.api_shared_collection(p_share text, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = app, extensions as $$
declare c app.collections; v app.accounts;
begin
  select * into c from app.collections where share_token = p_share;
  if c.id is null then return null; end if;
  v := app.try_actor(p_token);
  return jsonb_build_object('id', c.id, 'name', c.name, 'share_token', c.share_token,
    'owner_name', (select split_part(display_name, ' ', 1) from app.accounts where id = c.owner_id),
    'is_owner', v.id is not null and v.id = c.owner_id,
    'items', coalesce((select jsonb_agg(app.property_card(p) || jsonb_build_object(
        'votes_up', (select count(*) from app.collection_votes cv where cv.collection_id = c.id and cv.property_id = p.id and cv.vote = 1),
        'votes_down', (select count(*) from app.collection_votes cv where cv.collection_id = c.id and cv.property_id = p.id and cv.vote = -1),
        'my_vote', (select vote from app.collection_votes cv where cv.collection_id = c.id and cv.property_id = p.id and cv.voter_id = v.id),
        'note', ci.note) order by ci.added_at)
      from app.collection_items ci join app.properties p on p.id = ci.property_id where ci.collection_id = c.id and p.status = 'published'), '[]'::jsonb));
end $$;
