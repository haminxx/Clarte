/**
 * Static export so the site drops straight onto Cloudflare Pages
 * (`wrangler pages deploy out`). Everything dynamic lives in the API Worker,
 * so the frontend needs no server runtime.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
