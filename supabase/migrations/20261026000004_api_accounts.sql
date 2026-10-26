-- Guest, owner and administrator API.

-- ---------- Guests: bookings ----------
create or replace function public.api_create_booking(p_token text, p_unit uuid, p_checkin date, p_checkout date, p_guests int, p_names text[])
returns jsonb language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; u app.units; p app.properties; q jsonb; v_root uuid; v_id uuid; v_ref text; n text;
begin
  v := app.require_role(p_token, array['guest','owner','admin']);
  select * into u from app.units where id = p_unit;
  select * into p from app.properties where id = u.property_id;
  if u.id is null or p.status <> 'published' or not u.is_bookable then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if p.owner_id = v.id then return jsonb_build_object('ok', false, 'error', 'own_listing'); end if;
  if coalesce(array_length(p_names, 1), 0) > p_guests then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if (select count(*) from app.bookings where guest_id = v.id and status = 'pending' and expires_at > now()) >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many_holds');
  end if;
  -- Serialise bookings for units that share space, then re-check on the server.
  v_root := coalesce(u.parent_unit_id, u.id);
  perform 1 from app.units where id = v_root for update;
  perform app.expire_holds(null);
  q := app.quote(u.id, p_checkin, p_checkout, p_guests);
  if not (q->>'ok')::boolean then return q; end if;
  if not (q->>'available')::boolean then return jsonb_build_object('ok', false, 'error', 'unavailable'); end if;
  v_ref := app.new_reference();
  begin
    insert into app.bookings(reference, unit_id, guest_id, stay, guests, status, nights, subtotal, discount, cleaning_fee, service_fee, total,
                             deposit, cancellation_policy, is_demo, payment_mode, expires_at)
    values (v_ref, u.id, v.id, daterange(p_checkin, p_checkout, '[)'), p_guests, 'pending', (q->>'nights')::int, (q->>'subtotal')::int,
            (q->>'discount')::int, (q->>'cleaning_fee')::int, (q->>'service_fee')::int, (q->>'total')::int, (q->>'deposit')::int,
            p.cancellation_policy, p.is_demo, case when p.is_demo then 'demo_simulated' else 'provider' end, now() + interval '15 minutes')
    returning id into v_id;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end;
  if p_names is not null then
    foreach n in array p_names loop
      if length(trim(n)) > 0 then insert into app.booking_guests(booking_id, full_name) values (v_id, left(trim(n), 100)); end if;
    end loop;
  end if;
  perform app.audit(v, 'booking.hold', 'booking', v_id::text, jsonb_build_object('unit', u.id));
  return jsonb_build_object('ok', true, 'booking_id', v_id, 'reference', v_ref, 'expires_at', now() + interval '15 minutes', 'quote', q);
end $$;

-- Completes payment. Demo listings use a simulated payment that never moves money;
-- real listings require a configured payment provider, which is not part of this build.
create or replace function public.api_pay_booking(p_token text, p_booking uuid, p_outcome text)
returns jsonb language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; b app.bookings; p app.properties;
begin
  v := app.require_role(p_token, array['guest','owner','admin']);
  select * into b from app.bookings where id = p_booking and guest_id = v.id for update;
  if b.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if b.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'not_pending', 'status', b.status); end if;
  if b.expires_at < now() then
    update app.bookings set status = 'expired' where id = b.id;
    return jsonb_build_object('ok', false, 'error', 'hold_expired');
  end if;
  if not app.is_available(b.unit_id, lower(b.stay), upper(b.stay), b.id) then
    update app.bookings set status = 'expired' where id = b.id;
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;
  if b.payment_mode = 'provider' then return jsonb_build_object('ok', false, 'error', 'payment_provider_not_configured'); end if;
  if p_outcome = 'fail' then
    insert into app.payments(booking_id, mode, outcome, amount) values (b.id, b.payment_mode, 'failed', b.total);
    update app.bookings set status = 'payment_failed' where id = b.id;
    perform app.notify(v.id, 'payment_failed', 'Payment for ' || b.reference || ' did not go through. Your dates were released.', '/account/bookings');
    return jsonb_build_object('ok', false, 'error', 'payment_failed');
  end if;
  insert into app.payments(booking_id, mode, outcome, amount) values (b.id, b.payment_mode, 'succeeded', b.total);
  update app.bookings set status = 'confirmed', confirmed_at = now(), expires_at = null where id = b.id;
  select p2.* into p from app.properties p2 join app.units u on u.property_id = p2.id where u.id = b.unit_id;
  perform app.notify(v.id, 'booking_confirmed', 'Booking ' || b.reference || ' at ' || p.name || ' is confirmed.', '/account/bookings/' || b.reference);
  perform app.notify(p.owner_id, 'new_booking', 'New booking ' || b.reference || ' for ' || p.name || '.', '/owner/bookings');
  perform app.audit(v, 'booking.confirm', 'booking', b.id::text);
  return jsonb_build_object('ok', true, 'reference', b.reference);
