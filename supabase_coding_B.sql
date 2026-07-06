-- ============================================================
-- DHP Coding "B" — bảng cho cơ chế mã giàu cấu trúc (Supabase/Postgres)
-- Dán toàn bộ vào: Supabase → SQL Editor → New query → Run
-- An toàn chạy lại nhiều lần (idempotent).
-- ============================================================

-- 4 bảng kiểu {id, data, updated_at} — giống các bảng hiện có của DHP Manager
create table if not exists cs_customers  (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists cs_projects   (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists cs_assemblies (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists cs_skus       (id text primary key, data jsonb not null, updated_at timestamptz default now());

-- Cho phép app truy cập (công cụ nội bộ + có lớp mật khẩu app). Siết bằng Supabase Auth sau nếu cần.
do $$
declare t text;
begin
  foreach t in array array['cs_customers','cs_projects','cs_assemblies','cs_skus'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists dhp_all on %I', t);
    execute format('create policy dhp_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Bật đồng bộ real-time (bỏ qua nếu đã có → không lỗi)
do $$
declare t text;
begin
  foreach t in array array['cs_customers','cs_projects','cs_assemblies','cs_skus'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ── Số chạy DỰ ÁN: cấp nguyên tử, KHÔNG bao giờ trùng dù nhiều người tạo cùng lúc ──
create sequence if not exists cs_project_seq;

-- RPC app gọi để lấy số kế tiếp: supabase.rpc('cs_next_project_seq')
create or replace function cs_next_project_seq()
returns bigint
language sql
security definer
as $$ select nextval('cs_project_seq'); $$;

grant execute on function cs_next_project_seq() to anon, authenticated;

-- (Tùy chọn) Nếu đã có dự án cũ, đặt bộ đếm vượt số lớn nhất hiện có — chạy 1 lần:
-- select setval('cs_project_seq', (select coalesce(max((data->>'seq')::int),0) from cs_projects));

-- Kiểm tra nhanh:
-- select cs_next_project_seq();   -- mỗi lần chạy ra 1 số tăng dần
