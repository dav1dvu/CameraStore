import { Component, ErrorInfo, ReactNode } from 'react';
import { CameraOff } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-vintage-sepia-50 text-center font-medium">
          <div className="max-w-md bg-vintage-sepia-100 p-8 rounded-xl border border-vintage-sepia-200 shadow-xl space-y-4">
            <CameraOff className="mx-auto h-12 w-12 text-film-red" />
            <h2 className="font-serif font-extrabold text-2xl text-vintage-sepia-900">Đã xảy ra sự cố!</h2>
            <p className="text-xs text-warm-gray-700 leading-relaxed">
              Trang web gặp trục trặc kỹ thuật ngoài ý muốn khi tải khung nhìn. Vui lòng làm mới lại trang hoặc quay lại trang chủ.
            </p>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 px-4 rounded-lg bg-vintage-sepia-900 hover:bg-vintage-gold text-vintage-sepia-50 font-bold text-xs uppercase cursor-pointer transition-colors"
              >
                Tải lại trang
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="flex-1 py-3 px-4 rounded-lg border border-vintage-sepia-200 hover:bg-vintage-sepia-50 text-warm-gray-700 font-bold text-xs uppercase cursor-pointer transition-colors"
              >
                Về Trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
