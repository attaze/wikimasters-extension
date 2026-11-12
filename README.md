# 🃏 WikiMasters Tools (Browser Extension)

A cross-browser extension (**Chrome, Brave, Edge & Firefox**) designed to optimize collection management, market price analysis, and pack opening on [WikiMasters](https://www.wiki-masters.com/).

## ✨ Features

- **💰 Market Price Sorting (`/collection`)**: Fetches the average market price of each card via the marketplace API and dynamically reorders the current page (highest to lowest price, or vice versa).
- **📊 Portfolio Value Estimator**: Calculates and displays the total market value (`Ⓦ`) of all cards on the current page in real time.
- **🧠 Smart Cache (30-Day TTL) & Rate-Limit Protection**: Stores card prices in `localStorage` for instant sorting on known cards and automatically handles server rate limits with a smart retry queue (`⏳`).
- **🔄 Auto-Sort on Page Change**: Detects pagination (`Next` / `Previous`) and filter updates via a `MutationObserver` to sort new pages automatically.
- **⚡ Fast & Auto Pack Opening (`/pulls`)**:
  - **Auto-Open Loop ("Tout ouvrir")**: Automatically opens all available packs in sequence with a one-click stop option.
  - **Keyboard Shortcuts**: Use the arrow keys (`➡️` / `⬅️`) to open packs, flip through cards, and seamlessly chain into the next available pack.
- **🎨 Glassmorphism UI**: Compact, draggable, and semi-transparent floating widget that remembers its screen position and open/collapsed state across page reloads.

## 🚀 Installation

### 🦁 Brave / Chrome / Edge (Developer Mode)
1. Clone this repository or download the ZIP:
   ```bash
   git clone https://github.com/attaze/wikimasters-extension.git
   ```
2. Open your browser and navigate to `brave://extensions/` (or `chrome://extensions/`).
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the project folder.

### 🦊 Firefox
- **Temporary Installation (Quick Test)**:
  1. Download and extract the repository ZIP.
  2. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
  3. Click **Load Temporary Add-on...** and select the `manifest.json` file inside the folder.
- **Permanent Installation (`.xpi`)**:
  1. Download the signed `.xpi` file from the **Releases** section (if available) and drag-and-drop it into Firefox.

## 🛠️ Project Structure

- `manifest.json`: Cross-browser extension configuration (Manifest V3 with Gecko support).
- `injector.js`: Page-context bridge script ensuring React Fiber access on Firefox & Chromium.
- `content.js`: React Fiber data extraction, persistent price cache, rate-limit handler, auto-opener, and keyboard shortcuts.
- `style.css`: Glassmorphism widget styling and card price badges.