end $$;

create or replace function app.booking_json(b app.bookings, p_for_owner boolean default false) returns jsonb
language sql stable set search_path = app as $$
  select jsonb_build_object('id', b.id, 'reference', b.reference, 'status', b.status, 'checkin', lower(b.stay), 'checkout', upper(b.stay),
    'nights', b.nights, 'guests', b.guests, 'subtotal', b.subtotal, 'discount', b.discount, 'cleaning_fee', b.cleaning_fee,
    'service_fee', b.service_fee, 'total', b.total, 'deposit', b.deposit, 'refund_amount', b.refund_amount, 'currency', b.currency,
    'cancellation_policy', b.cancellation_policy, 'is_demo', b.is_demo, 'payment_mode', b.payment_mode, 'expires_at', b.expires_at,
    'created_at', b.created_at, 'unit', jsonb_build_object('id', u.id, 'code', u.code, 'name', u.name),
    'property', jsonb_build_object('slug', p.slug, 'name', p.name, 'neighbourhood', n.name),
    'guest_name', case when p_for_owner then (select display_name from app.accounts where id = b.guest_id) else null end,
    'guest_names', (select coalesce(jsonb_agg(full_name), '[]'::jsonb) from app.booking_guests where booking_id = b.id),
    'can_review', b.status = 'completed' and not exists (select 1 from app.reviews r where r.booking_id = b.id),
    'refund_if_cancelled_now', case when b.status = 'confirmed' then app.refund_for(b.cancellation_policy, b.total, b.service_fee, lower(b.stay), now()) end)
  from app.units u join app.properties p on p.id = u.property_id join app.neighbourhoods n on n.slug = p.neighbourhood where u.id = b.unit_id
$$;

create or replace function public.api_my_bookings(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts;
begin
  v := app.require_role(p_token, array['guest','owner','admin']);
  perform app.expire_holds(null);
  update app.bookings set status = 'completed' where guest_id = v.id and status = 'confirmed' and upper(stay) <= (now() at time zone 'Africa/Nairobi')::date;
  return coalesce((select jsonb_agg(app.booking_json(b) order by lower(b.stay) desc) from app.bookings b where b.guest_id = v.id), '[]'::jsonb);
end $$;

create or replace function public.api_booking(p_token text, p_reference text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; b app.bookings;
begin
  v := app.require_role(p_token, array['guest','owner','admin']);
  select * into b from app.bookings where reference = upper(p_reference) and guest_id = v.id;
  if b.id is null then return null; end if;
  return app.booking_json(b);
end $$;

create or replace function public.api_cancel_booking(p_token text, p_booking uuid) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; b app.bookings; v_refund int;
begin
  v := app.require_role(p_token, array['guest','owner','admin']);
  select * into b from app.bookings where id = p_booking and guest_id = v.id for update;
  if b.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if b.status = 'pending' then
    update app.bookings set status = 'cancelled', cancelled_at = now(), refund_amount = 0 where id = b.id;
    return jsonb_build_object('ok', true, 'refund', 0);
  end if;
  if b.status <> 'confirmed' then return jsonb_build_object('ok', false, 'error', 'not_cancellable'); end if;
  v_refund := app.refund_for(b.cancellation_policy, b.total, b.service_fee, lower(b.stay), now());
  update app.bookings set status = 'cancelled', cancelled_at = now(), refund_amount = v_refund where id = b.id;
  if v_refund > 0 then insert into app.payments(booking_id, mode, outcome, amount) values (b.id, b.payment_mode, 'refunded', v_refund); end if;
  perform app.notify(v.id, 'booking_cancelled', 'Booking ' || b.reference || ' was cancelled. Refund: KES ' || v_refund || case when b.is_demo then ' (demo, no money moved).' else '.' end, '/account/bookings');
  perform app.notify((select p.owner_id from app.properties p join app.units u on u.property_id = p.id where u.id = b.unit_id), 'booking_cancelled', 'Booking ' || b.reference || ' was cancelled by the guest.', '/owner/bookings');
  perform app.audit(v, 'booking.cancel', 'booking', b.id::text, jsonb_build_object('refund', v_refund));
  return jsonb_build_object('ok', true, 'refund', v_refund);
end $$;

create or replace function public.api_create_review(p_token text, p_booking uuid, p_rating int, p_body text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; b app.bookings; v_prop uuid;
begin
  v := app.require_role(p_token, array['guest','owner','admin']);
  select * into b from app.bookings where id = p_booking and guest_id = v.id;
  if b.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if b.status = 'confirmed' and upper(b.stay) <= (now() at time zone 'Africa/Nairobi')::date then
    update app.bookings set status = 'completed' where id = b.id; b.status := 'completed';
  end if;
  if b.status <> 'completed' then return jsonb_build_object('ok', false, 'error', 'not_eligible'); end if;
  if exists (select 1 from app.reviews where booking_id = b.id) then return jsonb_build_object('ok', false, 'error', 'duplicate'); end if;
  if p_rating not between 1 and 5 or length(coalesce(trim(p_body), '')) not between 10 and 2000 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  select u.property_id into v_prop from app.units u where u.id = b.unit_id;
  insert into app.reviews(booking_id, property_id, author_id, rating, body) values (b.id, v_prop, v.id, p_rating, trim(p_body));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_notifications(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; r jsonb;
begin
  v := app.require_role(p_token, array['guest','owner','admin']);
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'message', message, 'link', link, 'read', read_at is not null, 'created_at', created_at) order by created_at desc), '[]'::jsonb)
    into r from (select * from app.notifications where account_id = v.id order by created_at desc limit 50) x;
  update app.notifications set read_at = now() where account_id = v.id and read_at is null;
  return r;
end $$;

-- ---------- Collections ----------
create or replace function public.api_my_collections(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts;
begin
  v := app.require_role(p_token, array['guest','owner','admin']);
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'share_token', c.share_token,
      'slugs', (select coalesce(jsonb_agg(p.slug), '[]'::jsonb) from app.collection_items ci join app.properties p on p.id = ci.property_id where ci.collection_id = c.id))
      order by c.created_at) from app.collections c where c.owner_id = v.id), '[]'::jsonb);
