-- Slate: make personal documents private (security review, Nov 17, 2026).
-- Run once in Supabase > SQL editor, AFTER Web 3.83.0 is live (the app then reads personal documents through the
-- server). Safe to run twice. Undo: the block at the bottom.
--
-- What it does:
--   1. Turns on row-level security for the docs table.
--   2. Replaces every read rule on it with one: the public key may read only shared documents (slates, scores,
--      previews, team pages, news, Box Office). Everything personal (mine/, prefs/, u/<id>/, users/, mail/, stats/,
--      feedback/, alertsets/, bc/, code/ except team ids, debug/, work/) can then be read only with the secret key,
--      which only the Cloudflare worker and the score jobs have. The live-update channel follows the same rule.
--   3. Stops the public key from writing to the table directly (saves keep working: they go through the save_doc
--      function or the worker), and from calling mirror_doc (the secret-key-only save the worker uses).

-- 0. Look first (read only): how the two save functions run. prosecdef = true means "security definer".
select proname, prosecdef, pg_get_function_identity_arguments(oid) as args
from pg_proc where pronamespace = 'public'::regnamespace and proname in ('save_doc', 'mirror_doc');

begin;

alter table public.docs enable row level security;

do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'docs' loop
    execute format('drop policy %I on public.docs', r.policyname);
  end loop;
end $$;

create policy "shared docs are public" on public.docs for select to anon, authenticated using (
  path ~ '^(slates|scores|previews|teams|standouts|live|box|moments|mfacts|newsdeep|newsbrief|events)/'
  or path in ('news/athletic', 'news/newsletters', 'code/teamids')
);

-- direct writes with the public key: off, but only if save_doc doesn't depend on them
do $$ begin
  if coalesce((select bool_and(prosecdef) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'save_doc'), false) then
    revoke insert, update, delete, truncate on public.docs from anon, authenticated;
  else
    raise notice 'save_doc is not security definer: direct write grants kept. Tell Claude.';
  end if;
end $$;

-- mirror_doc is the worker's save (secret key): the public key may not call it
do $$ declare r record; begin
  for r in select oid::regprocedure as f from pg_proc where pronamespace = 'public'::regnamespace and proname = 'mirror_doc' loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.f);
    execute format('grant execute on function %s to service_role', r.f);
  end loop;
end $$;

commit;

-- Check (should list only shared paths when run as the public key): in the app nothing changes.
-- Undo, if anything breaks:
--   drop policy if exists "shared docs are public" on public.docs;
--   create policy "everyone reads" on public.docs for select to anon, authenticated using (true);
--   grant insert, update, delete on public.docs to anon, authenticated;   -- only if they were revoked above
--   grant execute on function public.mirror_doc(text, jsonb, boolean) to anon, authenticated;  -- use the args shown in step 0
