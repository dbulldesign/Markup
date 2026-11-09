# Changelog

All notable changes to Pencil Markup. The version number shows in the toolbar.

## 2.0.0 (phase 1: fixes)
**Fixed**
- Moving, restyling or deleting a markup that was already in the PDF no longer leaves the original showing underneath until you save.
- Escape now closes the style menu and Tool Chest while you are typing in a field.
- Rotated sheets: symbol labels, numbers and measurement text read upright, and rectangle and oval symbols keep the width and height you set as seen on screen.
- Box selection works across several pages and can start in the gap between pages.
- Undo and redo history is kept with your work, so it survives an update or reopening the app.

## 1.9.2
**Improved**
- One compact colour picker everywhere (style menu, properties panel, tool editor): a *Line | Fill | Text* switch, each showing its current colour, over one shared row of colours. *Fill* has *None* and *Line* (same as the line); *Text* (symbols only) has *Auto*. Replaces the separate Text, Line colour and Fill colour rows and the *Fill inside* checkbox.

## 1.9.1
**Improved**
- Markups list: grouped markups collapse into one row ("Group of 4", the subjects and numbers in it, page). Tap ▸ to list the markups underneath, tap the row to select the whole group. Picking one markup inside a group on the page opens its group in the list.

## 1.9.0
**Added**
- The open PDF and all your work (including markups not yet saved into the PDF, scale, numbered series, zoom and scroll) are kept on the iPad. Updating, reloading or reopening the app brings back the last file exactly where you left off.
- If markups were written into the PDF but the file was not shared or saved yet, the save bar comes back when the app reopens.

**Improved**
- *Update* no longer warns that markups will be lost.

## 1.8.0
**Added**
- Groups: tap a grouped markup again to select just that one markup.
- *Remove from group*: takes the selected markups out and keeps the rest grouped.
- *Add to group* and *Merge groups* (the Group button changes to match the selection).

**Improved**
- In the markups list, a row inside a group selects only that markup; *Ungroup* breaks up the whole group.
- Properties title says *Number* or *Symbol* for placed symbols instead of *Ellipse*.

## 1.7.0
**Added**
- Symbol shapes: oval, rectangle and rounded rectangle, each with its own width and height.

## 1.6.1
**Fixed**
- Slider handle no longer overhangs the track and covers the value (iPad).
- Sliders in the tool editor no longer sit inside a grey box.

## 1.6.0
**Added**
- Line colour and fill colour can be set independently for every tool, in the style menu, saved tools and the properties panel.

## 1.5.1
**Added**
- Live preview at the top of the tool editor that updates as you change any setting.

## 1.5.0
**Added**
- Box selection: with Select, drag on empty space. Left to right picks markups fully inside, right to left picks everything the box touches.

## 1.4.1
**Added**
- Separate text colour for symbol labels and numbers.

**Fixed**
- Choosing a saved numbered tool no longer clears the Symbol tool's label.

## 1.4.0
**Added**
- *Symbol* tool: fixed-size symbols (circle, square, diamond, hexagon, triangle) with a label, for fixture counts. Save them as tools.
- *Numbered* tool: each tap places the next number; continue a series, start a new one (with an optional prefix) or jump to a number.
- *Counts* by subject in the markups panel.

**Fixed**
- Toolbar sliding under the status bar (blurry) when the Tool Chest was open.

## 1.3.1
**Added**
- New app icon in all sizes (Home Screen, Android, browser tab).

## 1.3.0
**Added**
- Works offline after the first visit.
- Installs as a Home Screen app with its own name and icon.

## 1.2.1
**Fixed**
- "That file could not be opened as a PDF / Setting up fake worker failed": the PDF libraries now load from the site instead of a CDN.

## 1.2.0
**Added**
- Favourite tools, shown as one-tap buttons in the toolbar.
- Your own palettes; save the current tool and style as a named tool; edit, move or delete tools.
- Export palettes, and back up or restore all tools and settings to a file.

## 1.1.0
**Added**
- Polygon tool.
- Scale per page (presets, custom ratio, or calibrate by drawing a known length), saved where Revu reads it.
- Length, Area and Perimeter measurements that Revu reads as measurements.
- Version number in the toolbar with an update check and *Update* button.

**Fixed**
- Toolbar cut off under the iPad status bar, and the grey bar at the bottom of the screen.
