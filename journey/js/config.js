// Where the site looks for things.
//
// IMAGE_BASE is the one knob that matters for publishing. The derivatives in
// photos/ are committed and ship with the site; it is takeout/, the 26 GB of
// originals, that git never sees. Should the derivatives outgrow the 1 GB
// GitHub Pages ceiling, push them to a bucket and point this at it — the
// manifest never stores absolute URLs, so switching hosts is this line.
//
// Relative on purpose: this is what lets the site serve from /journey/ rather
// than only from a domain root.

export const IMAGE_BASE = './photos';

// Basemap. Dark tiles because the map panel is the ink half of the page and a
// standard OSM raster would fight everything around it. Attribution is required
// by both licences and is rendered by Leaflet in the corner — do not remove it.
//
// This is the one thing on the page that needs the network at runtime. Swap the
// URL for any {z}/{x}/{y} raster source.
export const TILES = {
  url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
    '&copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19,
};

export const DATA_URL = './data/photos.json';

// The browser gets the decimated boundaries; the full-precision mesh in
// data/br-uf.geojson is three times the size and exists for the classifier.
export const GEO_URL = './data/br-uf-map.geojson';

// Set from the manifest at load, so changing codec in config.json needs no edit
// here. Falls back to AVIF, which is what the pipeline ships by default.
let ext = 'avif';
export const setImageExt = (value) => { ext = value || ext; };

// Photos take a `path` of "Estado/nome" — folders are named for the state in
// full, files keep their original Takeout name. encodeURI, not
// encodeURIComponent: the slash between folder and file has to survive, while
// spaces and accents in "Sem estado" or a WhatsApp filename must not.
const encode = (p) => encodeURI(String(p)).replace(/#/g, '%23').replace(/\?/g, '%3F');

export const thumbUrl = (photo) => `${IMAGE_BASE}/thumb/${encode(photo.path ?? photo.id)}.${ext}`;
export const fullUrl = (photo) => `${IMAGE_BASE}/full/${encode(photo.path ?? photo.id)}.${ext}`;
