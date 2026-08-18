import React, { useState, useEffect } from 'react';
import { getAdminEmailSettings, saveAdminEmailSettings } from '../services/emailService';
import { getShiftConfigs, saveShiftConfigs } from '../services/dataService';
import { ShiftConfig } from '../types';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AdminSettingsModal({ isOpen, onClose, onSaved }: AdminSettingsModalProps) {
  const [senderEmail, setSenderEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [shifts, setShifts] = useState<ShiftConfig[]>([]);

  useEffect(() => {
    if (isOpen) {
      const settings = getAdminEmailSettings();
      setSenderEmail(settings.senderEmail);
      setAdminName(settings.adminName);
      setShifts(getShiftConfigs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleShiftTimeChange = (id: string, field: 'startTime' | 'endTime', value: string) => {
    setShifts(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (senderEmail.trim()) {
      saveAdminEmailSettings({
        senderEmail: senderEmail.trim(),
        adminName: adminName.trim() || 'Quản trị viên Hệ thống',
      });
      saveShiftConfigs(shifts);
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
        >
          ✕
        </button>

        <h3 className="text-xl font-black text-gray-900 mb-1">
          ⚙️ Cấu Hình Hệ Thống & Khung Giờ Ca Làm
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Tùy chỉnh thông tin gửi email và thời gian làm việc mặc định cho các ca.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Settings */}
          <div className="space-y-3 p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">📧 Cấu hình Email Thông Báo</h4>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên Admin Hiển Thị:
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                placeholder="VD: Quản trị viên Nguyễn Chí Công"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email Gửi Thông Báo Tự Động:
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                required
                placeholder="chicong092004@gmail.com"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Shift Working Hours Settings */}
          <div className="space-y-3 p-3.5 bg-purple-50/40 rounded-2xl border border-purple-100">
            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center justify-between">
              <span>⏰ Quản Lý Khung Giờ Các Ca Làm</span>
              <span className="text-[10px] text-purple-600 font-normal lowercase">(tự động đồng bộ với TNV & QR)</span>
            </h4>

            <div className="space-y-2.5">
              {shifts.map((shift) => (
                <div key={shift.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-purple-100 shadow-2xs">
                  <span className="text-xs font-bold text-gray-800 w-24 sm:w-28 truncate">{shift.name}</span>
                  <div className="flex items-center gap-1.5 text-xs">
                    <input
                      type="time"
                      value={shift.startTime}
                      onChange={(e) => handleShiftTimeChange(shift.id, 'startTime', e.target.value)}
                      required
                      className="px-2 py-1 border border-gray-300 rounded-lg outline-none text-xs font-semibold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-gray-400 font-bold">-</span>
                    <input
                      type="time"
                      value={shift.endTime}
                      onChange={(e) => handleShiftTimeChange(shift.id, 'endTime', e.target.value)}
                      required
                      className="px-2 py-1 border border-gray-300 rounded-lg outline-none text-xs font-semibold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
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

