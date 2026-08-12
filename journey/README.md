# journey

A year on the Northeast coast — 2024, nine states, one Takeout export.

Turns a Google Photos archive into a browsable map: every photo placed where it
was taken, connected in the order it was taken, filterable by state, date and
whether there are people in it.

Everything runs locally. No API keys, no uploads, no third-party service sees a
single photo.

---

## The shape of it

```
Takeout/Google Fotos/            your unzipped export (not in this repo)
        │
        ├─ ingest    read EXIF + JSON sidecars        -> cache/index.json
        ├─ locate    coordinates -> states + cities   -> cache/located.json
        ├─ images    web-sized copies + thumbnails    -> photos/
        ├─ detect    people, locally, with DETR       -> cache/people.json
        └─ build     merge the lot                    -> data/photos.json
                                                            │
                                              index.html ───┘
```

Each step is idempotent and cached. Adding photos later and re-running only does
the new work.

---

## Setup

```bash
cd journey
npm install
```

Unzip the Takeout archive somewhere with room, then point `config.json` at the
`Google Fotos` folder inside it:

```json
{ "takeoutDir": "C:/Users/andre/Downloads/Takeout/Google Fotos", "year": 2024 }
```

Then:

```bash
npm run all
```

Or one step at a time — `npm run geo`, `ingest`, `locate`, `images`, `detect`,
`build`. To resume after an interruption: `node scripts/run-all.js --from images`.

The slow step is `detect` (roughly 1–3 s per photo on CPU). To see the site
without waiting for it: `node scripts/run-all.js --skip detect`. Photos then show
as "not analysed" rather than disappearing, and you can run detection later.

---

## How places are decided

Coordinates become states offline, by point-in-polygon against the IBGE state
meshes. No geocoding API, so no rate limits and no per-photo latency.

The city is decided the same way, one step further in: once a photo has a state,
it is tested only against that state's municipalities. Knowing the state first
cuts the problem from 1,794 polygons to a few hundred, and the bounding box cuts
it again to one or two real candidates.

That mesh — `cache/br-mun.geojson`, written by `npm run geo` — is fetched at
maximum quality and weighs about 9 MB, so unlike the state mesh it lives in
`cache/` and is never committed or downloaded by the browser. Only the Northeast
is fetched, because that is the trip this archive holds; a photo in a state with
no mesh simply gets no city, the same way a photo with no fix gets no state.

In the manifest the city is a table plus an index per photo, not a name per
photo: about a hundred names repeated 3,292 times would cost 66 KB on a file
that sits in front of the first paint. `js/lugares.js` resolves the index back
into `p.cidade` once, at load.

Each photo records **how** its location was decided, and the site shows the
difference rather than pretending they are equivalent:

| `loc` | Meaning |
|---|---|
| `exact` | The fix falls inside a state polygon. |
| `coast` | Just outside it, within `coastToleranceKm`. Boundary slop, not water — you were on dry sand. |
| `offshore` | Genuinely out to sea, snapped ashore within `offshoreSnapKm`. You were on a boat. |
| `inferred` | No GPS at all. Borrowed from the nearest photo in time, within `interpolateHours`. |
| `null` | Not enough to say. Still in the archive, just not on the map. |

### Why `coast` and `offshore` are separate

On July's 1,536 photos, a fifth landed outside every state polygon. Lumped
together that reads as noise. Broken apart it is two different facts.

Clustering those photos by time put them in seven blocks at four places —
Pajuçara, Porto da Barra, Boa Viagem — with median distances of 200–600 m. That
is the IBGE mesh, which is not survey-grade and traces a shoreline that beaches
have since built out past. Those people are standing on sand.

One block was not like the others: 85 photos on 20 July, sitting 1.5 km off
Pajuçara. That is a jangada out to the natural pools, and it is the only thing in
the whole distribution worth seeing. `coastToleranceKm` is the line between the
two, and the map draws sea clusters in a different colour because a boat trip is
the rarest thing the archive can tell you.

Raising the IBGE mesh from `intermediaria` to `maxima` barely moved the count
(332 → 323) — the resolution ceiling is in the source data, not the request. What
fixed the reading was classifying the residual, not chasing it.

That third case is most of the value. Phone photos carry GPS; screenshots,
WhatsApp saves and anything from a real camera do not. On a trip, "wherever I was
four minutes ago" is a very good guess — and labelling it honestly costs nothing.

### Two sources, one answer

Takeout gives you the JSON sidecar and the file's own EXIF, and they disagree.
The sidecar wins on **timestamp** because Google corrects it across edits. EXIF
wins on **GPS** because Google zeroes `geoData` on anything shared or stripped.

Matching a photo to its sidecar is genuinely fiddly — the naming has drifted
across Takeout versions, filenames get truncated at 51 characters, and duplicate
markers hop across the extension (`IMG_1234(1).jpg` → `IMG_1234.jpg(1).json`).
`scripts/lib/takeout.js` indexes every JSON under a canonical key and falls back
to longest-prefix matching. If your export finds fewer sidecars than expected,
that file is where to look.

---

## People detection

`scripts/detect.js` runs DETR ResNet-50 through Transformers.js. The model
downloads once (~160 MB) into `node_modules/.cache` and every run after that is
offline.

Detection runs on the 480 px thumbnail rather than the original — about ten times
faster, and it does not change a person/no-person answer in practice.

Per photo it stores the count, the top confidence, and `largest`: the biggest
person's share of the frame. That last one is the useful one — it separates *a
portrait of someone* from *a beach with specks of tourists in it*.

