import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className="pointer-events-auto bg-[#FBF8F1] dark:bg-[#27221E] border-1.5 border-[#2B2118] dark:border-[#4E4238] rounded-[6px_10px_8px_12px] p-3.5 shadow-hard dark:shadow-hard-dark flex items-start justify-between gap-3 transition-all transform animate-fade-in"
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 border border-[#2B2118] dark:border-[#EFE7DA] ${
                  toast.type === "error"
                    ? "bg-[#B5502F]"
                    : toast.type === "success"
                    ? "bg-[#7A8B69]"
                    : "bg-[#D98E04]"
                }`}
              />
              <p className="text-sm font-medium text-[#2B2118] dark:text-[#EFE7DA] leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#2B2118]/60 dark:text-[#EFE7DA]/60 hover:text-[#2B2118] dark:hover:text-[#EFE7DA] text-xs font-mono ml-2 p-1"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
