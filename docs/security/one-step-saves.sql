-- Slate: one-step saves for the lists several people can change at once (code review, Nov 27, 2026).
-- Run once in Supabase > SQL editor. Safe to run twice. Nothing in the app changes.
--
-- Why: the server used to read a whole list (the people, the phones logged in, the invites, today's Claude count),
-- change it, and write the whole list back. Two changes in the same second could overwrite each other (say two
-- people signing up at once: one of them would vanish). These two functions make each change inside the database
-- in one step, so nothing can slip in between. Until this is run, the server keeps saving the old way.
--
-- Only the secret key (the Cloudflare worker) may call them, the same as mirror_doc.

begin;

-- doc_patch: in the document at p_path, inside its p_field list, add or replace the entries in p_set and remove
-- the keys in p_drop. Everything else in the document is left alone.
create or replace function public.doc_patch(p_path text, p_field text, p_set jsonb default '{}'::jsonb, p_drop text[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('slate-doc:' || p_path));
  update docs set
    data = jsonb_set(case when jsonb_typeof(data) = 'object' then data else '{}'::jsonb end, array[p_field],
                     ((case when jsonb_typeof(data -> p_field) = 'object' then data -> p_field else '{}'::jsonb end) || coalesce(p_set, '{}'::jsonb)) - coalesce(p_drop, '{}'), true),
    updated_at = now()
  where path = p_path;
  if not found then
    insert into docs (path, data, updated_at) values (p_path, jsonb_build_object(p_field, coalesce(p_set, '{}'::jsonb) - coalesce(p_drop, '{}')), now());
  end if;
end $$;

-- jsonb_sum: b laid over a; where both have a number, the two are added
create or replace function public.jsonb_sum(a jsonb, b jsonb) returns jsonb language plpgsql immutable as $$
declare out jsonb; r record;
begin
  if jsonb_typeof(a) = 'number' and jsonb_typeof(b) = 'number' then return to_jsonb((a #>> '{}')::numeric + (b #>> '{}')::numeric); end if;
  if jsonb_typeof(a) = 'object' and jsonb_typeof(b) = 'object' then
    out := a;
    for r in select key, value from jsonb_each(b) loop
      out := jsonb_set(out, array[r.key], case when out ? r.key then public.jsonb_sum(out -> r.key, r.value) else r.value end, true);
    end loop;
    return out;
  end if;
  return b;
end $$;

-- doc_add: add the numbers in p_add to the same places in the document at p_path (counts and running totals)
create or replace function public.doc_add(p_path text, p_add jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('slate-doc:' || p_path));
  update docs set data = public.jsonb_sum(case when jsonb_typeof(data) = 'object' then data else '{}'::jsonb end, p_add), updated_at = now() where path = p_path;
  if not found then
    insert into docs (path, data, updated_at) values (p_path, p_add, now());
  end if;
end $$;

revoke execute on function public.doc_patch(text, text, jsonb, text[]) from public, anon, authenticated;
revoke execute on function public.doc_add(text, jsonb) from public, anon, authenticated;
grant execute on function public.doc_patch(text, text, jsonb, text[]) to service_role;
grant execute on function public.doc_add(text, jsonb) to service_role;

commit;

-- the server finds new functions within a minute; this makes it right away
notify pgrst, 'reload schema';

-- Undo:
--   drop function public.doc_patch(text, text, jsonb, text[]);
--   drop function public.doc_add(text, jsonb);
--   drop function public.jsonb_sum(jsonb, jsonb);
