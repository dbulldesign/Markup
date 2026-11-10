// Adds the iPad settings the app needs to ios/App/App/Info.plist. Safe to run more than once.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const plist = join(here, '..', 'ios', 'App', 'App', 'Info.plist');
if (!existsSync(plist)) { console.error('No ios project yet: run npm run setup first.'); process.exit(1); }
let x = readFileSync(plist, 'utf8');

const entries = {
  // Split View, Slide Over and Stage Manager need the app to allow multitasking.
  UIRequiresFullScreen: '<false/>',
  UISupportedInterfaceOrientations: '<array><string>UIInterfaceOrientationPortrait</string><string>UIInterfaceOrientationLandscapeLeft</string><string>UIInterfaceOrientationLandscapeRight</string></array>',
  'UISupportedInterfaceOrientations~ipad': '<array><string>UIInterfaceOrientationPortrait</string><string>UIInterfaceOrientationPortraitUpsideDown</string><string>UIInterfaceOrientationLandscapeLeft</string><string>UIInterfaceOrientationLandscapeRight</string></array>',
  UIDeviceFamily: '<array><integer>2</integer></array>',
  // Site-walk photos.
  NSCameraUsageDescription: '<string>Take site photos and attach them to markups.</string>',
  NSPhotoLibraryUsageDescription: '<string>Attach photos from your library to markups.</string>',
  NSPhotoLibraryAddUsageDescription: '<string>Save exported images to your photo library.</string>',
  // "Open in Pencil Markup" for PDFs from Files, Mail and other apps.
  LSSupportsOpeningDocumentsInPlace: '<false/>',
  UIFileSharingEnabled: '<true/>',
  CFBundleDocumentTypes: '<array><dict><key>CFBundleTypeName</key><string>PDF</string><key>CFBundleTypeRole</key><string>Editor</string><key>LSHandlerRank</key><string>Alternate</string><key>LSItemContentTypes</key><array><string>com.adobe.pdf</string></array></dict></array>'
};

for (const [key, value] of Object.entries(entries)) {
  const re = new RegExp('<key>' + key.replace(/[~]/g, '\\$&') + '</key>\\s*(<(true|false)/>|<string>[\\s\\S]*?</string>|<array>[\\s\\S]*?</array>)');
  if (re.test(x) && key === 'CFBundleDocumentTypes') continue; // nested arrays: leave an existing entry alone
  if (re.test(x)) x = x.replace(re, '<key>' + key + '</key>\n\t' + value);
  else x = x.replace(/<\/dict>\s*<\/plist>\s*$/, '\t<key>' + key + '</key>\n\t' + value + '\n</dict>\n</plist>\n');
}
writeFileSync(plist, x);
console.log('Patched', plist);
