import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { User, Checkin } from '../types';
import { supabase } from '../supabase';
import { 
  fetchAllUsers, 
  fetchCheckins, 
  approveCheckinItem, 
  bulkApproveCheckinsList, 
  removeUser,
  updateUserProfileByAdmin,
  updateCheckinAdminNote,
  getDepartmentsList,
  fetchDepartmentsListAsync,
  calculateShiftPay,
  calculateMeals,
  rejectCheckinItem,
  deleteCheckinItem,
  subscribeToRealtimeChanges,
  isSupabaseActive,
} from '../services/dataService';
import { getAdminEmailSettings } from '../services/emailService';
import { format } from 'date-fns';
import Papa from 'papaparse';
import AdminEditUserModal from './AdminEditUserModal';
import AdminDailyQRModal from './AdminDailyQRModal';
import AdminDepartmentModal from './AdminDepartmentModal';
import AdminSettingsModal from './AdminSettingsModal';
import AdminEventModal from './AdminEventModal';
import AdminUserDetailModal from './AdminUserDetailModal';
import { getEventsList, fetchEventsListAsync } from '../services/dataService';

export default function AdminDashboard() {
  const { logout, isLocalStorageMode } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [departmentsList, setDepartmentsList] = useState<string[]>(getDepartmentsList());
  const [adminSettings, setAdminSettings] = useState(getAdminEmailSettings());
  const [eventsList, setEventsList] = useState(getEventsList());
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedDetailUser, setSelectedDetailUser] = useState<User | null>(null);
  const [isDailyQROpen, setIsDailyQROpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('Tất cả');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');

  // Selected checkins for bulk approve
  const [selectedCheckins, setSelectedCheckins] = useState<Set<string>>(new Set());

  const loadAllData = async () => {
    try {
      const allUsers = await fetchAllUsers();
      const tnvUsers = allUsers.filter(u => u.role === 'tnv');
      setUsers(tnvUsers);

      const validUserIds = new Set(tnvUsers.map(u => u.id));
      const validUserNames = new Set(tnvUsers.map(u => u.fullName.trim().toLowerCase()));
      const allCheckins = await fetchCheckins();
      const validCheckins = allCheckins.filter(c => 
        validUserIds.has(c.userId) || 
        (c.fullName && validUserNames.has(c.fullName.trim().toLowerCase()))
      );
      setCheckins(validCheckins);

      const deps = await fetchDepartmentsListAsync();
      setDepartmentsList(deps);
      setAdminSettings(getAdminEmailSettings());
      
      const evts = await fetchEventsListAsync();
      setEventsList(evts);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu Admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // 1. Direct Supabase Realtime Channel Subscription for INSERT, UPDATE, DELETE on checkins, users & system_settings
    let channel: any = null;
    try {
      if (isSupabaseActive()) {
        const channelName = 'admin-realtime-' + Math.random().toString(36).substring(2, 8);
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'checkins' },
            (payload) => {
              console.log("⚡ [Admin Realtime WebSocket] Checkin event:", payload);
              loadAllData();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'users' },
            (payload) => {
              console.log("⚡ [Admin Realtime WebSocket] User event:", payload);
              loadAllData();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'system_settings' },
            (payload) => {
              console.log("⚡ [Admin Realtime WebSocket] System Settings event:", payload);
              loadAllData();
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log("✅ Admin Dashboard Realtime SUBSCRIBED to checkins, users & system_settings!");
            }
          });
      }
    } catch (e) {
      console.warn("Admin realtime setup notice:", e);
    }

    // 2. Backup polling every 3 seconds for 100% cross-device guarantee
    const timer = setInterval(loadAllData, 3000);

    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch {}
      }
      clearInterval(timer);
    };
  }, []);

  const departments = useMemo(() => {
    return ['Tất cả', ...departmentsList];
  }, [departmentsList]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesTab = activeTab === 'Tất cả' || u.department === activeTab;
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.phone.includes(term)
      );

      let matchesEvent = true;
      if (selectedEventFilter !== 'all') {
        const targetEvt = eventsList.find(e => e.id === selectedEventFilter);
        const targetEvtName = targetEvt?.name;

        const hasMatchingCheckin = checkins.some(c => 
          (c.userId === u.id || (c.fullName && c.fullName.trim().toLowerCase() === u.fullName.trim().toLowerCase())) && (
            c.eventId === selectedEventFilter || 
            (targetEvtName && c.eventName === targetEvtName) ||
            (!c.eventId && !c.eventName)
          )
        );
        const hasMatchingUserEvent = u.eventId === selectedEventFilter || 
          (targetEvtName && u.eventName === targetEvtName) ||
          !u.eventId || !u.eventName;

        matchesEvent = hasMatchingCheckin || hasMatchingUserEvent;
      }

      return matchesTab && matchesSearch && matchesEvent;
    });
  }, [users, checkins, activeTab, searchTerm, selectedEventFilter, eventsList]);

  // Metrics
  const totalApprovedCheckins = checkins.filter(c => c.status === 'approved').length;
  const totalPendingCheckins = checkins.filter(c => c.status === 'pending').length;
  const totalPayroll = checkins
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => {
      const user = users.find(u => u.id === c.userId);
      const rate = user?.salaryRate || 50000;
      return sum + calculateShiftPay(c.shiftName, rate, c.otHours);
    }, 0);

  const [selectedMealDate, setSelectedMealDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const totalMealStats = useMemo(() => {
    let lunch = 0;
    let dinner = 0;
    const targetDate = selectedMealDate || format(new Date(), 'yyyy-MM-dd');

    const dateCheckins = checkins.filter(c => {
      const cDate = c.workDate || format(c.createdAt, 'yyyy-MM-dd');
      return cDate === targetDate;
    });

    dateCheckins.forEach(c => {
      const m = calculateMeals(c.shiftName || '');
      lunch += m.lunch;
      dinner += m.dinner;
    });
    return { lunch, dinner, total: lunch + dinner, targetDate };
  }, [checkins, selectedMealDate]);

  const handleApproveSingle = async (checkin: Checkin) => {
    try {
      const res = await approveCheckinItem(checkin.id);
      setToastMessage(res.emailNotice || `📧 Đã duyệt và gửi email thông báo từ ${adminSettings.senderEmail}!`);
      setTimeout(() => setToastMessage(''), 5000);
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi duyệt ca.");
    }
  };

  const handleRejectSingle = async (checkin: Checkin) => {
    try {
      await rejectCheckinItem(checkin.id);
      setToastMessage(`❌ Đã từ chối ca làm việc "${checkin.shiftName}" của ${checkin.fullName}!`);
      setTimeout(() => setToastMessage(''), 5000);
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi từ chối ca.");
    }
  };

  const handleDeleteSingleCheckin = async (checkin: Checkin) => {
    if (confirm(`Bạn có chắc chắn muốn XÓA ca làm (${checkin.workDate} - ${checkin.shiftName}) của ${checkin.fullName}?`)) {
      try {
        await deleteCheckinItem(checkin.id);
        setToastMessage(`🗑️ Đã xóa thành công ca làm việc của ${checkin.fullName}!`);
        setTimeout(() => setToastMessage(''), 5000);
        await loadAllData();
      } catch (err) {
        console.error(err);
        alert("Lỗi khi xóa ca.");
      }
    }
  };

  const handleBulkApprove = async () => {
    if (selectedCheckins.size === 0) return;
    try {
      await bulkApproveCheckinsList(Array.from(selectedCheckins));
      setSelectedCheckins(new Set());
      setToastMessage(`📧 Đã duyệt ${selectedCheckins.size} ca & tự động gửi email thông báo từ ${adminSettings.senderEmail}!`);
      setTimeout(() => setToastMessage(''), 5000);
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi duyệt hàng loạt.");
    }
  };

  const handleDepartmentChangeInline = async (userId: string, newDept: string) => {
    await updateUserProfileByAdmin(userId, { department: newDept });
    await loadAllData();
  };

  const handleSalaryChangeInline = async (userId: string, newSalary: number) => {
    await updateUserProfileByAdmin(userId, { salaryRate: newSalary });
    await loadAllData();
  };

  const handleAdminNoteChange = async (checkinId: string, note: string) => {
    await updateCheckinAdminNote(checkinId, note);
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xoá TNV "${name}" và toàn bộ dữ liệu ca làm liên quan?`)) {
      await removeUser(uid);
      await loadAllData();
    }
  };

  // CSV Exports
  const handleExportRegistrationsCSV = () => {
    const exportData = users.map(user => ({
      'Họ và Tên': user.fullName,
      'Email': user.email,
      'Số điện thoại': `"${user.phone}"`,
      'Link Facebook / Zalo': user.facebookLink || '',
      'Bộ phận': user.department,
      'Mức phụ cấp/ca (VND)': user.salaryRate || 50000,
      'Ghi chú / Khung rảnh': user.notes || '',
      'Ngày đăng ký': format(user.createdAt, 'dd/MM/yyyy HH:mm'),
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Dang_Ky_TNV_${format(new Date(), 'dd_MM_yyyy')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPayrollCSV = () => {
    const exportData = users.map(user => {
      const userCheckins = checkins.filter(c => c.userId === user.id && c.status === 'approved');
      const approvedShifts = userCheckins.length;
      const totalOT = userCheckins.reduce((otSum, c) => otSum + (Number(c.otHours) || 0), 0);
      const totalSalary = userCheckins.reduce((sum, c) => sum + calculateShiftPay(c.shiftName, user.salaryRate, c.otHours), 0);
      let lunchMeals = 0;
      let dinnerMeals = 0;
      userCheckins.forEach(c => {
        const m = calculateMeals(c.shiftName);
        lunchMeals += m.lunch;
        dinnerMeals += m.dinner;
      });

      return {
        'Họ và Tên': user.fullName,
        'Số điện thoại': `"${user.phone}"`,
        'Bộ phận': user.department,
        'Mức phụ cấp/ca (VND)': user.salaryRate || 50000,
        'Số ca đã duyệt': approvedShifts,
        'Tổng giờ OT làm thêm': totalOT,
        'Suất ăn trưa': lunchMeals,
        'Suất ăn tối': dinnerMeals,
        'Tổng suất ăn': lunchMeals + dinnerMeals,
        'Tổng phụ cấp nhận (VND)': totalSalary,
      };
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bang_Tinh_Luong_TNV_${format(new Date(), 'dd_MM_yyyy')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Đang tải dữ liệu hệ thống Admin...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Modals */}
      <AdminDailyQRModal isOpen={isDailyQROpen} onClose={() => setIsDailyQROpen(false)} />
      <AdminDepartmentModal 
        isOpen={isDeptModalOpen} 
        onClose={() => setIsDeptModalOpen(false)} 
        onSaved={loadAllData} 
      />
      <AdminEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEventsUpdated={loadAllData}
      />
      <AdminUserDetailModal
        user={selectedDetailUser}
        checkins={checkins}
        isOpen={Boolean(selectedDetailUser)}
        onClose={() => setSelectedDetailUser(null)}
        onDataChanged={loadAllData}
      />
      <AdminSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={loadAllData}
      />
      <AdminEditUserModal 
        user={editingUser} 
        isOpen={Boolean(editingUser)} 
        onClose={() => setEditingUser(null)} 
        onSaved={loadAllData} 
      />

      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-gray-900">{adminSettings.adminName}</h1>
              <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                Email gửi: {adminSettings.senderEmail}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Quản lý lịch đăng ký, duyệt ca gửi mail tự động & thu thập mã QR Check-in/Check-out (Đồng bộ Realtime Mobile & PC)</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1"
            >
              🎉 Quản Lý Sự Kiện
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1"
            >
              ⚙️ Cấu Hình Admin
            </button>

            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              🏢 Quản Lý Bộ Phận
            </button>

            <button
              onClick={() => setIsDailyQROpen(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              📱 Tạo QR Check-in & Check-out
            </button>

            <button
              onClick={handleExportRegistrationsCSV}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              Xuất Đăng Ký (CSV)
            </button>

            <button
              onClick={handleExportPayrollCSV}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              Xuất Bảng Lương (CSV)
            </button>

            <button
              onClick={logout}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {toastMessage && (
          <div className="p-4 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-lg flex justify-between items-center animate-bounce">
            <span>🎉 {toastMessage}</span>
            <button onClick={() => setToastMessage('')} className="text-xs bg-emerald-700 px-2 py-1 rounded-lg">Đóng</button>
          </div>
        )}

        {/* Metric Cards & Meals Stat Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tổng TNV Đăng ký</span>
            <div className="text-3xl font-black text-gray-900 mt-2">{users.length} <span className="text-sm font-normal text-gray-500">người</span></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Lịch chờ Admin duyệt</span>
            <div className="text-3xl font-black text-amber-600 mt-2">{totalPendingCheckins} <span className="text-sm font-normal text-gray-500">lịch</span></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Lịch đã duyệt & gửi Mail</span>
            <div className="text-3xl font-black text-emerald-600 mt-2">{totalApprovedCheckins} <span className="text-sm font-normal text-gray-500">lịch</span></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Tổng chi phí phụ cấp</span>
            <div className="text-3xl font-black text-blue-600 mt-2">{totalPayroll.toLocaleString()} <span className="text-xs font-normal text-gray-500">VND</span></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-orange-200 bg-orange-50/20 shadow-sm">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider block">🍱 Suất Ăn Theo Ngày</span>
              <input
                type="date"
                value={selectedMealDate}
                onChange={(e) => setSelectedMealDate(e.target.value)}
                className="text-[11px] font-bold border border-orange-200 rounded-lg px-1.5 py-0.5 bg-white text-gray-700 outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                title="Chọn ngày xem suất ăn (Mặc định: Hôm nay, tự động reset qua ngày mới)"
              />
            </div>
            <div className="text-3xl font-black text-orange-600 mt-1">
              {totalMealStats.total} <span className="text-xs font-normal text-gray-500">suất</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 font-bold border-t border-orange-100 pt-1">
              <span className="text-amber-800">🌞 Trưa: {totalMealStats.lunch}</span>
              <span className="text-purple-800">🌙 Tối: {totalMealStats.dinner}</span>
            </div>
          </div>
        </div>

        {/* EVENT MANAGEMENT VIEW MODES */}
        {selectedEventFilter === 'all' ? (
          /* ALL EVENTS DIRECTORY GRID (Hiển thị danh sách các sự kiện đã có) */
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <span>🎪</span> DANH SÁCH CÁC SỰ KIỆN HỆ THỐNG ({eventsList.length} sự kiện)
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Nhấp vào từng sự kiện bên dưới để mở & xem danh sách các TNV/CTV đã đăng ký thuộc riêng sự kiện đó.
                </p>
              </div>
              <button
                onClick={() => setIsEventModalOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
              >
                <span>➕</span> Thêm / Quản Lý Sự Kiện
              </button>
            </div>

            {eventsList.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">
                Chưa có sự kiện nào được tạo. Vui lòng bấm "Thêm / Quản Lý Sự Kiện" để tạo sự kiện mới!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eventsList.map(evt => {
                  const evtUsers = users.filter(u => {
                    const hasMatchingCheckin = checkins.some(c => 
                      c.userId === u.id && (
                        c.eventId === evt.id || 
                        c.eventName === evt.name || 
                        (!c.eventId && !c.eventName && (eventsList.length === 1 || evt.status === 'active'))
                      )
                    );
                    const hasMatchingUserEvent = u.eventId === evt.id || 
                      u.eventName === evt.name || 
                      (!u.eventId && !u.eventName && (eventsList.length === 1 || evt.status === 'active'));
                    return hasMatchingCheckin || hasMatchingUserEvent;
                  });

                  const pendingCount = checkins.filter(c => 
                    ((c.eventId === evt.id || c.eventName === evt.name) || (!c.eventId && !c.eventName && (eventsList.length === 1 || evt.status === 'active'))) && c.status === 'pending'
                  ).length;

                  const approvedCount = checkins.filter(c => 
                    ((c.eventId === evt.id || c.eventName === evt.name) || (!c.eventId && !c.eventName && (eventsList.length === 1 || evt.status === 'active'))) && c.status === 'approved'
                  ).length;

                  return (
                    <div 
                      key={evt.id}
                      onClick={() => setSelectedEventFilter(evt.id)}
                      className="bg-purple-50/40 hover:bg-purple-50 rounded-2xl border-2 border-purple-200 hover:border-purple-500 p-5 cursor-pointer transition shadow-xs hover:shadow-md flex flex-col justify-between group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-200/20 rounded-full blur-xl pointer-events-none group-hover:bg-purple-300/30 transition"></div>
                      
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-extrabold text-purple-950 text-base group-hover:text-purple-700 transition flex items-center gap-2">
                            <span>🎉</span> {evt.name}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                            evt.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                          }`}>
                            {evt.status === 'active' ? '🟢 Mở Đăng Ký' : '📁 Đã Khóa'}
                          </span>
                        </div>

                        <div className="text-xs text-gray-600 space-y-1 mb-4">
                          <div>📅 <b>Thời gian:</b> {evt.startDate} ➔ {evt.endDate}</div>
                          {evt.location && <div>📍 <b>Địa điểm:</b> {evt.location}</div>}
                        </div>
                      </div>

                      <div>
                        <div className="grid grid-cols-3 gap-1 bg-white p-2.5 rounded-xl border border-purple-100 text-center mb-3">
                          <div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase">TNV</div>
                            <div className="text-sm font-black text-purple-900">{evtUsers.length}</div>
                          </div>
                          <div className="border-x border-purple-100">
                            <div className="text-[10px] font-bold text-amber-600 uppercase">Chờ Duyệt</div>
                            <div className="text-sm font-black text-amber-700">{pendingCount}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-emerald-600 uppercase">Đã Duyệt</div>
                            <div className="text-sm font-black text-emerald-700">{approvedCount}</div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventFilter(evt.id);
                          }}
                          className="w-full py-2.5 bg-purple-600 group-hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-1"
                        >
                          <span>👉</span> Xem Data User Sự Kiện Này ({evtUsers.length} người)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* SINGLE EVENT USER DATA DRILL-DOWN VIEW */
          <div>
            {/* Header & Back Button */}
            <div className="bg-white p-4 rounded-2xl border-2 border-purple-200 shadow-xs mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedEventFilter('all')}
                  className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <span>←</span> Quay Lại Danh Sách Sự Kiện
                </button>

                <div>
                  <h2 className="text-base font-black text-purple-950 flex items-center gap-2">
                    <span>🎉</span> SỰ KIỆN: {eventsList.find(e => e.id === selectedEventFilter)?.name || 'Sự Kiện Đã Chọn'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Đang hiển thị danh sách TNV & CTV đăng ký thuộc riêng sự kiện này ({filteredUsers.length} người)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEventModalOpen(true)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <span>⚙️</span> Quản Lý Sự Kiện
                </button>
              </div>
            </div>

            {/* Search & Department Tabs */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-gray-500">Bộ phận:</span>
                <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-hide">
                  {departments.map(dep => (
                    <button
                      key={dep}
                      onClick={() => setActiveTab(dep)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                        activeTab === dep 
                          ? 'bg-gray-900 text-white shadow-sm' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {dep}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-80 flex items-center gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Tìm theo Tên, SĐT, Email..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50"
                />
                <button 
                  onClick={loadAllData} 
                  title="Làm mới đồng bộ dữ liệu"
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Main Data Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                  <span>📋 Data TNV Đăng Ký Sự Kiện:</span>
                  <span className="text-xs font-bold bg-purple-100 text-purple-900 px-3 py-1 rounded-full border border-purple-200">
                    {eventsList.find(e => e.id === selectedEventFilter)?.name || 'Sự Kiện'} ({filteredUsers.length} người)
                  </span>
                </h3>

                {selectedCheckins.size > 0 && (
                  <button
                    onClick={handleBulkApprove}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    Duyệt {selectedCheckins.size} lịch đã chọn & Gửi Mail
                  </button>
                )}
              </div>

              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">
                  Không tìm thấy TNV nào phù hợp trong sự kiện này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-gray-400 bg-gray-50 uppercase font-semibold border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3">Họ và Tên / Liên hệ</th>
                        <th className="px-4 py-3">Bộ phận (Edit trực tiếp)</th>
                        <th className="px-4 py-3 text-right">Phụ cấp/ca</th>
                        <th className="px-4 py-3 text-center">Ca đã duyệt</th>
                        <th className="px-4 py-3 text-right">Tổng phụ cấp (VND)</th>
                        <th className="px-4 py-3 text-center">Chi tiết & Ca làm việc</th>
                        <th className="px-4 py-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map(user => {
                        const userCheckins = checkins.filter(c => 
                          c.userId === user.id || 
                          (c.fullName && user.fullName && c.fullName.trim().toLowerCase() === user.fullName.trim().toLowerCase())
                        ).sort((a, b) => b.createdAt - a.createdAt);
                        const approvedCheckins = userCheckins.filter(c => c.status === 'approved');
                        const approvedCount = approvedCheckins.length;
                        const totalOTHours = approvedCheckins.reduce((otSum, c) => otSum + (Number(c.otHours) || 0), 0);
                        const userTotalSalary = approvedCheckins.reduce((sum, c) => sum + calculateShiftPay(c.shiftName || '', user.salaryRate, c.otHours), 0);

                        return (
                          <tr key={user.id} className="hover:bg-blue-50/30 transition">
                            {/* Name & Contact */}
                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                                  {user.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 text-sm">{user.fullName}</div>
                                  <div className="text-gray-500 text-[11px]">📱 {user.phone} &bull; 📧 {user.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Inline Department Select */}
                            <td className="px-4 py-3 align-middle">
                              <select
                                value={user.department}
                                onChange={(e) => handleDepartmentChangeInline(user.id, e.target.value)}
                                className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg bg-white font-bold text-gray-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                              >
                                {departmentsList.map(dep => (
                                  <option key={dep} value={dep}>{dep}</option>
                                ))}
                              </select>
                            </td>

                            {/* Rate */}
                            <td className="px-4 py-3 align-middle text-right font-bold text-gray-700">
                              {user.salaryRate.toLocaleString()}đ
                            </td>

                            {/* Approved Shift count badge */}
                            <td className="px-4 py-3 align-middle text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                                {approvedCount} ca {totalOTHours > 0 ? `(+${totalOTHours}h OT)` : ''}
                              </span>
                            </td>

                            {/* Total Earned */}
                            <td className="px-4 py-3 align-middle text-right font-black text-blue-600">
                              {userTotalSalary.toLocaleString()}đ
                            </td>

                            {/* Detail Drawer Trigger */}
                            <td className="px-4 py-3 align-middle text-center">
                              <button
                                onClick={() => setSelectedDetailUser(user)}
                                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs transition border border-purple-200 flex items-center gap-1 mx-auto shadow-2xs"
                              >
                                <span>📅</span> Xem {userCheckins.length} Ca Đăng Ký
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-center align-middle space-x-1">
                              <button
                                onClick={() => setEditingUser(user)}
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                                title="Sửa thông tin cá nhân"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.fullName)}
                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                                title="Xoá TNV khỏi hệ thống"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
