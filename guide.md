# Practitioner Territory Map — Angular Guide

This is an Angular 21 app that recreates the Practitioner Territory Map. It shows US state territories on an interactive Leaflet map, with practitioner markers you can click/select.

---

## Prerequisites

You need **Node.js** (version 18 or newer) installed on your machine.

- Download Node.js: https://nodejs.org (pick the **LTS** version)
- After installing, open a terminal and verify:

```bash
node --version
npm --version
```

Both commands should print a version number. If they do, you're good to go.

---

## Step 1 — Install Dependencies

Open a terminal, navigate into this `angular` folder, and run:

```bash
npm install
```

This will download all the required packages (Angular, Leaflet, TypeScript, etc.) into a `node_modules` folder. It may take a minute or two.

---

## Step 2 — Run the App

Still inside the `angular` folder, run:

```bash
npm start
```

This starts a local development server. After it compiles, you'll see something like:

```
** Angular Live Development Server is listening on localhost:4200 **
```

Open your browser and go to:

```
http://localhost:4200
```

You should see the Practitioner Territory Map!

---

## Step 3 — Using the App

| Action | What Happens |
|---|---|
| **Select a practitioner** from the dropdown | The map flies to their location, shows a green active marker, and displays their detail card in the sidebar |
| **Click a state** on the map | The sidebar shows territory info and zip codes for that state |
| **Click a practitioner marker** (gray dot) on the map | Same as selecting from the dropdown — it highlights and shows their info |
| **Choose "All Practitioners"** in the dropdown | Deselects the active practitioner and resets the view |

---

## Project Structure

```
angular/
├── src/
│   ├── index.html                          # Entry HTML (loads Leaflet CSS)
│   ├── main.ts                             # Angular bootstrap
│   ├── styles.css                          # Global styles
│   ├── assets/
│   │   └── data/
│   │       ├── practitioners.json          # Practitioner data
│   │       └── territories.json            # Territory/state/zip data
│   └── app/
│       ├── app.component.ts/html/css       # Root layout (sidebar + map)
│       ├── app.config.ts                   # App providers (HttpClient)
│       ├── models/
│       │   ├── practitioner.model.ts       # Practitioner interface
│       │   └── territory.model.ts          # Territory interface
│       ├── services/
│       │   └── data.service.ts             # Shared data service (loads JSON, manages state)
│       └── components/
│           ├── sidebar/                    # Sidebar with dropdown & slot for cards
│           ├── map/                        # Leaflet map with GeoJSON + markers
│           ├── practitioner-card/          # Practitioner detail card
│           └── territory-info/             # Territory zip-code info panel
├── angular.json                            # Angular CLI config
├── package.json                            # Dependencies & scripts
├── tsconfig.json                           # TypeScript config
├── tsconfig.app.json                       # TS config for the app
└── guide.md                                # This file
```

---

## Key Concepts (for Angular Beginners)

### Standalone Components
Every component in this project uses `standalone: true`. This is the modern Angular approach — no `NgModule` files needed. Each component declares its own imports directly.

### Services & Dependency Injection
`DataService` is a singleton service (provided in root). It:
- Loads the JSON data files via `HttpClient`
- Shares state across components using RxJS `BehaviorSubject` observables
- Components subscribe to `practitioners$`, `activePractitioner$`, etc. to react to changes

### How the Components Talk to Each Other
1. **Sidebar** selects a practitioner → calls `DataService.setActivePractitioner()`
2. **Map** subscribes to `DataService.activePractitioner$` → highlights the marker and flies to it
3. **Map** clicks a state → calls `DataService.setSelectedTerritoryInfo()`
4. **Sidebar** subscribes to `DataService.selectedTerritoryInfo$` → shows the territory-info panel

### Leaflet Integration
Leaflet is used directly (not via an Angular wrapper). The `MapComponent` creates the map in `ngAfterViewInit()` after the DOM element is available.

---

## Common Issues

| Problem | Solution |
|---|---|
| `npm install` fails | Make sure you have Node.js 18+ and a working internet connection |
| Map tiles don't load | You need an internet connection (tiles come from OpenStreetMap) |
| Blank page | Open browser DevTools (F12) → Console tab, check for errors |
| Port 4200 already in use | Run `npm start -- --port 4300` to use a different port |

---

## Building for Production

To create an optimized production build:

```bash
npm run build
```

The output will be in `dist/practitioner-territory-map/`. You can deploy these static files to any web server.
