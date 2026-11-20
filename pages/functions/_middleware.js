// Same as cloudflare_temp_email/pages/functions/_middleware.js: forward backend paths to the Worker
// through the `BACKEND` service binding; everything else is served from dist/ (SPA fallback).
const API_PATHS = [
    "/api/",
    "/open_api/",
    "/user_api/",
    "/admin/",
    "/telegram/",
    "/external/",
    "/redeem_api/",
];

export async function onRequest(context) {
    const reqPath = new URL(context.request.url).pathname;
    if (API_PATHS.some((path) => reqPath.startsWith(path))) {
        return context.env.BACKEND.fetch(context.request);
    }
    return await context.next();
}
