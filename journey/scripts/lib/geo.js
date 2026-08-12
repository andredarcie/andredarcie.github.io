// Offline geography. No API calls, no rate limits, no per-photo latency —
// point-in-polygon against the IBGE state meshes is exact and runs at a few
// hundred thousand points per second.

/** Ray casting against a single linear ring. */
function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const straddles = yi > lat !== yj > lat;
    if (straddles && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** A GeoJSON polygon is [outerRing, ...holes]. */
function inPolygon(lon, lat, rings) {
  if (!rings.length || !inRing(lon, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (inRing(lon, lat, rings[i])) return false; // fell in a hole
  }
  return true;
}

export function inFeature(lon, lat, feature) {
  const g = feature.geometry;
  if (!g) return false;
  if (g.type === 'Polygon') return inPolygon(lon, lat, g.coordinates);
  if (g.type === 'MultiPolygon') return g.coordinates.some((p) => inPolygon(lon, lat, p));
  return false;
}

/** Cheap reject before the expensive ring walk. */
export function bbox(feature) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (coords) => {
    if (typeof coords[0] === 'number') {
      if (coords[0] < minX) minX = coords[0];
      if (coords[0] > maxX) maxX = coords[0];
      if (coords[1] < minY) minY = coords[1];
      if (coords[1] > maxY) maxY = coords[1];
      return;
    }
    for (const c of coords) walk(c);
  };
  if (feature.geometry) walk(feature.geometry.coordinates);
  return [minX, minY, maxX, maxY];
}

export function inBbox(lon, lat, [minX, minY, maxX, maxY], pad = 0) {
  return lon >= minX - pad && lon <= maxX + pad && lat >= minY - pad && lat <= maxY + pad;
}

const R_KM = 6371;
const rad = (d) => (d * Math.PI) / 180;

export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(a));
}

/** Shortest distance from a point to any vertex of a feature, in km. */
export function distanceToFeatureKm(lon, lat, feature) {
  let best = Infinity;
  const walk = (coords) => {
    if (typeof coords[0] === 'number') {
      const d = haversineKm(lat, lon, coords[1], coords[0]);
      if (d < best) best = d;
      return;
    }
    for (const c of coords) walk(c);
  };
  if (feature.geometry) walk(feature.geometry.coordinates);
  return best;
}

/**
 * Google writes 0/0 into geoData when it has stripped location. Treat exact
 * null island as "no fix" — nobody photographs the Gulf of Guinea by accident.
 */
export function isRealFix(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat === 0 && lon === 0) return false;
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}
