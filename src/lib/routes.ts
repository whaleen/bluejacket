export type AppView =
  | 'dashboard'
  | 'inventory'
  | 'parts'
  | 'products'
  | 'settings'
  | 'loads'
  | 'create-load'
  | 'create-session';

export type RouteState = {
  view: AppView;
  sessionId?: string | null;
};

const baseSessionPath = '/scanning-sessions';

export function getPathForView(view: AppView, sessionId?: string | null): string {
  if (view === 'create-load') return '/loads/new';
  if (view === 'create-session') {
    if (sessionId) return `${baseSessionPath}/${sessionId}`;
    return baseSessionPath;
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
    case 'settings':
      return '/settings';
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

  const [first, second] = segments;

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
      if (second === 'new') {
        return { view: 'create-load' };
      }
      return { view: 'loads' };
    case 'scanning-sessions':
    case 'sessions':
      return { view: 'create-session', sessionId: second ?? null };
    case 'settings':
      return { view: 'settings' };
    default:
      return { view: 'dashboard' };
  }
}
