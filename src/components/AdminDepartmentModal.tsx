import React, { useState, useEffect } from 'react';
import { getDepartmentsList, saveDepartmentsList } from '../services/dataService';

interface AdminDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AdminDepartmentModal({ isOpen, onClose, onSaved }: AdminDepartmentModalProps) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [newDepName, setNewDepName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDepartments(getDepartmentsList());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDepName.trim();
    if (name && !departments.includes(name)) {
      const updated = [...departments, name];
      setDepartments(updated);
      saveDepartmentsList(updated);
      setNewDepName('');
      onSaved();
    }
  };

  const handleDelete = (depName: string) => {
    if (departments.length <= 1) {
      alert("Phải giữ lại ít nhất 1 bộ phận trong hệ thống!");
      return;
    }
    const updated = departments.filter(d => d !== depName);
    setDepartments(updated);
    saveDepartmentsList(updated);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
        >
          ✕
        </button>

        <h3 className="text-xl font-black text-gray-900 mb-1">
          🏢 Quản Lý Danh Sách Bộ Phận Đăng Ký
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Thêm hoặc bớt các bộ phận công tác cho TNV đăng ký.
        </p>

        {/* Add Department Form */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newDepName}
            onChange={(e) => setNewDepName(e.target.value)}
            placeholder="Nhập tên bộ phận mới..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Thêm mới
          </button>
        </form>

        {/* Department List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {departments.map(dep => (
            <div key={dep} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-900">{dep}</span>
              <button
                onClick={() => handleDelete(dep)}
                className="text-xs text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition"
              >
                🗑️ Xoá
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 text-right">
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
