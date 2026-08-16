import React, { useState, useEffect } from 'react';
import { getAdminEmailSettings, saveAdminEmailSettings } from '../services/emailService';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AdminSettingsModal({ isOpen, onClose, onSaved }: AdminSettingsModalProps) {
  const [senderEmail, setSenderEmail] = useState('');
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    if (isOpen) {
      const settings = getAdminEmailSettings();
      setSenderEmail(settings.senderEmail);
      setAdminName(settings.adminName);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (senderEmail.trim()) {
      saveAdminEmailSettings({
        senderEmail: senderEmail.trim(),
        adminName: adminName.trim() || 'Quản trị viên Hệ thống',
      });
      onSaved();
      onClose();
    }
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
          ⚙️ Tùy Chỉnh Email & Tên Admin
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Chỉnh sửa email gửi tự động và Tên hiển thị Admin khi gửi thông báo duyệt lịch tới TNV.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Tên Admin Hiển Thị:
            </label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              placeholder="VD: Quản trị viên Nguyễn Chí Công"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Email Gửi Thông Báo Tự Động:
            </label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              required
              placeholder="chicong092004@gmail.com"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Mặc định: chicong092004@gmail.com. Mọi thông báo duyệt ca sẽ tự động gửi dưới tên email này.
            </span>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
            >
              Lưu Cấu Hình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
