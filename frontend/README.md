# MatchaJob - Full Static Website Demo

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
- `role.html`: Chọn vai trò trước khi đăng nhập hoặc đăng ký
- `saved.html`: Danh sách việc làm đã lưu
- `applications.html`: Theo dõi tiến trình ứng tuyển
- `profile.html`: Hồ sơ nghề nghiệp, CV và kiểm tra CV mẫu
- `forgot-password.html`: Luồng khôi phục mật khẩu và OTP
- `employer.html`: Không gian Nhà tuyển dụng với dashboard, tin, ứng viên, pipeline, lịch, phân tích, doanh nghiệp, dịch vụ và hồ sơ
- `admin.html`: Trung tâm Admin với người dùng, kiểm duyệt, báo cáo, danh mục, cấu hình, nhật ký và thông báo
- `css/style.css`: Toàn bộ giao diện responsive + dark mode
- `js/data.js`: Dữ liệu công việc/công ty mẫu
- `js/mock-data.js`: Dữ liệu mẫu riêng cho Nhà tuyển dụng và Admin
- `js/portal.js`: Điều hướng và tương tác cho hai không gian quản trị
- `js/candidate.js`: Dữ liệu và tương tác cho hồ sơ, việc đã lưu, đơn ứng tuyển
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
8. `employer.html` có 9 khu vực chức năng, modal tạo tin, đặt lịch, chọn gói và xác nhận thao tác.
9. `admin.html` có 9 khu vực chức năng, duyệt/từ chối nội dung, cấu hình và thông báo mẫu.
10. Hồ sơ, yêu thích, ứng tuyển, theme và một số biểu mẫu được lưu bằng `localStorage`.
11. Giao diện responsive cho desktop, tablet, mobile và hỗ trợ Light/Dark mode.

## Lưu ý
Đây là frontend thuần HTML/CSS/JavaScript. Chưa có backend hoặc database thật.
Dữ liệu đăng nhập/ứng tuyển/đăng tin chỉ được lưu trên trình duyệt hiện tại bằng `localStorage`.
