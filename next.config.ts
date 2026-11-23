import type { NextConfig } from "next";

// Aspi Rash is a single-user app on this PC: every page reads live data from
// the local database, so Cache Components / partial prefetching are off.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
