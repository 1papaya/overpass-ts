export type OverpassResponse = OverpassJson | string;

export interface OverpassJson {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: Array<
    OverpassNode | OverpassWay | OverpassRelation | OverpassTimeline
  >;
  remark?: string;
}

//
// Base
//

export interface OverpassElement {
  type: "node" | "way" | "relation" | "timeline";
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
  geometry?: OverpassPointGeom[] | OverpassPointGeom;
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
