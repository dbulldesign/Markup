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
