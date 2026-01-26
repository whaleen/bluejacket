export type AppView =
  | 'dashboard'
  | 'inventory'
  | 'parts'
  | 'products'
  | 'settings-locations'
  | 'settings-location'
  | 'settings-company'
  | 'settings-users'
  | 'settings-profile'
  | 'settings-displays'
  | 'loads'
  | 'activity'
  | 'create-session'
  | 'floor-display';

export type RouteState = {
  view: AppView;
  sessionId?: string | null;
  displayId?: string | null;
};

const baseSessionPath = '/scanning-sessions';

export function getPathForView(view: AppView, sessionId?: string | null, displayId?: string | null): string {
  if (view === 'create-session') {
    if (sessionId) return `${baseSessionPath}/${sessionId}`;
    return baseSessionPath;
  }
  if (view === 'floor-display') {
    if (displayId) return `/display/${displayId}`;
    return '/display';
  }

  switch (view) {
    case 'dashboard':
      return '/';
    case 'inventory':
      return '/inventory';
    case 'parts':
      return '/parts';
    case 'products':
      return '/products';
    case 'loads':
      return '/loads';
    case 'activity':
      return '/activity';
    case 'settings-locations':
      return '/settings/locations';
    case 'settings-location':
      return '/settings/location';
    case 'settings-company':
      return '/settings/company';
    case 'settings-users':
      return '/settings/users';
    case 'settings-profile':
      return '/settings/profile';
    case 'settings-displays':
      return '/settings/displays';
    default:
      return '/';
  }
}

export function parseRoute(pathname: string): RouteState {
  const normalized = pathname.replace(/\/+$/, '');
  const segments = normalized.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { view: 'dashboard' };
  }

  const [first, second ] = segments;

  switch (first) {
    case 'dashboard':
      return { view: 'dashboard' };
    case 'inventory':
      return { view: 'inventory' };
    case 'parts':
      return { view: 'parts' };
    case 'products':
      return { view: 'products' };
    case 'loads':
      return { view: 'loads' };
    case 'activity':
      return { view: 'activity' };
    case 'scanning-sessions':
    case 'sessions':
      return { view: 'create-session', sessionId: second ?? null };
    case 'settings':
      switch (second) {
        case 'location':
          return { view: 'settings-location' };
        case 'company':
          return { view: 'settings-company' };
        case 'users':
          return { view: 'settings-users' };
        case 'profile':
          return { view: 'settings-profile' };
        case 'displays':
          return { view: 'settings-displays' };
        case 'locations':
        case undefined:
          return { view: 'settings-locations' };
        default:
          return { view: 'settings-locations' };
      }
    case 'display':
      return { view: 'floor-display', displayId: second ?? null };
    default:
      return { view: 'dashboard' };
  }
}

export function isPublicRoute(pathname: string): boolean {
  return pathname.startsWith('/display');
}
