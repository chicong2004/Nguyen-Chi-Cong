import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error in Mobile Web App:", error, errorInfo);
  }

  private handleReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = window.location.origin + '?v=' + Date.now();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center text-gray-900">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center text-3xl mb-4 shadow-sm">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">
            Đã Xảy Ra Lỗi Khởi Tạo Trên Thiết Bị
          </h2>
          <p className="text-xs text-gray-500 max-w-sm mb-6">
            Trình duyệt thiết bị di động của bạn vừa gặp sự cố khởi động bộ nhớ tạm (Cache / LocalStorage). Vui lòng bấm nút làm mới dưới đây.
          </p>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-left w-full max-w-sm mb-6 overflow-x-auto text-[11px] font-mono text-red-600">
            {this.state.error?.toString() || 'Lỗi không xác định'}
          </div>

          <button
            onClick={this.handleReload}
            className="w-full max-w-sm py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-md hover:bg-blue-700 transition"
          >
            🔄 LÀM MỚI VÀ XÓA CACHE ĐIỆN THOẠI
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
