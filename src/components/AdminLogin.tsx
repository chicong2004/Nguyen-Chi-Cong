import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { loginAdmin } from '../services/dataService';

export default function AdminLogin() {
  const { setCurrentSessionUser, isLocalStorageMode } = useAuth();
  const [passcode, setPasscode] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const adminUser = await loginAdmin(passcode);
      setCurrentSessionUser(adminUser);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đăng nhập Admin thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-md">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">
        Cổng Quản Trị Viên
      </h2>
      <p className="text-xs text-gray-500 text-center mb-6">
        Xem danh sách đăng ký TNV, duyệt điểm danh & xuất báo cáo lương
      </p>

      {error && <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu Admin</label>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition"
            placeholder="••••••••"
          />
          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
            <span>💡 Mật khẩu mặc định:</span>
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-mono font-semibold">admin123</code>
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !passcode}
          className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black focus:ring-4 focus:ring-gray-200 transition shadow-md disabled:opacity-50"
        >
          {loading ? 'Đang xác thực...' : 'Đăng nhập Quản trị'}
        </button>
      </form>
    </div>
  );
}
