// proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server"
import createMiddleware from "next-intl/middleware"
import { locales, defaultLocale } from "@/i18n"

// next-intl routing handler
const handleI18nRouting = createMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
})

// Combine Clerk + next-intl
export default clerkMiddleware((auth, req) => {
  // We don't call auth.protect() here yet because
  // getAuthUserWithCategories() already handles redirecting
  // unauthenticated users to /sign-in.
  return handleI18nRouting(req)
})

// Run this proxy on root + localized routes
export const config = {
  matcher: ["/", "/(en|zh)/:path*"],
}
