import "./scripts/verify-social-previews.mjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Message preview crawlers must receive complete tags in the initial head.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
