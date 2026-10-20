import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TodoAll",
    template: "%s · TodoAll",
  },
  description: "把目标拆成每天真正可以完成的计划。",
  applicationName: "TodoAll",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TodoAll" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}<ServiceWorkerRegistration /></body>
    </html>
  );
}
