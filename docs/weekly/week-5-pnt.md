# SE347 - Week 5 - Candidate Responsive, Validation & UX/UI

## 1. Phạm vi
- Nhanh: feature/update_5_pnt-candidate-responsive-validation-ux
- Kiem tra responsive, validation, accessibility, trang thai UI va luong Candidate.
- Che do kiem thu giao dien: MOCK.

## 2. Ket qua kiem thu
- Luong Candidate da thao tac: dang ky, dang nhap, tim viec, xem chi tiet, ung tuyen, xem lich su va tai CV.
- Da xem giao dien mobile va desktop cua cac trang chinh.
- Ho so va viec da luu: da kiem tra anh o 360px, 768px va 1366px.
- Khong phat hien loi P0 trong pham vi da kiem tra.
- Usability: developer walkthrough; chua co nguoi tham gia doc lap.

## 3. Loi da xu ly
- P1 demo: 5 tin dang tuyen het han trong du lieu MOCK; gia han den 31/12/2026.
- P2: bo sung kiem tra dinh dang so dien thoai khi ung tuyen.
- P2: bo sung lien ket nhan Email/Mat khau va accessible password toggle.
- P2/P3: cai thien nut chon CV tren mobile cho MOCK va API.
- P2/P3: cai thien nut chon anh dai dien tren mobile.
- P3: cho phep ten tep CV dai xuong dong.

## 4. Automated tests
- Week 5: 16/16 PASS.
- Full frontend: 130/131 PASS.
- Loi co san: ranking.test.jsx ky vong overallScore = 0, nhung nhan null.
- Vite production build: PASS.
- git diff --check: PASS.
- Canh bao large bundle va LF/CRLF khong lam build that bai.

## 5. Gioi han va viec can review
- Chua thuc hien usability test voi nguoi tham gia doc lap.
- Chua smoke test lai toan bo Backend API that trong dot tuan 5.
- Chua xac nhan dong bo loc viec da luu o 768px thuc su bi cat.
- Chua quan sat lai truc quan nut chon Avatar/CV sau ban sua cuoi.
- mockJobs.js la du lieu dung chung: can nhom review thay doi ngay het han.
- Loi Ranking thuoc pham vi Recruiter, khong sua trong PR nay.

## 6. Ket luan
Cac ban sua Candidate va test tu dong da dat ket qua du kien.
San sang tao Pull Request de nhom review, voi cac gioi han neu tren.
