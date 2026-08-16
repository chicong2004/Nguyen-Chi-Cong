import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';

interface AdminDailyQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminDailyQRModal({ isOpen, onClose }: AdminDailyQRModalProps) {
  const [selectedShift, setSelectedShift] = useState('Ca Sáng (08:00 - 12:00)');
  const currentDate = format(new Date(), 'yyyy-MM-dd');

  if (!isOpen) return null;

  const qrPayload = JSON.stringify({
    type: 'event_qr',
    shiftName: selectedShift,
    date: currentDate,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
        >
          ✕
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-1">
          📱 Tạo Mã QR Điểm Danh Hàng Ngày
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          TNV quét mã này bằng camera trên giao diện web để ghi nhận ca làm
        </p>

        <div className="mb-4 text-left">
          <label className="block text-xs font-bold text-gray-700 mb-1">Chọn ca làm việc hôm nay:</label>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="Ca Sáng (08:00 - 12:00)">Ca Sáng (08:00 - 12:00)</option>
            <option value="Ca Chiều (13:00 - 17:00)">Ca Chiều (13:00 - 17:00)</option>
            <option value="Ca Tối (18:00 - 21:00)">Ca Tối (18:00 - 21:00)</option>
            <option value="Ca Cả Ngày (08:00 - 17:00)">Ca Cả Ngày (08:00 - 17:00)</option>
          </select>
        </div>

        {/* Display QR SVG */}
        <div className="p-6 bg-gray-50 rounded-2xl border-2 border-blue-100 flex flex-col items-center justify-center mb-4 shadow-inner">
          <QRCodeSVG value={qrPayload} size={220} level="H" includeMargin={true} />
          <div className="mt-3 text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            {selectedShift}
          </div>
          <span className="text-[11px] text-gray-400 mt-1">Ngày: {format(new Date(), 'dd/MM/yyyy')}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition flex items-center justify-center gap-1.5"
          >
            🖨️ In / Trình chiếu QR
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(qrPayload);
              alert("Đã sao chép mã QR!");
            }}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition"
          >
            📋 Sao chép mã
          </button>
        </div>
      </div>
    </div>
  );
}
