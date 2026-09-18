# JOBLY - Full Static Website Demo

## Cách chạy
Cách đơn giản nhất:
1. Mở thư mục bằng VS Code.
2. Cài extension **Live Server**.
3. Chuột phải `index.html` → **Open with Live Server**.

Bạn cũng có thể mở trực tiếp `index.html`, nhưng Live Server dễ test điều hướng nhiều trang hơn.

## Cấu trúc
- `index.html`: Trang chủ
- `jobs.html`: Danh sách và bộ lọc việc làm
- `job-detail.html`: Chi tiết việc làm + popup ứng tuyển
- `companies.html`: Danh sách công ty
- `guides.html`: Cẩm nang
- `login.html`: Đăng nhập demo
- `register.html`: Đăng ký demo
- `employer.html`: Trang nhà tuyển dụng, đăng tin demo
- `admin.html`: Dashboard quản trị
- `css/style.css`: Toàn bộ giao diện responsive + dark mode
- `js/data.js`: Dữ liệu công việc/công ty mẫu
- `js/app.js`: Dark mode, menu mobile, ô tìm kiếm, toast, lưu yêu thích
- `js/jobs.js`: Render job card, bộ lọc, sắp xếp, trang chi tiết, công ty
- `js/forms.js`: Kiểm tra form, login/register demo, đăng tin, ứng tuyển
- `assets/logo.svg`: favicon/logo đơn giản

## JavaScript thể hiện ở đâu?
1. Nút ☾/☀ trên header đổi sáng/tối và lưu lựa chọn vào `localStorage`.
2. Ô tìm kiếm ở trang chủ chuyển sang `jobs.html` với từ khóa.
3. `jobs.html` lọc theo từ khóa, địa điểm, hình thức và sắp xếp ngay trên trình duyệt.
4. Nút ♡/♥ lưu việc yêu thích bằng `localStorage`.
5. `job-detail.html?id=...` đọc `id` trên URL để đổi nội dung công việc.
6. Nút **Ứng tuyển ngay** mở modal; form lưu hồ sơ demo vào `localStorage`.
7. `login.html` và `register.html` kiểm tra dữ liệu nhập và giả lập đăng nhập.
8. `employer.html` cho phép đăng tin demo và hiển thị lại trong bảng.
9. `admin.html` đọc số hồ sơ ứng tuyển demo để cập nhật thống kê.
10. Menu mobile mở/đóng bằng JavaScript.

## Lưu ý
Đây là frontend thuần HTML/CSS/JavaScript. Chưa có backend hoặc database thật.
Dữ liệu đăng nhập/ứng tuyển/đăng tin chỉ được lưu trên trình duyệt hiện tại bằng `localStorage`.