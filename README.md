# Pencil Markup for Bluebeam

A single-file web app for marking up PDFs on an iPad with Apple Pencil. Markups are written as standard PDF annotations that Bluebeam Revu reads (Subject, Comments, Author, Color, fill opacity, groups), and markups made in Revu show up here.

## Host it on GitHub Pages

1. Create a repository and add `pencil-markup.html` (rename it to `index.html` if you want it at the root URL).
2. Settings, Pages, Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Open `https://<you>.github.io/<repo>/` in Safari on the iPad. Use Share, *Add to Home Screen* to run it full-screen.

The page loads three libraries from cdnjs (pdf.js 3.11.174, pdf-lib 1.17.1, pako 2.1.0), so it needs internet access the first time it opens. Everything else runs on the device; no file ever leaves it.

## Using it

- Pencil draws, a finger pans, pinch to zoom. *Finger draws* lets a finger draw too.
- Circle, Rectangle and Pen tools; the style chip sets color, fill, opacity and line width.
- Select to move or resize. *Multi-select* then *Group* makes a Revu group.
- *Tool Chest* imports `.btx` tool sets exported from Revu. Circle, rectangle and pen tools become drawable with their subject, color, fill and line width.
- *Save PDF* writes the markups into the file and offers the share sheet (or a download on a computer).

Author name, style defaults and imported tool sets are remembered in the browser on that device.

## Your own tools, palettes and favourites

- Pick a tool and style, then tap *Save as a tool…* in the style menu (or *+ Tool* in the Tool Chest). Give it a name, subject, default comment and style, and choose the palette it goes in (or make a new one).
- Tap ☆ on any tool to make it a favourite. Favourites appear as one-tap buttons in the toolbar and at the top of the Tool Chest.
- Tap ••• on a tool to edit it, move it to another palette, change what it draws, or delete it. *Use current style* copies the style you are drawing with.
- *+ Palette* makes an empty palette; each palette can be renamed, exported to a file or removed. Imported Revu tool sets can be edited the same way.
- *Back up* saves every palette, favourite and your author name and style to one file. *Import* restores it (or adds a single exported palette, or a Revu `.btx`), which is how you move your tools to another iPad.

Tools and settings are kept in the browser on that device, so back them up before clearing Safari data.

## Polygons and measurements

- *Polygon*: tap each corner, then tap the first point (or *Finish*) to close it. *Undo point* and *Cancel* are in the bar that appears while drawing; on a keyboard, Enter finishes, Backspace removes the last point and Escape cancels.
- *Scale*: set the drawing scale for the current page or all pages: pick a preset (architectural, engineering, metric), type a custom ratio, or *Calibrate* by drawing a line over a dimension you know and typing its real length. The button shows the current page's scale.
- *Length* (drag), *Area* and *Perimeter* (tap points like the polygon) show their measurement live and in the markups list. Changing a page's scale updates its measurements.
- Measurements are saved as standard PDF measurement annotations (Line, PolyLine and Polygon with a `/Measure` scale) and the page scale is saved in the page viewport, so Revu shows them as Length, Perimeter and Area measurements.
- Select a polygon or measurement and drag its corner handles to adjust it.

## Versions and updates

The version number is in the toolbar (for example *v1.1.0*). The app checks `version.json` on the server when it opens, when you come back to it, and every 30 minutes. When a newer version is published, the chip turns into *Update*; tap it to see what changed and reload into the new version.

To publish a new version, bump both together:

1. `APP_VERSION` in `index.html` (and the `app-version` meta tag).
2. `version` (and `notes`) in `version.json`.
