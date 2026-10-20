import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TodoAll",
    short_name: "TodoAll",
    description: "目标驱动的每日计划与执行记录。",
    start_url: "/today",
    display: "standalone",
    background_color: "#f5f7f4",
    theme_color: "#0f766e",
    lang: "zh-CN",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
