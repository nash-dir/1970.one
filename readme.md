# 1970.one

**1970.one** is an ambient clock & data dashboard that renders the pulse of the digital world in real-time. It streams *buffered,* near real-time events from *Wikipedia, Bitcoin Mempool, and GitHub*, presenting them as a continuous flow of raw data on a CRT-styled terminal.

Try it on an idle LCD tablet for cool desk decoration, a server room monitor, or as a Wallpaper Engine background.

A study on a small group of devs showed empirical evidence suggesting that the dashboard makes the user look busy, serious, and somehow important.

---

## Architecture & Design Philosophy

This project is built with a **"Separation of Concerns"** strictly enforcing the separation between the View (Frontend) and the Engine (Backend), creating an architecture optimized for portability and resilience.

### Frontend: Zero-Dependency Single Artifact
The frontend is deliberately architected as a **Single HTML File (`index.html`)**.
- **Delivery Optimization:** The entire application is contained within a single file. This ensures maximum portability and simplifies deployment. It can be served from any static host, CDN, or even opened locally without a build step.
- **No Bundler Required:** No Webpack, No Vite, No React. Just pure, performant Vanilla JS.
- **Resilience (Dead Reckoning Mode):** When the network goes dark or the backend is unreachable, the frontend seamlessly switches to a **simulation mode**, generating synthetic events to keep the visual experience alive.
- **Low Bandwidth Mode:** After 10 minutes of inactivity, 'Eco Mode' automatically engages to reduce network requests and conserve resources.

### Backend: Serverless Edge Computing
The data engine runs on **Cloudflare Workers** with **KV Storage**, engineered to operate sustainably within the Free Tier limits.
- **Edge Caching:** High-frequency events are buffered and cached at the edge to reduce origin load.
- **Quota-Safe Scheduling:** The backend operates entirely within **Cloudflare**'s generous free tier. Cron triggers are synchronized with `Cache-Control` headers (6m/10m intervals) to maximize data freshness while strictly adhering to the 1,000 daily write limit.
- **Hybrid Fetching Strategy:** The Wiki worker utilizes a smart mix of lightweight stream reading and selective rich-content fetching to bypass the 10ms CPU execution limit.

---

## Features

* **Clocks**:
    * **Unix Clock:** Live Unix Timestamp (Dec/Hex/Bin) and UTC/Local time display.
    * **Y2K38 Countdown:** Counting down to the 32-bit integer overflow horizon.
    * **Server RTT Graph:** Monitor Round-Trip Time to a designated server.

* **Themes**:
    * **Wikipedia**: Real-time edit stream (Global/English) with "Typewriter" effect for summaries.
    * **Bitcoin**: Live transaction monitoring from Mempool.space (vSize, Fees, BTC value).
    * **GitHub**: Repository events and commit logs.

* **Visuals**:
    * CRT Scanline & Curvature effects.
    * Terminal-style JSON raw data rain.
    * Responsive "Split Mode" dashboard.

* **Audio**:
    * Procedural sound effects (Hum, Beeps, Blips) using Web Audio API.

---

## URL Query Parameters (Deep Linking)

1970.one supports **Deep Linking** via URL query parameters. This feature allows you to bypass the cinematic boot sequence and initialize the dashboard in a specific state, which is ideal for **Kiosk Mode**, multi-monitor setups, or bookmarking specific configurations.

| Parameter | Description | Values |
| :--- | :--- | :--- |
| `theme` | Skips boot animation and immediately loads the specified theme. | `wiki`, `btc`, `github` |
| `target` | Sets the RTT monitor target domain and starts pinging immediately. | Any domain (e.g., `google.com`) |

### Usage Examples
* **Bitcoin Dashboard (Immediate Start):**
    `https://1970.one/?theme=btc`
* **Network Monitor (Targeting Google):**
    `https://1970.one/?target=google.com`
* **Combined (Wiki Theme + Cloudflare Monitor):**
    `https://1970.one/?theme=wiki&target=cloudflare.com`

---

## Project Structure

```bash
1970.one/
├── index.html          # The Frontend (View). Deploy this anywhere.
└── workers/            # The Backend (Engine).
    ├── wiki/           # Handles Wikipedia stream & parsing (Hybrid Logic)
    ├── btc/            # Fetches Bitcoin Mempool data
    └── github/         # Polling GitHub public events
```

---

## Installation & Deployment

### 1. Frontend
#### Easy way 
Visit [https://1970.one](https://1970.one)

#### Retro way
Simply download `index.html` to your local computer. Thanks to its monolithic structure, no web server is required. 
*Yes, you can actually **Save As...(S)** a working website, just like back in the 90s.*

### 2. Backend (Cloudflare Workers)
#### Default Configuration (Public API) 
The provided `index.html` is pre-configured to use our public workers (sampled data):
    
*   **WIKI**: "https://1970-wiki.nashdir.workers.dev",
*   **GITHUB**: "https://1970-github.nashdir.workers.dev",
*   **BTC**: "https://1970-btc.nashdir.workers.dev"

#### Self-Hosted (Full Control) 
Deploy workers to your own Cloudflare account and create the required KV namespaces.
Each worker is an independent microservice.
You must set up a KV Namespace and bind it in `wrangler.toml` before deploying.

```bash
# Install dependencies
npm install

# Deploy each worker
cd workers/wiki && npx wrangler deploy
cd ../btc && npx wrangler deploy
cd ../github && npx wrangler deploy
```

---

## License
MIT License © 2024-2026 nash-dir