# 1970.one

**1970.one** is a Unix Epoch-themed dashboard designed for idle display. It visualizes global digital events in a retro-terminal interface, optimized for long-running sessions without exhausting API quotas.

### Architecture & Optimization
To ensure stability and minimize load on public APIs, this project implements a **Cloudflare Worker fan-out architecture** rather than direct client-side connections.

- **Buffered Polling:** Workers fetch and cache data streams (Wiki, GitHub, BTC) every 5 minutes, serving efficient batches to clients.
- **State Persistence:** Implements client-side state management to preserve data queues and handle tab switching gracefully.
- **Network Monitoring:** Includes a real-time **RTT (Round Trip Time)** graph to visualize latency between the client and the edge worker.

### Data Sources
- **Wikipedia:** Global recent changes stream.
- **Bitcoin:** Mempool transactions (focusing on raw on-chain metrics like vSize, Sats, and Fees).
- **GitHub:** Public event stream (Commits, PRs, Issues).

### Features
- **Unix Clock:** Live Unix Timestamp (Dec/Hex/Bin) and UTC/Local time display.
- **Y2K38 Countdown:** Tracking the 32-bit integer overflow horizon.
- **Retro UI:** Optional CRT visual effects and typing sounds.

---

[ **Live Demo** ](https://1970.one)
