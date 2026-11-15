-- Link a website listing to its official Android APK listing.
alter table public.apps add column if not exists android_app_id uuid references public.apps(id) on delete set null;
create index if not exists apps_android_app_id_idx on public.apps(android_app_id);
alter table public.apps add constraint website_android_app_kind_check check (android_app_id is null or kind = 'website');
