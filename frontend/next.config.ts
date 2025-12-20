import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_SUBMISSION_API:
            process.env.NEXT_PUBLIC_SUBMISSION_API || "http://localhost:8081",
        NEXT_PUBLIC_VERSION_API:
            process.env.NEXT_PUBLIC_VERSION_API || "http://localhost:8082",
        NEXT_PUBLIC_FEEDBACK_API:
            process.env.NEXT_PUBLIC_FEEDBACK_API || "http://localhost:8083",
        NEXT_PUBLIC_INTEGRITY_API:
            process.env.NEXT_PUBLIC_INTEGRITY_API || "http://localhost:8084",
    },
};

export default nextConfig;
