/* MarkupIO: reads and writes PDF markup annotations with pdf-lib.
   Writes the standard keys Bluebeam Revu and Acrobat read:
   /Subj (Subject), /Contents (Comments), /T (Author), /C (Color), /IC (Fill),
   /CA (Opacity), /M and /CreationDate (Dates), /NM (unique id),
   /RT /Group + /IRT (grouping).
   Measurements are Line / PolyLine / Polygon annotations with /IT LineDimension,
   PolyLineDimension or PolygonDimension and a /Measure dictionary; page scales go
   in the page /VP (viewport) array. */
(function (root) {
  'use strict';
  var OWNED = new Set(['Circle', 'Square', 'Ink', 'Polygon', 'PolyLine', 'Line', 'FreeText', 'Stamp']);
  var FILLABLE = new Set(['Circle', 'Square', 'Polygon', 'FreeText']);
  var SKIP = new Set(['Popup', 'Link', 'Widget', 'Screen', 'PrinterMark', 'TrapNet', 'Watermark', '3D', 'RichMedia', 'Projection']);

  function lib() { var L = root.PDFLib; if (!L) throw new Error('pdf-lib is not loaded'); return L; }
  function fmt(n) { if (!isFinite(n)) return '0'; return String(Math.round(n * 1000) / 1000); }
  function fix(v, d) { return +(+v).toFixed(d == null ? 3 : d); }

  function nameOf(o) {
    var L = lib();
    if (!(o instanceof L.PDFName)) return null;
    var s = o.asString();
    if (s.charAt(0) === '/') s = s.slice(1);
    return s.replace(/#([0-9A-Fa-f]{2})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); });
  }
  function textOf(o) {
    var L = lib();
    if (o instanceof L.PDFString || o instanceof L.PDFHexString) { try { return o.decodeText(); } catch (e) { return ''; } }
    return '';
  }
  function numOf(o, d) { var L = lib(); return o instanceof L.PDFNumber ? o.asNumber() : (d == null ? null : d); }
  function numsOf(ctx, o) {
    var L = lib(); o = ctx.lookup(o);
    if (!(o instanceof L.PDFArray)) return null;
    var out = [];
    for (var i = 0; i < o.size(); i++) { var v = ctx.lookup(o.get(i)); if (v instanceof L.PDFNumber) out.push(v.asNumber()); }
    return out;
  }
  function colorOf(ctx, o) {
    var c = numsOf(ctx, o);
    if (!c || c.length === 0) return null;
    if (c.length === 3) return c;
    if (c.length === 1) return [c[0], c[0], c[0]];
    if (c.length === 4) return [(1 - c[0]) * (1 - c[3]), (1 - c[1]) * (1 - c[3]), (1 - c[2]) * (1 - c[3])];
    return null;
  }
  function parseDate(s) {
    var m = /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([Zz+\-])?(\d{2})?'?(\d{2})?/.exec(s || '');
    if (!m) return null;
    var iso = m[1] + '-' + (m[2] || '01') + '-' + (m[3] || '01') + 'T' + (m[4] || '00') + ':' + (m[5] || '00') + ':' + (m[6] || '00');
    if (m[7] === 'Z' || m[7] === 'z') iso += 'Z';
    else if (m[7] === '+' || m[7] === '-') iso += m[7] + (m[8] || '00') + ':' + (m[9] || '00');
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  function refKey(r) { return r.objectNumber + ' ' + r.generationNumber + ' R'; }
  function sameRef(a, b) { return a && b && a.objectNumber === b.objectNumber && a.generationNumber === b.generationNumber; }
  function makeNM() {
    var h = function (n) { var s = ''; for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16).toUpperCase(); return s; };
    return h(8) + '-' + h(4) + '-' + h(4) + '-' + h(4) + '-' + h(12);
  }

  /* ---- scale / measure dictionaries ---- */
  var UNIT_ALIAS = { ft: 'ft', feet: 'ft', foot: 'ft', "'": 'ft', 'in': 'in', inch: 'in', inches: 'in', '"': 'in',
    m: 'm', meter: 'm', meters: 'm', metre: 'm', cm: 'cm', mm: 'mm', yd: 'yd', yard: 'yd', km: 'km', mi: 'mi' };
  var UNIT_CONVERT = { yd: ['ft', 3], mi: ['ft', 5280], km: ['m', 1000] };
  function readMeasure(ctx, m) {
    var L = lib(), N = function (k) { return L.PDFName.of(k); };
    try {
      m = ctx.lookup(m);
      if (!(m instanceof L.PDFDict)) return null;
      var x = ctx.lookup(m.get(N('X')));
      if (!(x instanceof L.PDFArray) || !x.size()) return null;
      var f0 = ctx.lookup(x.get(0)); if (!(f0 instanceof L.PDFDict)) return null;
      var c = numOf(ctx.lookup(f0.get(N('C'))), null); if (!c || !isFinite(c) || c <= 0) return null;
      var u = textOf(ctx.lookup(f0.get(N('U')))).trim(), u2 = '';
      if (x.size() > 1) { var f1 = ctx.lookup(x.get(1)); if (f1 instanceof L.PDFDict) u2 = textOf(ctx.lookup(f1.get(N('U')))).trim(); }
      var unit = UNIT_ALIAS[u.toLowerCase()] || null, factor = c;
      if (unit && UNIT_CONVERT[unit]) { factor = c * UNIT_CONVERT[unit][1]; unit = UNIT_CONVERT[unit][0]; }
      var fmt = unit === 'ft' && UNIT_ALIAS[u2.toLowerCase()] === 'in' ? 'ft-in' : (unit || 'other');
      return { factor: factor, unit: unit || 'other', fmt: fmt, label: unit ? '' : u, ratio: textOf(ctx.lookup(m.get(N('R')))) };
    } catch (e) { return null; }
  }
  var AREA_LABEL = { ft: 'sf', 'in': 'sq in', m: 'm\u00b2', cm: 'cm\u00b2', mm: 'mm\u00b2' };
  function measureDict(ctx, s) {
    var L = lib(), S = function (t) { return L.PDFString.of(t); };
    var nf = function (u, c, extra) { return Object.assign({ Type: 'NumberFormat', U: S(u), C: fix(c, 10), D: 100, F: 'D', RT: S(''), RD: S('.'), SS: S('') }, extra || {}); };
    var unit = s.unit === 'other' ? (s.label || 'units') : s.unit;
    var x = s.fmt === 'ft-in'
      ? [nf('ft', s.factor, { F: 'T', D: 1, O: 'S', SS: S('') }), nf('in', 12, { F: 'F', D: 8 })]
      : [nf(unit, s.factor)];
    return ctx.obj({
      Type: 'Measure', Subtype: 'RL', R: S(s.ratio || ''),
      X: x, D: [nf(unit, 1)], A: [nf(AREA_LABEL[s.unit] || ('sq ' + unit), 1)], O: [0, 0]
    });
  }
  /* Page /VP viewports: one covering (nearly) the whole page is the page scale; smaller ones are
     scale areas (a detail or enlarged plan drawn at another scale), the way Revu stores them. */
  function readViewports(doc) {
    var L = lib(), ctx = doc.context, N = function (k) { return L.PDFName.of(k); };
    return doc.getPages().map(function (page) {
      var out = { sc: null, vps: [] };
      try {
        var vp = ctx.lookup(page.node.get(N('VP')));
        if (!(vp instanceof L.PDFArray)) return out;
        var mb = page.getMediaBox(), pa = mb.width * mb.height, all = [];
        for (var i = 0; i < vp.size(); i++) {
          var d = ctx.lookup(vp.get(i)); if (!(d instanceof L.PDFDict)) continue;
          var m = readMeasure(ctx, d.get(N('Measure'))); if (!m) continue;
          var bb = numsOf(ctx, d.get(N('BBox'))), box = bb && bb.length === 4 ? [Math.min(bb[0], bb[2]), Math.min(bb[1], bb[3]), Math.max(bb[0], bb[2]), Math.max(bb[1], bb[3])] : null;
          all.push({ sc: m, bbox: box, name: textOf(ctx.lookup(d.get(N('Name')))) || '', big: !box || (box[2] - box[0]) * (box[3] - box[1]) >= pa * 0.9 });
        }
        if (all.length === 1) { out.sc = all[0].sc; return out; }
        all.forEach(function (v) { if (v.big && !out.sc) out.sc = v.sc; else if (v.bbox) out.vps.push({ bbox: v.bbox, sc: v.sc, name: v.name || 'Scale area' }); });
      } catch (e) { /* no viewport scale */ }
      return out;
    });
  }
  function readScales(doc) { return readViewports(doc).map(function (v) { return v.sc; }); }

  async function readDocument(bytes) {
    var L = lib();
    var doc = await L.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    var vw = readViewports(doc);
    return { annots: readFromDoc(doc), scales: vw.map(function (v) { return v.sc; }), vps: vw.map(function (v) { return v.vps; }) };
  }
  async function readMarkups(bytes) { return (await readDocument(bytes)).annots; }

  function readFromDoc(doc) {
    var L = lib();
    var ctx = doc.context, pages = doc.getPages(), out = [], statusReplies = [], photoReplies = [];
    var N = function (k) { return L.PDFName.of(k); };
    pages.forEach(function (page, pageIndex) {
      var arr = null; try { arr = page.node.Annots(); } catch (e) { arr = null; }
      if (!arr) return;
      for (var i = 0; i < arr.size(); i++) {
        var raw = arr.get(i), ref = raw instanceof L.PDFRef ? raw : null, dict;
        try { dict = ctx.lookup(raw); } catch (e) { continue; }
        if (!(dict instanceof L.PDFDict)) continue;
        var subtype = nameOf(dict.get(N('Subtype')));
        if (!subtype || (SKIP.has(subtype) && !(subtype === 'Link' && dict.get(N('PMLink'))))) continue;
        var flags = numOf(ctx.lookup(dict.get(N('F'))), 0);
        var irt = dict.get(N('IRT'));
        var rt = nameOf(dict.get(N('RT'))) || (irt ? 'R' : null);
        if ((flags & 2) && !(irt && rt !== 'Group')) continue; // hidden markups (status replies are hidden too; read them below)
        if (irt && rt !== 'Group') {
          // Review status replies (Acrobat/Revu): /StateModel /Review with /State on a reply to the markup.
          var smod = textOf(ctx.lookup(dict.get(N('StateModel')))) || nameOf(dict.get(N('StateModel')));
          if (subtype === 'FileAttachment' && dict.get(N('PMPhoto')) && irt instanceof L.PDFRef) {
            // Site photos attached to a markup by this app: keep the picture with the markup.
            try {
              var fs0 = ctx.lookup(dict.get(N('FS'))), ef0 = fs0 && ctx.lookup(ctx.lookup(fs0.get(N('EF'))).get(N('F')));
              var pb = ef0 instanceof L.PDFRawStream ? L.decodePDFRawStream(ef0).decode() : ef0 && ef0.getContents ? ef0.getContents() : null;
              if (pb) photoReplies.push({ parent: refKey(irt), name: textOf(ctx.lookup(fs0.get(N('UF')))) || textOf(ctx.lookup(fs0.get(N('F')))) || 'Photo.jpg', bytes: pb, at: textOf(ctx.lookup(dict.get(N('M')))) });
            } catch (e) { /* unreadable photo */ }
            continue;
          }
          if (smod === 'Review' && irt instanceof L.PDFRef) statusReplies.push({ parent: refKey(irt), state: textOf(ctx.lookup(dict.get(N('State')))) || nameOf(dict.get(N('State'))) || '', by: textOf(ctx.lookup(dict.get(N('T')))), at: parseDate(textOf(ctx.lookup(dict.get(N('M'))))) || '' });
          continue; // replies stay in the file but are not markups
        }
        var rect = numsOf(ctx, dict.get(N('Rect')));
        if (!rect || rect.length < 4) continue;
        var bs = ctx.lookup(dict.get(N('BS'))), lineWidth = 1;
        if (bs instanceof L.PDFDict) lineWidth = numOf(ctx.lookup(bs.get(N('W'))), 1);
        else { var border = numsOf(ctx, dict.get(N('Border'))); if (border && border.length >= 3) lineWidth = border[2]; }
        var opacity = numOf(ctx.lookup(dict.get(N('CA'))), 1);
        var inkList = null;
        if (subtype === 'Ink') {
          var il = ctx.lookup(dict.get(N('InkList')));
          if (il instanceof L.PDFArray) {
            inkList = [];
            for (var k = 0; k < il.size(); k++) {
              var flat = numsOf(ctx, il.get(k)); if (!flat) continue;
              var pts = []; for (var q = 0; q + 1 < flat.length; q += 2) pts.push([flat[q], flat[q + 1]]);
              if (pts.length) inkList.push(pts);
            }
          }
        }
        var intent = nameOf(dict.get(N('IT'))), vertices = null;
        if (subtype === 'Polygon' || subtype === 'PolyLine') {
          var vf = numsOf(ctx, dict.get(N('Vertices')));
          if (vf && vf.length >= 4) { vertices = []; for (var vq = 0; vq + 1 < vf.length; vq += 2) vertices.push([vf[vq], vf[vq + 1]]); }
        } else if (subtype === 'Line') {
          var lf = numsOf(ctx, dict.get(N('L')));
          if (lf && lf.length >= 4) vertices = [[lf[0], lf[1]], [lf[2], lf[3]]];
        }
        var be = ctx.lookup(dict.get(N('BE'))), cloudy = be instanceof L.PDFDict && nameOf(be.get(N('S'))) === 'C';
        var editable = OWNED.has(subtype), link = null;
        if (subtype === 'Link') {
          editable = true; link = {};
          var la = ctx.lookup(dict.get(N('A'))), dst = ctx.lookup(dict.get(N('Dest')));
          if (la instanceof L.PDFDict && nameOf(la.get(N('S'))) === 'URI') link.url = textOf(ctx.lookup(la.get(N('URI'))));
          if (la instanceof L.PDFDict && nameOf(la.get(N('S'))) === 'GoTo') dst = ctx.lookup(la.get(N('D')));
          if (dst instanceof L.PDFArray && dst.size()) { var pr0 = dst.get(0); pages.forEach(function (pg, pi) { if (pr0 instanceof L.PDFRef && sameRef(pg.ref, pr0)) link.page = pi; }); }
        }
        var layer = '', ocd = ctx.lookup(dict.get(N('OC')));
        if (ocd instanceof L.PDFDict) layer = textOf(ctx.lookup(ocd.get(N('Name')))) || '';
        if (subtype === 'Polygon' || subtype === 'PolyLine') editable = !!vertices;
        if (subtype === 'Line') editable = !!vertices && (intent === 'LineDimension' || !intent);
        var le = null, lea = ctx.lookup(dict.get(N('LE')));
        if (lea instanceof L.PDFArray) le = [nameOf(lea.get(0)) || 'None', nameOf(lea.get(1)) || 'None'];
        else if (lea instanceof L.PDFName) le = [nameOf(lea), 'None'];
        // Text boxes and callouts made by this app carry /PMText (font size, text colour) and stay editable.
        var ftBox = null, ftTip = null, ftFs = null, ftTc = null;
        var ftBold = false, ftLK = null, ftLS = null;
        if (subtype === 'FreeText') {
          var pmt = ctx.lookup(dict.get(N('PMText')));
          // Text boxes from Revu or Acrobat are editable too: size and colour come from /DA.
          var da = textOf(ctx.lookup(dict.get(N('DA')))), dm = /([\d.]+)\s+Tf/.exec(da), dc = /([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+rg/.exec(da);
          editable = true;
          if (editable) {
            var rr0 = [Math.min(rect[0], rect[2]), Math.min(rect[1], rect[3]), Math.max(rect[0], rect[2]), Math.max(rect[1], rect[3])];
            var rd = numsOf(ctx, dict.get(N('RD'))) || [0, 0, 0, 0];
            ftBox = [rr0[0] + (rd[0] || 0), rr0[1] + (rd[1] || 0), rr0[2] - (rd[2] || 0), rr0[3] - (rd[3] || 0)];
            var cl = numsOf(ctx, dict.get(N('CL'))); ftTip = cl && cl.length >= 4 ? [cl[0], cl[1]] : null;
            if (pmt instanceof L.PDFDict) {
              ftFs = numOf(ctx.lookup(pmt.get(N('FS'))), 12);
              var tcv = numsOf(ctx, pmt.get(N('TC'))); ftTc = tcv && tcv.length === 3 ? rgbHex(tcv) : null;
              var bo = ctx.lookup(pmt.get(N('Bold'))); ftBold = bo instanceof L.PDFBool ? bo.asBoolean() : false;
              ftLK = textOf(ctx.lookup(pmt.get(N('LK')))) || null; ftLS = textOf(ctx.lookup(pmt.get(N('LS')))) || null;
            } else {
              ftFs = dm ? +dm[1] : 12; ftTc = dc ? rgbHex([+dc[1], +dc[2], +dc[3]]) : null; ftBold = /Bold/i.test(da);
            }
          }
        }
        var measure = readMeasure(ctx, dict.get(N('Measure')));
        // Angle, radius/diameter and area cut-outs made by this app: /PMMeasure.
        var mkind = null, mctr = null, mrad = null, holes = null, wallH = null, runN = null, roomName = null, pmm = ctx.lookup(dict.get(N('PMMeasure')));
        if (pmm instanceof L.PDFDict) {
          mkind = nameOf(pmm.get(N('Kind')));
          wallH = numOf(ctx.lookup(pmm.get(N('H'))), null); runN = numOf(ctx.lookup(pmm.get(N('RN'))), null); roomName = textOf(ctx.lookup(pmm.get(N('Name')))) || null;
          var cc0 = numsOf(ctx, pmm.get(N('C'))); if (cc0 && cc0.length >= 2) mctr = [cc0[0], cc0[1]];
          mrad = numOf(ctx.lookup(pmm.get(N('R'))), null);
          var hs0 = ctx.lookup(pmm.get(N('Holes')));
          if (hs0 instanceof L.PDFArray) { holes = []; for (var hi = 0; hi < hs0.size(); hi++) { var hv = numsOf(ctx, hs0.get(hi)) || [], hp = []; for (var hq = 0; hq + 1 < hv.length; hq += 2) hp.push([hv[hq], hv[hq + 1]]); if (hp.length >= 3) holes.push(hp); } }
        }
        // Symbols placed by this app carry their settings in /PMSymbol so they stay editable here.
        var sym = null, fixLen = null, fixQty = null, fixFmt = null, pmd = ctx.lookup(dict.get(N('PMSymbol')));
        if (pmd instanceof L.PDFDict) { fixLen = numOf(ctx.lookup(pmd.get(N('Len'))), null); fixQty = numOf(ctx.lookup(pmd.get(N('Qty'))), null); fixFmt = textOf(ctx.lookup(pmd.get(N('LenU')))) || null; }
        if (pmd instanceof L.PDFDict && (subtype === 'Circle' || subtype === 'Square' || subtype === 'Polygon' || subtype === 'Stamp')) {
          var nn = numOf(ctx.lookup(pmd.get(N('N'))), null);
          sym = { shape: nameOf(pmd.get(N('Shape'))) || 'circle', size: numOf(ctx.lookup(pmd.get(N('Size'))), null), height: numOf(ctx.lookup(pmd.get(N('Height'))), null),
            angle: numOf(ctx.lookup(pmd.get(N('Angle'))), 0), legend: ctx.lookup(pmd.get(N('Legend'))) instanceof L.PDFBool ? ctx.lookup(pmd.get(N('Legend'))).asBoolean() : false,
            label: textOf(ctx.lookup(pmd.get(N('Label')))), n: nn,
            textColor: (function () { var tc = numsOf(ctx, pmd.get(N('TextColor'))); return tc && tc.length === 3 ? rgbHex(tc) : null; })(),
            series: nn != null ? (textOf(ctx.lookup(pmd.get(N('Series')))) || 'default') : null,
            prefix: nn != null ? textOf(ctx.lookup(pmd.get(N('Prefix')))) : '' };
          vertices = null; editable = true;
          subtype = SYM_SUB[sym.shape] || subtype; // shapes work the same here whatever they were saved as
        }
        var fillOpacity = opacity, highlight = false;
        var fo = numOf(ctx.lookup(dict.get(N('FillOpacity'))), null);
        if (fo != null) fillOpacity = fo;
        try {
          var ap = ctx.lookup(dict.get(N('AP')));
          var n = ap instanceof L.PDFDict ? ctx.lookup(ap.get(N('N'))) : null;
          var sd = n && n.dict instanceof L.PDFDict ? n.dict : (n instanceof L.PDFDict ? n : null);
          var res = sd ? ctx.lookup(sd.get(N('Resources'))) : null;
          var eg = res instanceof L.PDFDict ? ctx.lookup(res.get(N('ExtGState'))) : null;
          if (eg instanceof L.PDFDict) eg.entries().forEach(function (kv) {
            var g = ctx.lookup(kv[1]); if (!(g instanceof L.PDFDict)) return;
            if (nameOf(g.get(N('BM'))) === 'Multiply') highlight = true;
            var ca = numOf(ctx.lookup(g.get(N('ca'))), null); if (fo == null && ca != null && ca < fillOpacity) fillOpacity = ca;
          });
        } catch (e) { /* appearance details are optional */ }
        // Custom fields: /PMFields [ (name) (value) ... ]
        var fields = null, pf = ctx.lookup(dict.get(N('PMFields')));
        if (pf instanceof L.PDFArray) { fields = {}; for (var fi = 0; fi + 1 < pf.size(); fi += 2) { var fk = textOf(ctx.lookup(pf.get(fi))); if (fk) fields[fk] = textOf(ctx.lookup(pf.get(fi + 1))); } }
        var id = ref ? refKey(ref) : ('inline-' + pageIndex + '-' + i);
        out.push({
          id: id, num: ref ? ref.objectNumber : null, gen: ref ? ref.generationNumber : 0, inline: !ref,
          isNew: false, deleted: false, dirty: false, geomDirty: false, styleDirty: false,
          owned: !!ref && editable, subtype: subtype, intent: intent, pageIndex: pageIndex,
          vertices: vertices, measure: measure, lsize: null, mtext: '', lpos: null, sym: sym,
          le: le, cloud: subtype === 'Polygon' && (cloudy || intent === 'PolygonCloud'), cr: null,
          box: ftBox, tip: ftTip, fs: ftFs, textColor: ftTc, fields: fields, bold: ftBold, legendKey: ftLK, legendScope: ftLS,
          cloudI: (be instanceof L.PDFDict) ? numOf(ctx.lookup(be.get(N('I'))), 1) : null,
          mkind: mkind === 'area' ? null : mkind, ctr: mctr, rad: mrad, holes: holes, wallH: wallH, runN: runN, roomName: roomName,
          rect: [Math.min(rect[0], rect[2]), Math.min(rect[1], rect[3]), Math.max(rect[0], rect[2]), Math.max(rect[1], rect[3])],
          inkList: inkList, link: link, layer: layer, fixLen: fixLen, fixQty: fixQty, fixFmt: fixFmt,
          color: colorOf(ctx, dict.get(N('C'))), fillColor: colorOf(ctx, dict.get(N('IC'))),
          fillOpacity: fillOpacity, highlight: highlight, opacity: opacity, lineWidth: lineWidth,
          subject: textOf(ctx.lookup(dict.get(N('Subj')))), contents: textOf(ctx.lookup(dict.get(N('Contents')))),
          author: textOf(ctx.lookup(dict.get(N('T')))),
          date: parseDate(textOf(ctx.lookup(dict.get(N('M'))))) || parseDate(textOf(ctx.lookup(dict.get(N('CreationDate'))))),
          parentId: (irt instanceof L.PDFRef && rt === 'Group') ? refKey(irt) : null,
          nm: textOf(ctx.lookup(dict.get(N('NM'))))
        });
      }
    });
    // Latest review state per markup.
    statusReplies.sort(function (x, y) { return x.at < y.at ? -1 : x.at > y.at ? 1 : 0; });
    var byIdMap = {}; out.forEach(function (a) { byIdMap[a.id] = a; });
    statusReplies.forEach(function (r) { var a = byIdMap[r.parent]; if (a) { var st = String(r.state || '').toLowerCase(); a.status = st === 'none' ? '' : st; a.statusBy = r.by || ''; } });
    photoReplies.forEach(function (r) { var a = byIdMap[r.parent]; if (a) (a.photosIn = a.photosIn || []).push({ name: r.name, bytes: r.bytes }); });
    var ids = new Set(out.map(function (a) { return a.id; }));
    out.forEach(function (a) { if (a.parentId && !ids.has(a.parentId)) a.parentId = null; });
    return out;
  }

  function ellipsePath(x0, y0, x1, y1) {
    var k = 0.5523, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2, f = fmt;
    return [
      f(cx + rx) + ' ' + f(cy) + ' m',
      f(cx + rx) + ' ' + f(cy + ry * k) + ' ' + f(cx + rx * k) + ' ' + f(cy + ry) + ' ' + f(cx) + ' ' + f(cy + ry) + ' c',
      f(cx - rx * k) + ' ' + f(cy + ry) + ' ' + f(cx - rx) + ' ' + f(cy + ry * k) + ' ' + f(cx - rx) + ' ' + f(cy) + ' c',
      f(cx - rx) + ' ' + f(cy - ry * k) + ' ' + f(cx - rx * k) + ' ' + f(cy - ry) + ' ' + f(cx) + ' ' + f(cy - ry) + ' c',
      f(cx + rx * k) + ' ' + f(cy - ry) + ' ' + f(cx + rx) + ' ' + f(cy - ry * k) + ' ' + f(cx + rx) + ' ' + f(cy) + ' c',
      'h'
    ].join('\n');
  }

  // Approximate Helvetica advance widths (per 1pt of font size) for centering labels.
  function charW(ch) {
    var cc = ch.charCodeAt(0);
    if (cc >= 0x2E80 && cc <= 0xFFEF) return 1.0; // CJK, kana, hangul, full-width forms
    if (cc > 0x24F) return 0.62;                   // other scripts (Cyrillic, Greek, Arabic, Hebrew, Thai...)
    if (/[0-9]/.test(ch)) return 0.556;
    if (ch === ' ' || ch === '.' || ch === ',') return 0.278;
    if (ch === "'") return 0.191;
    if (ch === '"') return 0.355;
    if (ch === '-' || ch === '/') return 0.333;
    if (/[mw]/.test(ch)) return 0.833;
    if (/[ijlft]/.test(ch)) return 0.28;
    if (/[A-Z]/.test(ch)) return 0.667;
    return 0.53;
  }
  function textWidth(s, size) { var w = 0; for (var i = 0; i < s.length; i++) w += charW(s[i]); return w * size; }
  function pdfText(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i), ch = s[i];
      if (ch === '(' || ch === ')' || ch === '\\') out += '\\' + ch;
      else if (c < 32 || c > 255) out += '?';
      else out += ch;
    }
    return '(' + out + ')';
  }
  /* Pages with /Rotate are turned by the viewer, so text drawn in page space is turned too.
     Text (and a symbol's shape) is turned back by the page rotation so it reads upright on screen. */
  function rotOf(a) { return (((+a.rot || 0) % 360) + 360) % 360; }
  function rotv(a, dx, dy) { var t = rotOf(a) * Math.PI / 180, c = Math.round(Math.cos(t) * 1e6) / 1e6, sn = Math.round(Math.sin(t) * 1e6) / 1e6; return [dx * c - dy * sn, dx * sn + dy * c]; }
  function sideways(a) { var r = rotOf(a); return r === 90 || r === 270; }
  // Content-stream text centred on (cx, cy), turned with the page rotation.
  function degRot(deg, dx, dy) { var t = deg * Math.PI / 180, c = Math.round(Math.cos(t) * 1e6) / 1e6, sn = Math.round(Math.sin(t) * 1e6) / 1e6; return [dx * c - dy * sn, dx * sn + dy * c]; }
  /* Text Helvetica (WinAnsi) cannot show - Chinese, Japanese, Korean, Arabic, Cyrillic, Greek...
     is drawn by the device's own fonts into a sharp image placed in the appearance. The markup's
     text itself stays Unicode, so Revu shows, searches and edits the real characters. */
  var apImgs = null, apCtx = null;
  function needsUnicode(s) { return /[^\x00-\xff]/.test(String(s || '')); }
  function textImage(text, size, colr, bold) {
    var S = Math.max(1, Math.min(8, 64 / size, 8000 / Math.max(1, String(text).length * size))), px = size * S, font = (bold ? '700 ' : '400 ') + px + 'px -apple-system, "Helvetica Neue", "PingFang SC", "Hiragino Sans", "Apple SD Gothic Neo", "Noto Sans", "Noto Sans CJK SC", Arial, sans-serif';
    var cv = document.createElement('canvas'), g = cv.getContext('2d'); g.font = font;
    var w = Math.max(1, Math.ceil(g.measureText(text).width + px * 0.1)), h = Math.ceil(px * 1.3);
    cv.width = w; cv.height = h; g.font = font; g.textBaseline = 'alphabetic'; g.fillStyle = '#000'; g.fillText(text, px * 0.05, px * 1.0);
    var d = g.getImageData(0, 0, w, h).data, n = w * h, rgb = new Uint8Array(n * 3), al = new Uint8Array(n);
    var cc = String(colr).split(/\s+/).map(function (v) { return Math.round(Math.max(0, Math.min(1, +v || 0)) * 255); });
    for (var i = 0; i < n; i++) { rgb[i * 3] = cc[0]; rgb[i * 3 + 1] = cc[1]; rgb[i * 3 + 2] = cc[2]; al[i] = d[i * 4 + 3]; }
    var mask = apCtx.register(apCtx.flateStream(al, { Type: 'XObject', Subtype: 'Image', Width: w, Height: h, ColorSpace: 'DeviceGray', BitsPerComponent: 8 }));
    var img = apCtx.register(apCtx.flateStream(rgb, { Type: 'XObject', Subtype: 'Image', Width: w, Height: h, ColorSpace: 'DeviceRGB', BitsPerComponent: 8, SMask: mask }));
    var name = 'TxI' + (Object.keys(apImgs).length + 1); apImgs[name] = img;
    return { name: name, w: w / S, h: h / S, base: px * 1.0 / S, lead: px * 0.05 / S };
  }
  function textOps(a, font, size, colr, cx, cy, tw, baseOff, text, deg) {
    var g = deg != null ? deg : rotOf(a), t = g * Math.PI / 180, c = Math.round(Math.cos(t) * 1e6) / 1e6, sn = Math.round(Math.sin(t) * 1e6) / 1e6;
    if (needsUnicode(text) && apImgs && typeof document !== 'undefined') {
      var im = textImage(text, size, colr, /B$/.test(font));
      // image bottom-left in the text's own frame: centred, baseline at -baseOff
      var x0 = -tw / 2 - im.lead + (tw - (im.w - 2 * im.lead)) / 2, y0 = -baseOff - (im.h - im.base);
      return 'q\n' + [c, sn, -sn, c, cx, cy].map(fmt).join(' ') + ' cm\n' + [im.w, 0, 0, im.h, x0, y0].map(fmt).join(' ') + ' cm\n/' + im.name + ' Do\nQ';
    }
    var o = degRot(g, -tw / 2, -baseOff);
    return 'q\nBT\n/' + font + ' ' + fmt(size) + ' Tf\n' + colr + ' rg\n' + [c, sn, -sn, c, cx + o[0], cy + o[1]].map(fmt).join(' ') + ' Tm\n' + pdfText(text) + ' Tj\nET\nQ';
  }
  function labelBox(a) {
    var size = a.lsize || 10, tw = textWidth(a.mtext, size), w = tw + size * 0.7, h = size * 1.4;
    if (sideways(a)) { var tmp = w; w = h; h = tmp; }
    return { x: a.lpos[0] - w / 2, y: a.lpos[1] - h / 2, w: w, h: h, tw: tw, size: size };
  }
  function vertexPath(v, closed) {
    return v.map(function (p, i) { return fmt(p[0]) + ' ' + fmt(p[1]) + (i ? ' l' : ' m'); }).join('\n') + (closed ? '\nh' : '');
  }

  /* ---- fixed-size symbols (fixture counts, numbered series) ---- */
  var SYM_SUB = { circle: 'Circle', oval: 'Circle', square: 'Square', rect: 'Square', roundrect: 'Polygon', diamond: 'Polygon', triangle: 'Polygon', hexagon: 'Polygon', stamp: 'Stamp' };
  // Shapes with their own height (the others are as tall as they are wide).
  var SYM_WIDE = { oval: 1, rect: 1, roundrect: 1, stamp: 1 };
  // A stamp is as wide as its text needs at the chosen height.
  function stampDims(text, h) { return [textWidth(String(text || ''), h * 0.58) / 0.82 + h * 0.5, h]; }

  /* ---- arrows, clouds, text boxes ---- */
  // A small arc at the corner of an angle measurement.
  function angleArc(a) {
    var v = a.vertices, c = v[1], r = (a.lsize || 10) * 1.3, t0 = Math.atan2(v[0][1] - c[1], v[0][0] - c[0]), t1 = Math.atan2(v[2][1] - c[1], v[2][0] - c[0]);
    var d = t1 - t0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    var pts = []; for (var i = 0; i <= 16; i++) { var t = t0 + d * i / 16; pts.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]); }
    return pts;
  }
  function arrowSize(a) { return Math.max(((+a.lineWidth) || 1) * 4, 7); }
  // An open arrowhead at tip, pointing away from 'from': [wing, tip, wing].
  function arrowHead(tip, from, size) {
    var dx = tip[0] - from[0], dy = tip[1] - from[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, w = size * 0.5;
    var bx = tip[0] - ux * size, by = tip[1] - uy * size;
    return [[bx - uy * w, by + ux * w], tip, [bx + uy * w, by - ux * w]];
  }
  // Line endings by PDF name. Returns { pts, closed, filled } around tip, pointing away from 'from'.
  function endShape(name, tip, from, size) {
    if (!name || name === 'None') return null;
    var dx = tip[0] - from[0], dy = tip[1] - from[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux, w = size * 0.5;
    var P = function (a, b) { return [tip[0] + ux * a + nx * b, tip[1] + uy * a + ny * b]; };
    switch (name) {
      case 'ClosedArrow': return { pts: [P(-size, w), tip, P(-size, -w)], closed: true, filled: true };
      case 'ROpenArrow': return { pts: [P(size, w), tip, P(size, -w)], closed: false };
      case 'RClosedArrow': return { pts: [P(size, w), tip, P(size, -w)], closed: true, filled: true };
      case 'Butt': return { pts: [P(0, w), P(0, -w)], closed: false };
      case 'Slash': return { pts: [P(-w * 0.6, -w), P(w * 0.6, w)], closed: false };
      case 'Square': return { pts: [P(-w * 0.7, -w * 0.7), P(w * 0.7, -w * 0.7), P(w * 0.7, w * 0.7), P(-w * 0.7, w * 0.7)], closed: true };
      case 'Diamond': return { pts: [P(-w, 0), P(0, -w), P(w, 0), P(0, w)], closed: true };
      case 'Circle': { var c = []; for (var i = 0; i < 16; i++) { var t = i / 16 * Math.PI * 2; c.push(P(Math.cos(t) * w * 0.75, Math.sin(t) * w * 0.75)); } return { pts: c, closed: true }; }
      default: return { pts: [P(-size, w), tip, P(-size, -w)], closed: false }; // OpenArrow and anything unknown
    }
  }
  // Revision cloud: scallops (two cubic curves each) bulging outwards along every edge.
  function cloudCurves(v, r) {
    var n = v.length, area = 0, out = [];
    for (var i = 0; i < n; i++) { var j = (i + 1) % n; area += v[i][0] * v[j][1] - v[j][0] * v[i][1]; }
    var ccw = area > 0;
    for (var e = 0; e < n; e++) {
      var A = v[e], B = v[(e + 1) % n], len = Math.hypot(B[0] - A[0], B[1] - A[1]); if (len < 0.01) continue;
      var segs = Math.max(1, Math.round(len / (2 * r)));
      for (var k = 0; k < segs; k++) {
        var a0 = [A[0] + (B[0] - A[0]) * k / segs, A[1] + (B[1] - A[1]) * k / segs], b0 = [A[0] + (B[0] - A[0]) * (k + 1) / segs, A[1] + (B[1] - A[1]) * (k + 1) / segs];
        var dl = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]), d = [(b0[0] - a0[0]) / dl, (b0[1] - a0[1]) / dl], nr = ccw ? [d[1], -d[0]] : [-d[1], d[0]];
        var rho = dl / 2, K = 0.5523 * rho, top = [(a0[0] + b0[0]) / 2 + nr[0] * rho, (a0[1] + b0[1]) / 2 + nr[1] * rho];
        out.push([a0, [a0[0] + nr[0] * K, a0[1] + nr[1] * K], [top[0] - d[0] * K, top[1] - d[1] * K], top]);
        out.push([top, [top[0] + d[0] * K, top[1] + d[1] * K], [b0[0] + nr[0] * K, b0[1] + nr[1] * K], b0]);
      }
    }
    return out;
  }
  function cloudPdfPath(c) {
    if (!c.length) return '';
    return fmt(c[0][0][0]) + ' ' + fmt(c[0][0][1]) + ' m\n' + c.map(function (q) { return [q[1], q[2], q[3]].map(function (pt) { return fmt(pt[0]) + ' ' + fmt(pt[1]); }).join(' ') + ' c'; }).join('\n') + '\nh';
  }
  // Word-wrap text to a width (Helvetica metrics); returns the lines.
  function wrapText(text, maxW, size) {
    var out = [];
    String(text || '').split(/\r?\n/).forEach(function (para) {
      var words = para.split(/(\s+)/), line = '';
      words.forEach(function (w) {
        if (!w) return;
        var tryL = line + w;
        if (textWidth(tryL.replace(/\s+$/, ''), size) <= maxW || !line.trim()) {
          if (textWidth(tryL, size) > maxW && !line.trim() && !/^\s+$/.test(w)) {
            // one long word: break it by characters
            var chunk = '';
            for (var i = 0; i < w.length; i++) { if (textWidth(chunk + w[i], size) > maxW && chunk) { out.push(chunk); chunk = ''; } chunk += w[i]; }
            line = chunk;
          } else line = tryL;
        } else { out.push(line.replace(/\s+$/, '')); line = /^\s+$/.test(w) ? '' : w; }
      });
      out.push(line.replace(/\s+$/, ''));
    });
    return out;
  }
  // Text box layout as seen on screen (W x H, top-left origin, v downwards).
  function ftLayout(a) {
    var size = +a.fs || 12, pad = Math.max(3, size * 0.35), b = a.box, sw = sideways(a);
    var W = sw ? b[3] - b[1] : b[2] - b[0], H = sw ? b[2] - b[0] : b[3] - b[1];
    return { size: size, pad: pad, W: W, H: H, lines: wrapText(a.contents || '', Math.max(size, W - 2 * pad), size) };
  }
  function ftVisToPdf(a, L0, u, v) { var b = a.box, c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], r = rotv(a, u - L0.W / 2, L0.H / 2 - v); return [c[0] + r[0], c[1] + r[1]]; }
  // Where a callout's leader meets the box: the middle of the side nearest the tip.
  function ftAttach(a) {
    var b = a.box, t = a.tip, cs = [[(b[0] + b[2]) / 2, b[1]], [(b[0] + b[2]) / 2, b[3]], [b[0], (b[1] + b[3]) / 2], [b[2], (b[1] + b[3]) / 2]], best = cs[0], bd = Infinity;
    cs.forEach(function (q) { var d = Math.hypot(q[0] - t[0], q[1] - t[1]); if (d < bd) { bd = d; best = q; } });
    return best;
  }
  function ftBounds(a) {
    var b = a.box, pad = (+a.lineWidth || 1) / 2 + 1, r = [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad];
    if (a.tip) { var s = arrowSize(a); r = [Math.min(r[0], a.tip[0] - s), Math.min(r[1], a.tip[1] - s), Math.max(r[2], a.tip[0] + s), Math.max(r[3], a.tip[1] + s)]; }
    return r;
  }
  function symKind(shape) { return shape === 'circle' || shape === 'oval' ? 'ellipse' : shape === 'square' || shape === 'rect' ? 'box' : 'poly'; }
  function symDims(sym) { var w = +sym.size || 18; return SYM_WIDE[sym.shape] ? [w, +sym.height || Math.round(w * 0.6)] : [w, w]; }
  function roundRectPts(x0, y0, x1, y1, r) {
    var pts = [], n = 6, cs = [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]];
    cs.forEach(function (c) { for (var i = 0; i <= n; i++) { var t = (c[2] + 90 * i / n) * Math.PI / 180; pts.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]); } });
    return pts;
  }
  var SYM_UNIT = {
    diamond: [[0, 0.5], [0.5, 0], [0, -0.5], [-0.5, 0]],
    triangle: [[0, 0.5], [0.5, -0.45], [-0.5, -0.45]],
    hexagon: [0, 1, 2, 3, 4, 5].map(function (i) { var t = Math.PI / 3 * i; return [0.5 * Math.cos(t), 0.5 * Math.sin(t)]; })
  };
  function symCenter(a) { return [(a.rect[0] + a.rect[2]) / 2, (a.rect[1] + a.rect[3]) / 2]; }
  // A symbol's turn on the page: the page rotation plus its own rotation (degrees, anticlockwise).
  function symAng(a) { return (((rotOf(a) + (+(a.sym && a.sym.angle) || 0)) % 360) + 360) % 360; }
  // Circles, ovals, squares and rectangles at a right angle can be drawn as themselves; anything else as a polygon.
  function symNative(a) { return symKind(a.sym.shape) !== 'poly' && symAng(a) % 90 === 0; }
  // Outline points: built at the symbol's size around its centre, then turned.
  function symPoints(a, inset) {
    var c = symCenter(a), d = symDims(a.sym), i0 = inset || 0, w = Math.max(1, d[0] - 2 * i0), h = Math.max(1, d[1] - 2 * i0), sh = a.sym.shape, k = symKind(sh), local;
    if (sh === 'roundrect' || sh === 'stamp') local = roundRectPts(-w / 2, -h / 2, w / 2, h / 2, Math.min(w, h) * (sh === 'stamp' ? 0.18 : 0.3));
    else if (k === 'ellipse') { local = []; for (var e = 0; e < 40; e++) { var t = e / 40 * Math.PI * 2; local.push([w / 2 * Math.cos(t), h / 2 * Math.sin(t)]); } }
    else if (k === 'box') local = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    else local = (SYM_UNIT[sh] || SYM_UNIT.diamond).map(function (q) { return [q[0] * w, q[1] * w]; });
    var g = symAng(a);
    return local.map(function (q) { var r = degRot(g, q[0], q[1]); return [c[0] + r[0], c[1] + r[1]]; });
  }
  // The bounding box of a symbol centred on pt.
  function symBBox(a, pt) {
    var keep = a.rect; a.rect = [pt[0], pt[1], pt[0], pt[1]];
    var pts = symPoints(a, 0), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    a.rect = keep;
    pts.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    return [x0, y0, x1, y1];
  }
  function symLabel(a) { if (!a.sym) return ''; return a.sym.n != null ? (a.sym.prefix || '') + a.sym.n : (a.sym.label || ''); }
  function symText(a) {
    var dd = symDims(a.sym), s = dd[0], hgt = dd[1], tri = a.sym.shape === 'triangle', label = symLabel(a);
    var wide = !!SYM_WIDE[a.sym.shape], m = Math.min(s, hgt);
    var size = m * (tri ? 0.36 : wide ? 0.58 : 0.5), maxW = s * (tri ? 0.46 : a.sym.shape === 'diamond' ? 0.56 : a.sym.shape === 'oval' ? 0.7 : wide ? 0.82 : 0.74);
    var w = textWidth(label, size); if (w > maxW) size *= maxW / w;
    var c = symCenter(a), g = symAng(a), off = degRot(g, 0, tri ? -0.16 * s : 0);
    return { text: label, size: size, x: c[0] + off[0], y: c[1] + off[1], w: textWidth(label, size), ang: g };
  }
  function hexRgb(h) { var m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; var n = parseInt(m[1], 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
  function rgbHex(c) { return '#' + c.map(function (v) { var x = Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16); return x.length < 2 ? '0' + x : x; }).join('').toUpperCase(); }
  // Text colour: the symbol's own text colour if set, otherwise automatic (white on a strong fill, else the line colour).
  function symTextColor(a) {
    var own = a.sym && hexRgb(a.sym.textColor); if (own) return own;
    return a.fillColor && a.fillOpacity >= 0.6 ? [1, 1, 1] : (a.color || [0, 0, 0]);
  }

  function buildAppearance(ctx, a) {
    var x0 = a.rect[0], y0 = a.rect[1], x1 = a.rect[2], y1 = a.rect[3];
    var lw = Math.max(0, +a.lineWidth || 0), f = fmt;
    var col = function (c) { return c.map(f).join(' '); };
    var gs = { GSs: { Type: 'ExtGState', CA: fix(a.opacity, 3), ca: fix(a.opacity, 3) } };
    var parts = [], fonts = null;
    apImgs = {}; apCtx = ctx;
    if (a.sym) {
      var hs = lw / 2, spath;
      if (!symNative(a)) spath = vertexPath(symPoints(a, hs), true);
      else if (symKind(a.sym.shape) === 'ellipse') spath = ellipsePath(x0 + hs, y0 + hs, Math.max(x1 - hs, x0 + hs + 0.01), Math.max(y1 - hs, y0 + hs + 0.01));
      else if (symKind(a.sym.shape) === 'box') spath = f(x0 + hs) + ' ' + f(y0 + hs) + ' ' + f(Math.max(0.01, x1 - x0 - lw)) + ' ' + f(Math.max(0.01, y1 - y0 - lw)) + ' re';
      else spath = vertexPath(symPoints(a, hs), true);
      if (a.fillColor) {
        gs.GSf = { Type: 'ExtGState', CA: fix(a.fillOpacity, 3), ca: fix(a.fillOpacity, 3), BM: a.highlight ? 'Multiply' : 'Normal' };
        parts.push('q\n/GSf gs\n' + col(a.fillColor) + ' rg\n' + spath + '\nf\nQ');
      }
      if (a.color && lw > 0) parts.push('q\n/GSs gs\n' + col(a.color) + ' RG\n' + f(lw) + ' w\n1 j\n' + spath + '\nS\nQ');
      var st = symText(a);
      if (st.text) {
        fonts = { HelvB: { Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica-Bold', Encoding: 'WinAnsiEncoding' } };
        parts.push(textOps(a, 'HelvB', st.size, col(symTextColor(a)), st.x, st.y, st.w, st.size * 0.36, st.text, st.ang));
      }
    } else if (a.subtype === 'Circle' && a.mkind && a.ctr && a.rad) {
      var cx0 = a.ctr[0], cy0 = a.ctr[1], rr = a.rad, cpath = ellipsePath(cx0 - rr, cy0 - rr, cx0 + rr, cy0 + rr);
      if (a.fillColor) { gs.GSf = { Type: 'ExtGState', CA: fix(a.fillOpacity, 3), ca: fix(a.fillOpacity, 3), BM: a.highlight ? 'Multiply' : 'Normal' }; parts.push('q\n/GSf gs\n' + col(a.fillColor) + ' rg\n' + cpath + '\nf\nQ'); }
      var rline = a.mkind === 'diameter' ? f(cx0 - rr) + ' ' + f(cy0) + ' m\n' + f(cx0 + rr) + ' ' + f(cy0) + ' l' : f(cx0) + ' ' + f(cy0) + ' m\n' + f(cx0 + rr) + ' ' + f(cy0) + ' l';
      if (a.color) parts.push('q\n/GSs gs\n' + col(a.color) + ' RG\n' + f(lw || 1) + ' w\n1 J\n' + cpath + '\n' + rline + '\nS\nQ');
      if (a.mtext && a.lpos) {
        var lb = labelBox(a); gs.GSl = { Type: 'ExtGState', CA: 1, ca: 0.85 };
        fonts = { Helv: { Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica', Encoding: 'WinAnsiEncoding' } };
        parts.push('q\n/GSl gs\n1 1 1 rg\n' + f(lb.x) + ' ' + f(lb.y) + ' ' + f(lb.w) + ' ' + f(lb.h) + ' re\nf\nQ');
        parts.push(textOps(a, 'Helv', lb.size, col(a.color || [0, 0, 0]), a.lpos[0], a.lpos[1], lb.tw, lb.size * 0.35, a.mtext));
      }
    } else if (a.subtype === 'Circle' || a.subtype === 'Square') {
      var h = lw / 2, ix0 = x0 + h, iy0 = y0 + h, ix1 = Math.max(x1 - h, ix0 + 0.01), iy1 = Math.max(y1 - h, iy0 + 0.01);
      var path = a.subtype === 'Circle' ? ellipsePath(ix0, iy0, ix1, iy1)
        : f(ix0) + ' ' + f(iy0) + ' ' + f(ix1 - ix0) + ' ' + f(iy1 - iy0) + ' re';
      if (a.fillColor) {
        gs.GSf = { Type: 'ExtGState', CA: fix(a.fillOpacity, 3), ca: fix(a.fillOpacity, 3), BM: a.highlight ? 'Multiply' : 'Normal' };
        parts.push('q\n/GSf gs\n' + col(a.fillColor) + ' rg\n' + path + '\nf\nQ');
      }
      if (a.color && lw > 0) parts.push('q\n/GSs gs\n' + col(a.color) + ' RG\n' + f(lw) + ' w\n' + path + '\nS\nQ');
    } else if (a.subtype === 'Ink') {
      var d = (a.inkList || []).map(function (pts) {
        return pts.map(function (p, i) { return f(p[0]) + ' ' + f(p[1]) + (i ? ' l' : ' m'); }).join('\n');
      }).join('\n');
      if (a.highlight) gs.GSs.BM = 'Multiply'; // highlighter: the drawing shows through
      parts.push('q\n/GSs gs\n' + col(a.color || [0, 0, 0]) + ' RG\n' + f(lw || 1) + ' w\n1 J\n1 j\n' + d + '\nS\nQ');
    } else if (a.subtype === 'FreeText' && a.box) {
      var L0 = ftLayout(a), bb = a.box, bpath = f(bb[0]) + ' ' + f(bb[1]) + ' ' + f(bb[2] - bb[0]) + ' ' + f(bb[3] - bb[1]) + ' re';
      if (a.fillColor) { gs.GSf = { Type: 'ExtGState', CA: fix(a.fillOpacity, 3), ca: fix(a.fillOpacity, 3), BM: a.highlight ? 'Multiply' : 'Normal' }; parts.push('q\n/GSf gs\n' + col(a.fillColor) + ' rg\n' + bpath + '\nf\nQ'); }
      var lead = '';
      var tipFill = '';
      if (a.tip) {
        var at = ftAttach(a), es = endShape((a.le && a.le[0]) || 'OpenArrow', a.tip, at, arrowSize(a));
        lead = '\n' + f(at[0]) + ' ' + f(at[1]) + ' m\n' + f(a.tip[0]) + ' ' + f(a.tip[1]) + ' l';
        if (es) { if (es.filled) tipFill = vertexPath(es.pts, true); else lead += '\n' + vertexPath(es.pts, es.closed); }
      }
      if (a.color && (lw > 0 || a.tip)) parts.push('q\n/GSs gs\n' + col(a.color) + ' RG\n' + f(lw || 1) + ' w\n1 J\n1 j\n' + (lw > 0 ? bpath : '') + lead + '\nS\nQ');
      if (tipFill && a.color) parts.push('q\n/GSs gs\n' + col(a.color) + ' rg\n' + col(a.color) + ' RG\n' + tipFill + '\nb\nQ');
      fonts = { Helv: { Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica', Encoding: 'WinAnsiEncoding' }, HelvB: { Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica-Bold', Encoding: 'WinAnsiEncoding' } };
      var tcol = col(hexRgb(a.textColor) || a.color || [0, 0, 0]);
      L0.lines.forEach(function (ln, i) {
        if (!ln) return;
        var tw = textWidth(ln, L0.size), c0 = ftVisToPdf(a, L0, L0.pad + tw / 2, L0.pad + L0.size * 0.95 + i * L0.size * 1.2);
        parts.push(textOps(a, a.bold ? 'HelvB' : 'Helv', L0.size, tcol, c0[0], c0[1], tw, 0, ln));
      });
    } else if (a.vertices && a.vertices.length >= 2) {
      var closed = a.subtype === 'Polygon', vp = a.cloud && closed && a.vertices.length >= 3 ? cloudPdfPath(cloudCurves(a.vertices, a.cr || 8)) : vertexPath(a.vertices, closed);
      // Cut-outs are extra rings inside the area; even-odd filling leaves them empty.
      if (closed && a.holes && a.holes.length) vp += '\n' + a.holes.map(function (hh) { return vertexPath(hh, true); }).join('\n');
      if (a.mkind === 'angle' && a.vertices.length === 3) vp += '\n' + vertexPath(angleArc(a), false);
      if (closed && a.fillColor) {
        gs.GSf = { Type: 'ExtGState', CA: fix(a.fillOpacity, 3), ca: fix(a.fillOpacity, 3), BM: a.highlight ? 'Multiply' : 'Normal' };
        parts.push('q\n/GSf gs\n' + col(a.fillColor) + ' rg\n' + vp + '\n' + (a.holes && a.holes.length ? 'f*' : 'f') + '\nQ');
      }
      var strokeW = lw || (a.color ? 1 : 0);
      if (a.color && strokeW > 0) {
        var ticks = '', fills = [];
        if (a.subtype === 'Line' && a.le) {
          [[1, 0], [0, 1]].forEach(function (ij, e) {
            var es = endShape(a.le[e], a.vertices[ij[1]], a.vertices[ij[0]], arrowSize(a)); if (!es) return;
            if (es.filled) fills.push(vertexPath(es.pts, true)); else ticks += '\n' + vertexPath(es.pts, es.closed);
          });
        }
        if (a.subtype === 'Line' && a.intent === 'LineDimension') {
          var p0 = a.vertices[0], p1 = a.vertices[1], dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy) || 1;
          var t = Math.max(strokeW * 3, (a.lsize || 10) * 0.45), nx = -dy / len * t, ny = dx / len * t;
          [p0, p1].forEach(function (q) { ticks += '\n' + f(q[0] - nx) + ' ' + f(q[1] - ny) + ' m\n' + f(q[0] + nx) + ' ' + f(q[1] + ny) + ' l'; });
        }
        parts.push('q\n/GSs gs\n' + col(a.color) + ' RG\n' + f(strokeW) + ' w\n1 J\n1 j\n' + vp + ticks + '\nS\nQ');
        if (fills.length) parts.push('q\n/GSs gs\n' + col(a.color) + ' rg\n' + col(a.color) + ' RG\n' + f(strokeW) + ' w\n' + fills.join('\n') + '\nb\nQ');
      }
      if (a.mtext && a.lpos) {
        var b = labelBox(a);
        gs.GSl = { Type: 'ExtGState', CA: 1, ca: 0.85 };
        fonts = { Helv: { Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica', Encoding: 'WinAnsiEncoding' } };
        parts.push('q\n/GSl gs\n1 1 1 rg\n' + f(b.x) + ' ' + f(b.y) + ' ' + f(b.w) + ' ' + f(b.h) + ' re\nf\nQ');
        parts.push(textOps(a, 'Helv', b.size, col(a.color || [0, 0, 0]), a.lpos[0], a.lpos[1], b.tw, b.size * 0.35, a.mtext));
      }
    }
    var resources = { ExtGState: gs };
    if (fonts) resources.Font = fonts;
    if (Object.keys(apImgs).length) resources.XObject = apImgs;
    apImgs = null;
    var stream = ctx.stream(parts.join('\n'), {
      Type: 'XObject', Subtype: 'Form', FormType: 1,
      BBox: [fix(x0), fix(y0), fix(x1), fix(y1)], Matrix: [1, 0, 0, 1, 0, 0],
      Resources: resources
    });
    return ctx.register(stream);
  }

  function findIndex(arr, ref) {
    var L = lib();
    for (var i = 0; i < arr.size(); i++) { var el = arr.get(i); if (el instanceof L.PDFRef && sameRef(el, ref)) return i; }
    return -1;
  }

  function isStatusReply(d) { var sm = d.get(lib().PDFName.of('StateModel')); return textOf(sm) === 'Review' || nameOf(sm) === 'Review'; }
  async function applyMarkups(bytes, annots, opts) {
    opts = opts || {};
    var L = lib(), author = opts.author || '';
    var N = function (k) { return L.PDFName.of(k); };
    var doc = await L.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    var ctx = doc.context, pages = doc.getPages(), now = new Date();
    var refOf = new Map();
    var setText = function (dict, key, text) { dict.set(N(key), L.PDFHexString.fromText(text == null ? '' : String(text))); };
    var colorArr = function (c) { return ctx.obj(c ? c.map(function (v) { return fix(v, 4); }) : []); };
    var flat = function (v) { return ctx.obj(v.reduce(function (acc, p) { acc.push(fix(p[0]), fix(p[1])); return acc; }, [])); };
    // Comments column: measurement or symbol label, then custom fields as "Name: value" lines, then the comment.
    var contentsOut = function (a) {
      var lines = [], head = a.mtext || symLabel(a);
      if (head) lines.push(head);
      if (a.sym && a.fixText) lines.push(a.fixText);
      if (a.fields) Object.keys(a.fields).forEach(function (k) { if (a.fields[k] !== '' && a.fields[k] != null) lines.push(k + ': ' + a.fields[k]); });
      if (a.contents) lines.push(a.contents);
      return lines.join('\n');
    };
    var setFields = function (dict, a) {
      var keys = a.fields ? Object.keys(a.fields) : [];
      if (!keys.length) { dict.delete(N('PMFields')); return; }
      var arr = []; keys.forEach(function (k) { arr.push(L.PDFHexString.fromText(k), L.PDFHexString.fromText(String(a.fields[k] == null ? '' : a.fields[k]))); });
      dict.set(N('PMFields'), ctx.obj(arr));
    };
    var setMeasureExtra = function (dict, a) {
      if (!a.mkind && !(a.holes && a.holes.length)) { dict.delete(N('PMMeasure')); return; }
      var pm = { Kind: a.mkind || 'area' };
      if (a.ctr) pm.C = [fix(a.ctr[0]), fix(a.ctr[1])];
      if (a.rad != null) pm.R = fix(a.rad);
      if (a.holes && a.holes.length) pm.Holes = a.holes.map(function (h) { return h.reduce(function (acc, q) { acc.push(fix(q[0]), fix(q[1])); return acc; }, []); });
      if (a.wallH != null) pm.H = fix(a.wallH, 6);
      if (a.runN != null) pm.RN = a.runN;
      if (a.roomName) pm.Name = L.PDFHexString.fromText(a.roomName);
      dict.set(N('PMMeasure'), ctx.obj(pm));
    };
    var setGeometry = function (dict, a) {
      if (a.subtype === 'Circle' && a.mkind) { if (a.measure) dict.set(N('Measure'), measureDict(ctx, a.measure)); setMeasureExtra(dict, a); }
      if (a.sym) {
        if (a.subtype === 'Polygon') dict.set(N('Vertices'), flat(symPoints(a, 0)));
        var sd = { Shape: a.sym.shape, Size: fix(a.sym.size || (a.rect[2] - a.rect[0]), 2) };
        if (SYM_WIDE[a.sym.shape]) sd.Height = fix(a.sym.height || (a.rect[3] - a.rect[1]), 2);
        if (+a.sym.angle) sd.Angle = fix(+a.sym.angle, 2);
        if (a.sym.legend) sd.Legend = true;
        if (a.sym.label) sd.Label = L.PDFHexString.fromText(a.sym.label);
        if (a.fixLen > 0) { sd.Len = fix(a.fixLen, 6); sd.Qty = a.fixQty > 0 ? a.fixQty : 1; sd.LenU = L.PDFString.of(a.fixFmt || 'ft-in'); }
        if (hexRgb(a.sym.textColor)) sd.TextColor = hexRgb(a.sym.textColor).map(function (v) { return fix(v, 4); });
        if (a.sym.n != null) { sd.N = a.sym.n; sd.Series = L.PDFString.of(a.sym.series || ''); sd.Prefix = L.PDFHexString.fromText(a.sym.prefix || ''); }
        dict.set(N('PMSymbol'), ctx.obj(sd));
        return;
      }
      if (a.subtype === 'FreeText' && a.box) {
        var tc = hexRgb(a.textColor) || a.color || [0, 0, 0], R = a.rect, B = a.box;
        dict.set(N('DA'), L.PDFString.of('/' + (a.bold ? 'HeBo' : 'Helv') + ' ' + fmt(a.fs || 12) + ' Tf ' + tc.map(fmt).join(' ') + ' rg'));
        dict.set(N('RD'), ctx.obj([B[0] - R[0], B[1] - R[1], R[2] - B[2], R[3] - B[3]].map(function (v) { return fix(Math.max(0, v)); })));
        if (a.tip) { var at2 = ftAttach(a); dict.set(N('IT'), N('FreeTextCallout')); dict.set(N('CL'), ctx.obj([a.tip[0], a.tip[1], at2[0], at2[1]].map(function (v) { return fix(v); }))); dict.set(N('LE'), N((a.le && a.le[0]) || 'OpenArrow')); }
        else { dict.delete(N('CL')); dict.delete(N('IT')); }
        var pt = { FS: fix(a.fs || 12, 2) }; if (hexRgb(a.textColor)) pt.TC = hexRgb(a.textColor).map(function (v) { return fix(v, 4); });
        if (a.bold) pt.Bold = true;
        if (a.legendKey) { pt.LK = L.PDFHexString.fromText(a.legendKey); pt.LS = L.PDFString.of(a.legendScope || 'all'); }
        dict.set(N('PMText'), ctx.obj(pt));
        return;
      }
      if (!a.vertices) return;
      if (a.subtype === 'Line' && a.le) dict.set(N('LE'), ctx.obj(a.le.map(function (n) { return N(n || 'None'); })));
      if (a.cloud) { dict.set(N('BE'), ctx.obj({ S: 'C', I: 1 })); dict.set(N('IT'), N('PolygonCloud')); }
      if (a.subtype === 'Line') dict.set(N('L'), flat(a.vertices));
      else if (a.subtype === 'Polygon' || a.subtype === 'PolyLine') dict.set(N('Vertices'), flat(a.vertices));
      if (a.measure) dict.set(N('Measure'), measureDict(ctx, a.measure));
      setMeasureExtra(dict, a);
    };
    var inkArr = function (a) { return ctx.obj((a.inkList || []).map(function (pts) { return pts.reduce(function (acc, p) { acc.push(fix(p[0]), fix(p[1])); return acc; }, []); })); };

    annots.forEach(function (a) { if (!a.isNew && a.num != null) refOf.set(a.id, L.PDFRef.of(a.num, a.gen || 0)); });

    // 1. Deletions (annotation, its popup, and any dangling group/reply links)
    var deletedRefs = [];
    annots.forEach(function (a) {
      if (!a.deleted || a.isNew) return;
      var ref = refOf.get(a.id); if (!ref) return;
      var page = pages[a.pageIndex]; var arr = page ? page.node.Annots() : null; if (!arr) return;
      var dict = null; try { dict = ctx.lookup(ref); } catch (e) { dict = null; }
      var popup = dict instanceof L.PDFDict ? dict.get(N('Popup')) : null;
      var i = findIndex(arr, ref); if (i >= 0) arr.remove(i);
      if (popup instanceof L.PDFRef) { var j = findIndex(arr, popup); if (j >= 0) arr.remove(j); ctx.delete(popup); }
      ctx.delete(ref); deletedRefs.push(ref); refOf.delete(a.id);
    });
    if (deletedRefs.length) {
      pages.forEach(function (page) {
        var arr = page.node.Annots(); if (!arr) return;
        for (var i = 0; i < arr.size(); i++) {
          var d; try { d = ctx.lookup(arr.get(i)); } catch (e) { continue; }
          if (!(d instanceof L.PDFDict)) continue;
          var irt = d.get(N('IRT'));
          if (irt instanceof L.PDFRef && deletedRefs.some(function (r) { return sameRef(r, irt); })) {
            if (isStatusReply(d) || d.get(N('PMPhoto'))) { var rr = arr.get(i); arr.remove(i); if (rr instanceof L.PDFRef) ctx.delete(rr); i--; continue; }
            d.delete(N('IRT')); d.delete(N('RT'));
          }
        }
      });
    }

    // Markup layers are optional content groups (the way Revu stores layers).
    var ocgCache = {};
    var ocgFor = function (name) {
      if (ocgCache[name]) return ocgCache[name];
      var cat = doc.catalog, ocp = ctx.lookup(cat.get(N('OCProperties')));
      if (!(ocp instanceof L.PDFDict)) { ocp = ctx.obj({ OCGs: [], D: { Name: L.PDFString.of('Layers'), Order: [], ON: [], OFF: [] } }); cat.set(N('OCProperties'), ocp); }
      var ocgs = ctx.lookup(ocp.get(N('OCGs')));
      if (!(ocgs instanceof L.PDFArray)) { ocgs = ctx.obj([]); ocp.set(N('OCGs'), ocgs); }
      for (var i = 0; i < ocgs.size(); i++) { var r = ocgs.get(i), d = ctx.lookup(r); if (d instanceof L.PDFDict && textOf(ctx.lookup(d.get(N('Name')))) === name) return (ocgCache[name] = r); }
      var ref = ctx.register(ctx.obj({ Type: 'OCG', Name: L.PDFHexString.fromText(name) }));
      ocgs.push(ref);
      var dd = ctx.lookup(ocp.get(N('D')));
      if (!(dd instanceof L.PDFDict)) { dd = ctx.obj({ Order: [], ON: [] }); ocp.set(N('D'), dd); }
      ['Order', 'ON'].forEach(function (k) { var ar = ctx.lookup(dd.get(N(k))); if (!(ar instanceof L.PDFArray)) { ar = ctx.obj([]); dd.set(N(k), ar); } ar.push(ref); });
      return (ocgCache[name] = ref);
    };
    var setLayer = function (dict, a) { if (a.layer) dict.set(N('OC'), ocgFor(a.layer)); else dict.delete(N('OC')); };
    var setLink = function (dict, a, page) {
      dict.set(N('Rect'), ctx.obj(a.rect.map(function (v) { return fix(v); })));
      dict.delete(N('A')); dict.delete(N('Dest'));
      var lk = a.link || {};
      if (lk.url) dict.set(N('A'), ctx.obj({ S: 'URI', URI: L.PDFString.of(lk.url) }));
      else if (lk.page != null && pages[lk.page]) dict.set(N('Dest'), ctx.obj([pages[lk.page].ref, N('Fit')]));
      dict.set(N('C'), colorArr(a.color || [0.16, 0.36, 0.84]));
      setText(dict, 'Contents', a.contents || (lk.url || (lk.page != null ? 'Page ' + (lk.page + 1) : '')));
      setText(dict, 'Subj', a.subject || 'Link'); setLayer(dict, a);
      dict.set(N('M'), L.PDFString.fromDate(now));
    };
    // 2. New markups
    annots.forEach(function (a) {
      if (!a.isNew || a.deleted) return;
      var page = pages[a.pageIndex]; if (!page) return;
      if (a.subtype === 'Link') {
        var ld = ctx.obj({ Type: 'Annot', Subtype: 'Link', F: 4, P: page.ref, Border: [0, 0, 0], H: 'I' });
        ld.set(N('PMLink'), L.PDFBool.True); ld.set(N('NM'), L.PDFString.of(a.nm || makeNM())); setText(ld, 'T', a.author || author);
        setLink(ld, a, page);
        var lref = ctx.register(ld); page.node.addAnnot(lref); refOf.set(a.id, lref); return;
      }
      var lw = +a.lineWidth || 0;
      var apRef = buildAppearance(ctx, a);
      var dict = ctx.obj({
        Type: 'Annot', Subtype: a.sym && opts.symAsStamp ? 'Stamp' : a.subtype, Rect: a.rect.map(function (v) { return fix(v); }), F: 4, P: page.ref,
        CA: fix(a.opacity, 3), BS: { Type: 'Border', W: lw, S: 'S' }, AP: { N: apRef }
      });
      dict.set(N('C'), colorArr(a.color));
      dict.set(N('NM'), L.PDFString.of(a.nm || makeNM()));
      dict.set(N('M'), L.PDFString.fromDate(now));
      dict.set(N('CreationDate'), L.PDFString.fromDate(a.date ? new Date(a.date) : now));
      setText(dict, 'T', a.author || author);
      setText(dict, 'Subj', a.subject);
      setText(dict, 'Contents', contentsOut(a)); setFields(dict, a);
      if (a.fillColor && FILLABLE.has(a.subtype)) { dict.set(N('IC'), colorArr(a.fillColor)); dict.set(N('FillOpacity'), L.PDFNumber.of(fix(a.fillOpacity, 3))); }
      if (a.subtype === 'Ink') dict.set(N('InkList'), inkArr(a));
      if (a.intent) dict.set(N('IT'), N(a.intent));
      setGeometry(dict, a); setLayer(dict, a);
      var ref = ctx.register(dict);
      page.node.addAnnot(ref);
      refOf.set(a.id, ref);
    });

    // 3. Edited existing markups
    annots.forEach(function (a) {
      if (a.isNew || a.deleted || !a.dirty) return;
      var ref = refOf.get(a.id); if (!ref) return;
      var dict; try { dict = ctx.lookup(ref); } catch (e) { return; }
      if (!(dict instanceof L.PDFDict)) return;
      if (a.subtype === 'Link') { setLink(dict, a, pages[a.pageIndex]); return; }
      setLayer(dict, a);
      setText(dict, 'Subj', a.subject);
      setText(dict, 'Contents', contentsOut(a)); setFields(dict, a);
      dict.set(N('M'), L.PDFString.fromDate(now));
      dict.set(N('C'), colorArr(a.color));
      if (FILLABLE.has(a.subtype)) {
        if (a.fillColor) { dict.set(N('IC'), colorArr(a.fillColor)); dict.set(N('FillOpacity'), L.PDFNumber.of(fix(a.fillOpacity, 3))); }
        else { dict.delete(N('IC')); dict.delete(N('FillOpacity')); }
      }
      dict.set(N('CA'), L.PDFNumber.of(fix(a.opacity, 3)));
      var bs = ctx.lookup(dict.get(N('BS')));
      if (bs instanceof L.PDFDict) bs.set(N('W'), L.PDFNumber.of(+a.lineWidth || 0));
      else dict.set(N('BS'), ctx.obj({ Type: 'Border', W: +a.lineWidth || 0, S: 'S' }));
      if (a.owned && (a.geomDirty || a.styleDirty)) {
        if (a.sym) dict.set(N('Subtype'), N(opts.symAsStamp ? 'Stamp' : a.subtype));
        dict.set(N('Rect'), ctx.obj(a.rect.map(function (v) { return fix(v); })));
        if (a.subtype === 'Ink') dict.set(N('InkList'), inkArr(a));
        setGeometry(dict, a);
        dict.set(N('AP'), ctx.obj({ N: buildAppearance(ctx, a) }));
        dict.delete(N('RD'));
      }
    });

    // 4. Groups: /RT /Group with /IRT pointing at the group's first markup
    annots.forEach(function (a) {
      if (a.deleted) return;
      var ref = refOf.get(a.id); if (!ref) return;
      var dict; try { dict = ctx.lookup(ref); } catch (e) { return; }
      if (!(dict instanceof L.PDFDict)) return;
      var want = (a.parentId && a.parentId !== a.id) ? refOf.get(a.parentId) : null;
      var cur = dict.get(N('IRT')), curRT = nameOf(dict.get(N('RT')));
      if (want) {
        if (!(cur instanceof L.PDFRef) || !sameRef(cur, want) || curRT !== 'Group') { dict.set(N('RT'), N('Group')); dict.set(N('IRT'), want); }
      } else if (curRT === 'Group') { dict.delete(N('IRT')); dict.delete(N('RT')); }
    });

    // 4b. Review status: a hidden reply with /StateModel /Review and /State, as Acrobat writes it.
    annots.forEach(function (a) {
      if (a.deleted || !a.statusDirty) return;
      var ref = refOf.get(a.id), page = pages[a.pageIndex]; if (!ref || !page) return;
      // one status reply per markup: drop the earlier ones
      var arr0 = page.node.Annots();
      if (arr0) for (var k0 = arr0.size() - 1; k0 >= 0; k0--) {
        var d0; try { d0 = ctx.lookup(arr0.get(k0)); } catch (e) { continue; }
        if (d0 instanceof L.PDFDict && isStatusReply(d0) && sameRef(d0.get(N('IRT')), ref)) { var r0 = arr0.get(k0); arr0.remove(k0); if (r0 instanceof L.PDFRef) ctx.delete(r0); }
      }
      var st = a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : 'None', who = a.statusBy || author || '';
      var reply = ctx.obj({ Type: 'Annot', Subtype: 'Text', Rect: [fix(a.rect[0]), fix(a.rect[3] - 20), fix(a.rect[0] + 20), fix(a.rect[3])], F: 30, P: page.ref, IRT: ref, Name: 'Comment' });
      reply.set(N('StateModel'), L.PDFString.of('Review')); reply.set(N('State'), L.PDFString.of(st));
      setText(reply, 'T', who); setText(reply, 'Contents', st + (who ? ' set by ' + who : ''));
      reply.set(N('M'), L.PDFString.fromDate(now)); reply.set(N('CreationDate'), L.PDFString.fromDate(now)); reply.set(N('NM'), L.PDFString.of(makeNM()));
      page.node.addAnnot(ctx.register(reply));
    });

    // 4b. Site photos: one file attachment per photo, a reply to the markup (Revu opens it from the paperclip)
    var photos = opts.photos || {};
    annots.forEach(function (a) {
      if (a.deleted || !(a.photosDirty || (a.isNew && a.photos && a.photos.length))) return;
      var ref = refOf.get(a.id), page = pages[a.pageIndex]; if (!ref || !page) return;
      var arr1 = page.node.Annots();
      if (arr1) for (var k1 = arr1.size() - 1; k1 >= 0; k1--) {
        var d1; try { d1 = ctx.lookup(arr1.get(k1)); } catch (e) { continue; }
        if (d1 instanceof L.PDFDict && d1.get(N('PMPhoto')) && sameRef(d1.get(N('IRT')), ref)) { var r1 = arr1.get(k1); arr1.remove(k1); if (r1 instanceof L.PDFRef) ctx.delete(r1); }
      }
      (a.photos || []).forEach(function (ph, i) {
        var bytes = photos[ph.id]; if (!bytes) return;
        var nm = ph.name || ('Photo ' + (i + 1) + '.jpg');
        var ef = ctx.register(ctx.stream(bytes, { Type: 'EmbeddedFile', Subtype: N('image/jpeg'), Params: { Size: bytes.length, ModDate: L.PDFString.fromDate(now) } }));
        var fsd = ctx.register(ctx.obj({ Type: 'Filespec', F: L.PDFString.of(nm.replace(/[^\x20-\x7e]/g, '_')), UF: L.PDFHexString.fromText(nm), Desc: L.PDFHexString.fromText(nm), EF: { F: ef } }));
        var x = a.rect[2] + 2 + i * 15, y = a.rect[3] - 18, w = 13, h = 17;
        var ap = ctx.register(ctx.stream('q 1 1 1 rg 0.16 0.36 0.84 RG 1 w 0.5 0.5 ' + (w - 1) + ' ' + (h - 1) + ' re B 0.16 0.36 0.84 rg 2.5 4 8 6 re f 1 1 1 rg 6.5 7 m 6.5 8.1 7.4 9 8.5 9 c 9.6 9 10.5 8.1 10.5 7 c 10.5 5.9 9.6 5 8.5 5 c 7.4 5 6.5 5.9 6.5 7 c f Q', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, w, h] }));
        var at = ctx.obj({ Type: 'Annot', Subtype: 'FileAttachment', Rect: [fix(x), fix(y), fix(x + w), fix(y + h)], FS: fsd, Name: 'Paperclip', F: 4, P: page.ref, IRT: ref, C: [0.16, 0.36, 0.84], AP: { N: ap } });
        at.set(N('PMPhoto'), L.PDFBool.True);
        setText(at, 'Contents', nm); setText(at, 'T', a.author || author || ''); setText(at, 'Subj', 'Photo');
        at.set(N('M'), L.PDFString.fromDate(now)); at.set(N('NM'), L.PDFString.of(makeNM()));
        page.node.addAnnot(ctx.register(at));
      });
    });

    // 5. Page scales (calibration) as a /VP viewport covering the page, the way Revu stores them
    var scales = opts.scales || {}, vps = opts.vps || {};
    Object.keys(scales).forEach(function (k) {
      var page = pages[+k]; if (!page) return;
      var sc = scales[k], arr = [];
      if (sc) {
        var mb = page.getMediaBox();
        arr.push({ Type: 'Viewport', Name: L.PDFString.of('Scale'), BBox: [fix(mb.x), fix(mb.y), fix(mb.x + mb.width), fix(mb.y + mb.height)], Measure: measureDict(ctx, sc) });
      }
      (vps[k] || []).forEach(function (v) { arr.push({ Type: 'Viewport', Name: L.PDFHexString.fromText(v.name || 'Scale area'), BBox: v.bbox.map(function (x) { return fix(x); }), Measure: measureDict(ctx, v.sc) }); });
      if (arr.length) page.node.set(N('VP'), ctx.obj(arr)); else page.node.delete(N('VP'));
    });

    return await doc.save({ useObjectStreams: false });
  }

  /* Flatten: draw every visible markup's appearance into its page and remove the markups,
     for issuing or printing. Links and form fields stay. The open document is not changed. */
  async function flatten(bytes) {
    var L = lib(), N = L.PDFName.of, doc = await L.PDFDocument.load(bytes, { updateMetadata: false }), ctx = doc.context;
    doc.getPages().forEach(function (page) {
      var annots = page.node.Annots(); if (!annots) return;
      var keep = [], ops = [];
      for (var i = 0; i < annots.size(); i++) {
        var ref = annots.get(i), d = ctx.lookup(ref); if (!(d instanceof L.PDFDict)) continue;
        var sub = nameOf(d.get(N('Subtype')));
        if (sub === 'Link' || sub === 'Widget') { keep.push(ref); continue; }
        if (sub === 'Popup' || d.get(N('IRT'))) continue;
        var fl = +(d.get(N('F')) ? d.get(N('F')).asNumber() : 0);
        if (fl & 2 || fl & 32) continue;
        var ap = ctx.lookup(d.get(N('AP'))); if (!(ap instanceof L.PDFDict)) continue;
        var nref = ap.get(N('N')), nobj = ctx.lookup(nref);
        if (nobj instanceof L.PDFDict && !(nobj instanceof L.PDFStream)) { var as = d.get(N('AS')); nref = as ? nobj.get(as) : null; nobj = nref && ctx.lookup(nref); }
        if (!(nobj instanceof L.PDFStream)) continue;
        var rect = ctx.lookup(d.get(N('Rect'))), bb = ctx.lookup(nobj.dict.get(N('BBox'))); if (!rect || !bb) continue;
        var r = rect.asArray().map(function (x) { return x.asNumber(); }), b = bb.asArray().map(function (x) { return x.asNumber(); });
        var mx = nobj.dict.get(N('Matrix')), m = mx ? ctx.lookup(mx).asArray().map(function (x) { return x.asNumber(); }) : [1, 0, 0, 1, 0, 0];
        var pts = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]].map(function (q) { return [m[0] * q[0] + m[2] * q[1] + m[4], m[1] * q[0] + m[3] * q[1] + m[5]]; });
        var bx0 = Math.min.apply(null, pts.map(function (q) { return q[0]; })), by0 = Math.min.apply(null, pts.map(function (q) { return q[1]; }));
        var bx1 = Math.max.apply(null, pts.map(function (q) { return q[0]; })), by1 = Math.max.apply(null, pts.map(function (q) { return q[1]; }));
        var rx0 = Math.min(r[0], r[2]), ry0 = Math.min(r[1], r[3]), rx1 = Math.max(r[0], r[2]), ry1 = Math.max(r[1], r[3]);
        var sx = bx1 - bx0 ? (rx1 - rx0) / (bx1 - bx0) : 1, sy = by1 - by0 ? (ry1 - ry0) / (by1 - by0) : 1;
        if (!(nref instanceof L.PDFRef)) nref = ctx.register(nobj);
        var name = page.node.newXObject('Flat', nref);
        ops.push(L.pushGraphicsState(), L.concatTransformationMatrix(sx, 0, 0, sy, rx0 - bx0 * sx, ry0 - by0 * sy), L.drawObject(name), L.popGraphicsState());
      }
      if (ops.length) page.pushOperators.apply(page, ops);
      if (keep.length) page.node.set(N('Annots'), ctx.obj(keep)); else page.node.delete(N('Annots'));
    });
    return doc.save({ useObjectStreams: false });
  }

  root.MarkupIO = { flatten: flatten, endShape: endShape, angleArc: angleArc, symBBox: symBBox, symNative: symNative, symAng: symAng, stampDims: stampDims, arrowSize: arrowSize, arrowHead: arrowHead, cloudCurves: cloudCurves, ftLayout: ftLayout, ftAttach: ftAttach, ftBounds: ftBounds, SYM_SUB: SYM_SUB, SYM_WIDE: SYM_WIDE, symKind: symKind, symDims: symDims, symPoints: symPoints, symLabel: symLabel, symText: symText, symTextColor: symTextColor, readMarkups: readMarkups, readDocument: readDocument, applyMarkups: applyMarkups, makeNM: makeNM, OWNED: OWNED, FILLABLE: FILLABLE, textWidth: textWidth, labelBox: labelBox };
})(typeof window !== 'undefined' ? window : globalThis);
