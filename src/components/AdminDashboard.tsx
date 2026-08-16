import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { User, Checkin } from '../types';
import { 
  fetchAllUsers, 
  fetchCheckins, 
  approveCheckinItem, 
  bulkApproveCheckinsList, 
  removeUser,
  processQRCheckin
} from '../services/dataService';
import { format } from 'date-fns';
import Papa from 'papaparse';
import AdminEditUserModal from './AdminEditUserModal';
import AdminDailyQRModal from './AdminDailyQRModal';
import QRScannerModal from './QRScannerModal';

export default function AdminDashboard() {
  const { logout, isLocalStorageMode } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDailyQROpen, setIsDailyQROpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('Tất cả');

  // Selected checkins for bulk approve
  const [selectedCheckins, setSelectedCheckins] = useState<Set<string>>(new Set());

  const loadAllData = async () => {
    try {
      const allUsers = await fetchAllUsers();
      const allCheckins = await fetchCheckins();
      setUsers(allUsers.filter(u => u.role === 'tnv'));
      setCheckins(allCheckins);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu Admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const departments = useMemo(() => {
    const deps = Array.from(new Set(users.map(u => u.department)));
    return ['Tất cả', ...deps];
  }, [users]);

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

  // Total statistics
  const totalApprovedCheckins = checkins.filter(c => c.status === 'approved').length;
  const totalPendingCheckins = checkins.filter(c => c.status === 'pending').length;
  const totalPayroll = users.reduce((sum, u) => {
    const userApprovedCount = checkins.filter(c => c.userId === u.id && c.status === 'approved').length;
    return sum + (userApprovedCount * (u.salaryRate || 50000));
  }, 0);

  const handleApproveSingle = async (checkinId: string) => {
    try {
      await approveCheckinItem(checkinId);
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
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi duyệt hàng loạt.");
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedCheckins);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCheckins(newSet);
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xoá TNV "${name}" khỏi hệ thống?`)) {
      await removeUser(uid);
      await loadAllData();
    }
  };

  const handleQRScanResult = async (qrText: string) => {
    const res = await processQRCheckin(qrText);
    setToastMessage(res.message);
    setTimeout(() => setToastMessage(''), 5000);
    await loadAllData();
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
      const totalSalary = approvedShifts * (user.salaryRate || 50000);
      return {
        'Họ và Tên': user.fullName,
        'Số điện thoại': `"${user.phone}"`,
        'Bộ phận': user.department,
        'Mức phụ cấp/ca (VND)': user.salaryRate || 50000,
        'Số ca đã duyệt': approvedShifts,
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
      <QRScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleQRScanResult} 
        title="📷 Admin Quét Mã QR Thẻ TNV" 
      />
      <AdminEditUserModal 
        user={editingUser} 
        isOpen={Boolean(editingUser)} 
        onClose={() => setEditingUser(null)} 
        onSaved={loadAllData} 
      />

      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-gray-900">Quản Trị Viên (Admin)</h1>
              {isLocalStorageMode ? (
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  LocalStorage Mode
                </span>
              ) : (
                <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Supabase Cloud
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Tạo QR điểm danh, chỉnh sửa đăng ký bộ phận & chi phí phụ cấp từng TNV</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsDailyQROpen(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              📱 Tạo QR Ca Điểm Danh
            </button>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              📷 Quét QR Thẻ TNV
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
          <div className="p-4 bg-emerald-600 text-white text-sm font-bold rounded-2xl shadow-lg flex justify-between items-center animate-bounce">
            <span>🎉 {toastMessage}</span>
            <button onClick={() => setToastMessage('')} className="text-xs bg-emerald-700 px-2 py-1 rounded-lg">Đóng</button>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tổng TNV Đăng ký</span>
            <div className="text-3xl font-black text-gray-900 mt-2">{users.length} <span className="text-sm font-normal text-gray-500">người</span></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Ca làm chờ duyệt</span>
            <div className="text-3xl font-black text-amber-600 mt-2">{totalPendingCheckins} <span className="text-sm font-normal text-gray-500">ca</span></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Ca làm đã duyệt</span>
            <div className="text-3xl font-black text-emerald-600 mt-2">{totalApprovedCheckins} <span className="text-sm font-normal text-gray-500">ca</span></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Tổng chi phí phụ cấp</span>
            <div className="text-3xl font-black text-blue-600 mt-2">{totalPayroll.toLocaleString()} <span className="text-xs font-normal text-gray-500">VND</span></div>
          </div>
        </div>

        {/* Search & Filter Header */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Department Tabs */}
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

          {/* Search Input */}
          <div className="w-full md:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Tìm theo Tên, SĐT, Email..."
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50"
            />
          </div>
        </div>

        {/* Bulk Approve Banner */}
        {selectedCheckins.size > 0 && (
          <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
            <span className="text-sm font-bold">Đã chọn {selectedCheckins.size} ca điểm danh chờ duyệt</span>
            <button
              onClick={handleBulkApprove}
              className="px-4 py-2 bg-white text-blue-700 font-bold text-xs rounded-xl shadow hover:bg-blue-50 transition"
            >
              DUYỆT TẤT CẢ CA ĐÃ CHỌN
            </button>
          </div>
        )}

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-500">
            Không tìm thấy TNV nào phù hợp.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredUsers.map(user => {
              const userCheckins = checkins.filter(c => c.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);
              const approvedCount = userCheckins.filter(c => c.status === 'approved').length;
              const userTotalSalary = approvedCount * (user.salaryRate || 50000);

              return (
                <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* User Profile Bar */}
                  <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gray-50/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-gray-900">{user.fullName}</h3>
                        <span className="px-2.5 py-0.5 text-xs font-bold text-blue-700 bg-blue-100 rounded-full border border-blue-200">
                          {user.department}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-1">
                        <span>📧 {user.email}</span>
                        <span>📱 {user.phone}</span>
                        {user.facebookLink && (
                          <a href={user.facebookLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline">
                            🔗 Facebook/Zalo
                          </a>
                        )}
                        <span className="text-gray-400">📅 Đăng ký: {format(user.createdAt, 'dd/MM/yyyy')}</span>
                      </div>

                      {user.notes && (
                        <div className="mt-2 text-xs bg-amber-50 text-amber-800 p-2 rounded-xl border border-amber-100 italic">
                          📝 Ghi chú: {user.notes}
                        </div>
                      )}
                    </div>

                    {/* Admin Edit Action & Salary Display */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
                      <div className="text-xs">
                        <span className="text-gray-400 font-medium block">Mức phụ cấp / ca:</span>
                        <span className="font-bold text-emerald-700 text-sm">{(user.salaryRate || 50000).toLocaleString()} VND</span>
                      </div>

                      <div className="text-xs border-l border-gray-200 pl-3">
                        <span className="text-gray-400 font-medium block">Tổng nhận ({approvedCount} ca):</span>
                        <span className="font-black text-blue-600 text-sm">{userTotalSalary.toLocaleString()} VND</span>
                      </div>

                      <button
                        onClick={() => setEditingUser(user)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl transition border border-blue-200"
                      >
                        ✏️ Sửa Bộ phận & Chi phí
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.id, user.fullName)}
                        title="Xoá TNV"
                        className="text-gray-400 hover:text-red-600 p-1.5 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Checkins Sub-table */}
                  <div className="p-5">
                    {userCheckins.length === 0 ? (
                      <div className="text-xs text-gray-400 font-medium italic">TNV này chưa điểm danh ca nào.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="text-[11px] text-gray-400 bg-gray-50 uppercase font-semibold">
                            <tr>
                              <th className="px-3 py-2 w-8"></th>
                              <th className="px-3 py-2">Ca làm việc</th>
                              <th className="px-3 py-2">Thời gian điểm danh</th>
                              <th className="px-3 py-2">Trạng thái</th>
                              <th className="px-3 py-2 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userCheckins.map(ci => (
                              <tr key={ci.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="px-3 py-2">
                                  {ci.status === 'pending' && (
                                    <input
                                      type="checkbox"
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={selectedCheckins.has(ci.id)}
                                      onChange={() => toggleSelection(ci.id)}
                                    />
                                  )}
                                </td>
                                <td className="px-3 py-2 font-semibold text-gray-900">
                                  {ci.shiftName || 'Ca làm việc'}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {format(ci.createdAt, 'HH:mm - dd/MM/yyyy')}
                                </td>
                                <td className="px-3 py-2">
                                  {ci.status === 'pending' ? (
                                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold border border-amber-200 text-[10px]">
                                      ⏳ Chờ duyệt
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200 text-[10px]">
                                      ✓ Đã duyệt
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {ci.status === 'pending' && (
                                    <button
                                      onClick={() => handleApproveSingle(ci.id)}
                                      className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                                    >
                                      Duyệt ca này
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
