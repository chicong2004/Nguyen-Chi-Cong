import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';
import { Checkin } from '../types';
import { format } from 'date-fns';

export default function TNVDashboard() {
  const { userProfile } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  useEffect(() => {
    if (!userProfile?.id) return;

    const fetchCheckins = async () => {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCheckins(data.map(d => ({
          id: d.id,
          userId: d.user_id,
          fullName: d.full_name,
          department: d.department,
          status: d.status,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        })));
      }
      setLoading(false);
    };

    fetchCheckins();

    const subscription = supabase
      .channel('public:checkins')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'checkins',
        filter: `user_id=eq.${userProfile.id}` 
      }, () => {
        fetchCheckins();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userProfile?.id]);

  const handleCheckin = async () => {
    if (!userProfile) return;
    setIsCheckingIn(true);
    try {
      const { error } = await supabase.from('checkins').insert({
        user_id: userProfile.id,
        full_name: userProfile.fullName,
        department: userProfile.department,
        status: 'pending',
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      if (error) throw error;
    } catch (err) {
      console.error("Lỗi điểm danh:", err);
      alert("Không thể điểm danh, vui lòng thử lại.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!userProfile) return null;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white px-6 py-5 shadow-sm border-b border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Xin chào, {userProfile.fullName}</h1>
          <p className="text-sm text-gray-500">{userProfile.department}</p>
        </div>
        <button 
          onClick={handleSignOut}
          className="text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg"
        >
          Thoát
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center mb-6">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-800 mb-2">Điểm danh ca làm việc</h2>
          <p className="text-sm text-gray-500 mb-6">Bấm vào nút dưới đây để ghi nhận điểm danh cho ca làm việc hiện tại của bạn.</p>
          
          <button
            onClick={handleCheckin}
            disabled={isCheckingIn}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-medium text-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 active:scale-95 transition disabled:opacity-70"
          >
            {isCheckingIn ? 'Đang điểm danh...' : 'Điểm danh ngay'}
          </button>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
            Lịch sử điểm danh
            <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{checkins.length} ca</span>
          </h3>
          
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-4">Đang tải lịch sử...</div>
          ) : checkins.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8 bg-white rounded-xl border border-dashed border-gray-200">
              Chưa có lượt điểm danh nào.
            </div>
          ) : (
            <div className="space-y-3">
              {checkins.map(ci => (
                <div key={ci.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-800">
                      {format(ci.createdAt, 'HH:mm - dd/MM/yyyy')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">ID: {ci.id.slice(0, 8)}...</div>
                  </div>
                  <div>
                    {ci.status === 'pending' ? (
                      <span className="px-2.5 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-100 rounded-full">
                        Chờ duyệt
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-full">
                        Đã duyệt
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
