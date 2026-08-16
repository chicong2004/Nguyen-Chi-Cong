import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { loginAdmin } from '../services/dataService';

export default function AdminLogin() {
  const { setCurrentSessionUser } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLockedOut) {
      setError('Hệ thống đang tạm khoá 30 giây do nhập sai quá nhiều lần.');
      return;
    }

    setLoading(true);

    try {
      const adminUser = await loginAdmin(passcode);
      setCurrentSessionUser(adminUser);
    } catch (err: any) {
      console.error(err);
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);

      if (attempts >= 5) {
        setIsLockedOut(true);
        setError('⚠️ Bạn đã nhập sai 5 lần! Hệ thống tạm khoá 30 giây để bảo mật.');
        setTimeout(() => {
          setIsLockedOut(false);
          setFailedAttempts(0);
        }, 30000);
      } else {
        setError(err.message || 'Mật khẩu Admin không đúng!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
          🔒
        </div>
        <h2 className="text-2xl font-black text-gray-900">
          Đăng Nhập Quản Trị Viên (Admin)
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Hệ thống bảo mật nâng cao &bull; Nhập mật khẩu xác thực Admin
        </p>
      </div>

      <div className="mb-4 text-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          🛡️ Bảo Vệ Nâng Cáo 2 Lớp (Max 5 Lần Thử)
        </span>
      </div>

      {error && (
        <div className="p-3 mb-4 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Mật khẩu Admin <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
              disabled={isLockedOut}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none transition text-sm pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-xs text-gray-400 hover:text-gray-700"
            >
              {showPassword ? "👁️ Ẩn" : "👁️ Hiện"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || isLockedOut}
          className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-black focus:ring-4 focus:ring-gray-200 transition active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? 'Đang xác thực bảo mật...' : '🔑 XÁC THỰC VÀO SYSTEM ADMIN'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-gray-400 pt-4 border-t border-gray-100">
        Khu vực bảo mật riêng dành cho Ban Tổ Chức & Admin Quản Lý
      </div>
    </div>
  );
}
