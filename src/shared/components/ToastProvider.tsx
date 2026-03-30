import { Toaster } from "sonner";

export function ToastProvider() {
  const isDark = document.documentElement.classList.contains("dark");
  return (
    <Toaster
      position="bottom-right"
      theme={isDark ? "dark" : "light"}
      toastOptions={{
        className: "text-xs",
        duration: 4000,
      }}
      richColors
      closeButton
    />
  );
}
