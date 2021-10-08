export interface OverpassOptions {
  /**
   * Overpass API endpoint URL (usually ends in /interpreter)
   */
  endpoint: string;
  /**
   * How many retries when gateway timeout before giving up?
   */
  numRetries: number;
  /**
   * Pause in between receiving a rate limited response and initiating a retry
   */
  retryPause: number;
  /**
   * Automatically retry if query is rate limited
   */
  rateLimitRetry: boolean;
  /**
   * Output verbose query information
   */
  verbose: boolean;
  /**
   * User-agent to send on Overpass Request
   */
  userAgent: string;
}

export interface OverpassApiStatus {
  clientId: string;
  currentTime: Date;
  rateLimit: number;
  slotsAvailableAfter: number[];
  slotsRunning: string[];
}

//
// Overpass API Response types
//

export interface OverpassJson {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: Array<
    | OverpassNode
    | OverpassWay
    | OverpassRelation
    | OverpassTimeline
    | OverpassCount
  >;
  remark?: string;
}

//
// Base
//

export interface OverpassElement {
  type: "node" | "way" | "relation" | "timeline" | "count";
  id: number;
}

export interface OverpassOsmElement extends OverpassElement {
  type: "node" | "way" | "relation";
  timestamp?: string;
  version?: number;
  changeset?: number;
  user?: string;
  uid?: number;
  tags?: {
    [key: string]: string;
  };
}

//
// Node
//

export interface OverpassNode extends OverpassOsmElement {
  type: "node";
  lat: number;
  lon: number;
}

//
// Way
//

export interface OverpassWay extends OverpassOsmElement {
  type: "way";
  nodes: number[];
  center?: OverpassPointGeom;
  bounds?: OverpassBbox;
  geometry?: OverpassPointGeom[];
}

//
// Relation
//

export interface OverpassRelation extends OverpassOsmElement {
  type: "relation";
  members: OverpassRelationMember[];
  center?: OverpassPointGeom;
  bounds?: OverpassBbox;
  geometry?: OverpassPointGeom[];
}

export interface OverpassRelationMember {
  type: "node" | "way" | "relation";
  ref: number;
  role: string;

  // Relation Node Members in `out geom;` have lon/lats
  lon?: number;
  lat?: number;

  // Relation Way Members in `out geom;` have point geoms
  geometry?: OverpassPointGeom[];
}

//
// Timeline
//

export interface OverpassTimeline extends OverpassElement {
  type: "timeline";
  tags: {
    reftype: string;
    ref: string;
    refversion: string;
    created: string;
    expired?: string;
  };
}

//
// Count
//

export interface OverpassCount extends OverpassElement {
  type: "count";
  tags: {
    nodes: string;
    ways: string;
    relations: string;
    total: string;
  };
}

//
// Geometry
//

export interface OverpassPointGeom {
  lat: number;
  lon: number;
}

export interface OverpassBbox {
  minlat: number;
  minlon: number;
  maxlat: number;
  maxlon: number;
}
