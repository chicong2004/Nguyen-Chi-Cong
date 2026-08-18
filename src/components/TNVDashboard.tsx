import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { 
  fetchCheckins, 
  fetchAllUsers, 
  submitScheduleRegistration, 
  processQRCheckin, 
  getDepartmentsList, 
  fetchDepartmentsListAsync,
  calculateShiftPay, 
  getDepartmentRate, 
  getActiveEventsList, 
  fetchActiveEventsListAsync, 
  subscribeToRealtimeChanges,
  changeUserPassword,
  getFormattedShiftList,
} from '../services/dataService';
import { Checkin, User, EventItem } from '../types';
import { format } from 'date-fns';
import QRScannerModal from './QRScannerModal';

export default function TNVDashboard() {
  const { userProfile, logout } = useAuth();
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(userProfile);
  const activeProfile = currentUserProfile || userProfile;

  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change Password State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassInput, setOldPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [changePassError, setChangePassError] = useState('');
  const [changePassSuccess, setChangePassSuccess] = useState('');
  const [changePassLoading, setChangePassLoading] = useState(false);

  // Registration Form State
  const [departmentsList, setDepartmentsList] = useState<string[]>(getDepartmentsList());
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState(userProfile?.department || 'Hậu cần');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [availableShifts, setAvailableShifts] = useState<string[]>(getFormattedShiftList());
  const [selectedShift, setSelectedShift] = useState<string>(() => {
    const list = getFormattedShiftList();
    return list[0] || 'Ca Sáng (07:00 - 12:00)';
  });
  const [notes, setNotes] = useState<string>('');
  const [confirmSetup, setConfirmSetup] = useState<boolean>(Boolean(userProfile?.confirmSetup));
  const [successMessage, setSuccessMessage] = useState('');

  // Scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const loadUserData = async () => {
    if (!activeProfile?.id) return;
    try {
      // 1. Fetch updated users to sync latest profile, departments & events configured by Admin
      const allUsers = await fetchAllUsers();
      const updatedProfile = allUsers.find(u => u.id === activeProfile.id);
      if (updatedProfile) {
        setCurrentUserProfile(updatedProfile);
        if (updatedProfile.department) {
          setSelectedDepartment(prev => prev || updatedProfile.department);
        }
      }

      // 2. Sync latest departments & active events list directly from Supabase Cloud
      const deps = await fetchDepartmentsListAsync();
      setDepartmentsList(deps);

      const evts = await fetchActiveEventsListAsync();
      setEventsList(evts);
      setSelectedEventId(prev => {
        if (evts.length > 0 && (!prev || !evts.some(e => e.id === prev))) {
          return evts[0].id;
        }
        return prev;
      });

      // 3. Fetch latest checkins/schedules
      const data = await fetchCheckins(activeProfile.id);
      setCheckins(data);
    } catch (e) {
      console.error("Lỗi lấy dữ liệu lịch làm:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();

    const syncEventsAndDeps = async () => {
      const deps = await fetchDepartmentsListAsync();
      setDepartmentsList(deps);

      const activeEvts = await fetchActiveEventsListAsync();
      setEventsList(activeEvts);
      if (activeEvts.length > 0 && !selectedEventId) {
        setSelectedEventId(prev => (prev && activeEvts.some(e => e.id === prev) ? prev : activeEvts[0].id));
      }
    };
    syncEventsAndDeps();

    const unsubscribe = subscribeToRealtimeChanges(() => {
      loadUserData();
      syncEventsAndDeps();
    });

    const handleShiftConfigUpdate = () => {
      const list = getFormattedShiftList();
      setAvailableShifts(list);
      if (list.length > 0) {
        setSelectedShift(prev => (list.includes(prev) ? prev : list[0]));
      }
    };
    handleShiftConfigUpdate();
    window.addEventListener('shift_configs_updated', handleShiftConfigUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('shift_configs_updated', handleShiftConfigUpdate);
    };
  }, [userProfile?.id]);

  // Handle native camera scan (URL deep link) or pending scan after login
  useEffect(() => {
    const handleUrlOrPendingScan = async () => {
      if (!activeProfile) return;

      const params = new URLSearchParams(window.location.search);
      let scanAction = params.get('action');
      let scanType = params.get('type');
      let scanDate = params.get('date');

      if (!scanType && typeof sessionStorage !== 'undefined') {
        try {
          const pending = sessionStorage.getItem('pending_qr_scan');
          if (pending) {
            const parsed = JSON.parse(pending);
            scanAction = 'qr_scan';
            scanType = parsed.type;
            scanDate = parsed.date;
            sessionStorage.removeItem('pending_qr_scan');
          }
        } catch {}
      }

      if (scanAction === 'qr_scan' && scanType) {
        const payload = JSON.stringify({
          type: scanType === 'checkout' || scanType === 'event_checkout' ? 'event_checkout' : 'event_checkin',
          date: scanDate || format(new Date(), 'yyyy-MM-dd'),
        });

        const res = await processQRCheckin(payload, activeProfile);
        setSuccessMessage(res.message);
        window.history.replaceState({}, document.title, window.location.pathname);
        await loadUserData();
      }
    };

    handleUrlOrPendingScan();
  }, [activeProfile?.id]);

  useEffect(() => {
    if (activeProfile?.department) {
      setSelectedDepartment(activeProfile.department);
    }
  }, [activeProfile?.department]);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!activeProfile) return;
    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      const targetDate = selectedDate || format(new Date(), 'yyyy-MM-dd');
      const targetShift = selectedShift || 'Ca Sáng (07:00 - 12:00)';
      const targetDept = selectedDepartment || activeProfile.department || 'Hậu cần';
      const selectedEvt = eventsList.find(evt => evt.id === selectedEventId) || (eventsList.length > 0 ? eventsList[0] : undefined);

      await submitScheduleRegistration(
        activeProfile, 
        targetDate, 
        targetShift, 
        0, 
        (notes || '').trim(),
        targetDept,
        selectedEvt?.id,
        selectedEvt?.name,
        confirmSetup
      );

      setSuccessMessage(`Đã gửi đăng ký lịch làm ca (${targetDept} - ${targetDate} - ${targetShift})! Đang chờ Admin duyệt.`);
      setNotes('');
      await loadUserData();
    } catch (err: any) {
      console.error("Lỗi đăng ký lịch:", err);
      alert(err.message || "Không thể gửi đăng ký lịch, vui lòng kiểm tra lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQRScanResult = async (qrText: string) => {
    if (!activeProfile) return;
    const res = await processQRCheckin(qrText, activeProfile);
    setSuccessMessage(res.message);
    await loadUserData();
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    setChangePassError('');
    setChangePassSuccess('');

    if (!newPassInput || newPassInput.trim().length < 4) {
      setChangePassError('Mật khẩu mới phải từ 4 ký tự trở lên.');
      return;
    }

    if (newPassInput.trim() !== confirmPassInput.trim()) {
      setChangePassError('Mật khẩu mới xác nhận không trùng khớp.');
      return;
    }

    setChangePassLoading(true);
    try {
      await changeUserPassword(activeProfile.id, oldPassInput, newPassInput);
      setChangePassSuccess('Đã đổi mật khẩu thành công!');
      setTimeout(() => {
        setIsChangePasswordOpen(false);
      }, 1200);
    } catch (err: any) {
      setChangePassError(err.message || 'Đổi mật khẩu thất bại, vui lòng kiểm tra lại.');
    } finally {
      setChangePassLoading(false);
    }
  };

  if (!activeProfile) return null;

  const approvedShifts = checkins.filter(c => c.status === 'approved').length;
  const pendingShifts = checkins.filter(c => c.status === 'pending').length;
  const approvedShiftPay = checkins
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + calculateShiftPay(c.shiftName, activeProfile.salaryRate, c.otHours), 0);
  const adjustmentAmount = activeProfile.adjustmentAmount || 0;
  const estimatedEarned = approvedShiftPay + adjustmentAmount;

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-gray-50 flex flex-col pb-12 text-gray-900">
      {/* Event QR Scanner Modal */}
      <QRScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleQRScanResult}
        title="📷 Quét QR Điểm Danh Sự Kiện"
      />

      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-xs border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
        <div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Bộ phận: {activeProfile.department}
          </span>
          <h1 className="text-xl font-black text-gray-900 mt-1">Xin chào, {activeProfile.fullName}</h1>
          <p className="text-xs text-gray-500">{activeProfile.email} • {activeProfile.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setOldPassInput('');
              setNewPassInput('');
              setConfirmPassInput('');
              setChangePassError('');
              setChangePassSuccess('');
              setIsChangePasswordOpen(true);
            }}
            className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl transition border border-purple-200"
          >
            🔑 Đổi MK
          </button>
          <button 
            onClick={logout}
            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsChangePasswordOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                🔑
              </div>
              <h3 className="text-xl font-bold text-gray-900">Đổi Mật Khẩu Tài Khoản</h3>
              <p className="text-xs text-gray-500 mt-1">
                Cập nhật mật khẩu mới cho tài khoản TNV <span className="font-bold text-gray-800">{activeProfile.fullName}</span>
              </p>
            </div>

            {changePassError && <div className="p-3 mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl font-semibold">{changePassError}</div>}
            {changePassSuccess && <div className="p-3 mb-4 text-xs text-green-600 bg-green-50 border border-green-100 rounded-xl font-semibold">{changePassSuccess}</div>}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={oldPassInput}
                  onChange={(e) => setOldPassInput(e.target.value)}
                  placeholder="Nhập mật khẩu đang dùng (nếu có)"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu mới <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  required
                  placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Xác nhận mật khẩu mới <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={changePassLoading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {changePassLoading ? 'Đang cập nhật...' : '💾 Lưu Mật Khẩu Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6 flex-1">
        {/* Basic Stats Cards with Accumulated Total Earnings */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-xs text-gray-500 font-medium">Ca đã được duyệt</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{approvedShifts} <span className="text-xs font-normal text-gray-500">ca</span></div>
            <span className="text-[11px] text-emerald-700 font-semibold">✓ Đã duyệt hoàn tất</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-xs text-gray-500 font-medium">Thu nhập tích luỹ tổng</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{estimatedEarned.toLocaleString()} <span className="text-xs font-normal">VND</span></div>
            {adjustmentAmount !== 0 ? (
              <span className={`text-[10px] font-bold block truncate mt-0.5 ${adjustmentAmount > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {adjustmentAmount > 0 ? `+${adjustmentAmount.toLocaleString()}đ` : `${adjustmentAmount.toLocaleString()}đ`} ({activeProfile.adjustmentNote || 'Điều chỉnh'})
              </span>
            ) : (
              <span className="text-[11px] text-amber-600 font-bold">{pendingShifts} ca chờ duyệt</span>
            )}
          </div>
        </div>

        {/* QR Scanner Action Button */}
        <button
          onClick={() => setIsScannerOpen(true)}
          className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-md hover:opacity-95 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
              📷
            </div>
            <div className="text-left">
              <div className="font-extrabold text-sm">Quét Mã QR Điểm Danh Sự Kiện</div>
              <div className="text-xs text-blue-100">Quét mã QR Check-in/Check-out của Admin</div>
            </div>
          </div>
          <span className="text-xl">➔</span>
        </button>

        {/* Registration Schedule Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            📅 Đăng Ký Lịch Làm Việc
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Chọn ngày làm và ca làm việc đăng ký với Ban Quản Lý.
          </p>

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            {eventsList.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">🎉 Chọn Sự Kiện Đăng Ký Ca:</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-purple-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/40 text-purple-900"
                >
                  {eventsList.map(evt => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} ({evt.startDate} đến {evt.endDate})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                <span>🏢 Chọn / Đổi Công Việc Cho Ca Này:</span>
                <span className="text-[10px] text-blue-600 font-semibold">(Có thể đổi theo từng ca)</span>
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {departmentsList.map(dep => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Chọn Ngày Làm Việc:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Chọn Ca Làm Việc:</label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {availableShifts.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú cho Admin (Tuỳ chọn):</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VD: Em xin phép đến muộn 15p ca sáng..."
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2">
              <label className="block text-xs font-bold text-purple-900">
                ⚡ Xác nhận tham gia setup trước 1 ngày? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSetup(true)}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                    confirmSetup === true 
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
                  }`}
                >
                  🟢 Có
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmSetup(false)}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                    confirmSetup === false 
                      ? 'bg-red-600 text-white border-red-600 shadow-sm' 
                      : 'bg-white text-gray-700 border-gray-300 hover:border-red-300'
                  }`}
                >
                  🔴 Không
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition active:scale-95 disabled:opacity-70"
            >
              {isSubmitting ? 'Đang đăng ký...' : '📅 GỬI ĐĂNG KÝ LỊCH LÀM VIỆC'}
            </button>
          </form>
        </div>

        {/* Schedule & Attendance History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Lịch sử đăng ký & điểm danh</h3>
            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2.5 py-0.5 rounded-full">{checkins.length} lượt</span>
          </div>
          
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-6">Đang tải lịch làm...</div>
          ) : checkins.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8 bg-white rounded-2xl border border-dashed border-gray-200">
              Chưa có lịch làm việc nào được đăng ký.
            </div>
          ) : (
            <div className="space-y-3">
              {checkins.map(ci => (
                <div key={ci.id} className="bg-white p-4 rounded-xl shadow-2xs border border-gray-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <span>{ci.shiftName || 'Ca làm'}</span>
                      {ci.otHours ? (
                        <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          +{ci.otHours}h OT
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      📅 Ngày: {ci.workDate || format(ci.createdAt, 'dd/MM/yyyy')} &bull; Ghi nhận: {format(ci.createdAt, 'HH:mm')}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                      <span className={ci.checkinTime ? "text-emerald-700 font-bold" : "text-gray-400"}>
                        📍 In: {ci.checkinTime ? format(ci.checkinTime, 'HH:mm') : 'Chưa quét'}
                      </span>
                      <span className={ci.checkoutTime ? "text-emerald-700 font-bold" : "text-amber-600 font-bold"}>
                        🏁 Out: {ci.checkoutTime ? format(ci.checkoutTime, 'HH:mm') : 'Chưa quét Out'}
                      </span>
                    </div>
                    {ci.adminNote && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 italic">
                        📝 Ghi chú Admin: {ci.adminNote}
                      </div>
                    )}
                  </div>
                  <div>
                    {ci.checkinTime && ci.checkoutTime && ci.status === 'approved' ? (
                      <div className="text-right">
                        <span className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full block">
                          ✓ Đủ Check-in & Out (Đã Duyệt)
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-1">📧 Đã gửi Email</span>
                      </div>
                    ) : ci.checkinTime && !ci.checkoutTime ? (
                      <span className="px-3 py-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full block">
                        🟡 Đã Check-in (Chờ Check-out)
                      </span>
                    ) : ci.status === 'approved' ? (
                      <div className="text-right">
                        <span className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full block">
                          ✓ Admin Duyệt Thủ Công
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-1">📧 Đã gửi Email</span>
                      </div>
                    ) : ci.status === 'rejected' ? (
                      <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-full block">
                        ❌ Từ chối
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-full block">
                        ⏳ Chờ Check-in & Out
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
