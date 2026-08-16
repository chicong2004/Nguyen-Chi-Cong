import React, { useState } from 'react';
import { useAuth } from './components/AuthContext';
import TNVLogin from './components/TNVLogin';
import AdminLogin from './components/AdminLogin';
import TNVDashboard from './components/TNVDashboard';
import AdminDashboard from './components/AdminDashboard';

function AppContent() {
  const { currentUser, loading, isLocalStorageMode } = useAuth();
  const [loginMode, setLoginMode] = useState<'tnv' | 'admin' | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-sm font-medium text-gray-500">Đang khởi tạo hệ thống...</p>
      </div>
    );
  }

  // If logged in
  if (currentUser) {
    if (currentUser.role === 'admin') {
      return <AdminDashboard />;
    } else {
      return <TNVDashboard />;
    }
  }

  // If not logged in and a mode is selected
  if (loginMode === 'tnv') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <TNVLogin />
        <button 
          onClick={() => setLoginMode(null)} 
          className="mt-6 text-sm font-medium text-gray-500 hover:text-gray-900 transition flex items-center gap-1"
        >
          ← Quay lại trang chủ
        </button>
      </div>
    );
  }

  if (loginMode === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <AdminLogin />
        <button 
          onClick={() => setLoginMode(null)} 
          className="mt-6 text-sm font-medium text-gray-500 hover:text-gray-900 transition flex items-center gap-1"
        >
          ← Quay lại trang chủ
        </button>
      </div>
    );
  }

  // Landing Page
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-white to-gray-50 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
        {/* Status Pill */}
        <div className="mb-6">
          {isLocalStorageMode ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 mr-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Lưu trữ Cục bộ LocalStorage (Đã sẵn sàng sử dụng 100%)
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              🟢 Kết nối Cloud Supabase Active
            </span>
          )}
        </div>

        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20 text-white">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 tracking-tight">
          Hệ Thống Đăng Ký & Điểm Danh TNV
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed max-w-md text-sm sm:text-base">
          Thu thập thông tin đăng ký Tình nguyện viên/CTV, ghi nhận điểm danh ca làm việc và tự động tính bảng lương xuất file CSV.
        </p>

        <div className="w-full space-y-3.5">
          <button
            onClick={() => setLoginMode('tnv')}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>📝 Đăng ký / Điểm danh TNV</span>
          </button>
          
          <button
            onClick={() => setLoginMode('admin')}
            className="w-full py-4 bg-white text-gray-900 border-2 border-gray-200 rounded-2xl font-bold text-lg hover:border-gray-300 hover:bg-gray-50 transition active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>🔑 Quản trị viên (Admin)</span>
          </button>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-100">
        Hệ thống Quản lý TNV/CTV &bull; Đã sẵn sàng đưa lên Vercel
      </footer>
    </div>
  );
}

export default AppContent;
