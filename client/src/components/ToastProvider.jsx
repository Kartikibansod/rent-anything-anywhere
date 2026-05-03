import React from "react";
import toast, { Toaster } from "react-hot-toast";

export function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "18px",
            background: "rgba(15, 23, 42, 0.92)",
            color: "#fff",
            backdropFilter: "blur(16px)",
            boxShadow: "0 18px 60px rgba(15, 23, 42, 0.25)"
          },
          success: {
            iconTheme: { primary: "#171717", secondary: "#fff" }
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#fff" }
          }
        }}
      />
    </>
  );
}

export function useToast() {
  return toast;
}
