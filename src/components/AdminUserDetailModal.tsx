import React, { useState } from 'react';
import { User, Checkin, EventItem } from '../types';
import { 
  updateCheckinShiftDetails, 
  approveCheckinItem, 
  rejectCheckinItem, 
  deleteCheckinItem,
  calculateShiftPay,
  getDepartmentsList,
  getEventsList,
  getDepartmentRate
} from '../services/dataService';
import { format } from 'date-fns';

interface AdminUserDetailModalProps {
  user: User | null;
  checkins: Checkin[];
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export default function AdminUserDetailModal({ user, checkins, isOpen, onClose, onDataChanged }: AdminUserDetailModalProps) {
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  
  // Shift Edit Form State
  const [editWorkDate, setEditWorkDate] = useState('');
  const [editShiftName, setEditShiftName] = useState('');
  const [editOtHours, setEditOtHours] = useState<number>(0);
  const [editDepartment, setEditDepartment] = useState('');
  const [editEventId, setEditEventId] = useState('');
  const [editAdminNote, setEditAdminNote] = useState('');

  if (!isOpen || !user) return null;

  const userCheckins = checkins.filter(c => 
    c.userId === user.id || 
    (c.fullName && user.fullName && c.fullName.trim().toLowerCase() === user.fullName.trim().toLowerCase())
  ).sort((a, b) => b.createdAt - a.createdAt);
  const approvedCheckins = userCheckins.filter(c => c.status === 'approved');
  const totalSalary = approvedCheckins.reduce((sum, c) => sum + calculateShiftPay(c.shiftName || '', user.salaryRate, c.otHours), 0);
  const departments = getDepartmentsList();
  const events = getEventsList();

  const handleStartEditShift = (shift: Checkin) => {
    setEditingShiftId(shift.id);
    setEditWorkDate(shift.workDate || format(shift.createdAt, 'yyyy-MM-dd'));
    setEditShiftName(shift.shiftName || 'Ca Sáng (07:00 - 12:00)');
    setEditOtHours(shift.otHours || 0);
    setEditDepartment(shift.department || user.department);
    setEditEventId(shift.eventId || '');
    setEditAdminNote(shift.adminNote || '');
  };

  const handleSaveShiftEdit = async (shiftId: string) => {
    const selectedEvt = events.find(e => e.id === editEventId);
    await updateCheckinShiftDetails(shiftId, {
      workDate: editWorkDate,
      shiftName: editShiftName,
      otHours: Number(editOtHours),
      department: editDepartment,
      eventId: editEventId || undefined,
      eventName: selectedEvt ? selectedEvt.name : undefined,
      adminNote: editAdminNote,
    });

    setEditingShiftId(null);
    onDataChanged();
  };

  const handleApprove = async (id: string) => {
    await approveCheckinItem(id);
    onDataChanged();
  };

  const handleReject = async (id: string) => {
    await rejectCheckinItem(id);
    onDataChanged();
  };

  const handleDelete = async (shift: Checkin) => {
    if (confirm(`Bạn có chắc chắn muốn xóa ca làm (${shift.workDate} - ${shift.shiftName})?`)) {
      await deleteCheckinItem(shift.id);
      onDataChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
        >
          ✕
        </button>

        {/* User Summary Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-gray-900">{user.fullName}</h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {user.department}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              📱 Phone: <span className="font-bold text-gray-800">{user.phone}</span> &bull; 📧 Email: <span className="font-bold text-gray-800">{user.email}</span>
            </p>
            {user.facebookLink && (
              <a href={user.facebookLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-semibold block mt-0.5">
                🔗 Facebook/Zalo: {user.facebookLink}
              </a>
            )}
          </div>
        </div>

        {/* Financial Stat Banner */}
        <div className="grid grid-cols-3 gap-2 my-4 bg-gray-50 p-3 rounded-2xl border border-gray-200 text-center">
          <div>
            <span className="text-[11px] text-gray-500 font-medium block">Số ca đã duyệt</span>
            <span className="text-lg font-black text-emerald-600">{approvedCheckins.length} ca</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium block">Mức lương cơ bản</span>
            <span className="text-lg font-black text-gray-800">{(user.salaryRate || 50000).toLocaleString()}đ/ca</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium block">Tổng phụ cấp nhận</span>
            <span className="text-lg font-black text-blue-600">{totalSalary.toLocaleString()} VND</span>
          </div>
        </div>

        {/* List of Registered Shifts */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
            📅 Danh sách ca đăng ký ({userCheckins.length})
          </h4>

          {userCheckins.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400 italic">
              Chưa có lịch ca làm việc nào.
            </div>
          ) : (
            userCheckins.map(shift => {
              const isEditing = editingShiftId === shift.id;
              const shiftPay = calculateShiftPay(shift.shiftName || '', user.salaryRate, shift.otHours);

              return (
                <div key={shift.id} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-2">
                  {!isEditing ? (
                    <>
                      <div className="flex items-center justify-between font-bold text-xs text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📅 {shift.workDate || format(shift.createdAt, 'dd/MM/yyyy')}: {shift.shiftName}</span>
                          {shift.eventName && (
                            <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full">
                              🎉 {shift.eventName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {shift.checkinTime && shift.checkoutTime && shift.status === 'approved' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                              ✓ Đã đủ Check-in & Out (Đã Duyệt)
                            </span>
                          ) : shift.checkinTime && !shift.checkoutTime ? (
                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200">
                              🟡 Đã Check-in (Chờ Check-out)
                            </span>
                          ) : shift.status === 'approved' ? (
                            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-200">
                              ✓ Admin Duyệt Thủ Công
                            </span>
                          ) : shift.status === 'rejected' ? (
                            <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-red-200">
                              ❌ Từ chối
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-gray-200">
                              ⏳ Chờ Check-in & Out
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                        <span>🏢 Bộ phận: <strong className="text-blue-700">{shift.department}</strong> | OT: <strong className="text-purple-700">+{shift.otHours || 0}h</strong></span>
                        <span className="font-extrabold text-emerald-700">Thù lao: {shiftPay.toLocaleString()} VND</span>
                      </div>

                      {/* QR Timestamps */}
                      <div className="flex items-center gap-3 text-[11px] bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <span className={shift.checkinTime ? "text-emerald-700 font-bold" : "text-gray-400"}>
                          📍 In: {shift.checkinTime ? format(shift.checkinTime, 'HH:mm dd/MM') : 'Chưa quét'}
                        </span>
                        <span className={shift.checkoutTime ? "text-emerald-700 font-bold" : "text-amber-600 font-bold"}>
                          🏁 Out: {shift.checkoutTime ? format(shift.checkoutTime, 'HH:mm dd/MM') : 'Chưa quét Check-out'}
                        </span>
                      </div>

                      {shift.adminNote && (
                        <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-xl border border-gray-100">
                          📝 Ghi chú: {shift.adminNote}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                        <div className="flex items-center gap-1.5">
                          {shift.status !== 'approved' && (
                            <button
                              onClick={() => handleApprove(shift.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                            >
                              ✓ Duyệt
                            </button>
                          )}
                          {shift.status !== 'rejected' && (
                            <button
                              onClick={() => handleReject(shift.id)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
                            >
                              ✕ Từ Chối
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEditShift(shift)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl"
                          >
                            ✏️ Sửa chi tiết ca
                          </button>
                        </div>

                        <button
                          onClick={() => handleDelete(shift)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 font-bold rounded-xl"
                        >
                          🗑️ Xóa ca
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Shift Inline Edit Form */
                    <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 space-y-3">
                      <div className="font-bold text-xs text-blue-900 flex items-center justify-between">
                        <span>✏️ Chỉnh Sửa Chi Tiết Ca Làm</span>
                        <button onClick={() => setEditingShiftId(null)} className="text-gray-400 hover:text-gray-700">✕ Hủy</button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Ngày làm việc</label>
                          <input
                            type="date"
                            value={editWorkDate}
                            onChange={(e) => setEditWorkDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Ca làm việc</label>
                          <select
                            value={editShiftName}
                            onChange={(e) => setEditShiftName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Ca Sáng (07:00 - 12:00)">Ca Sáng (07:00 - 12:00)</option>
                            <option value="Ca Chiều (13:00 - 17:30)">Ca Chiều (13:00 - 17:30)</option>
                            <option value="Ca Tối / OT (18:00 - 22:00)">Ca Tối / OT (18:00 - 22:00)</option>
                            <option value="Ca Cả Ngày (07:00 - 17:30)">Ca Cả Ngày (07:00 - 17:30)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Bộ phận ca này</label>
                          <select
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {departments.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Giờ OT làm thêm</label>
                          <input
                            type="number"
                            min={0}
                            max={12}
                            value={editOtHours}
                            onChange={(e) => setEditOtHours(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Sự kiện</label>
                        <select
                          value={editEventId}
                          onChange={(e) => setEditEventId(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Chọn sự kiện --</option>
                          {events.map(evt => (
                            <option key={evt.id} value={evt.id}>{evt.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Ghi chú Admin</label>
                        <input
                          type="text"
                          value={editAdminNote}
                          onChange={(e) => setEditAdminNote(e.target.value)}
                          placeholder="Nhập ghi chú cho ca làm này..."
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingShiftId(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 font-bold text-xs rounded-lg"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleSaveShiftEdit(shift.id)}
                          className="px-4 py-1 bg-blue-600 text-white font-bold text-xs rounded-lg shadow hover:bg-blue-700"
                        >
                          💾 Lưu thay đổi ca
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-black transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
