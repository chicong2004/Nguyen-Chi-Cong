import React, { useState } from 'react';
import { supabase } from '../supabase';

const ADMIN_EMAIL = 'admin@admin.com';

export default function AdminLogin() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First, try to sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: ADMIN_EMAIL,
        password: passcode,
      });

      if (signUpError) {
        // If already registered, try to sign in
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already exists')) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: passcode,
          });
          if (signInErr) throw signInErr;
        } else {
          throw signUpError;
        }
      } else if (signUpData.user) {
        // Newly created, insert into users table
        const { error: insertErr } = await supabase.from('users').insert({
          id: signUpData.user.id,
          role: 'admin',
          full_name: 'Administrator',
          phone: '',
          department: 'Quản trị',
          salary_rate: 0,
          created_at: Date.now(),
          updated_at: Date.now(),
        });
        
        if (insertErr) {
          console.error("Insert admin error:", insertErr);
          // Don't throw here to avoid locking out, as they are auth'd now
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
      <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
        Quản trị viên
      </h2>
      
      {error && <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu cấp sẵn</label>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !passcode}
          className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-black focus:ring-4 focus:ring-gray-200 transition disabled:opacity-50"
        >
          {loading ? 'Đang xác thực...' : 'Đăng nhập Admin'}
        </button>
      </form>
    </div>
  );
}
