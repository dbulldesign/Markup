# Changelog

All notable changes to Pencil Markup. The version number shows in the toolbar.

## 3.16.0
- Search in the Tool Chest and in the toolbar's tool drop-down: type a type code (LT1, E-R1), a word from the description (sconce, track), a manufacturer, a voltage or any other field; every word must match. Palettes with no matches are hidden, folded sections open while searching, and Return picks the first match.

## 3.15.0
- Saved file names end with the date and time: "QB 360 Plans 2026-11-10 1432.pdf", and the same for exports ("... - counts 2026-11-10 1432.csv", "... - markups ... .xlsx", "... - counts by room ... .csv", "... - markup summary ... .pdf"). Saving a file that already has a stamp replaces it rather than adding another. The name can still be edited in the save bar before saving. Settings > Date and time in saved file names turns it off.

## 3.14.1
- The app opens with the Select tool (it used to start on Circle), so the first tap selects instead of drawing.

## 3.14.0 (channel schedule workbooks)
- Fixture schedule import reads a whole channel schedule workbook (.xlsx or .xlsm): the "Fixture List" tab becomes the palette and the "Channel Schedule" tab is kept with it.
  - Fixture List: "FIXT TYPE" and "QTY USED" columns are recognised; category heading rows (LT's, A's, G's, L's, T's...) colour the types by category and become a Category field; reading stops at "range stops here"; totals, costs and bookkeeping columns are left out; linear strips and track are recognised (rectangle symbols, scheduled in feet).
  - Channel Schedule: each channel's sheet, channel number, location, area, circuit, description, fixture type and quantity.
- Schedule check (Counts > Schedule check) now has three views:
  - Types: placed against QTY USED, grouped by category ("7 of 9"); green when it matches, orange when short, red when over or not placed. Linear types compare total length in feet (give those fixtures a length). Remote power supplies (-X) and types with QTY 0 are shown greyed, not as missing.
  - By sheet: for each sheet in the channel schedule (LD-101, LD-201...), finds the page showing that sheet number (page label or the number printed on the page) and compares each type's quantity on that sheet.
  - By channel: each channel's quantity against the fixtures given that channel.
- Channel on fixtures: a fixture's properties list the channels for its type ("101 - Entry Vestibule Accents - LD-201 - qty 2"); picking one sets Channel, Circuit and Location fields (shown in Revu's Comments). Works on many selected fixtures at once.

## 3.13.0 (status summary)
- Status summary in the markups list: once any markup has a status, a strip shows All, Open (no status), Accepted, Rejected, Completed and Cancelled with counts. Tap one to show only those markups (works together with the text filter); tap it again for all. Counts update as statuses change, including statuses set in Revu.
- The printable summary starts with a By status table.

## 3.12.0 (iPad feel)
- Lasso tool (after Select): draw a loop with the Pencil around fixtures in any shape; everything whose middle is inside is selected (whole groups), ready for the selection bar. With Multi-select on, the lasso adds to the selection.
- Pencil-only toggle on the floating palette (hand icon): crossed out = Pencil only, fingers scroll, zoom and select; on = fingers draw too. Same as Settings > Finger draws.
- Tool in use: a small label at the top left of the drawing shows the current tool (or Tool Chest tool) and its colour, and briefly pulses when it changes; tap it to change tools. Settings can hide it.
- Haptics: a light tap when you pick a tool, place a markup or select (in the native iPad app; iPadOS does not let websites vibrate). Settings can turn it off. Adds @capacitor/haptics to ios-app (run npm install, npm run sync).
- Zooming no longer blanks the pages: the current image stays on screen, stretched, until the sharper one is ready, then swaps in.

## 3.11.0 (copy, paste, edit many)
- Copy and paste markups: select markups or groups and tap Copy in the selection bar (Cmd+C). A paste bar appears at the bottom left of the drawing on any page and in any open file: "Paste here" puts them in the middle of what you are looking at (Cmd+V); "Paste in place" puts them at the same position, for repeated floor plans (Shift+Cmd+V). Groups stay groups, numbered fixtures continue their series, measurements take the scale of where they land, photos and custom fields come along. The copy is kept when the app closes; x clears it.
- Editing many at once: with several markups selected, the properties pop-up says "Editing N markups" and every change (subject, comments, status, layer, length and quantity, custom fields, colours, rotation) applies to all of them; values that differ show "Mixed".

