-- =====================================================================
--  DHP MANAGER — SIẾT AN TOÀN KHO CHUNG SUPABASE      30-08-2026
--  Dán TOÀN BỘ file này vào Supabase → SQL Editor → New query → Run.
--  An toàn chạy lại nhiều lần (idempotent). KHÔNG xoá dữ liệu đang có.
--  KHÔNG cần sửa gì trong app — app chạy y như cũ sau khi chạy file này.
-- =====================================================================
--
--  Đang bị gì:
--    Policy hiện tại là  for all using(true) with check(true)  → bất kỳ ai có
--    anon key (key này nằm trong localStorage của mọi máy, và từng ở repo công
--    khai) đều được DELETE sạch cả 7 bảng. Kho chung không có bản sao lưu nào.
--
--  File này làm 3 việc:
--    1. THÙNG RÁC  — mọi dòng bị xoá được chép sang bảng dhp_trash trước khi mất.
--    2. NHẬT KÝ    — ghi lại ai/khi nào sửa gì (dhp_audit), để truy khi số liệu lệch.
--    3. ẢNH CHỤP   — hàm dhp_snapshot() đóng băng toàn bộ 7 bảng thành 1 bản.
--
--  Vẫn phải làm bằng tay (SQL không làm thay được):
--    · Repo dhp-manager → Private
--    · Đổi 3 mật khẩu (dùng doi-mat-khau.html)
--    · Supabase → Settings → Database → bật Daily backups / PITR
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. THÙNG RÁC — không cho mất trắng
-- ---------------------------------------------------------------------
create table if not exists dhp_trash (
  seq         bigserial primary key,
  tbl         text        not null,
  row_id      text        not null,
  data        jsonb,
  deleted_at  timestamptz not null default now()
);
create index if not exists dhp_trash_tbl_time on dhp_trash (tbl, deleted_at desc);

create or replace function dhp_trash_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into dhp_trash (tbl, row_id, data) values (TG_TABLE_NAME, OLD.id, OLD.data);
  return OLD;
end $$;

-- ---------------------------------------------------------------------
-- 2. NHẬT KÝ THAY ĐỔI — biết đơn nào bị ai sửa lúc nào
-- ---------------------------------------------------------------------
create table if not exists dhp_audit (
  seq        bigserial primary key,
  tbl        text        not null,
  row_id     text,
  action     text        not null,          -- INSERT | UPDATE | DELETE
  data_new   jsonb,
  data_old   jsonb,
  at         timestamptz not null default now()
);
create index if not exists dhp_audit_time on dhp_audit (at desc);
create index if not exists dhp_audit_row  on dhp_audit (tbl, row_id);

create or replace function dhp_audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    insert into dhp_audit (tbl,row_id,action,data_old) values (TG_TABLE_NAME, OLD.id, TG_OP, OLD.data);
    return OLD;
  else
    insert into dhp_audit (tbl,row_id,action,data_new,data_old)
      values (TG_TABLE_NAME, NEW.id, TG_OP, NEW.data, case when TG_OP='UPDATE' then OLD.data else null end);
    return NEW;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. GẮN TRIGGER + SIẾT RLS cho cả 7 bảng
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['orders','customers','staff','assignments',
                           'outsource_shipments','ncr_records','products'] loop
    if to_regclass('public.'||t) is null then
      raise notice 'Bỏ qua bảng chưa tạo: %', t;  continue;
    end if;

    execute format('drop trigger if exists trg_dhp_trash on %I', t);
    execute format('create trigger trg_dhp_trash before delete on %I
                    for each row execute function dhp_trash_row()', t);

    execute format('drop trigger if exists trg_dhp_audit on %I', t);
    execute format('create trigger trg_dhp_audit after insert or update or delete on %I
                    for each row execute function dhp_audit_row()', t);

    -- RLS: app vẫn đọc/ghi/xoá bình thường (xoá đã có thùng rác đỡ),
    -- nhưng tách policy ra để sau này siết riêng từng quyền mà không phải viết lại.
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
  end loop;
end $$;

-- Thùng rác + nhật ký: BẬT RLS và KHÔNG tạo policy nào
--  → anon key không đọc, không sửa, không xoá được. Chỉ mở được ở SQL Editor.
alter table dhp_trash enable row level security;
alter table dhp_audit enable row level security;
revoke all on dhp_trash from anon, authenticated;
revoke all on dhp_audit from anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. ẢNH CHỤP TOÀN BỘ — chạy trước mỗi lần làm gì đó rủi ro
-- ---------------------------------------------------------------------
create table if not exists dhp_snapshot (
  seq       bigserial primary key,
  taken_at  timestamptz not null default now(),
  note      text,
  tbl       text not null,
  rows      jsonb not null
);
alter table dhp_snapshot enable row level security;
revoke all on dhp_snapshot from anon, authenticated;

create or replace function dhp_snapshot(note text default null) returns text
language plpgsql security definer set search_path = public as $$
declare t text; n bigint; total bigint := 0;
begin
  foreach t in array array['orders','customers','staff','assignments',
                           'outsource_shipments','ncr_records','products'] loop
    if to_regclass('public.'||t) is null then continue; end if;
    execute format('insert into dhp_snapshot(note,tbl,rows)
                    select $1, %L, coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from %I x', t, t)
      using note;
    execute format('select count(*) from %I', t) into n;
    total := total + n;
  end loop;
  return 'Đã chụp ' || total || ' bản ghi lúc ' || now();
end $$;

-- Chụp ngay một bản làm mốc:
select dhp_snapshot('mốc đầu tiên — 30-08-2026');


-- =====================================================================
--  CÁCH DÙNG SAU NÀY  (dán từng câu vào SQL Editor khi cần)
-- =====================================================================
--
-- ▸ Xem 50 dòng bị xoá gần nhất:
--     select seq, tbl, row_id, deleted_at, data->>'code' as ma_don
--     from dhp_trash order by deleted_at desc limit 50;
--
-- ▸ Phục hồi MỘT đơn đã xoá nhầm (thay 123 bằng seq lấy ở câu trên):
--     insert into orders (id, data, updated_at)
--     select row_id, data, now() from dhp_trash where seq = 123
--     on conflict (id) do update set data = excluded.data, updated_at = now();
--
-- ▸ Phục hồi TẤT CẢ đơn bị xoá trong 24 giờ qua:
--     insert into orders (id, data, updated_at)
--     select distinct on (row_id) row_id, data, now() from dhp_trash
--     where tbl='orders' and deleted_at > now() - interval '24 hours'
--     order by row_id, deleted_at desc
--     on conflict (id) do update set data = excluded.data, updated_at = now();
--
-- ▸ Xem lịch sử sửa của một đơn:
--     select at, action, data_new->>'status' as trang_thai
--     from dhp_audit where tbl='orders' and row_id='DH-0042' order by at desc;
--
-- ▸ Chụp một bản trước khi làm gì rủi ro:
--     select dhp_snapshot('trước khi import lại danh sách đơn');
--
-- ▸ Xem các bản đã chụp:
--     select seq, taken_at, note, tbl, jsonb_array_length(rows) as so_dong
--     from dhp_snapshot order by taken_at desc;
--
-- ▸ Dọn thùng rác cũ hơn 90 ngày (chạy vài tháng một lần cho nhẹ):
--     delete from dhp_trash where deleted_at < now() - interval '90 days';
--     delete from dhp_audit where at        < now() - interval '90 days';
-- =====================================================================
