import React, { useState, useEffect } from 'react';
import { 
  DepartmentItem,
  fetchDepartmentsWithDetailsAsync,
  addDepartmentAsync,
  deleteDepartmentAsync,
  updateDepartmentAllowanceAsync,
  saveDepartmentsAndRatesAsync
} from '../services/dataService';

interface AdminDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AdminDepartmentModal({ isOpen, onClose, onSaved }: AdminDepartmentModalProps) {
  const [departmentItems, setDepartmentItems] = useState<DepartmentItem[]>([]);
  const [newDepName, setNewDepName] = useState('');
  const [newDepRate, setNewDepRate] = useState<number>(50000);

  const loadData = async () => {
    const items = await fetchDepartmentsWithDetailsAsync();
    setDepartmentItems(items);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRateChange = async (depName: string, rate: number) => {
    const updated = departmentItems.map(item => item.name === depName ? { ...item, allowance: rate } : item);
    setDepartmentItems(updated);
    await updateDepartmentAllowanceAsync(depName, rate);
    const deps = updated.map(u => u.name);
    const rates: Record<string, number> = {};
    updated.forEach(u => { rates[u.name] = u.allowance; });
    await saveDepartmentsAndRatesAsync(deps, rates);
    onSaved();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDepName.trim();
    if (name && !departmentItems.some(d => d.name === name)) {
      const rate = Number(newDepRate) || 50000;
      await addDepartmentAsync(name, rate);
      await loadData();
      setNewDepName('');
      setNewDepRate(50000);
      onSaved();
    }
  };

  const handleDelete = async (depItem: DepartmentItem) => {
    if (departmentItems.length <= 1) {
      alert("Phải giữ lại ít nhất 1 bộ phận trong hệ thống!");
      return;
    }
    await deleteDepartmentAsync(depItem.id || depItem.name);
    await loadData();
    onSaved();
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

        <h3 className="text-xl font-black text-gray-900 mb-1">
          🏢 Quản Lý Công Việc, Bộ Phận & Chi Phí
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Thiết lập danh sách công việc/bộ phận, định mức thù lao/ca (VND) và chi phí làm thêm (OT) cho nhân sự.
        </p>

        {/* Add Department Form */}
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-4 bg-blue-50/60 p-3 rounded-2xl border border-blue-100">
          <div className="sm:col-span-6">
            <input
              type="text"
              value={newDepName}
              onChange={(e) => setNewDepName(e.target.value)}
              placeholder="Tên bộ phận mới..."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          <div className="sm:col-span-4">
            <input
              type="number"
              step={5000}
              value={newDepRate}
              onChange={(e) => setNewDepRate(Number(e.target.value))}
              placeholder="Chi phí/ca (VND)"
              className="w-full px-3 py-2 bg-white border border-emerald-300 font-bold text-emerald-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full h-full min-h-[36px] bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              + Thêm
            </button>
          </div>
        </form>

        {/* Department List with Rate inputs */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {departmentItems.map(item => {
            const currentRate = item.allowance !== undefined ? item.allowance : 50000;
            return (
              <div key={item.id || item.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 gap-2">
                <span className="text-xs font-bold text-gray-900 sm:w-1/3 truncate">{item.name}</span>
                
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">Thù lao/ca:</span>
                  <input
                    type="number"
                    step={5000}
                    value={currentRate}
                    onChange={(e) => handleRateChange(item.name, Number(e.target.value))}
                    className="w-28 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] font-bold text-emerald-600">VND</span>
                </div>

                <button
                  onClick={() => handleDelete(item)}
                  className="text-xs text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition self-end sm:self-auto"
                >
                  🗑️ Xoá
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-[11px] text-gray-400 font-medium">✨ Tự động đồng bộ với Form Đăng Ký TNV</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
}
