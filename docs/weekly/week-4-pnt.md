# Tuần 4 — Nguyễn Thông: Candidate API Integration

## Phần đã thực hiện
- Kết nối đăng nhập, hồ sơ, tìm kiếm và chi tiết việc làm với backend.
- Tải CV PDF/DOCX, xem danh sách phiên bản, chọn CV mặc định và tải xuống.
- Chọn CV, xác nhận và gửi đơn ứng tuyển qua API.
- Chặn gửi lặp khi đang xử lý; hiển thị lỗi khi đã ứng tuyển cùng vị trí.
- Xem danh sách đơn, lọc trạng thái, phân trang và lịch sử xử lý.
- Giữ luồng mock để chạy demo và component test.

## Cách chạy
1. Chạy backend và database theo hướng dẫn dự án.
2. Tạo frontend/.env.local với:
   VITE_DATA_SOURCE=api
   VITE_API_BASE_URL=http://localhost:8080/api
3. Nếu backend dùng cổng khác, sửa URL tương ứng.
4. Chạy npm --prefix frontend run dev.
5. Đăng ký tài khoản ứng viên trên backend đang chạy.

.env.local không được đưa lên Git.
Tài khoản và dữ liệu trên máy Thông không tự chuyển sang máy người pull code.

## Cách kiểm tra nhanh trên giao diện
1. Đăng nhập ứng viên → Hồ sơ cá nhân.
2. Lưu thông tin, tải lại trang: dữ liệu vẫn còn.
3. Tải CV lên và tải xuống để kiểm tra tệp.
4. Mở tin tuyển dụng đang nhận hồ sơ → chọn CV → xác nhận gửi.
5. Vào Đơn ứng tuyển → mở Chi tiết & lịch sử.
6. Tải lại trang: đơn vẫn còn; gửi lại cùng tin không tạo đơn trùng.

## Kiểm thử tự động
Tại thư mục gốc dự án:

npm --prefix frontend test
npm --prefix frontend run build

Kiểm tra tích hợp với backend localhost đang chạy:

node frontend/scripts/candidate-api-smoke.mjs "DUONG_DAN_CV_TEST.pdf"

Script tạo tài khoản ứng viên/HR, công ty và tin tuyển dụng thử;
kiểm tra CV, ứng tuyển, chống trùng, HR đổi trạng thái và lịch sử.
Không xóa dữ liệu hiện có. Mỗi lần chạy tạo bộ dữ liệu thử mới.
Script in tài khoản thử để người kiểm tra đăng nhập giao diện.

## Kết quả đã kiểm chứng trên máy Thông
Ngày 28/10/2026:
- 49/49 test đạt.
- Production build thành công.
- Integration smoke test với backend thật: PASS.
- Kiểm tra giao diện: đăng nhập, tải/tải xuống CV, gửi đơn,
  xem chi tiết/lịch sử và tải lại trang: đạt.

## Giới hạn
- Chưa kiểm chứng AI scoring.
- Backend hiện yêu cầu đăng nhập để xem chi tiết việc làm.
- Chưa có API ứng viên rút đơn; chức năng này vẫn có trong mock.
- Để chạy mock: đặt VITE_DATA_SOURCE=mock và khởi động lại frontend.