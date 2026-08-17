import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (qrText: string) => void;
  title?: string;
}

export default function QRScannerModal({ isOpen, onClose, onScanSuccess, title }: QRScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Play audio beep feedback on scan success
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}
  };

  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    setErrorMessage('');
    setIsCameraActive(false);

    // AUTO-OPEN CAMERA IMMEDIATELY ON MOUNT
    const startCamera = async () => {
      try {
        const element = document.getElementById('qr-camera-feed');
        if (!element) return;

        const html5Qrcode = new Html5Qrcode('qr-camera-feed');
        html5QrcodeRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          { 
            fps: 25, 
            qrbox: { width: 250, height: 250 },
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            }
          } as any,
          (decodedText) => {
            if (isSubscribed) {
              playBeep();
              onScanSuccess(decodedText);
              html5Qrcode.stop().catch(() => {});
              onClose();
            }
          },
          () => {} // frame parse errors ignored
        );

        if (isSubscribed) {
          setIsCameraActive(true);
        }
      } catch (err: any) {
        console.warn("Lỗi tự động mở camera:", err);
        if (isSubscribed) {
          setErrorMessage("Không thể tự động mở Camera (Vui lòng cấp quyền Camera hoặc nhập mã bên dưới).");
        }
      }
    };

    startCamera();

    return () => {
      isSubscribed = false;
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
        html5QrcodeRef.current = null;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition"
        >
          ✕
        </button>

        <h3 className="text-xl font-black text-gray-900 text-center mb-1 flex items-center justify-center gap-2">
          <span>📷</span> {title || 'Quét QR Điểm Danh Sự Kiện'}
        </h3>
        <p className="text-xs text-gray-500 text-center mb-4">
          Camera đang được mở tự động &bull; Đưa mã QR vào khung hình để ghi nhận ca làm
        </p>

        {errorMessage && (
          <div className="p-3 mb-3 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Camera Live Feed */}
        <div className="overflow-hidden rounded-2xl border-2 border-dashed border-purple-300 bg-black min-h-[260px] flex items-center justify-center mb-4 relative shadow-inner">
          <div id="qr-camera-feed" className="w-full"></div>
          {!isCameraActive && !errorMessage && (
            <div className="absolute text-white text-xs font-semibold flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
              Đang bật Camera tự động...
            </div>
          )}
        </div>

        {/* Manual Code Input fallback */}
        <form onSubmit={handleManualSubmit} className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Nhập mã QR / ID thủ công:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Dán mã QR tại đây..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition"
            >
              Gửi mã
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
