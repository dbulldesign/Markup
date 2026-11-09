# Pencil Markup for Bluebeam

A single-file web app for marking up PDFs on an iPad with Apple Pencil. Markups are written as standard PDF annotations that Bluebeam Revu reads (Subject, Comments, Author, Color, fill opacity, groups), and markups made in Revu show up here.

## Host it on GitHub Pages

1. Create a repository and add `index.html`, `version.json`, `sw.js`, `manifest.webmanifest` and the `icons/` and `vendor/` folders.
2. Settings, Pages, Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Open `https://<you>.github.io/<repo>/` in Safari on the iPad. Use Share, *Add to Home Screen* to run it full-screen.

The three libraries it uses (pdf.js 3.11.174, pdf-lib 1.17.1, pako 2.1.0) are in the `vendor/` folder and load from the same site as the page, so keep that folder next to `index.html`. Everything runs on the device; no file ever leaves it.

## Using it

- Pencil draws, a finger pans, pinch to zoom. *Finger draws* lets a finger draw too.
- Circle, Rectangle and Pen tools; the style chip sets the line colour and fill colour (independently, or *Line* to fill with the line colour), fill on/off, highlight, opacity and line width. Selected markups can be recoloured the same way in the properties panel.
- Select to move or resize. With Select, drag on empty space to box-select: drag left to right to pick markups fully inside the box (solid blue), right to left to pick everything the box touches (dashed green). Turn on *Multi-select* to add to the selection. *Group* makes a Revu group.
- Groups: tapping a markup selects its whole group; tap it again to select just that one markup. *Remove from group* takes the selected markups out and leaves the rest grouped. Select a group plus other markups and tap *Add to group*, or select several groups and tap *Merge groups*. *Ungroup* breaks up the whole group. In the markups list each group is one collapsed row; tap ▸ to list its markups, tap the row to select the group, or a row under it to select just that markup.
- *Tool Chest* imports `.btx` tool sets exported from Revu. Circle, rectangle and pen tools become drawable with their subject, color, fill and line width.
- *Save PDF* writes the markups into the file and offers the share sheet (or a download on a computer).

Author name, style defaults and imported tool sets are remembered in the browser on that device.

## Your own tools, palettes and favourites

- Pick a tool and style, then tap *Save as a tool…* in the style menu (or *+ Tool* in the Tool Chest). Give it a name, subject, default comment and style, and choose the palette it goes in (or make a new one).
- The tool editor shows a live preview at the top that updates as you change the type, colours, fill, line, symbol shape, size, label or text colour, and stays in view while you scroll.
- Tap ☆ on any tool to make it a favourite. Favourites appear as one-tap buttons in the toolbar and at the top of the Tool Chest.
- Tap ••• on a tool to edit it, move it to another palette, change what it draws, or delete it. *Use current style* copies the style you are drawing with.
- *+ Palette* makes an empty palette; each palette can be renamed, exported to a file or removed. Imported Revu tool sets can be edited the same way.
- *Back up* saves every palette, favourite and your author name and style to one file. *Import* restores it (or adds a single exported palette, or a Revu `.btx`), which is how you move your tools to another iPad.

Tools and settings are kept in the browser on that device, so back them up before clearing Safari data.

## Symbols and numbered counts

- *Symbol* places a fixed-size symbol with each tap (drag before lifting to position it). Every symbol from a tool is the same size on the drawing whatever the zoom, which suits fixture counts. Set the shape (circle, oval, square, rectangle, rounded rectangle, diamond, hexagon, triangle), size in points (oval and rectangles have a separate width and height) and a short label such as `L1` in the style menu, then *Save as a tool…* to keep it (for example one tool per fixture type, starred into the toolbar).
- *Text* colour for the label or number is set separately from the line and fill (in the style menu, the tool editor, or the properties panel for symbols already placed). *Auto* uses white on a strong fill, otherwise the line colour.
- *Numbered* places 1, 2, 3… with each tap. The bar at the top of the page picks the series: choose an earlier series to continue it, tap *New series* to start again at 1 (with an optional prefix such as `A` for A1, A2…), or type a *Next* number to jump.
- The markups panel shows *Counts* by subject (tap one to list just those). Symbols are saved as standard Circle, Square or Polygon markups with the label in the drawing and in Comments, so Revu lists and totals them by Subject. Their settings are also stored in the PDF, so series continue when you reopen the file here.

## Polygons and measurements

- *Polygon*: tap each corner, then tap the first point (or *Finish*) to close it. *Undo point* and *Cancel* are in the bar that appears while drawing; on a keyboard, Enter finishes, Backspace removes the last point and Escape cancels.
- *Scale*: set the drawing scale for the current page or all pages: pick a preset (architectural, engineering, metric), type a custom ratio, or *Calibrate* by drawing a line over a dimension you know and typing its real length. The button shows the current page's scale.
- *Length* (drag), *Area* and *Perimeter* (tap points like the polygon) show their measurement live and in the markups list. Changing a page's scale updates its measurements.
- Measurements are saved as standard PDF measurement annotations (Line, PolyLine and Polygon with a `/Measure` scale) and the page scale is saved in the page viewport, so Revu shows them as Length, Perimeter and Area measurements.
- Select a polygon or measurement and drag its corner handles to adjust it.

## Reopening where you left off

The open PDF and everything you have done to it (including markups not yet written into the PDF, the scale, numbered series, zoom and scroll position) are kept on the iPad as you work. Reloading, updating or reopening the app brings back the same file exactly as it was, and *Update* no longer warns about losing markups. Opening a different PDF makes that the one that reopens.

This is a working copy inside the app, not your file in Files: tap *Save PDF* and then *Save file* to share or save the marked-up PDF. If you wrote markups into the PDF but did not share it yet, the save bar comes back when the app reopens.

## Versions and updates

The version number is in the toolbar (for example *v1.1.0*). The app checks `version.json` on the server when it opens, when you come back to it, and every 30 minutes. When a newer version is published, the chip turns into *Update*; tap it to see what changed and reload into the new version.

To publish a new version, bump both together:

1. `APP_VERSION` in `index.html` (and the `app-version` meta tag).
2. `version` (and `notes`) in `version.json`.
3. `CACHE` in `sw.js` (so devices replace their offline copy).

## Offline

After the app has been opened once with a connection, it works with no connection: opening, marking up and saving PDFs all run on the device. The service worker (`sw.js`) keeps `index.html`, the `vendor/` libraries and the `icons/` on the iPad, and always tries the network first for the page so updates still arrive when you are online.

On iPad, add it to the Home Screen and open it from there once while online; the version popover shows *Offline: ready* when it is set up. Home Screen apps keep their own storage, separate from Safari.

## App icon

The icon source is `icons/icon.svg`. The PNGs next to it are rendered from it: `apple-touch-icon.png` (180 px, iPad/iPhone Home Screen), `icon-192.png` and `icon-512.png` (Android and install prompts), `icon-maskable-512.png` (artwork inset for launchers that crop to a circle) and `favicon-32.png` (browser tab).

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.
