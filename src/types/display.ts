export type DisplayWidget = {
  id: string;
  type: 'loads-summary' | 'parts-alerts' | 'active-sessions' | 'clock' | 'text';
  title?: string;
  config?: Record<string, unknown>;
};

export type DisplayLayout = {
  columns?: number;
  rows?: number;
  widgets: DisplayWidget[];
};

export type DisplayState = {
  layout?: DisplayLayout;
  theme?: 'dark' | 'light';
  refreshInterval?: number;
  title?: string;
};

export type FloorDisplay = {
  id: string;
  companyId: string;
  locationId: string;
  name: string;
  pairingCode: string;
  paired: boolean;
  stateJson: DisplayState;
  lastHeartbeat?: string;
  createdAt: string;
  updatedAt?: string;
};

export type FloorDisplaySummary = {
  id: string;
  name: string;
  pairingCode: string;
  paired: boolean;
  lastHeartbeat?: string;
  createdAt: string;
};
