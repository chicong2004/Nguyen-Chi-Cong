import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (qrText: string) => void;
  title?: string;
}

export default function QRScannerModal({ isOpen, onClose, onScanSuccess, title }: QRScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Initialize scanner
    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader-container',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            onScanSuccess(decodedText);
            scanner.clear().catch(console.error);
            onClose();
          },
          (errorMessage) => {
            // Ignore frame parse errors
          }
        );

        scannerRef.current = scanner;
      } catch (err) {
        console.error("Lỗi mở camera QR scanner:", err);
        setCameraError(true);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
        >
          ✕
        </button>

        <h3 className="text-xl font-bold text-gray-900 text-center mb-1">
          {title || '📷 Quét Mã QR Điểm Danh'}
        </h3>
        <p className="text-xs text-gray-500 text-center mb-4">
          Hướng camera về phía mã QR để hệ thống tự động quét và duyệt điểm danh
        </p>

        {/* Camera Container */}
        <div className="overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-gray-50 min-h-[260px] flex items-center justify-center mb-4">
          <div id="qr-reader-container" className="w-full"></div>
        </div>

        {/* Manual Code Input fallback */}
        <form onSubmit={handleManualSubmit} className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Hoặc nhập mã QR / ID thủ công:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Dán mã QR hoặc ID tại đây..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              Gửi mã
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
