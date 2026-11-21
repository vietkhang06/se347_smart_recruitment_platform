# SE347 – Candidate Regression + Demo Data + UI Evidence (20/11/2026)

## Phạm vi và nguồn kiểm tra
- Nguồn: GitHub `main` tại commit `f19d1b0135526dce6b8703e6b775dbb82b21a6b4`, kiểm tra ngày 20/11/2026.
- Mục tiêu: regression auth → hồ sơ → tìm/lọc việc → CV → ứng tuyển → lịch sử → matching/kết quả; các trạng thái UI; dữ liệu demo; bằng chứng component/E2E.
- Đây là báo cáo kiểm kê có phân biệt **bằng chứng đã xác minh** và **bước chưa chạy**. Không đánh dấu PASS cho test mới trước khi có log.

## Ma trận nghiệm thu

| Mã | Hạng mục | Bằng chứng có sẵn trong source | Trạng thái thực tế 20/11 | Cần làm thêm |
| --- | --- | --- | --- | --- |
| C01 | Đăng ký, đăng nhập, đúng role, phiên | `mock-flow.test.jsx`, `fixture-flow.test.jsx`, `auth.test.js` | PASS (Vitest 20/11/2026) | Chạy frontend suite |
| C02 | Hồ sơ, lưu dữ liệu, CV | `candidate.test.jsx`, `candidate-api-flow.test.jsx`, `candidate-week5-avatar-mobile.test.jsx`, `candidate-week5-mobile-cv.test.jsx` | PASS (Vitest 20/11/2026) | Chạy frontend suite |
| C03 | Tìm/lọc việc, sắp xếp, pagination | `candidate.test.jsx`, `search-regression.test.jsx` | PASS (Vitest 20/11/2026) | Chạy frontend suite |
| C04 | Ứng tuyển, chặn trùng, lỗi 409 | `candidate-api-flow.test.jsx`, `candidate-week5-validation.test.jsx` | PASS (Vitest 20/11/2026) | Chạy frontend suite |
| C05 | Lịch sử, lọc trạng thái, timeline | `candidate-api-flow.test.jsx`, `mock-flow.test.jsx` | PASS (Vitest 20/11/2026) | Chạy frontend suite |
| C06 | Matching PENDING/PROCESSING/COMPLETED/FAILED, retry/error | `matching-result.test.jsx`, `matching-contract.test.js`, `matching-http.test.js` | PASS (UI/mock API; AI thật BLOCKED) | Chạy frontend suite; E2E thật BLOCKED |
| C07 | Việc đã lưu: empty, filter, live refresh, API loading/error/retry | **MỚI** `candidate-week6-saved-jobs.test.jsx`, `candidate-week6-saved-jobs-api.test.jsx` | PASS (6/6) | Đã chạy kiểm thử |
| C08 | Responsive mobile/tablet/desktop | Ảnh tuần 5 của `profile`/`saved` là bằng chứng lịch sử; chưa phải sau main mới | NOT VERIFIED THIS WEEK | Kiểm tra trực quan 360/768/1366, ưu tiên các màn hình vừa thay đổi |
| C09 | Demo account/job/CV/application | MOCK jobs và mock roles có sẵn; `candidate-api-smoke.mjs` tạo account/job/CV/application mới trên localhost | PARTIAL | Xác nhận tài khoản demo thực, seed/reset và CV mẫu từ nhóm; không dùng account mock để xác nhận API |
| C10 | End-to-end Backend + AI thực | Backend Java compile fail trên CI; chưa có bằng chứng E2E Matching thật | **BLOCKED** | Backend owner sửa lỗi compile, CI PASS, chạy smoke + matching E2E |

## Phát hiện cần xử lý ngay – P0/P1 liên quan release

**BLOCKER: Backend không biên dịch được trên `main`.** GitHub Actions `Demo checks` run `44591079732` (19/11) cho thấy `frontend`, `ai-worker`, `compose-config` PASS; `backend` FAIL ở bước `mvn -B verify` với 22 lỗi Java do các conflict marker trong `backend/src/main/java/com/matchajob/matching/service/MatchingService.java` (khoảng dòng 137–160). Các chuỗi `<<<<<<< Updated upstream`, `=======`, `>>>>>>> Stashed changes` vẫn có trong `main`. Đây là lỗi nguồn Backend/matching, không phải lỗi UX Candidate. **Không thể tuyên bố end-to-end Candidate → AI PASS**. Bàn giao cho Backend/AI owner để giải quyết đúng semantics lease/idempotency, rồi chạy lại CI và E2E. Không tự ý bỏ conflict marker mà không đối chiếu hai nhánh logic.

**Dữ liệu demo MOCK:** 5 job mặc định đang tuyển có deadline 31/12/2026; chưa xác nhận tài khoản + job + AI result khi dùng database thật, nhất là reset/seed tuần này.

## Hướng dẫn tái chạy / ghi bằng chứng

Chạy tại root repository với source mới nhất:

```powershell
npm --prefix frontend test -- src/tests/candidate-week6-saved-jobs.test.jsx src/tests/candidate-week6-saved-jobs-api.test.jsx
npm --prefix frontend test
npm --prefix frontend run build
git diff --check
```

Ghi kết quả vào mục này sau khi thực sự chạy:

- 6 test mới: **6/6 PASS**
- Full frontend suite: **137/137 PASS (21/21 test files)**
- Production build trên source mới nhất: **PASS (462 modules)**
- CI/backend `mvn verify`: **FAIL (đã xác minh từ GitHub Actions)**
- E2E Candidate + AI thật: **BLOCKED**
- Responsive bằng trình duyệt mới nhất: **PENDING**

## Checklist bàn giao/demo

- [ ] Đã xác nhận tài khoản Candidate demo và vai trò đúng trên môi trường demo được nhóm dùng
- [ ] Đã xác nhận job đang tuyển, category/skills, lịch sử và CV mẫu trên database demo (không chỉ MOCK)
- [ ] Đã có trạng thái matching thực tế `PENDING`/`PROCESSING`/`COMPLETED` hoặc `FAILED` khi API+AI chạy
- [ ] Backend owner sửa conflict markers, CI `mvn verify` PASS
- [ ] Chạy được API smoke test và E2E Matching trên hệ thống thật; lưu log/link run
- [ ] Kiểm tra trực quan màn hình 360/768/1366 sau khi release candidate ổn định; lưu ảnh cần thiết
- [ ] Không còn P0/P1 trong Candidate sau retest; báo người phụ trách khi lỗi nằm ngoài phạm vi

## Các nguồn để reviewer kiểm chứng

- [PR #37 tuần 5 – đã merge](https://github.com/vietkhang06/se347_smart_recruitment_platform/pull/37)
- [CI main lỗi biên dịch Backend](https://github.com/vietkhang06/se347_smart_recruitment_platform/actions/runs/44591079732)
- `frontend/scripts/candidate-api-smoke.mjs` kiểm tra register/login/profile/search/detail/CV upload/download/apply/duplicate/history và stage; script tạo bản ghi thử mới, không xóa dữ liệu cũ, không xác nhận AI matching.

**Kết luận:** Có thể review frontend regression, nhưng không thể ký đạt hoàn toàn task tuần 6 trước khi backend hoạt động và matching E2E thật được xác minh.
