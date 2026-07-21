"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import Toaster from "@/components/ui/Toaster";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((current) => current.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 180);
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    ({ title, description, variant = "success", duration = 4500 }) => {
      const id = ++idCounter;
      setToasts((current) => [...current, { id, title, description, variant, closing: false }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (title, description) => push({ title, description, variant: "success" }),
    error: (title, description) => push({ title, description, variant: "error" }),
    info: (title, description) => push({ title, description, variant: "info" }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
