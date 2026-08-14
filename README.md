# Hệ Thống Quản Lý Điểm Danh & Tính Lương TNV / CTV

Dự án được xây dựng với React, Tailwind CSS và Firebase (Auth & Firestore).

## Tính Năng Chính
- **Phân quyền 2 Role**: TNV/CTV (Đăng ký, điểm danh) và Admin (Duyệt ca, cập nhật mức lương, xuất dữ liệu).
- **Luồng Điểm Danh**: TNV/CTV điểm danh mỗi ca, trạng thái mặc định "Chờ duyệt".
- **Tính Lương Tự Động**: Hệ thống dựa vào số ca *đã duyệt* nhân với Mức lương (được Admin cài đặt cho mỗi cá nhân) để tính ra tổng lương.
- **Xuất Dữ Liệu**: Admin có thể xuất toàn bộ bảng công, số lượng ca và tổng lương ra file CSV để báo cáo hoặc mở bằng Excel/Google Sheets.

## Cách Cài Đặt và Chạy Project

1. Đảm bảo bạn đã cài đặt Node.js (v18+).
2. Clone repository này về máy.
3. Cài đặt thư viện:
   ```bash
   npm install
   ```
4. Đảm bảo file cấu hình `.env` hoặc `firebase-applet-config.json` chứa thông tin Firebase của bạn. (Nếu chạy trong AI Studio, hệ thống tự động xử lý).
5. Khởi chạy Server Development:
   ```bash
   npm run dev
   ```
6. Truy cập vào `http://localhost:3000` trên trình duyệt.

## Hướng Dẫn Dành Cho Quản Trị Viên (Admin)
- Tại giao diện màn hình chính, chọn **Quản trị viên (Admin)**.
- Nhập mật khẩu bạn muốn (Ở lần đăng nhập đầu tiên, nếu mật khẩu chưa tồn tại, hệ thống sẽ tự động đăng ký tài khoản Admin với email `admin@admin.com` và lấy mật khẩu bạn vừa nhập làm mật khẩu bảo mật).

**Lưu ý**: Firebase Email/Password Auth sẽ tự động quản lý đăng nhập dựa trên mật khẩu cấp sẵn mà bạn tạo ở lần đầu tiên.
