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
| 📦 **Kho & Vật tư** | Tồn kho thép · sắt · khớp nối tồn, dao cụ, dụng cụ đo (hiệu chuẩn); phiếu nhập/xuất gắn đơn hàng; **phiếu kiểm hàng xuất kho trước gia công**. |
| ⚠ **Ghi nhận NCR** | Ghi lỗi/sai lệch khi phát hiện. |
| ⚙ **Dữ liệu & Đồng bộ** | Kết nối Supabase, sao lưu JSON. |

### Tạo / theo dõi một đơn (người có quyền Sửa)
1. **＋ Thêm đơn hàng** → nhập tên hàng, khách, số lượng, hạn giao.
2. **Chuỗi công đoạn (routing)**: bấm **⚡ Dùng mẫu chuẩn** hoặc **💡 Gợi ý từ đơn giống**, hoặc tự thêm.
3. Mỗi công đoạn: chọn **👤 người làm + ngày bắt đầu + số ngày** → app **tự dàn lên lịch** (bỏ Chủ Nhật) cho người đó.
4. Khi làm: đổi trạng thái công đoạn **Chưa → Đang → Xong** → **% đơn tự tính**, mọi người thấy ngay.

### 📦 Kho & kiểm hàng xuất kho trước gia công (25-11-2026)
- **Phiếu nhập**: phôi mua cho đơn nào (vd *China Steel*, ghi CO/CQ + số heat), hàng KH gửi về **gia công lỗ** hay **cắt bớt** → chọn **lý do** + **đơn hàng**. Hàng của KH không có trong danh mục thì gõ tên tự do (không tính tồn).
- **Phiếu xuất**: xuất cho gia công đơn nào; dao cụ / dụng cụ đo cấp cho thợ nào.
- **🔍 Kiểm trước gia công**: hàng lấy từ kho / KH gửi về → **mở hộp, ghi mã đóng trên sản phẩm + đo kích thước thực** (lỗ sẵn, Ø ngoài, chiều dài…), chọn dụng cụ đo, kết luận **ĐẠT** mới giao thợ. Chưa có phiếu ĐẠT thì app **không cho bắt đầu / báo xong công đoạn gia công** (Tiện, Phay, Cắt dây, Khoan, Xọc…). KHÔNG ĐẠT → giữ hàng, lập NCR, đổi hàng.
- Đơn gia công mới tự bật ô **🔍 Kiểm hàng xuất kho** (trong form đơn, cạnh ô 🛃 hàng nhập) — bỏ tick nếu đơn không lấy hàng từ kho.
- **📏 Dụng cụ đo**: mỗi cái 1 dòng, ghi ngày hiệu chuẩn + chu kỳ → app báo quá hạn; phiếu kiểm dùng thước quá hạn sẽ bị nhắc.

### 📤 Lấy hàng / báo kho (thợ) — thư soạn sẵn cho tech.manager
- Tab Kho → nút xanh **📤 LẤY HÀNG / BÁO KHO**: chọn người, đơn hàng (hoặc "dùng chung"), từng món **lấy ra · hư (lý do) · đếm còn lại trên kệ** — cả 3 ô bắt buộc.
- Bấm **GỬI** là app tự tạo phiếu xuất / hủy / kiểm kê (nếu đếm lệch sổ). Món còn ít (≤ tối thiểu), có hàng hư hoặc đếm lệch → app **mở ngay thư soạn sẵn trong webmail** (người nhận tech.manager@dhp-corp.com.vn, tiêu đề, nội dung) → chỉ việc bấm **Gửi**.
- Lần đầu trên mỗi máy app hỏi **email đăng nhập webmail** của máy đó (để mở đúng hộp thư). Trình duyệt hỏi chặn cửa sổ → chọn **Luôn cho phép**.
- Thư trống hoặc webmail đòi đăng nhập → đăng nhập, bấm **Soạn thư** → **Ctrl+V** (nội dung đã copy sẵn).
- Đổi cách gửi: tab Kho → **✉ Thư báo kho** → Cách gửi (webmail · Outlook trên máy · máy chủ tự gửi khi IT cấp SMTP).

### Bảng & cửa sổ linh hoạt
- **Cột bảng**: kéo mép tiêu đề để giãn · kéo tiêu đề sang chỗ khác để đổi vị trí · **⚙ Cột** để ẩn/hiện. Nhớ theo từng máy.
- **🖥 Bố cục** (góc trên phải): toàn màn hình / vừa, khoảng cách dòng gọn · vừa · thoáng, cỡ chữ bảng.
- **Tab Kho → ▦ Bảng kéo thả**: nắm tiêu đề bảng kéo sang chỗ khác, ½ hoặc cả bề ngang, thu gọn, ẩn.
- **Cửa sổ thao tác** (phiếu kho, xem đơn…): nắm thanh trên cùng kéo đi góc nào cũng được, kéo góc dưới phải để đổi cỡ.

### ⚖ Trách nhiệm & xử lý sau NCR
- Tab NCR → **⚖ Trách nhiệm**: ghi người từng khâu (kho · gia công · kiểm cuối · giao hàng · quản lý), mức trách nhiệm, đề xuất (nhắc nhở · KPI · khiển trách…), tường trình.
- In: **bảng tường trình**, **biên bản họp**, **phiếu nhắc nhở**, **quyết định kỷ luật** (bản nháp cho HR). Nút **📧 Mail đề nghị xử lý**.
- App nhắc luật: chỉ 4 hình thức kỷ luật, **không phạt tiền / cắt lương**, hành vi phải có trong nội quy lao động đã đăng ký, thời hiệu 6 tháng.

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
