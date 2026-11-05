import { createContext, useContext, useState, useCallback, useRef } from "react";
import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";
import Button from "react-bootstrap/Button";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const lastToastRef = useRef({ message: "", type: "", timestamp: 0 });

  const showToast = useCallback((message, type = "success", options = {}) => {
    const now = Date.now();
    // Chống trùng lặp thông báo nếu cùng nội dung và kiểu xuất hiện trong vòng 1.5 giây
    if (
      lastToastRef.current.message === message &&
      lastToastRef.current.type === type &&
      now - lastToastRef.current.timestamp < 1500
    ) {
      return;
    }
    lastToastRef.current = { message, type, timestamp: now };

    const id = now + Math.random();
    const actionLabel = options.actionLabel || options.actionText || null;
    const onAction = options.onAction || null;
    const delay = options.delay || 4000;

    setToasts(prev => [...prev, { id, message, type, actionLabel, onAction, delay }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const getHeaderStyle = (type) => {
    switch (type) {
      case "danger":
      case "error":
        return { className: "bg-danger text-white", style: {} };
      case "warning":
        // Dùng CSS variable thay vì bg-warning để tương thích dark mode
        return {
          className: "text-body",
          style: {
            backgroundColor: "rgba(217,119,6,0.18)",
            borderBottom: "1px solid rgba(217,119,6,0.25)"
          }
        };
      case "info":
        return { className: "bg-primary text-white", style: {} };
      default:
        return { className: "bg-success text-white", style: {} };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        {toasts.map(toast => {
          const header = getHeaderStyle(toast.type);
          const isWarning = toast.type === "warning";

          return (
            <Toast 
              key={toast.id} 
              onClose={() => removeToast(toast.id)} 
              delay={toast.delay || 4000} 
              autohide
              className="shadow-sm border-0 mb-2"
            >
              <Toast.Header className={`${header.className} py-1`} style={header.style}>
                <strong className={`me-auto ${isWarning ? "text-body fw-bold" : "text-white"}`}>MatchaJob</strong>
                <small className={isWarning ? "text-muted" : "text-white-50"}>Vừa xong</small>
              </Toast.Header>
              <Toast.Body className="bg-surface text-body">
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <span style={{ fontSize: "13px" }}>{toast.message}</span>
                  {toast.actionLabel && (
                    <Button
                      variant={toast.type === "warning" ? "outline-warning" : "success"}
                      size="sm"
                      className="py-0 px-2 text-nowrap fw-semibold flex-shrink-0"
                      style={{ fontSize: "12px", height: "26px" }}
                      onClick={() => {
                        removeToast(toast.id);
                        toast.onAction?.();
                      }}
                    >
                      {toast.actionLabel}
                    </Button>
                  )}
                </div>
              </Toast.Body>
            </Toast>
          );
        })}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
