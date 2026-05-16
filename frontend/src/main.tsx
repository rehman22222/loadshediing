import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

if (import.meta.env.PROD) {
  registerSW();
} else if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => void registration.unregister());
  });

  if ("caches" in window) {
    void caches.keys().then((keys) => {
      keys.forEach((key) => void caches.delete(key));
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
