import React, { useState } from 'react';
import { useAuth } from './components/AuthContext';
import TNVLogin from './components/TNVLogin';
import AdminLogin from './components/AdminLogin';
import TNVDashboard from './components/TNVDashboard';
import AdminDashboard from './components/AdminDashboard';

function AppContent() {
  const { currentUser, userProfile, loading } = useAuth();
  const [loginMode, setLoginMode] = useState<'tnv' | 'admin' | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If logged in
  if (currentUser && userProfile) {
    if (userProfile.role === 'admin') {
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
        <button onClick={() => setLoginMode(null)} className="mt-6 text-sm text-gray-500 hover:text-gray-800">
          ← Quay lại
        </button>
      </div>
    );
  }

  if (loginMode === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <AdminLogin />
        <button onClick={() => setLoginMode(null)} className="mt-6 text-sm text-gray-500 hover:text-gray-800">
          ← Quay lại
        </button>
      </div>
    );
  }

  // Initial screen
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-200">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Hệ thống Quản lý TNV/CTV</h1>
        <p className="text-gray-500 mb-10 max-w-sm mx-auto">
          Ứng dụng điểm danh và tự động tính lương theo ca dành cho Tình nguyện viên và Quản trị viên.
        </p>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => setLoginMode('tnv')}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-medium text-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition active:scale-95"
          >
            Dành cho TNV / CTV
          </button>
          
          <button
            onClick={() => setLoginMode('admin')}
            className="w-full py-3.5 bg-white text-gray-800 border-2 border-gray-200 rounded-xl font-medium text-lg hover:border-gray-300 hover:bg-gray-50 transition active:scale-95"
          >
            Quản trị viên (Admin)
          </button>
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-gray-400">
        Google AI Studio Preview
      </footer>
    </div>
  );
}

export default AppContent;
