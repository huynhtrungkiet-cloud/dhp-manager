# Hướng dẫn đưa DHP Manager lên web (GitHub Pages) + cài ra điện thoại

Kết quả: có 1 đường link dạng `https://<tên-bạn>.github.io/dhp-manager/` mở được trên
máy tính + điện thoại, và cài được icon ra màn hình chính như app thật. **Miễn phí.**

Thư mục cần đẩy lên: toàn bộ `DHP_Manager_Web/` (gồm `index.html`, `manifest.json`,
`service-worker.js`, `icon.svg`, và các file hướng dẫn).

---

## Phần 1 — Tạo tài khoản & repo GitHub (1 lần)

1. Vào [github.com](https://github.com) → **Sign up** (nếu chưa có tài khoản). Miễn phí.
2. Đăng nhập xong, góc trên phải bấm **＋ → New repository**.
3. Đặt:
   - **Repository name**: `dhp-manager`
   - Chọn **Public** (bắt buộc để dùng Pages miễn phí)
   - Tick **Add a README file**
4. Bấm **Create repository**.

## Phần 2 — Tải file lên

1. Trong repo vừa tạo, bấm **Add file → Upload files**.
2. Mở thư mục `DHP_Manager_Web` trên máy, **chọn hết các file** rồi kéo-thả vào trang GitHub.
   (Quan trọng: kéo từng FILE, không kéo cả thư mục — để các file nằm ở gốc repo.)
3. Kéo lên đủ: `index.html`, `manifest.json`, `service-worker.js`, `icon.svg`.
4. Cuối trang bấm **Commit changes**.

## Phần 3 — Bật GitHub Pages

1. Trong repo: tab **Settings** (Cài đặt).
2. Menu trái: **Pages**.
3. Mục **Branch**: chọn `main` → thư mục `/ (root)` → bấm **Save**.
4. Đợi ~1 phút, tải lại trang. GitHub hiện link:
   **`https://<tên-bạn>.github.io/dhp-manager/`**
5. Mở link đó → web DHP Manager đã chạy online!

## Phần 4 — Cài ra màn hình chính điện thoại

**Android (Chrome):**
1. Mở link trên điện thoại bằng Chrome.
2. Menu ⋮ góc phải → **Thêm vào Màn hình chính (Add to Home screen)**.
3. Xác nhận → icon DHP xuất hiện trên màn hình như 1 app.

**iPhone (Safari):**
1. Mở link bằng Safari.
2. Bấm nút **Chia sẻ** (ô vuông mũi tên) → **Thêm vào MH chính**.
3. Xác nhận.

---

## Cập nhật sau này

Mỗi khi tôi sửa/nâng cấp app:
1. Vào repo → **Add file → Upload files** → kéo file `index.html` mới lên → **Commit**.
2. (Trong app) đổi số phiên bản cache nếu cần — tôi sẽ báo khi cần.
3. Trên điện thoại mở lại app, kéo refresh để nhận bản mới.

## Lưu ý kết nối Google Sheets

- App lưu URL Google Sheets trong từng thiết bị (localStorage). Lần đầu mở trên điện
  thoại, vào tab **Dữ liệu & Đồng bộ** dán lại URL Apps Script → **Lưu URL** → **Tải về từ Sheets**.
- Vậy là điện thoại và máy tính cùng xem 1 database.

## Sơ đồ tổng thể

```
        GitHub Pages (web app — giao diện)
                    │ mở bằng link
        ┌───────────┴───────────┐
   Máy tính                 Điện thoại
        └───────────┬───────────┘
                    │ đồng bộ
            Google Sheets (database chung)
```
