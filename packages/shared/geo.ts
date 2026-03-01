export type VesselType = 'cruise' | 'yacht' | 'cargo';

export interface TrackPoint {
  lat: number;
  lon: number;
  timestamp: string;
}

export interface RouteData {
  id: string;
  points: TrackPoint[];
}

export interface UploadResponse {
  routeId: string;
  points: number;
}

export interface RenderRequest {
  routeId: string;
  vesselType: VesselType;
  aspect?: '16:9' | '9:16';
  fps?: number;
  music?: boolean;
}