Want it faster? Python with `ultralytics` YOLOv8n is roughly 10× quicker on CPU.
The output shape in `cache/people.json` is small enough to reproduce from another
language; nothing downstream cares who wrote it.

---

## Culling photos

The **Apagar fotos** button in the rail turns the grid into a marking surface:
clicking a photo turns it red instead of opening it, and the filenames collect in
a tray at the bottom, copied to the clipboard as you go.

Nothing is deleted in the browser. Marking produces a list; applying it is a
second, deliberate step:

```bash
npm run exclude        # paste the list, then Ctrl+Z and Enter on Windows
npm run build
```

That two-step shape is on purpose. A click in a grid is far too cheap an action
to be the last word on throwing a photo away.

`npm run exclude` writes `data/excluded.json` and removes the encoded
derivatives. The list is the durable half: `ingest` re-reads the entire Takeout
on every run, so without a persistent record of what was culled, the next build
would resurrect all of it.

**Your originals in `takeout/` are never touched** — not by this script, not by
the site, not by anything in the pipeline. To undo:

```bash
npm run exclude -- --undo
npm run images         # re-encodes what was removed
npm run build
```

Other flags: `--list` to see the current exclusions, `--file x.txt` to read from
a file instead of stdin, `--keep` to exclude a photo from the site while leaving
its encoded files on disk, `--prune` to reclaim the space for everything already
on the list.

`--keep` and `--prune` are a pair, and they exist for one situation: culling while
`npm run detect` is running. The detector reads the same thumbnails this script
deletes, so removing them mid-run costs you an error entry per file. Mark with
`--keep`, let detection finish, then `--prune`.

---

## How the photos are laid out

```
photos/
├── full/
│   ├── Bahia/20240701_174451.avif
│   ├── Sergipe/…
│   ├── Alagoas/…
│   ├── Pernambuco/…
│   └── Sem estado/…          no GPS and nothing nearby in time
└── thumb/                     same tree, 440 px
```

One folder per state, named in full, and files keep their original Takeout name
rather than the internal id. The id is a fine key and useless in a file browser —
a folder worth organising is a folder someone intends to open.

`build.js` writes that location into each photo's `path`, so the site reads it
instead of guessing from the id. Renaming a folder therefore breaks the site
until the next `npm run build`.

Archives built before this layout existed can migrate without re-encoding:

```bash
npm run reorganize
npm run build
```

It moves files rather than rewriting them — the AVIFs would come out
byte-identical, and re-encoding 910 of them costs an hour of CPU to change a
path. Safe to re-run; anything already in place is left alone.

---

## Publishing

`takeout/` is gitignored; `photos/` is not. The 26 GB of originals never enter
git — the web derivatives do, and ship with the site.

At 2,982 photos that is 593 MB: 549 MB of `full/` at 1600 px and 45 MB of
`thumb/` at 440 px. GitHub Pages refuses to publish a site over 1 GB, so the
budget is real without being tight yet. Git keeps every version of a binary
forever, though — re-encoding at different settings later leaves both copies in
history permanently. Settle the quality numbers before the first commit, not
after.

If it stops fitting:

- **A curated subset.** `npm run images -- --limit 400` and commit those.
- **Somewhere else.** Push `photos/` to a bucket and set `IMAGE_BASE` in
  `js/config.js`. The manifest stores no absolute URLs, so that one line is the
  whole migration.

Every path the site asks for is relative, so it serves from a subfolder
(`/journey/`) exactly as it does from a domain root. `.nojekyll` at the repo root
keeps Pages from running the files through Jekyll.

`data/photos.json` and `data/br-uf.geojson` are small and should be committed —
the site is useful even before the images resolve.

---

## The site

Static. No build step, no framework, no runtime network calls. Open `index.html`
through any local server.

The map is inline SVG projected from the same IBGE geometry the pipeline uses —
no tile server, no map library. The trail is the point: photos in chronological
order, connected, so the shape on screen is the shape of the trip. Dragging the
timeline clips it, and the route draws itself down the coast.

Everything is ordered **chronologically**, oldest first — the grid opens on the
first photo of the trip and walks forward, matching the trail on the map and the
direction the arrow keys move through the lightbox. A journey is not a feed.

State filters follow the same rule: `build.js` sorts them by the timestamp of
their first photo, so the chips read in the order the states were travelled.

This started out as a hardcoded coast order, north to south, and that was wrong —
July runs Bahia northward, the opposite way. Deriving the order from the data
instead of from geography fixes it for good and needs no editing when a month
that doubles back gets added.

Cache-busting follows the repo convention: modules are mapped with `?v=N` in the
import map in `index.html`, and the `BUILD N` line in the footer matches. Bump
both together on every JS or CSS change.

UI text lives entirely in `js/strings.js`.

---

## Config reference

| Key | What it does |
|---|---|
| `takeoutDir` | Path to the `Google Fotos` folder inside your unzipped export. |
| `year` | Photos outside this capture year are dropped at ingest. |
| `images.fullWidth` / `thumbWidth` | Long edge of each derivative, in pixels. |
| `locate.offshoreSnapKm` | How far a sea fix may be snapped ashore. Default 40. |
| `locate.interpolateHours` | Time window for inferring a missing location. Default 12. |
| `detect.threshold` | Minimum confidence to count as a person. Default 0.6. |
| `detect.model` | Any Transformers.js object-detection model. |
