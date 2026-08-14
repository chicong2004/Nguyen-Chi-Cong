import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';
import { User, Checkin } from '../types';
import { format } from 'date-fns';
import Papa from 'papaparse';

export default function AdminDashboard() {
  const { refreshProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Active Tab
  const departments = useMemo(() => Array.from(new Set(users.map(u => u.department))), [users]);
  const [activeTab, setActiveTab] = useState<string>('');

  // Selected checkins for bulk approve
  const [selectedCheckins, setSelectedCheckins] = useState<Set<string>>(new Set());

  // Editing salary
  const [editingSalaryUser, setEditingSalaryUser] = useState<string | null>(null);
  const [editSalaryValue, setEditSalaryValue] = useState<string>('');

  const fetchData = async () => {
    const { data: usersData } = await supabase.from('users').select('*').eq('role', 'tnv');
    if (usersData) {
      setUsers(usersData.map(d => ({
        id: d.id,
        role: d.role,
        fullName: d.full_name,
        phone: d.phone,
        facebookLink: d.facebook_link,
        department: d.department,
        salaryRate: d.salary_rate,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      })));
    }

    const { data: checkinsData } = await supabase.from('checkins').select('*').order('created_at', { ascending: false });
    if (checkinsData) {
      setCheckins(checkinsData.map(d => ({
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

  useEffect(() => {
    fetchData();

    const usersSub = supabase.channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchData())
      .subscribe();
      
    const checkinsSub = supabase.channel('public:checkins_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(usersSub);
      supabase.removeChannel(checkinsSub);
    };
  }, []);

  useEffect(() => {
    if (departments.length > 0 && !activeTab) {
      setActiveTab(departments[0]);
    }
  }, [departments, activeTab]);

  const handleApprove = async (checkinId: string) => {
    try {
      await supabase.from('checkins').update({
        status: 'approved',
        updated_at: Date.now()
      }).eq('id', checkinId);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi duyệt ca.");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedCheckins.size === 0) return;
    try {
      const idsArray = Array.from(selectedCheckins);
      await supabase.from('checkins')
        .update({ status: 'approved', updated_at: Date.now() })
        .in('id', idsArray);
      setSelectedCheckins(new Set());
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

  const saveSalary = async (uid: string) => {
    const val = parseInt(editSalaryValue, 10);
    if (isNaN(val)) return;
    try {
      await supabase.from('users').update({
        salary_rate: val,
        updated_at: Date.now()
      }).eq('id', uid);
      setEditingSalaryUser(null);
      refreshProfile();
    } catch (err) {
      console.error(err);
      alert("Lỗi cập nhật lương.");
    }
  };

  const handleExportCSV = () => {
    const exportData = users.map(user => {
      const userCheckins = checkins.filter(c => c.userId === user.id && c.status === 'approved');
      const approvedShifts = userCheckins.length;
      const totalSalary = approvedShifts * (user.salaryRate || 0);
      return {
        'Họ và Tên': user.fullName,
        'Số điện thoại': `"${user.phone}"`,
        'Link Facebook': user.facebookLink || '',
        'Bộ phận': user.department,
        'Số ca đã duyệt': approvedShifts,
        'Mức lương/ca (VND)': user.salaryRate || 0,
        'Tổng lương (VND)': totalSalary
      };
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bang_Luong_TNV_${format(new Date(), 'dd_MM_yyyy')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Đang tải dữ liệu...</div>;

  const filteredUsers = users.filter(u => u.department === activeTab);
  
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Quản lý điểm danh và tính lương TNV/CTV</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
          >
            Xuất file CSV
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-200 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {departments.length === 0 && <div className="text-gray-500 text-sm">Chưa có dữ liệu TNV.</div>}
          {departments.map(dep => (
            <button
              key={dep}
              onClick={() => setActiveTab(dep)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === dep ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {dep}
            </button>
          ))}
        </div>

        {/* Content */}
        {departments.length > 0 && (
          <div className="space-y-8">
            {/* List of TNVs and their Checkins in Active Tab */}
            {filteredUsers.map(user => {
              const userCheckins = checkins.filter(c => c.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);
              const approvedCount = userCheckins.filter(c => c.status === 'approved').length;
              const pendingCount = userCheckins.filter(c => c.status === 'pending').length;

              return (
                <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* User Info Header */}
                  <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
                    <div>
                      <h3 className="font-semibold text-lg">{user.fullName}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                        <span>📱 {user.phone}</span>
                        {user.facebookLink && (
                          <a href={user.facebookLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            🔗 Facebook
                          </a>
                        )}
                        <span className="font-medium text-gray-800 bg-gray-200 px-2 rounded">
                          Đã duyệt: {approvedCount} ca
                        </span>
                      </div>
                    </div>
                    
                    {/* Salary Setting */}
                    <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                      <div className="text-sm">
                        <span className="text-gray-500 block text-xs">Mức lương / ca:</span>
                        {editingSalaryUser === user.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="number"
                              className="w-24 px-2 py-1 text-sm border rounded outline-none"
                              value={editSalaryValue}
                              onChange={(e) => setEditSalaryValue(e.target.value)}
                            />
                            <button onClick={() => saveSalary(user.id)} className="text-green-600 text-sm font-medium">Lưu</button>
                            <button onClick={() => setEditingSalaryUser(null)} className="text-gray-500 text-sm font-medium">Huỷ</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-semibold">{(user.salaryRate || 0).toLocaleString()} VND</span>
                            <button 
                              onClick={() => { setEditingSalaryUser(user.id); setEditSalaryValue(user.salaryRate?.toString() || '0'); }}
                              className="text-blue-600 text-xs hover:underline"
                            >
                              Sửa
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-sm border-l border-gray-200 pl-3">
                        <span className="text-gray-500 block text-xs">Tổng lương:</span>
                        <span className="font-bold text-green-700">
                          {(approvedCount * (user.salaryRate || 0)).toLocaleString()} VND
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Checkins List */}
                  <div className="p-5">
                    {userCheckins.length === 0 ? (
                      <div className="text-sm text-gray-400">TNV này chưa có lịch sử điểm danh.</div>
                    ) : (
                      <div>
                        {pendingCount > 0 && (
                          <div className="mb-3">
                            <button
                              onClick={handleBulkApprove}
                              disabled={selectedCheckins.size === 0}
                              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
                            >
                              Duyệt {selectedCheckins.size > 0 ? selectedCheckins.size : ''} ca đã chọn
                            </button>
                          </div>
                        )}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 bg-gray-50 uppercase">
                              <tr>
                                <th className="px-4 py-2 w-10"></th>
                                <th className="px-4 py-2">Thời gian</th>
                                <th className="px-4 py-2">Trạng thái</th>
                                <th className="px-4 py-2 text-right">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userCheckins.map(ci => (
                                <tr key={ci.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                  <td className="px-4 py-2">
                                    {ci.status === 'pending' && (
                                      <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedCheckins.has(ci.id)}
                                        onChange={() => toggleSelection(ci.id)}
                                      />
                                    )}
                                  </td>
                                  <td className="px-4 py-2 font-medium">
                                    {format(ci.createdAt, 'HH:mm - dd/MM/yyyy')}
                                  </td>
                                  <td className="px-4 py-2">
                                    {ci.status === 'pending' ? (
                                      <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-medium border border-orange-100">Chờ duyệt</span>
                                    ) : (
                                      <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-medium border border-green-100">Đã duyệt</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {ci.status === 'pending' && (
                                      <button
                                        onClick={() => handleApprove(ci.id)}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-xs"
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
