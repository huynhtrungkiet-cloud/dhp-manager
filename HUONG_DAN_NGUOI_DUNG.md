# DHP Manager — Hướng dẫn cho người dùng

App quản lý sản xuất xưởng CK368. Dùng được trên **máy tính, điện thoại, máy tính bảng** — chỉ cần trình duyệt (Chrome/Edge/Safari).

---

## 1. Mở app

Vào địa chỉ (gõ hoặc lưu bookmark):

> **https://huynhtrungkiet-cloud.github.io/dhp-manager/**

## 2. Đăng nhập — 2 mức quyền

Mọi người **đều xem được mọi thứ**. Chỉ 2 người (TPKT & điều phối) mới được sửa.

| Mật khẩu | Quyền |
|---|---|
| `mật khẩu Xem` | 👁 **Xem** — xem hết, không sửa được (cho mọi người) |
| `mật khẩu quyền sửa` | 🔓 **Sửa** — tạo/sửa/xóa đơn, gán việc (TPKT & điều phối) |

- Tick **“Ghi nhớ trên thiết bị này”** để lần sau khỏi nhập lại.
- Đã đăng nhập “Xem” mà cần sửa: bấm **🔓 Mở khóa sửa** (góc trên phải) → nhập `mật khẩu quyền sửa`.
- Đổi vai trò / đăng xuất: bấm **⎋** (góc trên phải).

## 3. Kết nối dữ liệu chung (làm 1 LẦN mỗi thiết bị)

Để mọi máy thấy **cùng một dữ liệu** và cập nhật **tức thì** (không cần F5):

1. Vào tab **⚙ Dữ liệu & Đồng bộ** → mục **⚡ Supabase**.
2. Dán 2 thông tin (hỏi TPKT để lấy — giống nhau cho mọi máy):
   - **Project URL**: `https://……supabase.co`
   - **anon public key**: `sb_publishable_……` (hoặc `eyJ……`)
3. Bấm **💾 Lưu & Kết nối** → hiện “✓ Đã kết nối + real-time”.

→ Từ đó: ai sửa máy nào, máy khác thấy ngay (chỉ cần đang mở app).

> ⚠️ Dán đúng **URL gốc** (không kèm `/rest/v1`). App tự cắt nếu lỡ dán dư.

## 4. Cài ra màn hình chính điện thoại (như app thật)

- **Android (Chrome):** menu ⋮ → **Thêm vào Màn hình chính**.
- **iPhone (Safari):** nút **Chia sẻ** → **Thêm vào MH chính**.

→ Có icon DHP trên điện thoại, mở 1 chạm.

---

## 5. Các tab & cách dùng nhanh

| Tab | Để làm gì |
|---|---|
| 📅 **Lịch phân công & Đơn hàng** | Màn hình chính. Trên: lịch (người × ngày, ai làm việc gì). Dưới: danh sách đơn hàng + tiến độ. |
| 🏢 **Khách hàng** | Danh bạ khách (tự sinh từ đơn hàng). |
| 📊 **KPI & Báo cáo** | Tỷ lệ đúng hạn, đơn quá hạn, NCR, giờ công… |
| ⚠ **Ghi nhận NCR** | Ghi lỗi/sai lệch khi phát hiện. |
| ⚙ **Dữ liệu & Đồng bộ** | Kết nối Supabase, sao lưu JSON. |

### Tạo / theo dõi một đơn (người có quyền Sửa)
1. **＋ Thêm đơn hàng** → nhập tên hàng, khách, số lượng, hạn giao.
2. **Chuỗi công đoạn (routing)**: bấm **⚡ Dùng mẫu chuẩn** hoặc **💡 Gợi ý từ đơn giống**, hoặc tự thêm.
3. Mỗi công đoạn: chọn **👤 người làm + ngày bắt đầu + số ngày** → app **tự dàn lên lịch** (bỏ Chủ Nhật) cho người đó.
4. Khi làm: đổi trạng thái công đoạn **Chưa → Đang → Xong** → **% đơn tự tính**, mọi người thấy ngay.

### Đọc màu công đoạn trên đơn
🟢 xong · 🟠 đang làm · 🔴 trễ (vượt số ngày) · ⚪ chưa làm.

---

## 6. Quy tắc dùng chung

- **Chỉ 2 người sửa** (TPKT & điều phối) — tránh mỗi người sửa một kiểu.
- Mọi người khác: **xem để nắm việc**, báo lỗi qua tab NCR.
- Hàng đính kèm bản vẽ/ảnh: dán **link Google Drive** trong đơn.

## 7. Gặp sự cố?

- **Trắng / lỗi hiển thị:** bấm **Ctrl+Shift+R** (làm mới cứng) 2 lần. Dữ liệu không mất.
- **Không thấy dữ liệu mới của người khác:** kiểm tra đã **Kết nối Supabase** (mục 3) chưa; rồi F5.
- Còn lỗi → báo TPKT.
