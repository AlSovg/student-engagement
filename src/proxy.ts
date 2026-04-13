import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.auth && isPublic) {
    const role = req.auth.user?.role;
    const dest = role === "TEACHER" ? "/dashboard" : "/me";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (req.auth && pathname.startsWith("/me")) {
    const role = req.auth.user?.role;
    if (role === "TEACHER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (req.auth && pathname.startsWith("/dashboard")) {
    const role = req.auth.user?.role;
    if (role === "STUDENT") {
      return NextResponse.redirect(new URL("/me", req.url));
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
