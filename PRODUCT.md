# TG Pilot Planner

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are THAI co-pilots checking their monthly roster and estimated income on a phone. The same product supports iPad and desktop use.

## Product Purpose

Turn a THAI monthly crew schedule PDF into a calendar where pilots can review duties, inspect flight details, correct imported entries, estimate income, and share their schedule. Success means users can understand their month and retrieve their saved schedule offline after initial setup.

## Positioning

The product combines parsing of the current THAI monthly crew schedule format with co-pilot income estimates and a calendar stored on the user's device. This is the implemented product mechanism; no claim of official airline endorsement or verified payroll accuracy has been established.

## Operating Context

- Import a monthly schedule PDF to populate the calendar. Replace the next roster through Settings.
- Review day details in a dialog on phones or beside the calendar on iPad and larger screens. Flight times use their respective airport local times; they are not reporting or release times.
- Correct flights and duties manually, set a monthly base salary, and choose which daily income amount is displayed.
- Hide income while continuing to inspect and edit schedule details. Share or save a calendar image, with an explicit option to include monthly income.
- Visit online and wait for **Offline ready** before depending on offline reopening. Clearing browser site data removes the saved schedule.

## Capabilities and Constraints

The user confirmed these durable constraints:

- Keep production entirely static, with no server or production build requirement. Preserve relative paths for deployment at a GitHub Pages project URL or a custom domain.
- Keep schedule data on the user's device. The PDF, parsed schedule, and manual edits use IndexedDB; profile and display preferences use localStorage.
- Preserve offline use after the initial download of the page and required browser assets.
- Present income as an estimate.
- Support the current THAI monthly crew schedule PDF format.

Current implementation facts, documented in `README.md` and `index.html`:

- PDF processing reads page 1 of the supported monthly layout. Scanned PDFs, other layouts, and schedules spanning multiple months are unsupported. Missing dates, unreadable flights, and additional pages are flagged. Imports reject files larger than 25 MB.
- Co-pilot is the only enabled income role. Implemented rates are ฿1,250 per block hour, ฿650 per landing, ฿500 per qualifying red-eye flight, and ฿1,000 transportation once per date with a BKK departure. These describe the existing estimator, not independently verified payroll policy.
- Block duration uses airport timezones and daylight saving time. Red-eye eligibility uses the existing 02:00–06:00 clock overlap rule; its payroll timezone interpretation remains unresolved.
- Income privacy persists across visits and hides daily amounts, monthly totals, and salary settings. Monthly figures can be explicitly included in a shared image while the page remains private.
- Exports use an 820-pixel layout rendered at 2×, with bundled fonts and optional monthly income. Shared images include © bankgg attribution.
- Failed imports preserve the previous schedule. Storage failures offer **Retry saving**. Updates are offered after a complete replacement cache is ready.
- Production consists of `index.html`, `sw.js`, and bundled browser assets in `vendor/`. Changing production files requires matching version increments in `index.html` and `sw.js`.

Open decisions: expansion to other pilot roles or PDF formats, any broader market positioning, and a formal accessibility conformance target have not been established.

## Evidence on Hand

- `README.md`: existing workflows, supported formats, privacy behavior, estimator rules, deployment instructions, and known limitations.
- `index.html` and `sw.js`: implemented app behavior, estimator, PDF import, export, local persistence, and offline support.
- `tests/fixtures.cjs`: synthetic crew schedule PDF fixtures. No representative real crew PDF is included; fixtures do not establish compatibility with every real report variation. Personal schedule PDFs must not be committed.
- `tests/calculations.test.cjs` and `tests/browser.spec.cjs`: calculation and browser verification, including import, editing, storage failure, privacy, sharing, keyboard navigation, responsive layouts, and offline reopening.
- `vendor/`: bundled PDF.js, html2canvas, fonts, licenses, and font source records.
- Existing product identity appears as **TG Pilot Planner** with bankgg attribution. No additional binding brand direction was provided during initialization.

## Product Principles

1. Make the monthly roster and its daily details easy to retrieve and understand on a phone.
2. Keep users in control of their schedule data and income visibility.
3. Preserve dependable offline access after initial setup.
4. Expose import uncertainty and allow corrections without presenting estimates as verified payroll.
5. Keep deployment simple through a self-contained static site.