## 3.10.0 (counts and schedule check)
- Counts table: tap "Counts" at the top of the markups list to open totals By type, By page (each page and the types on it) and By room (each room and the types in it, plus "Not in a room"), with total lengths. Every line has previous/next buttons that step through those fixtures on the drawings in reading order (page, top to bottom, left to right), selecting each and jumping to it ("3 of 12 - p. 4").
- Schedule check: compares every fixture type in your imported fixture schedules with what is placed: how many of each (green), types on the schedule that are not placed anywhere (red), and fixtures placed that are not on any schedule (red). Matching is by Subject and symbol label.

## 3.9.0 (safety net)
- Recovery points: while you have markups not yet saved into a PDF, the app keeps a copy of them on the iPad every 5 minutes (2, 5, 10 or off in Settings) and when you leave the app, the newest 10 per file. Settings > Safety net lists them with time and markup count; Restore brings one back (your current markups are kept as a recovery point first, and Undo also works). "Make one now" makes one by hand.
- Save reminder: after 30 minutes (15, 30, 60 or off) with markups not saved into a PDF, a bar reminds you to tap Save PDF; it goes away when you save.
- Native iPad app: also writes a marked-up copy of the PDF to Files (On My iPad > Pencil Markup > Autosave) at the same interval, so work survives even if the app's storage is cleared. (A website cannot write to Files on its own, so this is only in the native app.)
- Closing a file removes its recovery points.

## 3.8.2
- The Author field is no longer in the markups list; set it in Settings > Your name (the first save without a name shows a one-time reminder). The list gets that space.
- The markups list header fits any width: when you make the list narrow, its buttons (Select, side/bottom, Export, Close) move together onto their own row and get more compact; Close becomes an x.

## 3.8.1
- The toolbar's tool drop-down now shows your Favourites first and then every Tool Chest palette (your own palettes, imported Revu tool sets and fixture schedules), each as a section with its tools. Tap a section's title to fold it away (remembered); tap a tool to use it. Tools Revu made that cannot be drawn here are greyed out. "Manage in Tool Chest..." opens the chest for starring, editing and arranging.
- The button appears as soon as you have any palette tools, even without favourites, and shows the tool in use whichever palette it came from.

## 3.8.0 (favourites drop-down)
- Favourite tools sit in one drop-down in the toolbar instead of a button each: the button shows the favourite you are using (or a star) and how many you have; tap it for a grid of all your favourites with their names, and "Tool Chest..." to manage them. Adding tools no longer makes the toolbar longer.
- Settings > Appearance > Favourite tools in the toolbar: "One drop-down" (default) or "A row of buttons" (the old layout).
- The floating quick palette still shows up to 8 favourites as buttons.

## 3.7.2
- Fixed: the top of the app going blurry after adding a new tool (or typing in any dialog). The iPad keyboard scrolls the app up to keep the text field visible and sometimes leaves it there, with the toolbar under the status bar. The app now puts itself back whenever the keyboard closes, a dialog or menu closes, the iPad's visible area changes, the app comes back to the front, or (as a last resort) on the next tap anywhere, as long as you are not typing.

## 3.7.1 (bug pass)
- Fixed: a finger tap on the drawing did nothing (only the Pencil selected). With "Finger draws" off, a quick finger tap now selects a markup, finishes Add to group / Combine (which is why Add to group seemed not to work), follows a link, or deselects on empty paper; a finger that moves still scrolls. Tapping a selected text box again with a finger opens it for editing.
- Fixed: the selection bar (and properties pop-up) covered the toolbar's menus (style, tool chest, tool picker), so menu items under it could not be tapped. Menus are now always on top.
- List multi-select: press and hold a row to start Select mode with that row ticked (or tap Select). Tick more rows, or drag down the circles, then Group / Combine / Ungroup / Remove in the selection bar.
- Fixed: right after a long-press, the next quick tap on a row was ignored.
- Settings > Properties has a third choice again: "In the list, always open" (properties shown in the list whenever something is selected).
- Ran every test from all rounds against the current app (with real touch input for the new ones); all current features pass.

## 3.7.0
- Resizable markups list: drag the handle on its inner edge to make it wider or narrower (the drawing re-fits when Fit is on). The width is remembered; double-tap the handle for the default. At the bottom, drag its top edge as before.
- Select mode in the list (Select button in the list header): the colour dots become tick circles. Tap rows to tick or untick them (a group row ticks the whole group, a row inside an open group just that markup), or drag down the circles to tick a run of rows; the list scrolls when you drag to its top or bottom edge. With the Pencil or a mouse you can drag anywhere on the rows. Then use the selection bar: Group, Combine (several groups into one), Ungroup, or Remove (take the ticked markups out of their group). Done leaves Select mode.

