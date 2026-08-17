import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { updateUserProfileByAdmin, getDepartmentsList, fetchDepartmentsListAsync } from '../services/dataService';

interface AdminEditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AdminEditUserModal({ user, isOpen, onClose, onSaved }: AdminEditUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Hậu cần');
  const [depsList, setDepsList] = useState<string[]>(getDepartmentsList());
  const [salaryRate, setSalaryRate] = useState<number>(50000);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [facebookLink, setFacebookLink] = useState('');
  const [notes, setNotes] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDepartmentsListAsync().then(deps => setDepsList(deps));
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setDepartment(user.department || 'Hậu cần');
      setSalaryRate(user.salaryRate || 50000);
      setAdjustmentAmount(user.adjustmentAmount || 0);
      setAdjustmentNote(user.adjustmentNote || '');
      setFacebookLink(user.facebookLink || '');
      setNotes(user.notes || '');
      setPassword(user.password || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await updateUserProfileByAdmin(user.id, {
        fullName,
        email,
        phone,
        department,
        salaryRate: Number(salaryRate),
        adjustmentAmount: Number(adjustmentAmount),
        adjustmentNote,
        facebookLink,
        notes,
        password: password ? password.trim() : undefined,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Có lỗi xảy ra khi cập nhật thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
        >
          ✕
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-1">
          ✏️ Chỉnh Sửa Đăng Ký & Mức Lương TNV
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Quyền Admin: Cập nhật thông tin cá nhân, chuyển bộ phận và điều chỉnh phụ cấp ca/thưởng phạt.
        </p>

        {error && <div className="p-3 mb-4 text-xs text-red-600 bg-red-50 rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Họ và Tên</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Bộ phận công tác</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold"
              >
                {depsList.map(dep => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-700 mb-1">
                💰 Mức lương/ca (VND) <span className="text-[10px] text-gray-400 font-normal">(Chỉ Admin)</span>
              </label>
              <input
                type="number"
                step={5000}
                value={salaryRate}
                onChange={(e) => setSalaryRate(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50/40 rounded-xl text-sm font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Financial Adjustment Section (Plus/Minus & Reasons) */}
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-purple-900 flex items-center justify-between">
              <span>➕➖ Điều Chỉnh Thưởng / Phạt / Phụ Cấp Thêm</span>
              <span className="text-[10px] text-purple-700 font-normal">Nhập số dương (+) cộng, số âm (-) trừ</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-purple-900 mb-1">Số tiền cộng/trừ (VND):</label>
                <input
                  type="number"
                  step={5000}
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                  placeholder="VD: 50000 hoặc -20000"
                  className={`w-full px-3 py-2 border rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-purple-500 bg-white ${
                    adjustmentAmount > 0 
                      ? 'text-emerald-700 border-emerald-400' 
                      : adjustmentAmount < 0 
                        ? 'text-red-600 border-red-400' 
                        : 'text-gray-700 border-purple-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-900 mb-1">Lý do chi tiết cộng/trừ:</label>
                <input
                  type="text"
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="VD: Thưởng làm xuất sắc, Trừ tạm ứng..."
                  className="w-full px-3 py-2 border border-purple-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
              <span>🔑 Mật khẩu đăng nhập của TNV</span>
              <span className="text-[10px] text-blue-600 font-normal">Admin có thể cài/đặt lại MK cho TNV</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới (VD: 123456...)"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Link Facebook / Zalo</label>
            <input
              type="url"
              value={facebookLink}
              onChange={(e) => setFacebookLink(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú của Admin / Khung rảnh</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
