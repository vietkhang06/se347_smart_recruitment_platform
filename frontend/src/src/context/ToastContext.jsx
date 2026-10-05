import { createContext, useContext, useState, useCallback } from "react";
import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        {toasts.map(toast => (
          <Toast 
            key={toast.id} 
            onClose={() => removeToast(toast.id)} 
            delay={3000} 
            autohide
            className="shadow-sm border-0 mb-2"
          >
            <Toast.Header className="bg-success text-white py-1">
              <strong className="me-auto text-white">MatchaJob</strong>
              <small className="text-white-50">Vừa xong</small>
            </Toast.Header>
            <Toast.Body className="bg-surface text-body">
              {toast.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
