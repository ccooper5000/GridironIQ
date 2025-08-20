-- Storage: bucket + user-scoped policies (path prefix: user/<uid>/...)

-- Create private videos bucket if missing
insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

-- Allow authenticated users to list/insert/update/delete their objects under user/<uid>/
-- Note: org-scoped storage would require custom JWT claims or a proxy—this is a safe default.
create policy if not exists "storage_videos_select_own"
on storage.objects for select
using (
  bucket_id = 'videos'
  and (split_part(name, '/', 2) = auth.uid()::text and split_part(name, '/', 1) = 'user')
);

create policy if not exists "storage_videos_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'videos'
  and (split_part(name, '/', 2) = auth.uid()::text and split_part(name, '/', 1) = 'user')
);

create policy if not exists "storage_videos_update_own"
on storage.objects for update
using (
  bucket_id = 'videos'
  and (split_part(name, '/', 2) = auth.uid()::text and split_part(name, '/', 1) = 'user')
);

create policy if not exists "storage_videos_delete_own"
on storage.objects for delete
using (
  bucket_id = 'videos'
  and (split_part(name, '/', 2) = auth.uid()::text and split_part(name, '/', 1) = 'user')
);
