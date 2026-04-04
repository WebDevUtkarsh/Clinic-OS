export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/onboarding",
] as const;

export function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => {
    if (route === "/") {
      return pathname === route;
    }

    return pathname === route || pathname.startsWith(`${route}/`);
  });
}
