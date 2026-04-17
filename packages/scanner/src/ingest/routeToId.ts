export function routeToId(route: string): string {
  return route.replace(/^\//, '').replace(/\//g, '-').replace(/[[\]]/g, '') || 'home';
}
