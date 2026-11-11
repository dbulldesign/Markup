/* ToolChest: reads Bluebeam Revu tool set files (.btx).
   A .btx is XML; each <ToolChestItem> carries a <Raw> field that is hex text of a
   zlib stream whose payload is a PDF annotation dictionary such as
   <</Subtype/Circle/C[1 0 0]/IC[1 0 0]/FillOpacity 0.35/Subj(Issue)...>>. */
(function (root) {
  'use strict';
  var SUPPORTED = { Circle: 'circle', Square: 'rect', Ink: 'pen', Polygon: 'polygon' };
  // Which drawing tool a Revu tool maps to, using its subtype and intent (/IT).
  function drawToolFor(subtype, it) {
    if (subtype === 'Polygon') return it === 'PolygonDimension' ? 'area' : (it === 'PolygonCloud' ? 'cloud' : 'polygon');
    if (subtype === 'PolyLine') return it === 'PolyLineDimension' ? 'perimeter' : null;
    if (subtype === 'Line') return it === 'LineDimension' ? 'length' : 'line';
    if (subtype === 'FreeText') return it === 'FreeTextCallout' ? 'callout' : 'text';
    return SUPPORTED[subtype] || null;
  }

  function hexToBytes(h) {
    var out = new Uint8Array(h.length >> 1);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
    return out;
  }
  function inflate(bytes) {
    var p = root.pako; if (!p) return null;
    try { return p.inflate(bytes); } catch (e) { /* not zlib */ }
    try { return p.inflateRaw(bytes); } catch (e) { /* not deflate */ }
    return null;
  }
  function bytesToText(b) {
    try { return new TextDecoder('utf-8').decode(b); } catch (e) { return ''; }
  }
  // Leaf fields are either plain text or hex of a zlib stream.
  function decodeField(text) {
    if (text == null) return { text: '', bytes: null };
    var t = String(text).trim();
    if (/^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0 && t.length >= 8) {
      var b = hexToBytes(t);
      var inf = inflate(b);
      if (inf) return { text: bytesToText(inf), bytes: inf };
      return { text: bytesToText(b), bytes: b };
    }
    return { text: t, bytes: null };
  }
  function isPng(b) { return b && b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47; }
  function toDataUrl(b) {
    var s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return 'data:image/png;base64,' + btoa(s);
  }

  // Minimal parser for PDF object syntax in text form.
  function PName(n) { this.name = n; }
  function parsePdfText(src) {
    var i = 0, n = src.length;
    function ws() {
      while (i < n) {
        var c = src[i];
        if (c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f' || c === '\0') i++;
        else if (c === '%') { while (i < n && src[i] !== '\n') i++; }
        else break;
      }
    }
    function name() {
      i++; var s = i;
      while (i < n && !/[\s\/\[\]<>(){}%]/.test(src[i])) i++;
      return src.slice(s, i).replace(/#([0-9A-Fa-f]{2})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); });
    }
    function decodeText(s) {
      if (s.length >= 2 && s.charCodeAt(0) === 0xFE && s.charCodeAt(1) === 0xFF) {
        var out = ''; for (var k = 2; k + 1 < s.length; k += 2) out += String.fromCharCode((s.charCodeAt(k) << 8) | s.charCodeAt(k + 1));
        return out;
      }
      return s;
    }
    function value() {
      ws(); if (i >= n) return undefined;
      var c = src[i];
      if (c === '<') {
        if (src[i + 1] === '<') {
          i += 2; var d = {};
          for (;;) {
            ws();
            if (src.substr(i, 2) === '>>') { i += 2; return d; }
            if (i >= n) return d;
            if (src[i] !== '/') { if (value() === undefined) return d; continue; }
            var k = name(); d[k] = value();
          }
        }
        i++; var s = i; while (i < n && src[i] !== '>') i++;
        var hex = src.slice(s, i).replace(/\s+/g, ''); i++;
        var str = ''; for (var h = 0; h + 1 < hex.length; h += 2) str += String.fromCharCode(parseInt(hex.substr(h, 2), 16));
        return decodeText(str);
      }
      if (c === '[') {
        i++; var a = [];
        for (;;) { ws(); if (src[i] === ']') { i++; return a; } if (i >= n) return a; var v = value(); if (v === undefined) return a; a.push(v); }
      }
      if (c === '(') {
        i++; var depth = 1, out = '';
        while (i < n) {
          var ch = src[i++];
          if (ch === '\\') {
            var e = src[i++];
            if (e === 'n') out += '\n'; else if (e === 'r') out += '\r'; else if (e === 't') out += '\t'; else if (e === 'b') out += '\b'; else if (e === 'f') out += '\f';
            else if (/[0-7]/.test(e)) { var oct = e; while (oct.length < 3 && /[0-7]/.test(src[i])) oct += src[i++]; out += String.fromCharCode(parseInt(oct, 8)); }
            else if (e === '\n' || e === '\r') { /* line continuation */ }
            else out += e;
          } else if (ch === '(') { depth++; out += ch; }
          else if (ch === ')') { depth--; if (!depth) break; out += ch; }
          else out += ch;
        }
        return decodeText(out);
      }
      if (c === '/') return new PName(name());
      if (src.substr(i, 4) === 'true') { i += 4; return true; }
      if (src.substr(i, 5) === 'false') { i += 5; return false; }
      if (src.substr(i, 4) === 'null') { i += 4; return null; }
      var m = /^[+-]?(\d+\.?\d*|\.\d+)/.exec(src.substr(i, 40));
      if (m) { i += m[0].length; return parseFloat(m[0]); }
      if (c === '}' || c === ']' || c === '>' || c === ')') { i++; return undefined; }
      i++; return undefined;
    }
    var v = value();
    return v;
  }
  function nm(v) { return v instanceof PName ? v.name : null; }
  function colorOf(v) {
    if (!Array.isArray(v) || !v.length) return null;
    var c = v.filter(function (x) { return typeof x === 'number'; });
    if (c.length === 3) return c;
    if (c.length === 1) return [c[0], c[0], c[0]];
    if (c.length === 4) return [(1 - c[0]) * (1 - c[3]), (1 - c[1]) * (1 - c[3]), (1 - c[2]) * (1 - c[3])];
    return null;
  }
  function str(v) { return typeof v === 'string' ? v : ''; }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }

  function itemToTool(fields, index) {
    var rawText = decodeField(fields.Raw).text;
    var dict = null;
    if (rawText) { try { dict = parsePdfText(rawText); } catch (e) { dict = null; } }
    if (!dict || typeof dict !== 'object' || Array.isArray(dict)) dict = {};
    var typeClass = str(fields.Type), typeGuess = (/Annotation(\w+)$/.exec(typeClass) || [])[1] || '';
    var subtype = nm(dict.Subtype) || typeGuess || 'Unknown';
    var it = nm(dict.IT) || '';
    var color = colorOf(dict.C), fill = colorOf(dict.IC);
    var opacity = num(dict.CA, 1), fillOpacity = num(dict.FillOpacity, opacity);
    var lw = dict.BS && typeof dict.BS === 'object' ? num(dict.BS.W, 1) : (Array.isArray(dict.Border) ? num(dict.Border[2], 1) : 1);
    var highlight = dict.Highlight === true || nm(dict.BM) === 'Multiply';
    var icon = null;
    ['Data', 'Icon', 'Image'].forEach(function (k) { if (icon || !fields[k]) return; var d = decodeField(fields[k]); if (isPng(d.bytes)) icon = toDataUrl(d.bytes); });
    var subject = str(dict.Subj);
    var label = subject || (it ? subtype + ' (' + it.replace(/^Polygon|^PolyLine/, '') + ')' : subtype);
    return {
      id: 't' + index + '-' + (str(fields.Name) || Math.random().toString(36).slice(2)),
      title: label, subtype: subtype, intent: it, typeClass: typeClass, mode: str(fields.Mode),
      supported: !!drawToolFor(subtype, it), drawTool: drawToolFor(subtype, it),
      color: color, fillColor: fill, opacity: opacity, fillOpacity: fillOpacity, lineWidth: lw, highlight: highlight,
      subject: subject, contents: str(dict.Contents), layer: str(dict.OC), icon: icon
    };
  }

  function childText(el, tag) {
    for (var k = 0; k < el.children.length; k++) if (el.children[k].tagName === tag) return el.children[k].textContent;
    return null;
  }
  function parseBtx(buf, fileName) {
    var u8 = new Uint8Array(buf), enc = 'utf-8';
    if (u8[0] === 0xFF && u8[1] === 0xFE) enc = 'utf-16le'; else if (u8[0] === 0xFE && u8[1] === 0xFF) enc = 'utf-16be';
    var text = new TextDecoder(enc).decode(u8).replace(/^\uFEFF/, '');
    var items = [], title = '';
    var doc = null;
    try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) { doc = null; }
    if (doc && !doc.getElementsByTagName('parsererror').length && doc.documentElement) {
      title = decodeField(childText(doc.documentElement, 'Title')).text;
      Array.prototype.forEach.call(doc.getElementsByTagName('ToolChestItem'), function (el, idx) {
        var f = {}; for (var k = 0; k < el.children.length; k++) f[el.children[k].tagName] = el.children[k].textContent;
        items.push(itemToTool(f, idx));
      });
    } else {
      var re = /<ToolChestItem[^>]*>([\s\S]*?)<\/ToolChestItem>/g, m, idx = 0;
      while ((m = re.exec(text))) {
        var f = {}, inner = m[1], tre = /<(\w+)>([\s\S]*?)<\/\1>/g, t;
        while ((t = tre.exec(inner))) f[t[1]] = t[2];
        items.push(itemToTool(f, idx++));
      }
      var tm = /<Title>([\s\S]*?)<\/Title>/.exec(text); if (tm) title = decodeField(tm[1]).text;
    }
    if (!items.length) throw new Error('No tools found. Is this a Bluebeam tool set (.btx) file?');
    title = (title || '').replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '').trim() || String(fileName || 'Tool set').replace(/\.btx$/i, '');
    return { id: 'set-' + Date.now().toString(36), title: title, tools: items };
  }

  root.ToolChest = { parseBtx: parseBtx, parsePdfText: parsePdfText, decodeField: decodeField, SUPPORTED: SUPPORTED, drawToolFor: drawToolFor };
})(typeof window !== 'undefined' ? window : globalThis);
