import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  registerTNV, 
  loginTNV, 
  resetPasswordWithEmailAndPhone,
  getDepartmentsList, 
  fetchDepartmentsListAsync, 
  fetchAllUsers, 
  fetchActiveEventsListAsync, 
  subscribeToRealtimeChanges,
} from '../services/dataService';
import { EventItem } from '../types';

interface TNVLoginProps {
  initialIsLogin?: boolean;
}

export default function TNVLogin({ initialIsLogin = false }: TNVLoginProps) {
  const { setCurrentSessionUser, isLocalStorageMode } = useAuth();
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [departments, setDepartments] = useState<string[]>(getDepartmentsList());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Forgot Password State
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    setIsLogin(initialIsLogin);

    const syncData = async () => {
      try {
        await fetchAllUsers();
      } catch (err) {
        console.warn("TNVLogin fetchAllUsers notice:", err);
      }
      const deps = await fetchDepartmentsListAsync();
      setDepartments(deps);
      if (deps.length > 0) {
        setDepartment(prev => (deps.includes(prev) ? prev : deps[0]));
      }

      const activeEvents = await fetchActiveEventsListAsync();
      setEvents(activeEvents);
      if (activeEvents.length > 0) {
        setSelectedEventId(prev => (prev && activeEvents.some(e => e.id === prev) ? prev : activeEvents[0].id));
      }
    };

    syncData();
    const unsubscribe = subscribeToRealtimeChanges(() => {
      syncData();
    });
    const interval = setInterval(syncData, 3000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
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
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) {
        throw new Error('Vui lòng nhập Email.');
      }

      if (isLogin) {
        const user = await loginTNV(cleanEmail, password);
        setCurrentSessionUser(user);
      } else {
        const cleanName = (fullName || '').trim();
        const cleanPhone = (phone || '').trim();
        if (!cleanName || !cleanPhone) {
          throw new Error('Vui lòng điền đầy đủ Họ tên và Số điện thoại.');
        }
        if (!password || password.trim().length < 4) {
          throw new Error('Vui lòng đặt Mật khẩu từ 4 ký tự trở lên.');
        }
        const chosenEvt = events.find(e => e.id === selectedEventId) || (events.length > 0 ? events[0] : undefined);
        const newUser = await registerTNV({
          fullName: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          facebookLink: (facebookLink || '').trim(),
          department: department || 'Hậu cần',
          eventId: selectedEventId || chosenEvt?.id || '',
          eventName: chosenEvt?.name || '',
          notes: (notes || '').trim(),
          password: password.trim(),
        });
        setSuccess('Đăng ký thành công! Đang tự động chuyển đến bảng cá nhân...');
        setTimeout(() => {
          setCurrentSessionUser(newUser);
        }, 600);
      }
    } catch (err: any) {
      console.error("TNV form submit error:", err);
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetNewPassword || resetNewPassword.trim().length < 4) {
      setResetError('Mật khẩu mới phải từ 4 ký tự trở lên.');
      return;
    }

    if (resetNewPassword.trim() !== resetConfirmPassword.trim()) {
      setResetError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setResetLoading(true);
    try {
      const updatedUser = await resetPasswordWithEmailAndPhone(
        resetEmail,
        resetPhone,
        resetNewPassword
      );
      setResetSuccess('Đặt lại mật khẩu thành công! Đang tự động đăng nhập...');
      setTimeout(() => {
        setIsForgotPasswordOpen(false);
        setCurrentSessionUser(updatedUser);
      }, 1000);
    } catch (err: any) {
      setResetError(err.message || 'Xác minh thất bại. Vui lòng kiểm tra lại Email và Số điện thoại.');
    } finally {
      setResetLoading(false);
    }
  };

  const fillQuickDemoUser = () => {
    setIsLogin(true);
    setEmail('nguyenvanan@gmail.com');
  };

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-lg border border-gray-100 relative">
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
          {isLogin ? 'Điền email và mật khẩu để vào bảng cá nhân' : 'Điền thông tin cá nhân và mật khẩu để đăng ký vào đội ngũ'}
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

            <div>
              <label className="block text-xs font-bold text-purple-900 mb-1 flex items-center justify-between">
                <span>🎉 Chọn Sự Kiện Tham Gia <span className="text-red-500">*</span></span>
                <span className="text-[10px] text-purple-600 font-normal">Đồng bộ tự động từ Admin</span>
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                required
                className="w-full px-4 py-2.5 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition bg-purple-50/50 text-xs font-extrabold text-purple-900 shadow-xs"
              >
                {events.length === 0 ? (
                  <option value="">(Chưa có sự kiện nào mở đăng ký)</option>
                ) : (
                  events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      🎉 {evt.name} ({evt.startDate} đến {evt.endDate})
                    </option>
                  ))
                )}
              </select>
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-gray-700">Mật khẩu <span className="text-red-500">*</span></label>
            {isLogin && (
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setIsForgotPasswordOpen(true);
                  setResetError('');
                  setResetSuccess('');
                }}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                🔑 Quên mật khẩu?
              </button>
            )}
          </div>
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

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsForgotPasswordOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                🔑
              </div>
              <h3 className="text-xl font-bold text-gray-900">Quên / Đặt Lại Mật Khẩu</h3>
              <p className="text-xs text-gray-500 mt-1">
                Nhập Email và Số điện thoại đã đăng ký để xác minh tài khoản và cài đặt mật khẩu mới.
              </p>
            </div>

            {resetError && <div className="p-3 mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl font-semibold">{resetError}</div>}
            {resetSuccess && <div className="p-3 mb-4 text-xs text-green-600 bg-green-50 border border-green-100 rounded-xl font-semibold">{resetSuccess}</div>}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email đã đăng ký <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="example@gmail.com"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Số điện thoại xác minh <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  required
                  placeholder="Nhập SĐT đã dùng để đăng ký TNV"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu mới <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  required
                  placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Xác nhận mật khẩu mới <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {resetLoading ? 'Đang xác minh...' : '💾 Đổi Mật Khẩu & Đăng Nhập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
