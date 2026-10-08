# Critique fixes — 7 October 2026

Implemented all four Priority Issues from `2026-10-07T15-44-52Z__index-html.md`:

1. Calendar labels and local times now use 0.75rem at every viewport. Flight tokens remain intact. A contained horizontal scroll region preserves the seven-column calendar at narrow widths and enlarged text; its cue and keyboard focus appear when needed. Full currency amounts receive wider minimum columns on desktop.
2. Flight edit and delete targets are 44 × 44px with a 4px gap.
3. The visible daily-estimate legend names all allowances or next-day pay, persists with Settings, and hides with income privacy. The existing monthly salary/all-allowances explanation remains visible.
4. First use names the supported current THAI monthly PDF and offers collapsed help for page 1, unsupported scans/formats/multi-month files, offline readiness, and browser-data retention.

## Verification

- Nine calculation tests passed. Pay arithmetic and policies were not changed.
- Chromium: 30 tests passed in the confirmation suite; the remaining screen-fit test then passed with a documented one-pixel tolerance for a 0.45px border rounding difference. All 31 browser cases passed across these runs.
- Coverage includes import, correction/cancellation, storage failures and migration, offline reopening/updates, privacy, fixed-size exports, keyboard navigation, 320–1440px widths, and simulated 200% root text size.
- Desktop, narrow phone, enlarged-text phone, first-use help, and correction-dialog screenshots inspected in two bounded rounds; no page errors or document-wide horizontal overflow were observed.
- WebKit could not launch: the host lacks GTK, Graphene, GStreamer and other required libraries. This was an environment failure before any test interaction, not an application assertion failure.
- `git diff --check` and browser-test syntax check passed.
- Static app and service-worker versions match: `2026.10.07-r25`.

The saved images use synthetic PDF fixtures, not a real pilot roster. `mobile-welcome.png` and `mobile-controls.png` show unchanged views from the confirmation capture script. Root text enlargement is a CSS simulation, not verification on an actual iOS device.

## Detector interpretation

One scan of the finished UI reported 33 findings: six warnings and 27 advisories. Calendar small-text warnings are gone. The preserved purple palette is intentional. Container padding flags are evaluated against the rendered content: the identity bar and section children own their insets; help summary text is vertically centered within a 44px target; the calendar footer is compact so six-week months fit typical phones while its link keeps a 44px target. The Arial warning concerns the retained export time typography, and token advisories concern existing values outside the recorded machine-readable scale. No new palette or broad redesign was introduced to silence these findings.
