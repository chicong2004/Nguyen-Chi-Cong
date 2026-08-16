import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { registerTNV, loginTNV } from '../services/dataService';

export default function TNVLogin() {
  const { setCurrentSessionUser, isLocalStorageMode } = useAuth();
  const [isLogin, setIsLogin] = useState(false); // Default to register tab for easy data collection!

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [facebookLink, setFacebookLink] = useState('');
  const [department, setDepartment] = useState('Hậu cần');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const user = await loginTNV(email, password);
        setCurrentSessionUser(user);
      } else {
        if (!fullName.trim() || !phone.trim() || !email.trim()) {
          throw new Error('Vui lòng điền đầy đủ các thông tin bắt buộc (Họ tên, SĐT, Email)');
        }
        const newUser = await registerTNV({
          fullName,
          email,
          phone,
          facebookLink,
          department,
          notes,
          password,
        });
        setSuccess('Đăng ký thành công! Đang đăng nhập...');
        setTimeout(() => {
          setCurrentSessionUser(newUser);
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemoUser = () => {
    setIsLogin(true);
    setEmail('nguyenvanan@gmail.com');
    setPassword('123456');
  };

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {isLogin ? 'Đăng nhập TNV / CTV' : 'Đăng ký TNV / CTV Mới'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {isLogin ? 'Điền email và mật khẩu để vào bảng điểm danh' : 'Điền thông tin để đăng ký vào đội ngũ Tình nguyện viên'}
        </p>
      </div>

      {/* Mode Status Pill */}
      <div className="mb-4 text-center">
        {isLocalStorageMode ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 mr-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Chế độ Lưu trữ Cục bộ (Sẵn sàng sử dụng)
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            🟢 Kết nối Cloud Supabase
          </span>
        )}
      </div>

      {error && <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">{error}</div>}
      {success && <div className="p-3 mb-4 text-sm text-green-600 bg-green-50 border border-green-100 rounded-xl">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và Tên <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="VD: Nguyễn Văn An"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="0901234567"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bộ phận đăng ký <span className="text-red-500">*</span></label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                >
                  <option value="Hậu cần">Hậu cần</option>
                  <option value="Truyền thông">Truyền thông</option>
                  <option value="Sự kiện">Sự kiện</option>
                  <option value="Tài trợ">Tài trợ</option>
                  <option value="Nhân sự">Nhân sự</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Link Facebook / Zalo</label>
              <input
                type="url"
                value={facebookLink}
                onChange={(e) => setFacebookLink(e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="example@gmail.com"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú / Khung giờ rảnh</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Có thể tham gia ca sáng thứ 7 và cả ngày chủ nhật..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập ngay' : 'Hoàn tất Đăng ký')}
        </button>
      </form>

      {isLocalStorageMode && isLogin && (
        <div className="mt-3">
          <button
            onClick={fillQuickDemoUser}
            type="button"
            className="w-full py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200 transition"
          >
            ⚡ Đăng nhập mẫu nhanh (TNV Nguyễn Văn An)
          </button>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-gray-600 pt-4 border-t border-gray-100">
        {isLogin ? "Bạn chưa có tài khoản? " : "Bạn đã đăng ký trước đó? "}
        <button
          onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
          className="text-blue-600 font-bold hover:underline focus:outline-none"
        >
          {isLogin ? 'Tạo tài khoản mới' : 'Đăng nhập'}
        </button>
      </div>
    </div>
  );
}
