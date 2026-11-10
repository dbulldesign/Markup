# Pencil Markup for iPad (native app)

This folder wraps the web app (`../index.html`) in a native iPad app using
[Capacitor 6](https://capacitorjs.com). It is the same app as the website.
The native app adds:

- **Apple Pencil double-tap**, and **squeeze** on Apple Pencil Pro. These follow
  the action set in iPad Settings > Apple Pencil: switch to the eraser and back,
  switch to the previous tool, show the colour/style menu, or show the tool ring
  where the Pencil is hovering.
- **Saving and exporting through the iPad share sheet.** You can save to Files,
  send to Revu, or mail a copy.
- **Open in Pencil Markup.** PDFs from Files, Mail or other apps open straight
  in the app.
- **No browser storage limits.** iPadOS does not clear the app's data the way
  Safari can clear a website's data.
- **Split View, Slide Over and Stage Manager.** The app works in all of them,
  in every orientation.

This folder was not built or run in the cloud session that produced it. Building
it needs a Mac with Xcode. The steps below are the standard Capacitor ones.

## What you need

- A Mac with **Xcode 15 or later** and the iOS platform installed.
- **Node.js 18 or later**.
- **CocoaPods**: run `sudo gem install cocoapods` or `brew install cocoapods`.
- An **Apple Developer account**. You need it to install the app on an iPad
  through TestFlight or the App Store. A free account can run the app on your
  own iPad for 7 days at a time.

## First build

```bash
cd ios-app
npm install
npm run setup
npm run open
```

`npm run setup` does four things:

1. Copies the web app into `www/`.
2. Creates the Xcode project in `ios/`.
3. Adds the iPad settings to `Info.plist`: multitasking, orientations, camera
   and photo permission text, and PDF "Open in".
4. Installs the plugins, including the Apple Pencil plugin in
   `plugins/pencil-interaction`.

Then, in Xcode:

1. Select the **App** target. Under **Signing & Capabilities**, pick your team.
   Change the **Bundle Identifier** from `com.example.pencilmarkup` to your
   own, for example `com.yourcompany.pencilmarkup`. Also change it in
   `capacitor.config.json`.
2. Under **General > Supported Destinations**, keep **iPad** and remove iPhone
   if it is listed.
3. Pick your iPad as the run destination and press **Run**.

### App icon

Drag `../icons/icon-1024.png` (1024 × 1024, no transparency) into **App > Assets > AppIcon**. Xcode 15 and later need only this one image.

## After changing the web app

Whenever `index.html` or the files in `vendor/` change, run:

```bash
cd ios-app
npm run sync
```

Then run the app again from Xcode. Bump the version in Xcode under
**General > Identity** before each TestFlight upload.

## Releasing

1. In Xcode, choose **Product > Archive**.
2. Choose **Distribute App > App Store Connect > Upload**.
3. In App Store Connect, add the build to **TestFlight** so you and your team
   can install it. Then submit it for review if you want it on the App Store.

For an internal-only app, use Apple Business Manager or a custom app.
TestFlight also works and keeps each build for 90 days.

## Files

| Path | What it is |
| --- | --- |
| `package.json` | Capacitor and plugin versions, plus the `setup`, `sync` and `open` commands |
| `capacitor.config.json` | App id, name and web view settings |
| `scripts/copy-web.mjs` | Copies the web app into `www/` |
| `scripts/patch-ios.mjs` | Adds the iPad keys to `ios/App/App/Info.plist`; safe to run more than once |
| `plugins/pencil-interaction/` | Swift plugin using `UIPencilInteraction`: double-tap on all supported Pencils, squeeze and hover position on Apple Pencil Pro with iPadOS 17.5+ |

## How the web app uses it

`index.html` checks for `window.Capacitor`. On the website that check finds
nothing, so the extra code does nothing there. In the app it:

- listens for `tap` and `squeeze` events from the `PencilInteraction` plugin;
- shares saved PDFs, CSV and Excel exports, and summaries with
  `@capacitor/filesystem` and `@capacitor/share`;
- opens PDFs passed to the app with `@capacitor/app` (`appUrlOpen`).

The app does not use the service worker, because the web files are inside the
app.

## Troubleshooting

- **"No ios project yet"**: run `npm run setup` before `npm run sync`.
- **Pod install fails**: run `cd ios/App && pod repo update && pod install`,
  then run `npm run sync` again.
- **Double-tap does nothing**: check iPad Settings > Apple Pencil >
  Double-tap. It must be set to an action, not Off. The 1st-generation and USB-C
  Apple Pencils have no double-tap.
- **Squeeze does nothing**: squeeze needs Apple Pencil Pro and iPadOS 17.5 or
  later.
