import React, { useState } from 'react';
import { EventItem } from '../types';
import { getEventsList, saveEventsList, generateUUID } from '../services/dataService';

interface AdminEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventsUpdated: () => void;
}

export default function AdminEventModal({ isOpen, onClose, onEventsUpdated }: AdminEventModalProps) {
  const [events, setEvents] = useState<EventItem[]>(getEventsList());
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');

  if (!isOpen) return null;

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newEvt: EventItem = {
      id: `evt-${generateUUID()}`,
      name: name.trim(),
      startDate: startDate || new Date().toISOString().slice(0, 10),
      endDate: endDate || new Date().toISOString().slice(0, 10),
      location: location.trim() || 'TP. Hồ Chí Minh',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newEvt, ...events];
    setEvents(updated);
    saveEventsList(updated);
    onEventsUpdated();

    setName('');
    setStartDate('');
    setEndDate('');
    setLocation('');
  };

  const handleToggleStatus = (id: string) => {
    const updated = events.map(e => {
      if (e.id === id) {
        return {
          ...e,
          status: e.status === 'active' ? 'archived' : 'active' as 'active' | 'archived',
          updatedAt: Date.now(),
        };
      }
      return e;
    });
    setEvents(updated);
    saveEventsList(updated);
    onEventsUpdated();
  };

  const handleDeleteEvent = (id: string, evtName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xoá sự kiện "${evtName}"?`)) {
      const updated = events.filter(e => e.id !== id);
      setEvents(updated);
      saveEventsList(updated);
      onEventsUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
        >
          ✕
        </button>

        <h3 className="text-xl font-black text-gray-900 mb-1 flex items-center gap-2">
          🎉 Quản Lý Danh Sách Sự Kiện (Events)
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Tạo và quản lý các sự kiện để TNV & CTV chọn đăng ký ca theo từng sự kiện cụ thể.
        </p>

        {/* Add Event Form */}
        <form onSubmit={handleAddEvent} className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-100 space-y-3 mb-4">
          <div className="font-bold text-xs text-purple-900">+ Thêm Sự Kiện Mới</div>
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Tên Sự Kiện <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Concert Âm Nhạc Mùa Hè 2026..."
              className="w-full px-3 py-2 text-xs font-semibold border border-purple-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Ngày Bắt Đầu</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold border border-purple-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Ngày Kết Thúc</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold border border-purple-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Địa Điểm Tổ Chức</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="VD: Sân vận động Quân khu 7..."
              className="w-full px-3 py-2 text-xs font-semibold border border-purple-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
          >
            ➕ Tạo Sự Kiện Mới & Mở Đăng Ký
          </button>
        </form>

        {/* List of Events */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          <div className="font-bold text-xs text-gray-700 flex items-center justify-between">
            <span>Danh sách sự kiện hiện tại ({events.length})</span>
            <span className="text-[11px] text-purple-600 font-semibold">Bật/Tắt để cho phép đăng ký</span>
          </div>

          {events.map(evt => (
            <div key={evt.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between gap-3">
              <div>
                <div className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <span>{evt.name}</span>
                  {evt.status === 'active' ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      🟢 Đang mở đăng ký
                    </span>
                  ) : (
                    <span className="bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      ⚪ Đã khóa
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  📍 {evt.location || 'Chưa cập nhật địa điểm'} &bull; 📅 {evt.startDate} đến {evt.endDate}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleStatus(evt.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition ${
                    evt.status === 'active' 
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  }`}
                >
                  {evt.status === 'active' ? 'Khóa' : 'Mở đăng ký'}
                </button>

                <button
                  onClick={() => handleDeleteEvent(evt.id, evt.name)}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition text-xs"
                  title="Xóa sự kiện"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

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
