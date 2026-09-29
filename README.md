# Minna N5 Hub — GitHub-ready

Website học tiếng Nhật N5 bài 1–25, gồm:
- Bảng từ vựng theo từng bài: chữ Nhật, romaji, tiếng Việt.
- Ngữ pháp theo từng bài.
- Flashcard: mặt trước tiếng Nhật; mặt sau nghĩa + romaji.
- Quiz có mức dễ/vừa/khó và câu hỏi ngữ pháp.
- Giao diện responsive.
- Khung tài khoản/đăng nhập/đăng ký và luồng quên mật khẩu OTP.

## Chạy trên GitHub Pages

1. Tạo repository mới trên GitHub.
2. Upload toàn bộ thư mục này.
3. Settings → Pages → Deploy from branch → `main` / root.
4. Mở URL Pages của repository.

## Đăng nhập thật + OTP Gmail

GitHub Pages chỉ chạy frontend, không nên chứa secret gửi mail. Dự án có `functions/worker.js` làm starter cho Cloudflare Worker.

Khuyến nghị production:
- Auth/database: Supabase hoặc Firebase.
- OTP: Cloudflare Worker + Resend (email có thể gửi tới Gmail), hoặc Gmail SMTP qua backend.
- Lưu OTP dạng hash trong KV/D1/DB, TTL 10 phút, giới hạn số lần thử và rate limit.
- Không commit API key vào GitHub.

### Gắn endpoint OTP

Trong `src/main.js`, thay xử lý nút quên mật khẩu bằng `fetch('https://YOUR-WORKER/auth/send-reset-code', ...)`.

## Nguồn dữ liệu

Dữ liệu học tập được trích xuất/chuẩn hóa từ file PDF "Bản dịch và giải thích ngữ pháp - Tập 1" bạn cung cấp. Tài liệu mô tả nội dung bài 1–25, phần từ mới/dịch/giải thích ngữ pháp và khoảng 1.000 từ vựng trọng tâm. File sách giáo khoa đi kèm không có lớp text đọc được trực tiếp trong Files, nên không dùng nó để tự suy đoán phần nội dung chưa đọc được.

## Lưu ý

Một số ký tự trong bản scan/OCR có thể bị nhận dạng sai; các mục được làm sạch thủ công ở những thuật ngữ nền tảng. Trước khi xuất bản thương mại, nên rà soát dữ liệu với bản PDF gốc.
