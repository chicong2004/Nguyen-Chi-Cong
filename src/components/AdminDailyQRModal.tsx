import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';

interface AdminDailyQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminDailyQRModal({ isOpen, onClose }: AdminDailyQRModalProps) {
  const [qrType, setQrType] = useState<'event_checkin' | 'event_checkout'>('event_checkin');
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());
  const currentDate = format(new Date(), 'yyyy-MM-dd');

  if (!isOpen) return null;

  const qrPayload = JSON.stringify({
    type: qrType,
    date: currentDate,
    key: refreshKey,
    code: `QR-${currentDate}-${qrType === 'event_checkin' ? 'IN' : 'OUT'}-${refreshKey.toString().slice(-4)}`,
  });

  const handleRefreshQR = () => {
    setRefreshKey(Date.now());
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
        >
          ✕
        </button>

        <h3 className="text-xl font-black text-gray-900 mb-1 flex items-center justify-center gap-2">
          <span>📱</span> Mã QR Điểm Danh Sự Kiện Hàng Ngày
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Mã QR ghi nhận điểm danh Check-in (Vào ca) hoặc Check-out (Ra ca) dùng chung cho tất cả TNV & CTV.
        </p>

        {/* QR Type Toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setQrType('event_checkin')}
            className={`py-2.5 text-xs font-bold rounded-xl transition ${
              qrType === 'event_checkin'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📍 Mã QR CHECK-IN (Vào Ca)
          </button>
          <button
            onClick={() => setQrType('event_checkout')}
            className={`py-2.5 text-xs font-bold rounded-xl transition ${
              qrType === 'event_checkout'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏁 Mã QR CHECK-OUT (Ra Ca)
          </button>
        </div>

        {/* Display QR SVG */}
        <div className={`p-6 rounded-3xl border-2 flex flex-col items-center justify-center mb-4 shadow-inner ${
          qrType === 'event_checkin' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
        }`}>
          <QRCodeSVG value={qrPayload} size={230} level="H" includeMargin={true} />
          
          <div className={`mt-3 text-xs font-bold px-3 py-1 rounded-full border ${
            qrType === 'event_checkin' 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {qrType === 'event_checkin' ? '📍 QR CHECK-IN TỔNG (VÀO CA)' : '🏁 QR CHECK-OUT TỔNG (RA CA)'}
          </div>
          <span className="text-[11px] text-gray-400 mt-1">
            Ngày: {format(new Date(), 'dd/MM/yyyy')} &bull; Mã phiên: #{refreshKey.toString().slice(-6)}
          </span>
        </div>

        {/* Action buttons including Refresh QR */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleRefreshQR}
            className="py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
            title="Tạo mã QR mới"
          >
            🔄 Làm Mới Mã
          </button>
          <button
            onClick={handlePrint}
            className="py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition flex items-center justify-center gap-1"
          >
            🖨️ In / Trình Chiếu
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(qrPayload);
              alert("Đã sao chép nội dung QR!");
            }}
            className="py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition"
          >
            📋 Sao chép
          </button>
        </div>
      </div>
    </div>
  );
}
