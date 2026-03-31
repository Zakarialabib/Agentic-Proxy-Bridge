export interface RouteDefinition {
  path: string;
  method: string;
  handler: (req: Request, path: string) => Promise<Response>;
}

export async function dispatchRoute(
  routes: RouteDefinition[],
  req: Request,
  path: string
): Promise<Response | null> {
  const method = req.method.toUpperCase();

  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.path === path) return route.handler(req, path);
    if (route.path.endsWith("*") && path.startsWith(route.path.slice(0, -1))) {
      return route.handler(req, path);
    }
  }

  return null;
}
