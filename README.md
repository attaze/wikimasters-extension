# 🃏 WikiMasters Tools (Browser Extension)

A Chromium / Brave browser extension designed to optimize collection management, market price analysis, and pack opening on [WikiMasters](https://www.wiki-masters.com/).

## ✨ Features

- **💰 Market Price Sorting (`/collection`)**: Fetches the average market price of each card via the marketplace API and dynamically reorders the current page (highest to lowest price, or vice versa).
- **📊 Portfolio Value Estimator**: Calculates and displays the total market value (`Ⓦ`) of all cards on the current page in real time.
- **🧠 Smart Cache (30-Day TTL) & Rate-Limit Protection**: Stores card prices in `localStorage` for instant sorting on known cards and automatically handles server rate limits with a smart retry queue (`⏳`).
- **🔄 Auto-Sort on Page Change**: Detects pagination (`Next` / `Previous`) and filter updates via a `MutationObserver` to sort new pages automatically.
- **⚡ Fast Pack Opening Shortcuts (`/pulls`)**: Use the keyboard arrow keys (`➡️` / `⬅️`) to open packs, flip through cards, and seamlessly chain into the next available pack.
- **🎨 Glassmorphism UI**: Compact, draggable, and semi-transparent floating widget designed to blend natively into WikiMasters' dark theme.

## 🚀 Installation (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/attaze/wikimasters-extension.git
   ```
2. Open Brave or Chrome and navigate to `brave://extensions/` (or `chrome://extensions/`).
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the cloned project folder.

## 🛠️ Project Structure

- `manifest.json`: Extension configuration (Manifest V3).
- `content.js`: React Fiber data extraction, persistent price cache, rate-limit handler, and keyboard navigation shortcuts.
- `style.css`: Glassmorphism widget styling and card price badges.
