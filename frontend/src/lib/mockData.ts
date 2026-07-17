export interface Alert {
  id: string;
  type: string;
  module: string;
  confidence: number;
  location?: [number, number];
  timestamp: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export const mockAlerts: Alert[] = [];

export const mockNetworkData = {
  nodes: [],
  links: []
};
