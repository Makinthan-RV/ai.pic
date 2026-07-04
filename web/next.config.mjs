/** @type {import('next').NextConfig} */
const nextConfig = {
  // R2 public bucket images are served from a custom domain / r2.dev URL.
  // Add your bucket's public host here so <Image> and <img> can load them.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