end $$;

create or replace function public.api_collection_save(p_token text, p_collection uuid, p_name text, p_slug text, p_add boolean)
returns jsonb language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; v_cid uuid := p_collection; v_pid uuid;
begin
  v := app.require_role(p_token, array['guest','owner','admin']);
  if v_cid is null then
    if length(trim(coalesce(p_name, ''))) = 0 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
    if (select count(*) from app.collections where owner_id = v.id) >= 20 then return jsonb_build_object('ok', false, 'error', 'limit'); end if;
    insert into app.collections(owner_id, name) values (v.id, left(trim(p_name), 80)) returning id into v_cid;
  elsif not exists (select 1 from app.collections where id = v_cid and owner_id = v.id) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if p_slug is not null then
    select id into v_pid from app.properties where slug = p_slug and status = 'published';
    if v_pid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
    if p_add then insert into app.collection_items(collection_id, property_id) values (v_cid, v_pid) on conflict do nothing;
    else delete from app.collection_items where collection_id = v_cid and property_id = v_pid; end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_cid);
end $$;

create or replace function public.api_collection_delete(p_token text, p_collection uuid) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts;
begin
  v := app.require_role(p_token, array['guest','owner','admin']);
  delete from app.collections where id = p_collection and owner_id = v.id;
  return jsonb_build_object('ok', found);
end $$;

-- Anyone signed in who has the share link may vote.
create or replace function public.api_collection_vote(p_token text, p_share text, p_slug text, p_vote int) returns jsonb
language plpgsql security definer set search_path = app, extensions as $$
declare v app.accounts; v_cid uuid; v_pid uuid;
begin
  v := app.require_role(p_token, array['guest','owner','admin']);
  select id into v_cid from app.collections where share_token = p_share;
  select p.id into v_pid from app.properties p join app.collection_items ci on ci.property_id = p.id and ci.collection_id = v_cid where p.slug = p_slug;
  if v_cid is null or v_pid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if p_vote = 0 then delete from app.collection_votes where collection_id = v_cid and property_id = v_pid and voter_id = v.id;
  elsif p_vote in (-1, 1) then
    insert into app.collection_votes values (v_cid, v_pid, v.id, p_vote)
      on conflict (collection_id, property_id, voter_id) do update set vote = excluded.vote;
  else return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  return jsonb_build_object('ok', true);
end $$;
