import React, { useState } from 'react';
import { useAuth } from './components/AuthContext';
import TNVLogin from './components/TNVLogin';
import AdminLogin from './components/AdminLogin';
import TNVDashboard from './components/TNVDashboard';
import AdminDashboard from './components/AdminDashboard';

function AppContent() {
  const { currentUser, loading, isLocalStorageMode } = useAuth();
  const [activeTab, setActiveTab] = useState<'tnv-login' | 'tnv-register' | 'admin-login'>('tnv-register');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-sm font-medium text-gray-500">Đang khởi tạo hệ thống...</p>
      </div>
    );
  }

  // If logged in, show respective dashboard
  if (currentUser) {
    if (currentUser.role === 'admin') {
      return <AdminDashboard />;
    } else {
      return <TNVDashboard />;
    }
  }

  // Landing Page with direct Login & Registration integrated!
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 via-white to-gray-50 flex flex-col justify-between p-4 sm:p-6">
      <header className="max-w-xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md font-extrabold text-xs tracking-tighter">
            PM
          </div>
          <span className="font-black text-gray-900 text-lg tracking-tight">Personnel Management</span>
        </div>

        {isLocalStorageMode ? (
          <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
            LocalStorage Active
          </span>
        ) : (
          <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
            🟢 Supabase Cloud Sync
          </span>
        )}
      </header>

      <main className="max-w-md mx-auto w-full my-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2">
            Personnel Management System
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
            Hệ thống đăng ký bộ phận, quản lý lịch ca làm việc & phụ cấp nhân sự tự động.
          </p>
        </div>

        {/* Home Direct Login / Register Tabs */}
        <div className="bg-gray-200/80 p-1.5 rounded-2xl grid grid-cols-3 gap-1 text-center shadow-inner">
          <button
            onClick={() => setActiveTab('tnv-register')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'tnv-register'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📝 Đăng Ký TNV
          </button>

          <button
            onClick={() => setActiveTab('tnv-login')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'tnv-login'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🔑 Đăng Nhập
          </button>

          <button
            onClick={() => setActiveTab('admin-login')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'admin-login'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👑 Admin
          </button>
        </div>

        {/* Form Container embedded right on the Home Page! */}
        <div className="w-full flex justify-center">
          {activeTab === 'admin-login' ? (
            <AdminLogin />
          ) : (
            <TNVLogin initialIsLogin={activeTab === 'tnv-login'} />
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-100">
        Hệ thống Quản lý TNV/CTV &bull; Email gửi: chicong092004@gmail.com
      </footer>
    </div>
  );
}

export default AppContent;
