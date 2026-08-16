import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { registerTNV, loginTNV, getDepartmentsList } from '../services/dataService';

interface TNVLoginProps {
  initialIsLogin?: boolean;
}

export default function TNVLogin({ initialIsLogin = false }: TNVLoginProps) {
  const { setCurrentSessionUser, isLocalStorageMode } = useAuth();
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    setIsLogin(initialIsLogin);
    const deps = getDepartmentsList();
    setDepartments(deps);
    if (deps.length > 0 && (!department || !deps.includes(department))) {
      setDepartment(deps[0]);
    }
  }, [initialIsLogin]);

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
        setSuccess('Đăng ký thành công! Đang tự động chuyển đến tài khoản...');
        setTimeout(() => {
          setCurrentSessionUser(newUser);
        }, 800);
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
          {isLogin ? 'Đăng Nhập TNV / CTV' : 'Đăng Ký TNV / CTV Mới'}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {isLogin ? 'Điền email đã đăng ký để vào bảng cá nhân' : 'Điền thông tin cá nhân để đăng ký vào đội ngũ Tình nguyện viên'}
        </p>
      </div>

      {error && <div className="p-3 mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl">{error}</div>}
      {success && <div className="p-3 mb-4 text-xs text-green-600 bg-green-50 border border-green-100 rounded-xl">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Họ và Tên <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="VD: Nguyễn Văn An"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="0901234567"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bộ phận đăng ký <span className="text-red-500">*</span></label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white text-xs font-bold"
                >
                  {departments.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Link Facebook / Zalo</label>
              <input
                type="url"
                value={facebookLink}
                onChange={(e) => setFacebookLink(e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-xs"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="example@gmail.com"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-xs"
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ghi chú / Khung giờ rảnh</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Rảnh các ngày thứ 7 và chủ nhật..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-xs resize-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition active:scale-[0.99] disabled:opacity-50"
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

      <div className="mt-6 text-center text-xs text-gray-600 pt-4 border-t border-gray-100">
        {isLogin ? "Bạn chưa có tài khoản? " : "Bạn đã đăng ký trước đó? "}
        <button
          onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
          className="text-blue-600 font-bold hover:underline focus:outline-none"
        >
          {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
        </button>
      </div>
    </div>
  );
}
