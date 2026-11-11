import config from "./src/config/config.json" with { type: "json" };

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: config.base_path !== "/" ? config.base_path : "",
  trailingSlash: config.site.trailing_slash,
  output: "standalone",
  // Safe browser protections that do not slow pages down or need a per-request nonce.
  // (A full Content-Security-Policy is left out on purpose: it has to be tested against every map tile, font and image source first.)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // Location (gyms map) and camera (barcode scan) stay allowed for this site only; microphone and payment are off.
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=(), payment=(), usb=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
