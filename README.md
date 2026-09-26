# TG Pilot Planner

A mobile-first, calendar-first planner for the current THAI monthly crew schedule PDF format. After importing a roster, the month header includes Share and Settings. Replace the monthly PDF in Settings. Today is highlighted directly in the calendar. Calendar rows use moderate spacing and grow only when flight labels need more room. Enlarged text and unusually dense days can still require scrolling.

On phones, tapping a calendar date opens its details in a modal. On iPad and larger screens, details appear beside the calendar. The app estimates income, allows flight/duty corrections, exports calendar images, and reopens offline after initial setup.

## GitHub Pages

The production app is entirely static. **No Node.js server, npm install, or build step is required to publish it.**

If the repository already publishes from a branch, publish the repository root containing index.html, sw.js, and vendor/. The .nojekyll file disables Jekyll processing.

For a deployment that includes only production files:

1. Push the changes to GitHub.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. In **Actions → Deploy GitHub Pages**, select **Run workflow**.

The workflow publishes only the HTML, service worker, robots.txt, and local browser libraries. It does not install or publish node_modules, tests, or npm configuration. All paths are relative, so the app works at a project URL such as https://bankgg.github.io/tgsalor/ as well as a custom domain.

GitHub Pages supports both branch publishing and custom Actions workflows. See [GitHub's Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

## Troubleshooting PDF reader loading

Publish the entire static site, including vendor/pdfjs/pdf.min.mjs and vendor/pdfjs/pdf.worker.min.mjs. Copying only index.html will leave the reader unavailable. These are browser files, not Node modules.

Open the page over HTTPS or a local HTTP server; opening index.html directly with file:// can block module loading. PDF.js requires a supported current browser; Safari 18 or later is supported by this legacy build. See [PDF.js browser support](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#faq-support).

The app distinguishes missing files, incorrect JavaScript content types, offline downloads, and reader initialization failures. After correcting a missing file or a temporary download failure, select the PDF again; a page reload is not required.

## Shared images

Exports always use the same 820-pixel layout and 2× rendering (1640 pixels wide), with locally bundled fonts, independent of the device viewport or text size. Height follows the number of calendar weeks and whether monthly income is included. There is no image-size selector.

Shared images contain the month, pilot name, date range, duties, flight number–arrival airport pairs (one flight per row), optional income, and © bankgg attribution. Navigation hints, page controls, and application version details are omitted.

## Income privacy

Use the eye icon in the purple identity bar or day details to hide income. The preference is saved in localStorage and restored on the next visit. Privacy mode hides calendar amounts, day pay details, monthly totals, and salary settings; shared images omit daily amounts. In the sharing dialog, Include monthly income can explicitly add monthly figures to that image while the page stays private. Flight numbers, routes, times, and editing remain available.

Today retains the calendar highlight. Opening another day does not leave a selection highlight; keyboard users still receive a focus indicator and return focus after closing a dialog.

## Offline and saved data

Visit the site online once and wait for **Offline ready** before relying on offline reopening. The app caches its own page and required browser libraries, and stores the PDF, parsed schedule, and manual edits in IndexedDB. Clearing the browser's site data also clears the saved schedule.

Existing localStorage profiles, display preferences, PDFs, and manual edits migrate automatically. A failed import leaves the previous schedule intact. If storage cannot be written, the current page remains usable and offers **Retry saving**.

Updates appear as **Update available · Reload** after a complete replacement cache is prepared. Close any open editor/settings dialog and finish saving before updating. Increment the version in both index.html and sw.js when changing production files.

## Pay rules and PDF support

The existing co-pilot rate and pay rules are retained: ฿1,250 per block hour, ฿650 per landing, ฿500 for a qualifying red-eye flight, and ฿1,000 transportation once per date with a BKK departure. Other roles remain disabled.

Block duration uses airport timezones, including DST. Red-eye eligibility retains the original clock-time overlap rule for 02:00–06:00; its payroll timezone interpretation has not been changed. Flight income excludes the daily transportation allowance, which appears separately.

Only page 1 of the existing monthly report layout is processed. Additional pages, unreadable flights, and missing dates are explicitly marked. Scanned PDFs, other layouts, and schedules spanning multiple months are unsupported.

## Local development and tests

Use a static server rather than opening index.html directly from disk:

    python3 -m http.server 8000

Open http://localhost:8000/. Offline support requires HTTPS or localhost.

Node.js 24 and npm are needed **only for development tests**:

    npm ci
    npx playwright install --with-deps chromium webkit
    npm test
    npm run test:browser

Tests exercise calculations, actual PDF extraction from synthetic fixtures, edits, migration, failed storage, sharing, responsive layouts, keyboard navigation, and offline reopening under a GitHub Pages-style /tgsalor/ directory. Browser coverage includes Chromium and WebKit; real-device Safari testing remains useful.

WebKit offline tests make the origin server unavailable and verify a fresh browser context cannot load the site, while the cached context can. This avoids a [confirmed Playwright offline-emulation bug](https://github.com/microsoft/playwright/issues/42775); Chromium uses the normal offline switch.

No representative real crew PDF is included. Synthetic fixtures reproduce the existing parser's expected coordinates; they cannot prove compatibility with every real-world report variation. Do not commit personal schedule PDFs.

Calendar flight ranges show the earliest departure and latest arrival in their respective airport local times, with +1 for next-day arrivals. These are flight times, not reporting or release times. Day details and the flight editor show date-aware UTC offsets for each endpoint, including daylight-saving and fractional offsets; calendar cells and exported calendars omit offset labels. Incomplete days omit the range. All flights and times remain visible; small screens and especially busy months may scroll vertically.
