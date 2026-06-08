# Colorblind Filter

A Chrome extension that applies scientifically accurate color vision deficiency (CVD) simulation and daltonization correction filters to any webpage in real time.

Built for designers testing their work and for people with color vision deficiencies who need clearer visual access to the web.

---

## Features

- **8 simulation filters** — Protanopia, Protanomaly, Deuteranopia, Deuteranomaly, Tritanopia, Tritanomaly, Achromatopsia, Achromatomaly
- **5 correction filters** — Daltonization for Protanopia, Deuteranopia, Tritanopia, plus High Contrast and Monochrome High Contrast
- **Adjustable intensity** — Smooth slider from 0–100% for fine-tuning filter strength
- **Simulation vs. Correction modes** — Simulation shows how a page looks to a CVD user; Correction shifts confusing colors into distinguishable ranges
- **Quick Compare** — Hold a button to temporarily disable the filter for side-by-side comparison
- **Site exceptions** — Disable the extension on specific domains
- **Dark mode & RTL support** — Respects system preferences and right-to-left languages
- **Full i18n** — Translated into 130+ languages

---

## Filters

| Filter | Type | Category |
|---|---|---|
| Protanopia | Simulation | Red-Green |
| Protanomaly | Simulation | Red-Green |
| Deuteranopia | Simulation | Red-Green |
| Deuteranomaly | Simulation | Red-Green |
| Tritanopia | Simulation | Blue-Yellow |
| Tritanomaly | Simulation | Blue-Yellow |
| Achromatopsia | Simulation | Monochromacy |
| Achromatomaly | Simulation | Monochromacy |
| Color Correct: Protanopia | Correction | Daltonization |
| Color Correct: Deuteranopia | Correction | Daltonization |
| Color Correct: Tritanopia | Correction | Daltonization |
| High Contrast | Correction | Universal |
| Mono High Contrast | Correction | Monochromacy |

**Algorithm sources:**
- Simulation matrices based on Viénot, Brettel & Mollon (1999) and Brettel, Viénot & Mollon (1997)
- Daltonization correction using error redistribution (Fidaner et al.)

---

## Permissions

| Permission | Justification |
|---|---|
| `storage` | Saves the user's selected filter, intensity level, enabled state, and site exception list locally. No data is ever sent to any server. |
| `activeTab` | Allows the popup to communicate with the content script running on the currently active tab when the user opens the extension. |
| `scripting` | Declared for potential programmatic content script injection; the extension primarily uses manifest-declared content scripts. |
| `host_permissions` (`<all_urls>`) | Required to inject the filter engine (content script) into web pages the user visits. Filtering only occurs on http:// and https:// URLs. |

The extension **does not** collect, transmit, or share any user data. All processing happens entirely locally in the browser.

---

## Chrome Web Store Description

> **Colorblind Filter** applies scientifically accurate color vision deficiency (CVD) simulation and daltonization correction filters to any website in real time.
>
> Whether you're a designer testing your work's accessibility or someone with color blindness who needs clearer access to the web, this extension puts powerful, research-backed filters at your fingertips.
>
> **Simulation mode** — See exactly how your designs look to users with protanopia, deuteranopia, tritanopia, and other conditions. Based on the Viénot/Brettel models used in academic research.
>
> **Correction mode** — Daltonization algorithms shift confusing color pairs into distinguishable ranges. Includes dedicated filters for red-blind, green-blind, and blue-blind users, plus universal High Contrast and Monochrome High Contrast modes.
>
> **Key features:**
> - 8 simulation and 5 correction filters
> - Adjustable intensity (0–100%)
> - Quick Compare button to temporarily disable the filter
> - Site-specific exception toggles
> - Supports all modern browsers via Manifest V3
> - Fully translated into 130+ languages
> - Dark mode and RTL support
> - Zero data collection — everything runs locally

---

## Installation

### From the Chrome Web Store
Visit the [Chrome Web Store listing]() and click **Add to Chrome**.

### Manual (Developer mode)
1. Clone or download this repository
2. Open `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `colorblind-filter-extension` folder

---

## Usage

1. Click the extension icon in the toolbar to open the popup
2. Toggle the master switch to enable filtering
3. Switch between **Simulation** and **Correction** mode tabs
4. Click a filter card to apply it
5. Adjust the **Intensity** slider to control filter strength
6. Use **Hold to compare** to temporarily disable the filter
7. Toggle **Disable on this site** to add exceptions

---

## Project Structure

```
colorblind-filter-extension/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker — sets defaults, re-applies filter on tab switch
├── filters.js             # CVD filter matrices, interpolation, daltonization pipeline
├── content.js             # Injected into pages — applies SVG filters via CSS
├── content.css            # Styles for injected SVG container
├── popup.html             # Popup UI structure
├── popup.css              # Popup styles (dark mode, RTL, forced-colors)
├── popup.js               # Popup logic, i18n, event handling
├── icons/                 # Extension icons (16, 32, 48, 128)
├── _locales/              # Translation files (130+ languages)
└── README.md
```

---

## License

MIT
