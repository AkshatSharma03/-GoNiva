/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * Useful for Docker / Railway builds before env vars are injected.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Compress responses
  compress: true,

  // Strict mode for catching issues early
  reactStrictMode: true,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",          value: "DENY" },
          { key: "X-XSS-Protection",         value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default config;
