Bạn là chuyên gia phân tích hệ thống, bảo mật ứng dụng và giảng viên phản biện môn SE347. Hãy review độc lập task Tuần 2 của Tiểu pro: CV Storage + Upload/Download + Version Management trong MatchaJob.

Đọc trạng thái Git, toàn bộ diff, contract CV, migration V6, source liên quan, test và kết quả lệnh. Xem báo cáo triển khai là lời khai cần đối chiếu. Không sửa source trong vòng review.

1. Kiểm tra upload multipart, MIME/extension/signature, giới hạn dung lượng, package DOCX và giới hạn giải nén, tên file, SHA-256, object key, path traversal, file tạm và cleanup khi đăng ký metadata thất bại.
2. Kiểm tra mỗi upload tạo bản riêng, đúng candidate, không ghi đè; active version được giới hạn một bản, chuyển bản có transaction và khóa phù hợp; application snapshot cũ không bị đổi.
3. Kiểm tra download/preview stream, MIME/headers/cache, lỗi missing object; candidate chỉ xem bản của mình, employer chỉ xem đúng version trong snapshot thuộc đơn cho job họ quản lý, admin chỉ đọc và phải ghi audit trước khi trả dữ liệu.
4. Kiểm tra job nền thật cho upload mặc định: claim, retry/backoff, lease, ngăn worker cũ ghi đè, phục hồi sau restart, terminal failure; việc lưu kết quả CV/embedding/job phải có transaction thực sự qua Spring proxy. Đối chiếu public processing DTO có che lease và lỗi nội bộ không.
5. Kiểm tra API tương thích, biến môi trường/volume, migration nâng cấp dữ liệu, bảo toàn phần của thành viên khác và phạm vi thay đổi.
6. Đọc và chạy các kiểm tra phù hợp. Phân biệt unit test, HTTP test dùng MockMvc, DB integration, AI Worker thật và Docker runtime. Không biến môi trường chưa chạy được thành kết quả pass.

Trình bày kết quả bằng tiếng Việt: bảng tiêu chí Đạt/Đạt một phần/Không đạt/Chưa xác minh; phát hiện theo mức P0–P3 kèm file/dòng và tác động; điểm tốt; thiếu sót; owner và hành động tiếp theo. Dẫn command/test/output làm bằng chứng. Nêu rõ điều kiện nghiệm thu còn thiếu và có thể chấp nhận merge/demo/production hay chưa. Không suy ra mức hoàn thành 100% từ số test hoặc sự tồn tại của source.
