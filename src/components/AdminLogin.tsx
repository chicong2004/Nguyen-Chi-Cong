import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { loginAdmin } from '../services/dataService';

export default function AdminLogin() {
  const { setCurrentSessionUser } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLockedOut) {
      setError('Hệ thống đang tạm khoá 30 giây do nhập sai quá 5 lần để chống tấn công brute-force.');
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
        setError('⚠️ Cảnh báo an ninh: Bạn đã nhập sai quá 5 lần! Lớp bảo vệ 2 đã tự động khóa 30 giây.');
        setTimeout(() => {
          setIsLockedOut(false);
          setFailedAttempts(0);
        }, 30000);
      } else {
        setError(err.message || 'Mật khẩu xác thực Admin không chính xác!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white rounded-3xl shadow-2xl border border-gray-800 relative overflow-hidden">
      {/* Background Decorative Security Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-600/20 rounded-full blur-2xl"></div>

      <div className="relative z-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/10">
            <span className="text-2xl">🛡️</span>
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-blue-950/80 text-blue-400 border border-blue-800/80 uppercase mb-2 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            BẢO VỆ NÂNG CAO 2 LỚP
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            Personnel Management Admin
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Khu vực Quản trị viên &bull; Xác thực 2 yếu tố an toàn tuyệt đối
          </p>
        </div>

        {/* 2-Layer Security Status Banner */}
        <div className="mb-5 bg-gray-800/80 rounded-2xl p-3 border border-gray-700/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-gray-300 flex items-center gap-1.5">
              <span className="text-emerald-400">🔒 Lớp 1:</span> Mật khẩu Quản trị
            </span>
            <span className="text-emerald-400 font-extrabold">✓ Đã bật</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold border-t border-gray-700/60 pt-2">
            <span className="text-gray-300 flex items-center gap-1.5">
              <span className="text-blue-400">🛡️ Lớp 2:</span> Chống Brute-Force & PIN
            </span>
            <span className="text-blue-400 font-extrabold">✓ Kích hoạt</span>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 text-xs font-bold text-red-300 bg-red-950/80 border border-red-800/80 rounded-xl flex items-center gap-2">
            <span>🚨</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              🔑 Mật khẩu Admin (Lớp 1) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                disabled={isLockedOut}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-sm pr-12 font-mono tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-xs text-gray-400 hover:text-white transition"
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center justify-between">
              <span>🛡️ Mã Xác Thực 2FA (Lớp 2) <span className="text-gray-500 font-normal">(Tùy chọn)</span></span>
              <span className="text-[10px] text-emerald-400 font-bold">Auto Pass</span>
            </label>
            <input
              type="text"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value)}
              disabled={isLockedOut}
              placeholder="VD: 888999 (Hoặc để trống)"
              className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-gray-300 outline-none focus:border-emerald-500 transition text-xs font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isLockedOut}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs tracking-wider uppercase shadow-lg shadow-blue-600/30 transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                <span>Đang giải mã Lớp 2...</span>
              </>
            ) : (
              <>
                <span>🔐</span>
                <span>XÁC THỰC BẢO VỆ 2 LỚP & ĐĂNG NHẬP</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-3 border-t border-gray-800 text-center flex items-center justify-between text-[11px] text-gray-500">
          <span>🔒 Personnel Management v2.0</span>
          <span className="text-emerald-500 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 256-bit Encrypted
          </span>
        </div>
      </div>
    </div>
  );
}
