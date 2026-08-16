import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { User, Checkin } from '../types';
import { 
  fetchAllUsers, 
  fetchCheckins, 
  approveCheckinItem, 
  bulkApproveCheckinsList, 
  removeUser,
  updateUserProfileByAdmin,
  updateCheckinAdminNote,
  getDepartmentsList,
  calculateShiftPay,
  calculateMeals,
} from '../services/dataService';
import { getAdminEmailSettings } from '../services/emailService';
import { format } from 'date-fns';
import Papa from 'papaparse';
import AdminEditUserModal from './AdminEditUserModal';
import AdminDailyQRModal from './AdminDailyQRModal';
import AdminDepartmentModal from './AdminDepartmentModal';
import AdminSettingsModal from './AdminSettingsModal';

export default function AdminDashboard() {
  const { logout, isLocalStorageMode } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [departmentsList, setDepartmentsList] = useState<string[]>(getDepartmentsList());
  const [adminSettings, setAdminSettings] = useState(getAdminEmailSettings());
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDailyQROpen, setIsDailyQROpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('Tất cả');

  // Selected checkins for bulk approve
  const [selectedCheckins, setSelectedCheckins] = useState<Set<string>>(new Set());

  const loadAllData = async () => {
    try {
      const allUsers = await fetchAllUsers();
      const tnvUsers = allUsers.filter(u => u.role === 'tnv');
      setUsers(tnvUsers);

      const validUserIds = new Set(tnvUsers.map(u => u.id));
      const allCheckins = await fetchCheckins();
      const validCheckins = allCheckins.filter(c => validUserIds.has(c.userId));
      setCheckins(validCheckins);

      setDepartmentsList(getDepartmentsList());
      setAdminSettings(getAdminEmailSettings());
    } catch (err) {
      console.error("Lỗi lấy dữ liệu Admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Auto-refresh every 4 seconds so registration on mobile phone shows immediately on Admin PC!
    const timer = setInterval(loadAllData, 4000);
    return () => clearInterval(timer);
  }, []);

  const departments = useMemo(() => {
    return ['Tất cả', ...departmentsList];
  }, [departmentsList]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesTab = activeTab === 'Tất cả' || u.department === activeTab;
      const matchesSearch = 
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [users, activeTab, searchTerm]);

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

  const totalMealStats = useMemo(() => {
    let lunch = 0;
    let dinner = 0;
    checkins.forEach(c => {
      const m = calculateMeals(c.shiftName);
      lunch += m.lunch;
      dinner += m.dinner;
    });
    return { lunch, dinner, total: lunch + dinner };
  }, [checkins]);

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
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block">🍱 Suất Ăn Cần Chuẩn Bị</span>
            <div className="text-3xl font-black text-orange-600 mt-1">{totalMealStats.total} <span className="text-xs font-normal text-gray-500">suất</span></div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 font-bold border-t border-orange-100 pt-1">
              <span className="text-amber-800">🌞 Trưa: {totalMealStats.lunch}</span>
              <span className="text-purple-800">🌙 Tối: {totalMealStats.dinner}</span>
            </div>
          </div>
        </div>

        {/* Search & Department Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex space-x-1 overflow-x-auto w-full md:w-auto pb-1 scrollbar-hide">
            {departments.map(dep => (
              <button
                key={dep}
                onClick={() => setActiveTab(dep)}
                className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                  activeTab === dep 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {dep}
              </button>
            ))}
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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              📋 Bảng Quản Lý Dữ Liệu Lịch Làm Việc & Điểm Danh (Đồng Bộ Thiết Bị)
              <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
                {filteredUsers.length} người
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
              Không tìm thấy TNV nào phù hợp trong hệ thống.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-gray-400 bg-gray-50 uppercase font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Họ và Tên / Liên hệ</th>
                    <th className="px-4 py-3">Bộ phận (Edit trực tiếp)</th>
                    <th className="px-4 py-3 text-right">Phụ cấp/ca (Sửa đồng bộ TNV)</th>
                    <th className="px-4 py-3 text-center">Ca đã duyệt</th>
                    <th className="px-4 py-3 text-right">Tổng phụ cấp (VND)</th>
                    <th className="px-4 py-3">Lịch đăng ký, QR Check-in/out & Note Admin</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(user => {
                    const userCheckins = checkins.filter(c => c.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);
                    const approvedCheckins = userCheckins.filter(c => c.status === 'approved');
                    const approvedCount = approvedCheckins.length;
                    const totalOTHours = approvedCheckins.reduce((otSum, c) => otSum + (Number(c.otHours) || 0), 0);
                    const userTotalSalary = approvedCheckins.reduce((sum, c) => sum + calculateShiftPay(c.shiftName, user.salaryRate, c.otHours), 0);

                    return (
                      <tr key={user.id} className="hover:bg-blue-50/30 transition">
                        {/* Name & Contact */}
                        <td className="px-4 py-3 align-top">
                          <div className="font-bold text-gray-900 text-sm">{user.fullName}</div>
                          <div className="text-gray-500 mt-0.5">📱 {user.phone}</div>
                          <div className="text-gray-400 text-[11px]">📧 {user.email}</div>
                          {user.facebookLink && (
                            <a href={user.facebookLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[11px] block mt-0.5">
                              🔗 Facebook/Zalo
                            </a>
                          )}
                        </td>

                        {/* Inline Department Select */}
                        <td className="px-4 py-3 align-top">
                          <select
                            value={user.department}
                            onChange={(e) => handleDepartmentChangeInline(user.id, e.target.value)}
                            className="px-2.5 py-1.5 border border-blue-200 bg-blue-50/60 rounded-xl font-bold text-blue-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                          >
                            {departmentsList.map(dep => (
                              <option key={dep} value={dep}>{dep}</option>
                            ))}
                          </select>
                        </td>

                        {/* Inline Salary Input */}
                        <td className="px-4 py-3 text-right align-top">
                          <input
                            type="number"
                            step={5000}
                            value={user.salaryRate || 50000}
                            onChange={(e) => handleSalaryChangeInline(user.id, Number(e.target.value))}
                            className="w-24 px-2 py-1 border border-emerald-200 bg-emerald-50/50 rounded-lg text-right font-bold text-emerald-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-gray-400 block mt-0.5">VND / ca</span>
                        </td>

                        {/* Approved count */}
                        <td className="px-4 py-3 text-center align-top font-bold text-sm">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 block">
                            {approvedCount} ca
                          </span>
                          {totalOTHours > 0 && (
                            <span className="text-[10px] text-purple-700 font-bold block mt-1">
                              +{totalOTHours}h OT
                            </span>
                          )}
                        </td>

                        {/* Total Salary */}
                        <td className="px-4 py-3 text-right align-top font-black text-emerald-600 text-sm">
                          <div>{userTotalSalary.toLocaleString()} VND</div>
                          {totalOTHours > 0 && (
                            <span className="text-[10px] text-purple-600 font-bold block">
                              (Đã cộng +{(totalOTHours * 25000).toLocaleString()}đ OT)
                            </span>
                          )}
                        </td>

                        {/* Schedules & QR Checkin/Checkout logs + Admin Notes */}
                        <td className="px-4 py-3 align-top">
                          {userCheckins.length === 0 ? (
                            <span className="text-gray-400 italic text-[11px]">Chưa có lịch đăng ký nào</span>
                          ) : (
                            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                              {userCheckins.map(ci => {
                                const isFullDay = (ci.shiftName || '').includes('Cả Ngày') || (ci.shiftName || '').toLowerCase().includes('full');
                                const shiftPay = calculateShiftPay(ci.shiftName, user.salaryRate, ci.otHours);
                                return (
                                  <div key={ci.id} className="p-2 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                                    <div className="flex items-center justify-between font-bold text-gray-900 text-xs gap-1">
                                      <span className="truncate">📅 {ci.workDate || format(ci.createdAt, 'dd/MM/yyyy')}: {ci.shiftName}</span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {isFullDay && (
                                          <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                                            ⚡ 2x Cả Ngày
                                          </span>
                                        )}
                                        {ci.otHours ? (
                                          <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                                            +{ci.otHours}h OT (+{(ci.otHours * 25000).toLocaleString()}đ)
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-emerald-700 font-bold">
                                      Thù lao ca này: {shiftPay.toLocaleString()} VND {isFullDay ? '(2x Lương)' : ''} {ci.otHours ? `(Cộng +${(ci.otHours * 25000).toLocaleString()}đ OT)` : ''}
                                    </div>

                                  {/* Check-in & Check-out Automatic Data */}
                                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                    <span>📍 In: {ci.checkinTime ? format(ci.checkinTime, 'HH:mm') : 'Chưa quét'}</span>
                                    <span>🏁 Out: {ci.checkoutTime ? format(ci.checkoutTime, 'HH:mm') : 'Chưa quét'}</span>
                                  </div>

                                  {/* Admin Note Inline Edit */}
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[10px] text-gray-400">Note Admin:</span>
                                    <input
                                      type="text"
                                      defaultValue={ci.adminNote || ''}
                                      onBlur={(e) => handleAdminNoteChange(ci.id, e.target.value)}
                                      placeholder="Nhập ghi chú Admin..."
                                      className="flex-1 px-2 py-0.5 text-[11px] border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    {ci.status === 'pending' ? (
                                      <button
                                        onClick={() => handleApproveSingle(ci)}
                                        className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[10px] transition"
                                      >
                                        Duyệt Lịch & Gửi Mail
                                      </button>
                                    ) : (
                                      <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                                        ✓ Đã duyệt 📧 Email (from {adminSettings.senderEmail})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center align-top space-x-1">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                            title="Sửa chi tiết"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.fullName)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                            title="Xoá TNV"
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
      </main>
    </div>
  );
}
