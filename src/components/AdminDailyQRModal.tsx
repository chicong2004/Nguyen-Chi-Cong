import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';

interface AdminDailyQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminDailyQRModal({ isOpen, onClose }: AdminDailyQRModalProps) {
  const [qrType, setQrType] = useState<'event_checkin' | 'event_checkout'>('event_checkin');
  const [scope, setScope] = useState<'full_day' | 'shift_window'>('full_day');
  const [shiftPreset, setShiftPreset] = useState<string>('Ca Sáng');
  const [customFrom, setCustomFrom] = useState<string>('07:00');
  const [customTo, setCustomTo] = useState<string>('12:00');
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());

  const currentDate = format(new Date(), 'yyyy-MM-dd');

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nguyen-chi-cong.vercel.app';
  const qrTypeParam = qrType === 'event_checkout' ? 'checkout' : 'checkin';

  let validFrom = '00:00';
  let validTo = '23:59';
  let shiftLabel = 'Tất cả các ca (Cả Ngày)';

  if (scope === 'shift_window') {
    if (shiftPreset === 'Ca Sáng') {
      validFrom = '07:00';
      validTo = '12:00';
      shiftLabel = 'Ca Sáng (07:00 - 12:00)';
    } else if (shiftPreset === 'Ca Chiều') {
      validFrom = '12:00';
      validTo = '17:00';
      shiftLabel = 'Ca Chiều (12:00 - 17:00)';
    } else if (shiftPreset === 'Ca Tối') {
      validFrom = '17:00';
      validTo = '22:00';
      shiftLabel = 'Ca Tối (17:00 - 22:00)';
    } else if (shiftPreset === 'Ca Cả Ngày') {
      validFrom = '07:00';
      validTo = '22:00';
      shiftLabel = 'Ca Cả Ngày (07:00 - 22:00)';
    } else {
      validFrom = customFrom || '07:00';
      validTo = customTo || '18:00';
      shiftLabel = `Khung Giờ Tự Chọn (${validFrom} - ${validTo})`;
    }
  }

  const qrPayload = `${origin}/?action=qr_scan&type=${qrTypeParam}&date=${currentDate}&scope=${scope}&from=${validFrom}&to=${validTo}&key=${refreshKey}`;

  const handleRefreshQR = () => {
    setRefreshKey(Date.now());
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-gray-100 text-center max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
        >
          ✕
        </button>

        <h3 className="text-xl font-black text-gray-900 mb-1 flex items-center justify-center gap-2">
          <span>📱</span> Mã QR Điểm Danh Chỉnh Giờ & Ca Làm
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Tạo mã QR Check-in/Check-out Cả Ngày hoặc Theo Khung Giờ để đối chiếu chính xác thời gian vào ra của TNV.
        </p>

        {/* 1. QR Action Type Toggle */}
        <div className="mb-3">
          <label className="block text-[11px] font-bold text-gray-500 mb-1 text-left">1. Chọn Loại Thao Tác:</label>
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setQrType('event_checkin')}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                qrType === 'event_checkin'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📍 QR CHECK-IN (Vào Ca)
            </button>
            <button
              onClick={() => setQrType('event_checkout')}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                qrType === 'event_checkout'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏁 QR CHECK-OUT (Ra Ca)
            </button>
          </div>
        </div>

        {/* 2. QR Scope Mode Selection */}
        <div className="mb-3">
          <label className="block text-[11px] font-bold text-gray-500 mb-1 text-left">2. Chọn Phạm Vi Thời Gian:</label>
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setScope('full_day')}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                scope === 'full_day'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ☀️ Cả Ngày (Linh Hoạt)
            </button>
            <button
              onClick={() => setScope('shift_window')}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                scope === 'shift_window'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⏰ Theo Khung Giờ Ca Làm
            </button>
          </div>
        </div>

        {/* 3. Shift Window Selector (If scope === 'shift_window') */}
        {scope === 'shift_window' && (
          <div className="mb-4 bg-purple-50/70 p-3 rounded-2xl border border-purple-200 text-left">
            <label className="block text-xs font-bold text-purple-900 mb-1.5">⏰ Chọn Ca Làm / Khung Giờ Giới Hạn:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
              {['Ca Sáng', 'Ca Chiều', 'Ca Tối', 'Ca Cả Ngày', 'Khung Giờ Tuỳ Chỉnh'].map((p) => {
                const keyName = p === 'Khung Giờ Tuỳ Chỉnh' ? 'custom' : p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setShiftPreset(keyName)}
                    className={`py-1.5 text-[11px] font-bold rounded-xl border transition ${
                      shiftPreset === keyName
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {shiftPreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-purple-200">
                <div>
                  <label className="block text-[10px] font-bold text-purple-800 mb-1">Cho phép từ (HH:mm):</label>
                  <input
                    type="time"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-purple-300 rounded-lg text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-purple-800 mb-1">Cho phép đến (HH:mm):</label>
                  <input
                    type="time"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-purple-300 rounded-lg text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Display QR SVG */}
        <div className={`p-5 rounded-3xl border-2 flex flex-col items-center justify-center mb-4 shadow-inner ${
          qrType === 'event_checkin' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
        }`}>
          <QRCodeSVG value={qrPayload} size={240} level="M" includeMargin={true} />
          
          <div className={`mt-3 text-xs font-bold px-3 py-1 rounded-full border ${
            qrType === 'event_checkin' 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {qrType === 'event_checkin' ? '📍 QR CHECK-IN (VÀO CA)' : '🏁 QR CHECK-OUT (RA CA)'}
          </div>

          <div className="mt-2 text-xs font-black text-gray-800">
            {scope === 'full_day' ? '☀️ Áp dụng: Cả Ngày (00:00 - 23:59)' : `⏰ Áp dụng: ${shiftLabel}`}
          </div>

          <span className="text-[11px] text-gray-400 mt-0.5">
            Ngày: {format(new Date(), 'dd/MM/yyyy')} &bull; Phiên mã: #{refreshKey.toString().slice(-6)}
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
