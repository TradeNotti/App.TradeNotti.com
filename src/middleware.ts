import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

// Every app surface requires a signed-in (invited beta) user.
const isProtected = createRouteMatcher([
  "/today(.*)",
  "/journal(.*)",
  "/analytics(.*)",
  "/notebook(.*)",
  "/rules(.*)",
  "/resources(.*)",
  "/settings(.*)",
  "/partners(.*)",
  "/pinboard(.*)",
]);

const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Optional: the public marketing / waitlist site. Set NEXT_PUBLIC_WAITLIST_URL
// (e.g. https://tradenotti.com) ONCE that domain is served by the separate
// marketing project. When set, signed-out visitors are sent there instead of
// the in-app /login. Unset (default) => everyone goes to /login.
const WAITLIST_URL = process.env.NEXT_PUBLIC_WAITLIST_URL;

const stripWww = (host: string) => host.replace(/^www\./, "");

/**
 * Where to send a signed-out visitor. Prefers the external waitlist site, but
 * only when that site lives on a DIFFERENT registrable host than the current
 * request — otherwise redirecting there would just bounce back into this app
 * and loop. Falls back to the in-app /login, which shares the host and so can
 * never loop.
 */
function signedOutTarget(req: NextRequest): NextResponse {
  if (WAITLIST_URL) {
    try {
      const target = new URL(WAITLIST_URL);
      const here = stripWww(req.nextUrl.hostname);
      if (stripWww(target.hostname) !== here) {
        return NextResponse.redirect(target);
      }
    } catch {
      // Malformed env value: ignore and fall through to /login.
    }
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

const withClerk = clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;
  const { userId } = await auth();

  if (url.pathname === "/") {
    if (userId) return NextResponse.redirect(new URL("/today", req.url));
    return signedOutTarget(req);
  }

  // Beta access is enforced by Clerk "Restricted" mode (only invited emails can
  // create an account); the middleware just routes signed-out visitors away.
  if (isProtected(req) && !userId) {
    return signedOutTarget(req);
  }
  return NextResponse.next();
});

export default function middleware(req: NextRequest, ev: NextFetchEvent) {
  // Local/demo (no Clerk configured): serve the app with demo data, no gate.
  if (!CLERK_ENABLED) {
    return NextResponse.next();
  }
  return withClerk(req, ev);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
