---
name: TG Pilot Planner
description: Existing calendar interface for THAI schedules and estimated income.
colors:
  purple: "#370e62"
  purple-soft: "#f3eef8"
  primary-hover: "#4b1b79"
  magenta: "#a32672"
  gold: "#b18527"
  ink: "#251633"
  muted: "#706878"
  line: "#e8e3ed"
  paper: "#fff"
  background: "#faf9fb"
  warning: "#765113"
  warning-bg: "#fff7e8"
  error: "#a32739"
typography:
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.5px"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "100%"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
  flight-label:
    fontFamily: "PilotFlightLabel, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
  export-body:
    fontFamily: "PilotExport, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  field: "7px"
  control: "8px"
  surface: "12px"
  dialog: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.purple}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.purple}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  section:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  identity-bar:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.paper}"
---

# Design System: TG Pilot Planner

## Overview

This record describes the existing CSS and components in `index.html`. It preserves the current interface for live variations; it establishes no new visual direction. Creative metaphors and additional brand language remain undecided.

The interface places a compact monthly calendar on a pale background beneath a purple identity bar. White containers, fine borders, restrained gold accents, and system typography support practical schedule review. Existing copy uses direct, personal language such as “Your schedule” and “Choose schedule PDF.”

**Key Characteristics:**

- Compact calendar with seven equal date columns.
- Purple actions and income figures on light surfaces.
- System text with bundled monospace flight labels.
- Flat containers and elevated task dialogs.

## Colors

The frontmatter records the existing CSS palette with its original token names.

### Primary

- **Purple:** identity bar, primary buttons, links, flight numbers, income totals, and today's date.
- **Soft purple:** secondary hover states and informational surfaces.
- **Primary hover:** the darker button interaction shade.

### Secondary

- **Magenta:** keyboard focus outlines.
- **Gold:** the narrow identity-bar accent and offline status indicator.

### Neutral

- **Ink:** primary text.
- **Muted:** explanatory copy and secondary labels.
- **Line:** calendar separators, section borders, and dividers.
- **Paper:** white interactive surfaces.
- **Background:** the page surface.

Warning text and warning backgrounds identify uncertain imports; error text identifies failures and destructive actions. These semantic roles remain distinct from ordinary schedule labels.

## Typography

The page uses the platform sans stack for headings, body copy, forms, and navigation. `PilotFlightLabel` loads the bundled Roboto Mono 600 for flight number and airport data. `PilotExport` loads bundled Noto Sans Thai at weights 400, 600, and 700 for exported images.

General heading sizes are 1.25rem, 1.1875rem, and 1rem. Component rules override these where needed: the loaded month heading is 1.125rem on phones and 1.25rem from 768px. Income totals use 1.875rem. Money uses tabular numerals and does not wrap.

Calendar flight labels and local times use 0.75rem at every viewport size. Flight numbers and airport codes remain intact; pairs wrap between tokens when needed. Next-day markers use the same size as their time labels. Export typography remains independently sized.

## Layout

The app and identity bar share a centered maximum width of 1120px. Phone gutters account for safe-area insets. The workspace starts as a single column; day details move into a dialog below 768px. At 768px, calendar and detail columns use a 1.5-to-1 ratio with an 18px gap; from 1000px the ratio becomes 1.7-to-1.

The calendar always has seven equal columns with 1px separators, inside a horizontal scroll region with a 21rem minimum grid width (31.5rem from 1000px, where daily amounts use full currency formatting). All seven columns fit typical 375–430px phones at normal text size; narrower screens and enlarged text can scroll within the calendar. A visible scrolling cue and a focusable region appear only when dates extend beyond the viewport. Dates stack the day number, flight labels, local flight-time range, and optional income. Dense content can increase row height. Breakpoints at 390px and 600px adjust labels and spacing; 768px, 1000px, and 1024px adjust workspace and calendar readability. Narrow overrides below 390px adjust cell padding without shrinking flight labels or local times.

Calendar exports have their own fixed 820px layout with 24px padding. They retain their dimensions independently of the device viewport.

## Elevation & Depth

Ordinary sections use borders and surface color instead of drop shadows. Dialogs use the existing soft shadow (`0 16px 60px #1e0b3430`) and a translucent dark backdrop (`#1d0d3a70`). Today's calendar cell has a 2px inset purple outline; the identity bar's 3px gold strip is a brand accent.

## Shapes

Containers use the surface radius; buttons and sharing previews use the control radius; fields use the field radius; dialogs use the dialog radius. Calendar cells have square corners. Today's date and warning flags are circular. Flight number–airport pairs have transparent backgrounds and square corners, while non-flight duty tags retain a compact filled treatment.

## Components

- **Buttons:** purple primary actions, white bordered secondary actions, and transparent text actions. Standard controls have a minimum height of 44px. Icon buttons are 44px square. Flight edit and delete tools are 44px square, separated by 4px.
- **Fields:** white surfaces, a fine lavender border, a minimum height of 46px, and 1rem input text. Labels sit above fields; form rows wrap to fit the available width.
- **Focus:** buttons, links, inputs, and summaries use a 3px magenta outline with 3px offset. Disabled buttons have reduced opacity and a default cursor.
- **Navigation:** the purple identity bar carries the product name and income privacy control. The loaded month header contains Share and Settings. Header labels adapt to available width.
- **Calendar:** today's date is the persistent highlight; opening another date does not add a selection highlight. Flight labels keep number and arrival airport as complete tokens. The footer visibly names the daily estimate basis and respects income privacy.
- **Dialogs:** sticky white headers keep the title and close action available; Settings also has a sticky footer. Dialog height follows the viewport and scrolls when needed.
- **Notices:** informational, warning, and error surfaces keep recovery copy beside the relevant workflow.
- **Motion:** buttons transition background over 0.15s only when reduced motion is not requested. No broader motion system is established.

## Do's and Don'ts

### Do:

- **Do** preserve existing palette roles, bundled data fonts, and responsive calendar structure during live refinement.
- **Do** retain visible keyboard focus and safe-area-aware layout.
- **Do** preserve income privacy and independently sized exports.
- **Do** distinguish today's date from keyboard focus.

### Don't:

- **Don't** treat missing documentation as permission to replace the existing identity.
- **Don't** apply the fixed export layout or small calendar labels to general forms and body copy.
- **Don't** add a persistent selection highlight when opening another day.
- **Don't** expose hidden income through decorative or preview content.
