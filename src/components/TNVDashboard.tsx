import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Checkin } from '../types';
import { fetchCheckins, submitCheckin } from '../services/dataService';
import { format } from 'date-fns';

export default function TNVDashboard() {
  const { userProfile, logout } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [selectedShift, setSelectedShift] = useState('Ca Sáng (08:00 - 12:00)');
  const [successMessage, setSuccessMessage] = useState('');

  const loadUserCheckins = async () => {
    if (!userProfile?.id) return;
    try {
      const data = await fetchCheckins(userProfile.id);
      setCheckins(data);
    } catch (e) {
      console.error("Lỗi lấy dữ liệu điểm danh:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserCheckins();
  }, [userProfile?.id]);

  const handleCheckin = async () => {
    if (!userProfile) return;
    setIsCheckingIn(true);
    setSuccessMessage('');
    try {
      await submitCheckin(userProfile, selectedShift);
      setSuccessMessage(`Đã gửi điểm danh (${selectedShift}) thành công! Đang chờ Admin duyệt.`);
      await loadUserCheckins();
    } catch (err) {
      console.error("Lỗi điểm danh:", err);
      alert("Không thể điểm danh, vui lòng thử lại.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (!userProfile) return null;

  const approvedShifts = checkins.filter(c => c.status === 'approved').length;
  const pendingShifts = checkins.filter(c => c.status === 'pending').length;
  const estimatedEarned = approvedShifts * (userProfile.salaryRate || 50000);

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-gray-50 flex flex-col pb-12">
      {/* Header */}
      <div className="bg-white px-6 py-5 shadow-sm border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
            {userProfile.department}
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-1">Xin chào, {userProfile.fullName}</h1>
          <p className="text-xs text-gray-500">{userProfile.email} • {userProfile.phone}</p>
        </div>
        <button 
          onClick={logout}
          className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition"
        >
          Đăng xuất
        </button>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {/* User Stats Card */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">Ca đã được duyệt</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{approvedShifts} ca</div>
            <span className="text-[11px] text-gray-400">{(userProfile.salaryRate || 50000).toLocaleString()} VND/ca</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">Thu nhập tích luỹ</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{estimatedEarned.toLocaleString()} <span className="text-xs font-normal">VND</span></div>
            <span className="text-[11px] text-amber-600 font-medium">{pendingShifts} ca chờ duyệt</span>
          </div>
        </div>

        {/* Checkin Action Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Điểm danh Ca Làm Việc</h2>
          <p className="text-xs text-gray-500 mb-4">Chọn ca làm việc và nhấn điểm danh để gửi yêu cầu duyệt lương.</p>

          <div className="mb-4 text-left">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Chọn ca làm việc:</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Ca Sáng (08:00 - 12:00)">Ca Sáng (08:00 - 12:00)</option>
              <option value="Ca Chiều (13:00 - 17:00)">Ca Chiều (13:00 - 17:00)</option>
              <option value="Ca Tối (18:00 - 21:00)">Ca Tối (18:00 - 21:00)</option>
              <option value="Ca Cả Ngày (08:00 - 17:00)">Ca Cả Ngày (08:00 - 17:00)</option>
            </select>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-xl border border-emerald-100">
              {successMessage}
            </div>
          )}
          
          <button
            onClick={handleCheckin}
            disabled={isCheckingIn}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-base shadow-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 active:scale-95 transition disabled:opacity-70"
          >
            {isCheckingIn ? 'Đang gửi điểm danh...' : '📍 ĐIỂM DANH CA NÀY NGAY'}
          </button>
        </div>

        {/* History List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Lịch sử điểm danh của bạn</h3>
            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2.5 py-0.5 rounded-full">{checkins.length} ca đã ghi nhận</span>
          </div>
          
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-6">Đang tải lịch sử...</div>
          ) : checkins.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8 bg-white rounded-2xl border border-dashed border-gray-200">
              Chưa có lượt điểm danh nào. Hãy điểm danh ca đầu tiên của bạn!
            </div>
          ) : (
            <div className="space-y-3">
              {checkins.map(ci => (
                <div key={ci.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {ci.shiftName || 'Ca làm việc'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      ⏰ {format(ci.createdAt, 'HH:mm - dd/MM/yyyy')}
                    </div>
                  </div>
                  <div>
                    {ci.status === 'pending' ? (
                      <span className="px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
                        ⏳ Chờ duyệt
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                        ✓ Đã duyệt
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
