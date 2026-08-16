import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Checkin } from '../types';
import { fetchCheckins, submitCheckin, processQRCheckin } from '../services/dataService';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import QRScannerModal from './QRScannerModal';

export default function TNVDashboard() {
  const { userProfile, logout } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [selectedShift, setSelectedShift] = useState('Ca Sáng (08:00 - 12:00)');
  const [successMessage, setSuccessMessage] = useState('');
  
  // QR scanner & QR card modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showPersonalQR, setShowPersonalQR] = useState(false);

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

  const handleQRScanResult = async (qrText: string) => {
    if (!userProfile) return;
    const res = await processQRCheckin(qrText, userProfile);
    setSuccessMessage(res.message);
    await loadUserCheckins();
  };

  if (!userProfile) return null;

  const approvedShifts = checkins.filter(c => c.status === 'approved').length;
  const pendingShifts = checkins.filter(c => c.status === 'pending').length;
  const estimatedEarned = approvedShifts * (userProfile.salaryRate || 50000);

  const personalQRPayload = JSON.stringify({
    type: 'user_qr',
    userId: userProfile.id,
    fullName: userProfile.fullName,
    department: userProfile.department,
  });

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-gray-50 flex flex-col pb-12">
      {/* Scanner Modal */}
      <QRScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleQRScanResult}
        title="📷 Quét Mã QR Sự Kiện Điểm Danh"
      />

      {/* Personal QR Card Modal */}
      {showPersonalQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-gray-100 text-center">
            <button
              onClick={() => setShowPersonalQR(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-1">🎴 Thẻ TNV QR Cá Nhân</h3>
            <p className="text-xs text-gray-500 mb-4">Đưa mã QR này cho Admin quét trực tiếp tại sự kiện để điểm danh</p>

            <div className="p-6 bg-blue-50/50 rounded-2xl border-2 border-blue-200 flex flex-col items-center justify-center mb-3">
              <QRCodeSVG value={personalQRPayload} size={200} level="H" includeMargin={true} />
              <div className="mt-3 font-bold text-gray-900 text-sm">{userProfile.fullName}</div>
              <div className="text-xs text-blue-700 font-semibold bg-blue-100 px-3 py-0.5 rounded-full mt-1">
                {userProfile.department}
              </div>
            </div>
            <span className="text-[11px] text-gray-400">ID: {userProfile.id}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white px-6 py-5 shadow-sm border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Bộ phận: {userProfile.department}
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

        {/* QR Actions Card */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-md transition text-left flex flex-col justify-between"
          >
            <div className="text-2xl mb-2">📷</div>
            <div>
              <div className="font-bold text-sm">Quét QR Sự Kiện</div>
              <div className="text-[11px] text-purple-200">Quét QR ca làm của Admin</div>
            </div>
          </button>

          <button
            onClick={() => setShowPersonalQR(true)}
            className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md transition text-left flex flex-col justify-between"
          >
            <div className="text-2xl mb-2">🎴</div>
            <div>
              <div className="font-bold text-sm">Thẻ QR Cá Nhân</div>
              <div className="text-[11px] text-indigo-200">Cho Admin quét thẻ</div>
            </div>
          </button>
        </div>

        {/* Manual Checkin Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <h2 className="text-base font-bold text-gray-900 mb-1">Điểm danh thủ công theo ca</h2>
          <p className="text-xs text-gray-500 mb-4">Chọn ca làm việc và gửi yêu cầu điểm danh cho Admin.</p>

          <div className="mb-4 text-left">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Chọn ca làm việc:</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
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
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 active:scale-95 transition disabled:opacity-70"
          >
            {isCheckingIn ? 'Đang gửi điểm danh...' : '📍 ĐIỂM DANH CA NÀY NGAY'}
          </button>
        </div>

        {/* History List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Lịch sử điểm danh</h3>
            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2.5 py-0.5 rounded-full">{checkins.length} ca</span>
          </div>
          
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-6">Đang tải lịch sử...</div>
          ) : checkins.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8 bg-white rounded-2xl border border-dashed border-gray-200">
              Chưa có lượt điểm danh nào.
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
