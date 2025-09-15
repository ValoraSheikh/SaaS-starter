import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publicRoutes = ["/", "/api/webhook/register", "/sign-in", "/sign-up"];

// Create route matchers
const isPublicRoute = createRouteMatcher(publicRoutes);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // Allow public routes to proceed without authentication
  if (isPublicRoute(req)) {
    // If user is authenticated and trying to access auth pages, redirect them
    if (userId && (req.nextUrl.pathname === "/sign-in" || req.nextUrl.pathname === "/sign-up")) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const role = user.publicMetadata.role as string | undefined;
        
        return NextResponse.redirect(
          new URL(
            role === "admin" ? "/admin/dashboard" : "/dashboard",
            req.url
          )
        );
      } catch (error) {
        console.error("Error fetching user data from Clerk:", error);
        return NextResponse.redirect(new URL("/error", req.url));
      }
    }
    return NextResponse.next();
  }

  // For protected routes, ensure user is authenticated
  if (!userId) {
    const authResult = await auth();
    return authResult.redirectToSignIn();
  }

  // Handle authenticated users
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata.role as string | undefined;

    // Admin role redirection logic
    if (role === "admin" && req.nextUrl.pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    // Prevent non-admin users from accessing admin routes
    if (isAdminRoute(req) && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Allow the request to proceed
    return NextResponse.next();

  } catch (error) {
    console.error("Error fetching user data from Clerk:", error);
    return NextResponse.redirect(new URL("/error", req.url));
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};