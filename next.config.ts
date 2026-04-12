import type { NextConfig } from "next";

// Turbopack конфликтует с @tailwindcss/postcss v4 — отключаем до выхода фикса
const nextConfig: NextConfig = {
  experimental: {
    turbopack: false,
  },
};

export default nextConfig;
