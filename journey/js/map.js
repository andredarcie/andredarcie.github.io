// The map: real tiles, real geography, one dot per photo.
//
// Built on Leaflet, vendored locally rather than pulled from a CDN. The only
// runtime network call the page makes is for basemap tiles.
//
// Two things keep it readable with six thousand photos on it:
//
//   Clustering is recomputed in screen space on every zoom. Dots merge when
//   they would overlap and split apart as you go in, so a beach reads as one
//   marker from the state view and as forty separate photos from a hundred
//   metres up. No plugin — the grid is a few lines and the plugin's behaviour
//   is hard to tune.
//
//   The trail is thinned by distance, not by count. A hundred photos from one
//   pousada should be one stop on the line, not a scribble.

import { TILES } from './config.js';
import { S } from './strings.js';

const CLUSTER_PX = 46;  // grid cell; dots closer than this merge
const SPLIT_AT = 15;    // zoom past which every photo gets its own dot

export class JourneyMap {
  constructor(node, { onOpen, onPick, readout }) {
    this.onOpen = onOpen;
    this.onPick = onPick;
    this.readout = readout;
    this.photos = [];
    this.geo = null;
    this.fitted = false;

    this.map = L.map(node, {
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: false,
      // The trail is the point; let it be scrolled over without hijacking the
      // page on a phone.
      scrollWheelZoom: true,
      tap: true,
    }).setView([-9, -38], 5);

    L.tileLayer(TILES.url, {
      attribution: TILES.attribution,
      subdomains: TILES.subdomains,
      maxZoom: TILES.maxZoom,
    }).addTo(this.map);

    this.borders = L.layerGroup().addTo(this.map);
    this.trail = L.layerGroup().addTo(this.map);
    this.dots = L.layerGroup().addTo(this.map);

    this.map.on('zoomend moveend', () => this.drawDots());
  }

  setGeo(geo) {
    this.geo = geo;
    this.drawBorders();
  }

  setExtent(bounds, presentStates) {
    this.bounds = bounds;
    this.present = presentStates ? new Set(presentStates) : null;
    this.drawBorders();

    if (bounds && !this.fitted) {
      this.map.fitBounds(
        [[bounds.minLat, bounds.minLon], [bounds.maxLat, bounds.maxLon]],
        { padding: [24, 24] }
      );
      this.fitted = true;
    }
  }

  setPhotos(photos) {
    this.photos = photos.filter((p) => p.lat !== null && p.lon !== null);
    this.drawTrail();
    this.drawDots();
  }

  /** State outlines over the tiles — OSM's own borders are nearly invisible in dark. */
  drawBorders() {
    if (!this.geo) return;
    this.borders.clearLayers();

    for (const f of this.geo.features) {
      const visited = this.present ? this.present.has(f.properties.sigla) : true;
      L.geoJSON(f, {
        interactive: false,
        style: {
          color: visited ? '#7C8471' : '#4A4740',
          weight: visited ? 1 : 0.5,
          opacity: visited ? 0.55 : 0.25,
          fill: false,
        },
      }).addTo(this.borders);
    }
  }

  drawTrail() {
    this.trail.clearLayers();
    const ordered = this.photos.filter((p) => p.t).sort((a, b) => a.t - b.t);
    if (ordered.length < 2) return;

    // ~2 km between kept points. Enough to show the route, few enough that the
    // polyline stays cheap to redraw.
    const pts = [];
    let last = null;
    for (const p of ordered) {
      if (last && Math.abs(p.lat - last[0]) < 0.02 && Math.abs(p.lon - last[1]) < 0.02) continue;
      pts.push([p.lat, p.lon]);
      last = [p.lat, p.lon];
    }
    if (pts.length < 2) return;

    L.polyline(pts, {
      color: '#C4451C',
      weight: 2,
      opacity: 0.75,
      lineJoin: 'round',
      lineCap: 'round',
      interactive: false,
      smoothFactor: 1.5,
    }).addTo(this.trail);
  }

