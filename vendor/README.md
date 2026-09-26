# Browser libraries

These files are served directly by GitHub Pages. They do not require Node.js.

- PDF.js 6.3.289, legacy display and worker builds: downloaded from the official npm package via jsDelivr. Apache-2.0 license in pdfjs/LICENSE.
- html2canvas 1.4.1: downloaded from the official npm package via jsDelivr. MIT license in html2canvas/LICENSE.

The application loads these libraries only when importing a PDF or exporting an image. Its service worker also caches them for offline use.

When changing an asset, increment the shared version in index.html and sw.js so existing installations receive a complete new cache.

- Noto Sans Thai 400/600/700, self-hosted export fonts from Google Fonts; SIL Open Font License 1.1 in fonts/OFL.txt. Exact source URLs are in fonts/SOURCES.md.

- Roboto Mono 600, a self-hosted monospace font for aligned flight–airport labels. SIL Open Font License 1.1 in fonts/OFL-RobotoMono.txt; source URL in fonts/SOURCES.md.
