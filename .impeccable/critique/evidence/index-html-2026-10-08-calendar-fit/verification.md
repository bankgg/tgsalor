# Phone calendar fit — 8 October 2026

Reduced the minimum calendar width below 1000px from 24.5rem to 21rem. Desktop minimum width remains 31.5rem. App and service-worker versions match: 2026.10.08-r26. DESIGN.md records the new behavior.

Eight targeted Chromium cases passed: enlarged text and keyboard scrolling; responsive mobile/tablet/desktop; typical-phone screen fit; local times and overnight markers; four-flight days; fixed export layout and privacy; keyboard focus restoration; offline cache updates and saved edits.

An existing responsive test now covers 375px and confirms every weekday column fits at 375, 390, and 430px. Actual grid/available widths were 349/349, 364/364, and 404/404px. Labels and times remain 12px. At 320px and simulated 200% root text size, contained scrolling remains available without document-wide overflow. No page errors occurred.

One batched visual inspection covered 375/390/430/320px, enlarged text, and desktop using a synthetic four-flight PDF. These are browser emulations, not real-device Safari verification. The local preview served the current HTML and worker at localhost:8000.

The single detector scan returned the same 33 findings (six warnings and 27 advisories) as the previous pass: established purple identity, container insets owned by child elements, retained export typography, and existing token documentation gaps. No new findings or calendar small-text warnings appeared. git diff --check passed.