  drawDots() {
    if (!this.map) return;
    this.dots.clearLayers();
    if (!this.photos.length) return;

    const zoom = this.map.getZoom();
    const bounds = this.map.getBounds().pad(0.25);
    const visible = this.photos.filter((p) => bounds.contains([p.lat, p.lon]));
    if (!visible.length) return;

    const groups = zoom >= SPLIT_AT ? visible.map((p) => [p]) : this.cluster(visible);

    for (const group of groups) {
      if (group.length === 1) this.dots.addLayer(this.singleDot(group[0]));
      else this.dots.addLayer(this.clusterDot(group));
    }
  }

  /** Grid the visible photos in pixel space at the current zoom. */
  cluster(photos) {
    const cells = new Map();
    for (const p of photos) {
      const pt = this.map.latLngToLayerPoint([p.lat, p.lon]);
      const key = `${Math.round(pt.x / CLUSTER_PX)}:${Math.round(pt.y / CLUSTER_PX)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(p);
    }
    return [...cells.values()];
  }

  singleDot(p) {
    const sea = p.loc === 'offshore';
    const guessed = p.loc === 'inferred';

    const marker = L.circleMarker([p.lat, p.lon], {
      radius: 5,
      color: '#16130F',
      weight: 1.5,
      fillColor: sea ? '#0F5C63' : guessed ? '#7C8471' : '#F6F4EE',
      fillOpacity: 0.95,
    });

    marker.on('mouseover', () => {
      marker.setStyle({ fillColor: '#C4451C', radius: 7 });
      if (this.readout) {
        const onde = [p.cidade, p.uf].filter(Boolean).join(' · ');
        this.readout.textContent =
          `${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}${onde ? ` · ${onde}` : ''}`;
      }
    });
    marker.on('mouseout', () => {
      marker.setStyle({ fillColor: sea ? '#0F5C63' : guessed ? '#7C8471' : '#F6F4EE', radius: 5 });
      if (this.readout) this.readout.textContent = '';
    });
    marker.on('click', () => this.onOpen?.(p.id));

    return marker;
  }

  clusterDot(group) {
    const lat = group.reduce((s, p) => s + p.lat, 0) / group.length;
    const lon = group.reduce((s, p) => s + p.lon, 0) / group.length;
    const sea = group.filter((p) => p.loc === 'offshore').length > group.length / 2;

    // Area grows with count, so a 400-photo stop is not eighty times the
    // diameter of a 5-photo one.
    const r = Math.min(26, 9 + Math.sqrt(group.length) * 1.4);

    const marker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: '',
        html: `<span class="pin ${sea ? 'pin--sea' : ''}" style="width:${r * 2}px;height:${r * 2}px">${group.length}</span>`,
        iconSize: [r * 2, r * 2],
        iconAnchor: [r, r],
      }),
      keyboard: true,
    });

    marker.on('click', () => {
      // Zoom into the cluster rather than opening 400 photos at once. Clicking
      // repeatedly walks you down to individual dots.
      const lats = group.map((p) => p.lat);
      const lons = group.map((p) => p.lon);
      const spread = Math.max(...lats) - Math.min(...lats) + Math.max(...lons) - Math.min(...lons);

      if (spread < 1e-4) this.map.setView([lat, lon], Math.min(SPLIT_AT + 2, TILES.maxZoom));
      else this.map.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [40, 40] });

      this.onPick?.(group.map((p) => p.id));
    });

    marker.on('mouseover', () => {
      if (this.readout) {
        // A cidade só entra quando o grupo inteiro está nela. Um agrupado que
        // atravessa a divisa nomeado pela cidade da primeira foto estaria
        // mentindo sobre as outras.
        const cidades = new Set(group.map((p) => p.cidade).filter(Boolean));
        const onde = cidades.size === 1 ? [...cidades][0] : group[0].uf;
        this.readout.textContent =
          S.map.photos(group.length, onde) + (sea ? S.map.onWater : '');
      }
    });
    marker.on('mouseout', () => {
      if (this.readout) this.readout.textContent = '';
    });

    return marker;
  }

  /** Leaflet needs telling when its container changes size. */
  invalidate() {
    this.map?.invalidateSize();
  }
}

export function emptyMapMessage(node) {
  node.hidden = false;
  node.textContent = S.mapEmpty;
}
