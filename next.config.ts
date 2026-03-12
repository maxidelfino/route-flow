import type { NextConfig } from "next";
import NextPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
};

const withPWA = NextPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
});

export default withPWA(nextConfig);