## 3.6.0
- Selecting a markup on the drawing highlights its row in the markups list and scrolls the list to it (with a short flash). A markup inside a collapsed group opens the group; a whole group selected shows the group's row. Works for long lists too (more rows are shown if needed). Selected rows also get an accent bar on the left.
- Floating tool palette remembers its position: fixed for iPad drags that ended without saving. After rotating the iPad or resizing the window it keeps the same relative spot, and it always stays fully on screen.

## 3.5.2
- The selection bar is draggable: drag it by the dots at its left end (or the "N selected" text) and it stays there for the next selection. Double-tap the dots to put it back at the top centre.

## 3.5.1
- Properties pop-up is draggable: drag it by its title bar (the grab handle at the top). It reopens where you left it; double-tap the title bar to centre it again. It shrinks and scrolls when moved low on the screen.
- Group rows in the markups list read like a single markup: the label(s) in bold, the total length, then the comments (for example "A · 12'-0" · Verify mounting height with GC"), with author and date on the right.

## 3.5.0 (properties pop-up)
- Properties have their own pop-up window, separate from the markups list. Select a fixture, markup or group (on the drawing or in the list), then tap Properties in the selection bar. Tap anywhere outside it, tap Done, press Escape, or select something else to close it. Edits inside stay open as you work.
- The markups panel is now only the list (counts, filter, sort, rows), so it has the whole height.
- Tapping a row in the list selects the markup and jumps to it without opening properties. A two-finger tap on a markup opens its properties pop-up directly.
- The selection bar and the pop-up are centred over the drawing, not over the markups list.
- Settings > Properties: "Pop-up window" (new default) or "In the markups list" (the 3.1 behaviour).

## 3.4.1
- Length box redesigned for the narrow properties panel: labelled Each, Units, Qty and a large Total, with a Clear link (shown only when a length is set). Typed values are full-strength text, not the grey of the hints.
- The broken "\u00d7" labels in the Length box are gone (fixed in 3.4.0; this release makes sure iPads still on older versions update).
- Fixed: automatic updates waited forever after tapping Later on the "Markups written into the PDF" bar.

## 3.4.0 (selection bar)
- Selection bar: whenever markups are selected, a bar floats at the top of the drawing with Properties, Group (or Add to group / Combine), Combine... (one group or markup selected: then tap the other), Ungroup, Remove (from its group), Duplicate, Delete and Deselect. It shows only the buttons that apply, works with the markups list closed, and in narrow windows shows icons only.
- These buttons moved out of the properties, which are now just the markup's details.
- Keyboard: Cmd+G groups, Shift+Cmd+G ungroups (Cmd+D duplicates, Delete deletes, as before).
- Fixed: a few labels showed "\u2026" or "\u00d7" instead of "..." and "x".

## 3.3.0 (combine groups)
- Combine groups in two taps: select a group (or a single markup), tap "Combine with..." (in the one-line bar or the properties), then tap the other group or markup, on the drawing or in the markups list. They become one group, in one undo step. Cancel or Escape stops it.
- When several markups or groups are selected (box select, or multi-select), the one-line bar now has Group / Add to group / Combine groups, so grouping no longer needs the properties opened.
- Group rows in the markups list follow Multi-select, so you can pick several groups there and tap Combine groups.

## 3.2.1
- Updates install by themselves: when the app opens, or you come back to it after half a minute away, a newer version is loaded straight away if nothing is being edited (your file and markups reopen). Turn it off in Settings > Drawing > Install updates automatically. Updates also skip the browser's 10-minute page cache, so a new version arrives right away.
- Toolbar on one row with many favourites (full-width iPad): the favourites strip shrinks and scrolls sideways instead of pushing the toolbar onto a second row. On smaller or upright screens it uses a second row only when nothing else fits. The version chip shows only when an update is waiting (always in Settings > About), and in portrait Help moves to Settings > About.
- The 3.1.1 status-bar fix (no blur over the toolbar) reaches iPads that were still on 3.1.0.

## 3.2.0 (fixture lengths)
- Length on fixtures: select a symbol (pick it in the list, or tap Properties) and type its length (4', 4'-0", 1.2 with m) and an optional quantity. The total (4'-0" x 3 = 12'-0") shows in the properties, the markups list, the Counts chips (total per subject), legends, the counts and markups CSV/Excel (Length qty, Total length) and the printable summary. Several symbols can be set at once.
- Revu: the length is written into the markup's Comments as "Length: 4'-0" x 3 = 12'-0"", which Revu shows in its Comments column. It is also stored with the symbol, so it comes back as a length (not plain text) when reopened here.
- Tools: a symbol tool can carry a default "Length each" and "Qty" (tool editor), so every fixture placed with it already has its length.
- Fixture schedule import reads optional Length and Qty columns; the template now has them.
- Fixed: a long tool name no longer pushes the toolbar onto two rows.
- Corrected wording: custom fields show in Revu's Comments column (not as separate Revu columns).

## 3.1.1
- Fixed: the top toolbar looked fuzzy (most visible with favourites in the toolbar). The app was drawn underneath the iPad status bar, and newer iPadOS versions blur a band under the status bar. The app now starts below the status bar, so iPadOS has nothing of ours to blur. The status bar keeps the toolbar colour (light or dark).

## 3.1.0 (compact markups list)
- Markups list position: Settings > Markups list (Automatic, Right side, Bottom, Left side), or the new button in the list header to switch between side and bottom in one tap. Automatic keeps the old behaviour (bottom when upright, side when sideways).
- Properties stay hidden until you pick a markup in the list, so the list has the room. Tapping a markup on the drawing shows a one-line bar (subject, label, page) with a Properties button; Hide folds them away again. A two-finger tap on a markup still opens its properties. Settings > Properties > "Whenever a markup is selected" brings back the old behaviour.
- The Author box leaves the list once your name is set (change it in Settings > Your name).

## 3.0.0 (round 2, phase 7: native iPad app)
- New `ios-app/` folder: a Capacitor 6 project that wraps the app as a native iPad app, with build and release steps in ios-app/README.md. Building it needs a Mac with Xcode; it was not built in this environment.
- Apple Pencil plugin (Swift, UIPencilInteraction): double-tap and, on Apple Pencil Pro, squeeze follow the iPad's Apple Pencil setting: eraser and back, previous tool, the style menu, or the tool ring where the Pencil hovers.
- In the native app, saving and exports use the iPad share sheet, and PDFs from Files, Mail or Revu open with "Open in Pencil Markup". The Info.plist settings for Split View, Stage Manager, all orientations and camera/photo access are added by a script.
- 1024 px App Store icon (icons/icon-1024.png).
- The website is unchanged: the native code only runs inside the app.

## 2.11.0 (round 2, phase 6: compare, links, layers, signature)
- Revision compare (Pages > Compare with older revision): pick the older PDF; ink added since then shows red and removed ink blue. Pages are matched by sheet number (or pick the older page). "Cloud changes" draws red clouds around each changed area (grouped, subject Revision change); "Cloud all pages" does the whole set in one undo step.
- Hyperlinks: the Link tool drags a box and links it to a web address or a page (number or sheet label). Links are real PDF links Revu follows; ones made here stay editable (Change, Open in the properties). Tapping an existing link in a drawing with Select follows it (asks before opening a web page).
- Layers: put markups on a layer from their properties (type a name or pick one). Show markups and layers lists markup layers and the drawing's own PDF layers (for example E-LIGHTING) with on/off switches. Markup layers are saved as PDF layers (optional content), so Revu shows them in its Layers panel.
- Signature and Initials tools: draw them once with the Pencil (kept on this iPad), then tap to place; saved as ink with an optional date and name underneath, grouped.

## 2.10.0 (round 2, phase 5: schedules, rooms, photos, summary)
- Fixture schedule import (Tool Chest > Fixture schedule): a CSV or Excel (.xlsx) schedule becomes a palette with a symbol tool per fixture type. Type is the label; Shape, Color, Fill, Text Color, Size and Height set the look; every other column (Manufacturer, Catalog Number, Watts...) becomes a custom field Revu shows as a column. "Download template" gives the layout; it is also in the repo at templates/fixture-schedule-template.csv.
- Room tool: tap the corners of a room and name it (101 Office). Its properties list what is inside ("Type A ×2, Type B ×1") and its area when the page has a scale.
- Counts by room: in Counts and export, a CSV (and a By room sheet in the Excel workbook) counts each symbol type per room, with symbols outside any room listed separately. The markups CSV gets a Room column.
- Site-walk photos: select a markup and tap + Photo to take or pick photos. They are kept on the iPad and saved in the PDF as attachments on the markup (Revu shows a paperclip that opens the photo); they come back when the PDF is reopened.
- Printable summary (PDF): counts, counts by room, measurement totals, every markup with status and comments, and the site photos with their markup.

## 2.9.0 (round 2, phase 4: measurements)
- Wall area tool: tap along a wall, type its height; shows length × height = area (height editable later in the properties). Saved as a Revu perimeter measurement with the area in the label.
- Linear run tool: draw a path, choose "Every 8'" or "Count 6", with or without symbols at the ends; the current symbol is placed evenly along it and grouped with the run (one undo step).
- Type the length while drawing: the bar under a measurement shows a "Next" box; type 12'-6" (and optionally @ 90 for the direction) and press return. Length measurements also get a "Set length" box in their properties.
- Several scales on one page: in Scale, choose "An area of this page" and drag a box around a detail; measurements made inside it use that scale. Stored as Revu viewports, so Revu uses the same scales. Rename or remove them in the Scale dialog. Undo covers them.

## 2.8.0 (round 2, phase 3: languages, large sets, storage, save options)
- Text in any language: Chinese, Japanese, Korean, Cyrillic, Greek, Arabic, Hebrew, symbols such as ✓ now appear in saved PDFs (drawn with the iPad's own fonts into the markup's appearance; the text itself stays real Unicode so Revu can search and edit it).
- Large drawing sets: pages open in parallel with a progress message (300 sheets in well under a second in testing); pages and thumbnails far from view give their memory back; the markups list shows 250 rows at a time with "Show more"; undo history is capped by size so big sets don't run the iPad out of memory.
- Settings > Storage on this iPad: space used, whether Safari will keep it, size of each kept file, clear undo history, close files and remove leftovers.
- Save options: choose the file name and whether markups stay editable or are flattened into the drawing (for issuing or printing). The open document stays editable either way.

## 2.7.0 (round 2, phase 2: iPad input and layout)
- Palm rejection: while the Pencil is on or near the page, finger touches are ignored (Settings toggle).
- Two-finger tap undoes, three-finger tap redoes. Two-finger tap on a markup selects it and opens its properties.
- Portrait layout: toolbar moves to the bottom within thumb reach, menus open upward, and the markups panel becomes a bottom sheet you drag taller or shorter.
- Split View and Stage Manager: narrow windows switch to a tool picker and hide less-used buttons; Fit zoom is kept when the window resizes.
- Left-handed mode: panel on the left, quick tool ring opens away from your hand.
- Larger touch targets option in Settings (bigger buttons and easier-to-grab handles).
- Fixed: tabs bar hidden behind the markups sheet in portrait.

## 2.6.0 (round 2, phase 1: fixes)
**Fixed**
- The tool ring no longer opens while you hold the Pencil still to place polygon, area, cloud or angle points, or while erasing.
- Symbol and Numbered tools have separate shape, size, rotation and text colour settings.
- The Polygon/Area and Numbered bars sit at the bottom of the page area instead of over the top of the drawing.
- Hovering with the Numbered tool no longer starts a new series.
- Area labels go in the solid part of the area, not inside a cut-out.
- Undo and redo include scale changes.
- Revu markups: arrows keep their style (closed, open, reversed, circle, square, diamond, butt, slash) when moved; Revu clouds keep their size; text boxes and callouts made in Revu or Acrobat can now be edited.
- Status: changing a status replaces the earlier status reply instead of adding another, and deleting a markup removes its status replies.
- Legends keep their counts up to date as you add or delete symbols; *Update legend* (select the legend) rebuilds it to add new kinds.
- Counts in the panel leave out hidden markups; exports can too (*Only markups that are shown*).
- Search highlights follow the direction of the text.
- Box selection scrolls when you drag to the edge of the screen.
- Text size and bold can be changed on existing text boxes and callouts.
- Switching or closing tabs quickly no longer overlaps.
- A warning stays on screen when the iPad's storage is full, and Safari users get a one-time tip to use the Home Screen app so iPadOS does not clear their work.

**Added**
- Settings > *Save symbols as stamps*: Revu then always keeps the number or label inside a symbol (it cannot restyle them).

## 2.5.0 (phase 6: interface and Apple Pencil)
**Added**
- *Settings* page (gear button, or Ctrl/Cmd+,): theme, toolbar, Pencil and touch, drawing, measurement display, your name, toolbar tools, backup/restore, updates and help.
- Light / dark / match-the-iPad theme switch.
- Compact toolbar (on by default): one tool button that opens a picker with every tool; the toolbar fits on one row. Turn it off in Settings for the full toolbar.
- Arrange the toolbar: show or hide each tool and change the order (Settings > Toolbar tools); the tool picker follows the same order.
- Arrange the Tool Chest: tap *Arrange* to move tools within a palette, palettes up and down, and the order of favourites (which is also their order in the toolbar).
- Floating quick palette (button next to the gear): your common tools, favourites, undo and redo in a small bar you can drag anywhere.
- Apple Pencil hover (on iPads that support it): shows where a symbol or number will land, outlines the markup under the tip with Select, and shows the snap point before you touch.
- Press and hold the Pencil still for half a second for a ring of tools around the tip: slide onto a tool and lift, or lift and tap one; the middle button is Undo. Hold time and on/off in Settings.
- Help sheet (? button, or press ?): gestures, tools, shortcuts and saving.

**Note**
- Apple Pencil double-tap and squeeze are only available to native apps, not web apps, so they cannot be used.

## 2.4.0 (phase 5: navigation and organisation)
**Added**
- *Pages* (button at the top left, shows the current page, e.g. 3 / 12): thumbnails of every page with the current one highlighted; tap to jump. Type a page number or label to go to it.
- *Search* (in the same drawer, or Ctrl/Cmd+F): finds text in the drawing (room names, fixture tags, notes) and in your markups (subject, label, comments, fields, status). Tap a result to jump there; text matches are highlighted.
- Markup *Status*: None, Accepted, Rejected, Cancelled, Completed, set in the properties panel and shown in the list (sortable). Saved as standard PDF review-status replies, the format Acrobat writes and Revu reads into its Status column.
- *Show...*: hide or show markups by subject (view only; they stay in the PDF).
- Several files open at once as tabs. Each keeps its own markups, scale and undo; tap a tab to switch, x to close, + to open another. All of them reopen after an update.

## 2.3.0 (phase 4: measurements)
**Added**
- *Angle*: tap one end, the corner, then the other end.
- *Radius* and *Diameter*: press at the centre and drag to the edge.
- Cut-outs: select an area measurement and tap *Cut out*, then draw the part to subtract (several allowed; *Remove cut-outs* to undo them).
- Measurement settings in the Scale dialog: feet-and-inch rounding (1/2" to 1/16"), decimal places, area units (sf/m², square yards, acres, hectares) and angle decimals. Changing them relabels every measurement.
- *Snap* (toolbar toggle, on by default): new points snap to corners, ends and centres of markups on the page, and lines within 3° of level or plumb are straightened. An orange square shows the snap.
- Shortcuts: U angle, Q radius, D diameter.

**Note**
- Angle, radius/diameter and cut-outs are written as normal PDF markups with the value in Comments. Revu shows them, but works out areas with cut-outs on its own terms.

## 2.2.0 (phase 3: counts and symbols)
**Added**
- Rotate symbols, numbers and stamps: a Rotation setting for new ones, and Rotate buttons (90° and 15° steps) for placed ones.
- *Duplicate* (button or Ctrl/Cmd+D): copies the selection; numbered markups get the next numbers; groups stay grouped.
- *Renumber* a numbered series in order, page by page, from any starting number.
- Custom fields (for example Type, Wattage, Circuit): add them to any markup in the properties panel, or give a saved tool default fields. They are written into the Comments column as "Name: value" lines, which Revu shows and exports, and kept as fields in the app.
- *Export*: an Excel workbook (counts, counts per page, every markup) or CSV files, with custom fields as columns.
- *Legend*: places each kind of symbol with its count on the sheet, as a group you can drag. Legend symbols are not counted.

## 2.1.0 (phase 2: drawing tools)
**Added**
- *Line* and *Arrow* tools (PDF line markups with arrowheads Revu reads).
- *Text box*: drag a box (or tap) and type. Tap a selected text box again to edit it. Text wraps and the box grows to fit; drag the corners to resize.
- *Callout*: press where the arrow should point, drag to where the text goes, then type. Drag the arrow tip to move it.
- *Cloud*: revision cloud, drawn like a polygon.
- *Highlighter*: see-through freehand marker.
- *Stamps*: APPROVED, REVISE AND RESUBMIT, VERIFY IN FIELD and more, or type your own; set the stamp and its height in the style menu.
- *Eraser*: drag over pen and highlighter strokes to remove them.
- All of these can be saved as tools in the Tool Chest; Revu tool sets with lines, arrows, clouds, text boxes and callouts can now be drawn.
- Shortcuts: I line, W arrow, T text, K callout, O cloud, H highlighter, M stamp, X eraser.

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
