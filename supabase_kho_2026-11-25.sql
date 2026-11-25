-- =====================================================================
--  DHP MANAGER — 3 BẢNG KHO & VẬT TƯ                         25-11-2026
--  (thép · sắt · khớp nối tồn · dao cụ · dụng cụ đo · kiểm hàng xuất kho)
--
--  Dán TOÀN BỘ file này vào Supabase → SQL Editor → New query → Run (1 lần).
--  An toàn chạy lại nhiều lần. KHÔNG đụng tới đơn hàng / dữ liệu đang có.
--  Chưa chạy file này thì tab "📦 Kho" vẫn dùng được, nhưng dữ liệu kho
--  chỉ nằm trên máy đang nhập (máy khác không thấy).
-- =====================================================================

-- 1) Ba bảng, cùng kiểu với các bảng cũ: {id, data jsonb, updated_at}
create table if not exists stock_items  (id text primary key, data jsonb not null, updated_at timestamptz default now());  -- danh mục vật tư / dao cụ / dụng cụ đo
create table if not exists stock_moves  (id text primary key, data jsonb not null, updated_at timestamptz default now());  -- phiếu nhập / xuất / kiểm kê (gắn đơn hàng)
create table if not exists stock_checks (id text primary key, data jsonb not null, updated_at timestamptz default now());  -- phiếu kiểm hàng xuất kho trước gia công

-- 2) Quyền + thùng rác + nhật ký + real-time — giống hệt 7 bảng cũ
do $$
declare t text;
begin
  foreach t in array array['stock_items','stock_moves','stock_checks'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists dhp_all    on %I', t);
    execute format('drop policy if exists dhp_read   on %I', t);
    execute format('drop policy if exists dhp_insert on %I', t);
    execute format('drop policy if exists dhp_update on %I', t);
    execute format('drop policy if exists dhp_delete on %I', t);
    execute format('create policy dhp_read   on %I for select using (true)', t);
    execute format('create policy dhp_insert on %I for insert with check (true)', t);
    execute format('create policy dhp_update on %I for update using (true) with check (true)', t);
    execute format('create policy dhp_delete on %I for delete using (true)', t);

    -- Thùng rác + nhật ký (chỉ khi đã chạy supabase_rls_2026-08-30.sql)
    if exists (select 1 from pg_proc where proname = 'dhp_trash_row') then
      execute format('drop trigger if exists trg_dhp_trash on %I', t);
      execute format('create trigger trg_dhp_trash before delete on %I
                      for each row execute function dhp_trash_row()', t);
    end if;
    if exists (select 1 from pg_proc where proname = 'dhp_audit_row') then
      execute format('drop trigger if exists trg_dhp_audit on %I', t);
      execute format('create trigger trg_dhp_audit after insert or update or delete on %I
                      for each row execute function dhp_audit_row()', t);
    end if;

    -- Real-time: máy A nhập kho → máy B thấy ngay
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- 3) Ảnh chụp toàn bộ (dhp_snapshot) — thêm 3 bảng kho vào danh sách chụp.
--    Chỉ có tác dụng nếu đã chạy supabase_rls_2026-08-30.sql (có bảng dhp_snapshot).
do $$
begin
  if to_regclass('public.dhp_snapshot') is not null then
    execute $f$
      create or replace function dhp_snapshot(note text default null) returns text
      language plpgsql security definer set search_path = public as $body$
      declare t text; n bigint; total bigint := 0;
      begin
        foreach t in array array['orders','customers','staff','assignments',
                                 'outsource_shipments','ncr_records','products',
                                 'stock_items','stock_moves','stock_checks'] loop
          if to_regclass('public.'||t) is null then continue; end if;
          execute format('insert into dhp_snapshot(note,tbl,rows)
                          select $1, %L, coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from %I x', t, t)
            using note;
          execute format('select count(*) from %I', t) into n;
          total := total + n;
        end loop;
        return 'Đã chụp ' || total || ' bản ghi lúc ' || now();
      end $body$;
    $f$;
  end if;
end $$;

-- Xong. Mở app → bấm F5 → tab "📦 Kho" hết dòng cảnh báo vàng là đã đồng bộ.
