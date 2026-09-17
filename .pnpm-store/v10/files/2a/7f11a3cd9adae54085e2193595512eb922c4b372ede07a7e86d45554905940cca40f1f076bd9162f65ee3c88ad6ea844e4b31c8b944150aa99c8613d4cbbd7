import ra from "jszip";
import * as wo from "echarts/core";
import { BarChart as ca, CandlestickChart as la, CustomChart as aa, LineChart as da, PieChart as ha, RadarChart as ua, ScatterChart as fa } from "echarts/charts";
import { AxisPointerComponent as $a, GraphicComponent as pa, GridComponent as xa, LegendComponent as ya, RadarComponent as ga, TitleComponent as ma, TooltipComponent as ba } from "echarts/components";
import { LabelLayout as Ma } from "echarts/features";
import { CanvasRenderer as La } from "echarts/renderers";
function va(t) {
  var o;
  const n = ((o = t.split(".").pop()) == null ? void 0 : o.toLowerCase()) || "";
  return {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    tiff: "image/tiff",
    tif: "image/tiff",
    emf: "image/x-emf",
    wmf: "image/x-wmf",
    webp: "image/webp",
    mp4: "video/mp4",
    m4v: "video/mp4",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    ogg: "audio/ogg"
  }[n] || "application/octet-stream";
}
function Aa(t) {
  const n = t.search(/[?#]/);
  return n >= 0 ? t.slice(0, n) : t;
}
function Sa(t) {
  const n = [];
  for (const e of t.replace(/\\/g, "/").split("/"))
    if (!(!e || e === ".")) {
      if (e === "..") {
        n.pop();
        continue;
      }
      n.push(e);
    }
  return n;
}
function Ca(t) {
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}
function nc(t) {
  const n = Sa(Aa(t)), e = n.lastIndexOf("media");
  return (e >= 0 && e < n.length - 1 ? n.slice(e + 1) : n.slice(-1)).join("/");
}
function oc(t) {
  return `ppt/media/${nc(t).split("/").map(Ca).join("/")}`;
}
function hs(t) {
  const n = nc(t), e = oc(t), o = `ppt/media/${n}`;
  return e === o ? [e] : [e, o];
}
function Ln(t, n) {
  for (const e of hs(t)) {
    const o = n.get(e);
    if (o) return { mediaPath: e, data: o };
  }
}
async function As(t, n, e) {
  const o = Ln(t, n);
  return o || (e == null ? void 0 : e.resolve(t));
}
function tn(t, n, e) {
  let o = e.get(t);
  if (!o) {
    const s = va(t), i = new Blob([n], { type: s });
    o = URL.createObjectURL(i), e.set(t, o);
  }
  return o;
}
const Up = Object.freeze({
  maxEntries: 4e3,
  maxEntryUncompressedBytes: 32 * 1024 * 1024,
  maxTotalUncompressedBytes: 256 * 1024 * 1024,
  maxMediaBytes: 192 * 1024 * 1024,
  maxConcurrency: 8
});
function Xe(t) {
  throw new Error(`PPTX zip limit exceeded: ${t}`);
}
function us(t) {
  return t.startsWith("ppt/media/");
}
function Fa(t) {
  return t.split("/").map((n) => {
    try {
      return decodeURIComponent(n);
    } catch {
      return n;
    }
  }).join("/");
}
function de(t, n, e) {
  t.set(n, e);
  const o = Fa(n);
  o !== n && !t.has(o) && t.set(o, e);
}
function ka(t) {
  const n = t._data, e = n == null ? void 0 : n.uncompressedSize;
  return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function wa(t) {
  return new TextEncoder().encode(t).byteLength;
}
class Ea {
  constructor(n, e, o, s) {
    this.entries = n, this.media = e, this.state = o, this.totalBytes = s, this.inflight = /* @__PURE__ */ new Map(), this.loadedPaths = /* @__PURE__ */ new Set(), this.totalCount = new Set(Array.from(n.values(), (i) => i.path)).size;
  }
  get loadedBytes() {
    var e;
    let n = 0;
    for (const o of this.loadedPaths)
      n += ((e = this.media.get(o)) == null ? void 0 : e.byteLength) ?? 0;
    return n;
  }
  get loadedCount() {
    return this.loadedPaths.size;
  }
  async resolve(n) {
    for (const e of hs(n)) {
      const o = this.media.get(e);
      if (o) return { mediaPath: e, data: o };
    }
    for (const e of hs(n)) {
      const o = this.entries.get(e);
      if (!o) continue;
      const s = await this.readEntry(o);
      return { mediaPath: e, data: s };
    }
  }
  async readEntry(n) {
    let e = this.inflight.get(n.path);
    e || (e = sc(n.path, n.file, this.state).then((o) => (de(this.media, n.path, o), this.loadedPaths.add(n.path), o)), this.inflight.set(n.path, e));
    try {
      return await e;
    } finally {
      this.inflight.delete(n.path);
    }
  }
}
function Ss(t, n, e) {
  if (e.limits.maxEntryUncompressedBytes !== void 0 && n > e.limits.maxEntryUncompressedBytes && Xe(
    `${t} is ${n} bytes > maxEntryUncompressedBytes ${e.limits.maxEntryUncompressedBytes}`
  ), e.knownSizeByPath.has(t)) return;
  e.unknownTotalBytes += n;
  const o = e.knownTotalBytes + e.unknownTotalBytes;
  if (e.limits.maxTotalUncompressedBytes !== void 0 && o > e.limits.maxTotalUncompressedBytes && Xe(
    `total uncompressed bytes ${o} > maxTotalUncompressedBytes ${e.limits.maxTotalUncompressedBytes}`
  ), us(t)) {
    e.unknownMediaBytes += n;
    const s = e.knownMediaBytes + e.unknownMediaBytes;
    e.limits.maxMediaBytes !== void 0 && s > e.limits.maxMediaBytes && Xe(
      `media bytes ${s} > maxMediaBytes ${e.limits.maxMediaBytes}`
    );
  }
}
async function se(t, n, e) {
  const o = await n.async("string");
  return Ss(t, wa(o), e), o;
}
async function sc(t, n, e) {
  const o = await n.async("uint8array");
  return Ss(t, o.byteLength, e), o;
}
async function Pa(t, n, e) {
  if (e.knownSizeByPath.has(t) || e.limits.maxEntryUncompressedBytes === void 0 && e.limits.maxTotalUncompressedBytes === void 0)
    return;
  const o = await n.async("uint8array");
  Ss(t, o.byteLength, e);
}
async function Ba(t, n, e) {
  if (t.length === 0) return;
  const o = Math.min(n, t.length);
  let s = 0;
  const i = Array.from({ length: o }, async () => {
    for (; ; ) {
      const r = s++;
      if (r >= t.length) return;
      await e(t[r]);
    }
  });
  await Promise.all(i);
}
async function ic(t, n = {}) {
  return cc(t, n, { lazyMedia: !1 });
}
async function rc(t, n = {}) {
  return cc(t, n, { lazyMedia: !0 });
}
async function cc(t, n, e) {
  const o = n.maxConcurrency ?? 8;
  (!Number.isInteger(o) || o < 1) && Xe(`maxConcurrency ${n.maxConcurrency} must be an integer >= 1`);
  const s = await ra.loadAsync(t), i = Object.entries(s.files).filter(([, u]) => !u.dir);
  n.maxEntries !== void 0 && i.length > n.maxEntries && Xe(`entries ${i.length} > maxEntries ${n.maxEntries}`);
  const r = /* @__PURE__ */ new Map();
  let c = 0, l = 0;
  for (const [u, x] of i) {
    const p = u.replace(/\\/g, "/"), $ = ka(x);
    $ !== void 0 && (r.set(p, $), n.maxEntryUncompressedBytes !== void 0 && $ > n.maxEntryUncompressedBytes && Xe(
      `${p} is ${$} bytes > maxEntryUncompressedBytes ${n.maxEntryUncompressedBytes}`
    ), c += $, n.maxTotalUncompressedBytes !== void 0 && c > n.maxTotalUncompressedBytes && Xe(
      `total uncompressed bytes ${c} > maxTotalUncompressedBytes ${n.maxTotalUncompressedBytes}`
    ), us(p) && (l += $, n.maxMediaBytes !== void 0 && l > n.maxMediaBytes && Xe(
      `media bytes ${l} > maxMediaBytes ${n.maxMediaBytes}`
    )));
  }
  const a = {
    contentTypes: "",
    presentation: "",
    presentationRels: "",
    slides: /* @__PURE__ */ new Map(),
    slideRels: /* @__PURE__ */ new Map(),
    slideLayouts: /* @__PURE__ */ new Map(),
    slideLayoutRels: /* @__PURE__ */ new Map(),
    slideMasters: /* @__PURE__ */ new Map(),
    slideMasterRels: /* @__PURE__ */ new Map(),
    themes: /* @__PURE__ */ new Map(),
    themeOverrides: /* @__PURE__ */ new Map(),
    media: /* @__PURE__ */ new Map(),
    charts: /* @__PURE__ */ new Map(),
    chartRels: /* @__PURE__ */ new Map(),
    chartStyles: /* @__PURE__ */ new Map(),
    chartColors: /* @__PURE__ */ new Map(),
    diagramDrawings: /* @__PURE__ */ new Map()
  }, d = {
    limits: n,
    knownSizeByPath: r,
    knownTotalBytes: c,
    knownMediaBytes: l,
    unknownTotalBytes: 0,
    unknownMediaBytes: 0
  }, h = /* @__PURE__ */ new Map();
  return await Ba(i, o, async ([u, x]) => {
    const p = u.replace(/\\/g, "/");
    if (p === "[Content_Types].xml") {
      a.contentTypes = await se(p, x, d);
      return;
    }
    if (p === "ppt/presentation.xml") {
      a.presentation = await se(p, x, d);
      return;
    }
    if (p === "ppt/_rels/presentation.xml.rels") {
      a.presentationRels = await se(p, x, d);
      return;
    }
    if (p === "ppt/tableStyles.xml") {
      a.tableStyles = await se(p, x, d);
      return;
    }
    if (us(p)) {
      if (e.lazyMedia) {
        de(h, p, { path: p, file: x });
        return;
      }
      const $ = await sc(p, x, d);
      de(a.media, p, $);
      return;
    }
    if (/^ppt\/slides\/_rels\/[^/]+\.xml\.rels$/.test(p)) {
      de(
        a.slideRels,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/slides\/[^/]+\.xml$/.test(p)) {
      de(
        a.slides,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/slideLayouts\/_rels\/[^/]+\.xml\.rels$/.test(p)) {
      de(
        a.slideLayoutRels,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/slideLayouts\/[^/]+\.xml$/.test(p)) {
      de(
        a.slideLayouts,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/slideMasters\/_rels\/[^/]+\.xml\.rels$/.test(p)) {
      de(
        a.slideMasterRels,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/slideMasters\/[^/]+\.xml$/.test(p)) {
      de(
        a.slideMasters,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/theme\/(?!themeOverride[^/]*\.xml$)[^/]+\.xml$/.test(p)) {
      de(
        a.themes,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/theme\/themeOverride[^/]*\.xml$/.test(p)) {
      a.themeOverrides && de(
        a.themeOverrides,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/charts\/_rels\/[^/]+\.xml\.rels$/.test(p)) {
      a.chartRels && de(
        a.chartRels,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/charts\/(?!style[^/]*\.xml$)(?!colors[^/]*\.xml$)[^/]+\.xml$/.test(p)) {
      de(
        a.charts,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/charts\/style[^/]*\.xml$/.test(p)) {
      de(
        a.chartStyles,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/charts\/colors[^/]*\.xml$/.test(p)) {
      de(
        a.chartColors,
        p,
        await se(p, x, d)
      );
      return;
    }
    if (/^ppt\/diagrams\/[^/]+\.xml$/.test(p)) {
      de(
        a.diagramDrawings,
        p,
        await se(p, x, d)
      );
      return;
    }
    await Pa(p, x, d);
  }), e.lazyMedia && (a.mediaResolver = new Ea(
    h,
    a.media,
    d,
    l
  )), a;
}
class ve {
  constructor(n) {
    this.el = n;
  }
  /** Get a string attribute value, or undefined if missing. */
  attr(n) {
    if (!this.el) return;
    if (this.el.hasAttribute(n)) return this.el.getAttribute(n);
    const e = n.indexOf(":"), o = e >= 0 ? n.slice(e + 1) : n, s = e >= 0 ? this.resolveAttributeNamespace(n.slice(0, e)) : void 0;
    for (let i = 0; i < this.el.attributes.length; i++) {
      const r = this.el.attributes[i];
      if (r.localName === o && (e < 0 || (s ? r.namespaceURI === s : r.namespaceURI !== null)))
        return r.value;
    }
  }
  resolveAttributeNamespace(n) {
    var e;
    return ((e = this.el) == null ? void 0 : e.lookupNamespaceURI(n)) ?? (n === "r" ? "http://schemas.openxmlformats.org/officeDocument/2006/relationships" : void 0);
  }
  /** Get a numeric attribute value, or undefined if missing or not a number. */
  numAttr(n) {
    const e = this.attr(n);
    if (e === void 0) return;
    const o = Number(e);
    return Number.isNaN(o) ? void 0 : o;
  }
  /**
   * Find the first child element matching the given localName (namespace-agnostic).
   * Returns an empty SafeXmlNode if not found, so chaining never crashes.
   */
  child(n) {
    if (!this.el) return new ve(null);
    const e = this.el.children;
    for (let o = 0; o < e.length; o++)
      if (e[o].localName === n)
        return new ve(e[o]);
    return new ve(null);
  }
  /**
   * Get child elements, optionally filtered by localName (namespace-agnostic).
   * If no localName is given, returns all direct child elements.
   */
  children(n) {
    if (!this.el) return [];
    const e = [], o = this.el.children;
    for (let s = 0; s < o.length; s++)
      (n === void 0 || o[s].localName === n) && e.push(new ve(o[s]));
    return e;
  }
  /** Get the text content, or empty string if the element is missing. */
  text() {
    return this.el ? this.el.textContent ?? "" : "";
  }
  /** Whether the underlying element actually exists. */
  exists() {
    return this.el !== null;
  }
  /** All direct child elements as SafeXmlNode[]. */
  allChildren() {
    return this.children();
  }
  /** The localName of the underlying element, or empty string. */
  get localName() {
    var n;
    return ((n = this.el) == null ? void 0 : n.localName) ?? "";
  }
  /** Raw access to the underlying Element (may be null). */
  get element() {
    return this.el;
  }
}
function ge(t) {
  const e = new DOMParser().parseFromString(t, "application/xml"), o = e.querySelector("parsererror");
  return o ? (console.warn("XML parse error:", o.textContent), new ve(null)) : new ve(e.documentElement);
}
function Ie(t) {
  return (t == null ? void 0 : t.trim().toLowerCase()) === "external";
}
function Ra(t) {
  const n = t.search(/[?#]/);
  return n >= 0 ? t.slice(0, n) : t;
}
function Zi(t) {
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}
function Pn(t) {
  const n = /* @__PURE__ */ new Map();
  if (!t) return n;
  const e = ge(t);
  if (!e.exists()) return n;
  const o = e.children("Relationship");
  for (const s of o) {
    const i = s.attr("Id"), r = s.attr("Type"), c = s.attr("Target"), l = s.attr("TargetMode");
    i && r !== void 0 && c !== void 0 && n.set(i, { type: r, target: c, targetMode: l });
  }
  return n;
}
function ke(t, n) {
  const e = Ra(n);
  if (e.startsWith("/"))
    return e.slice(1).replace(/\\/g, "/").split("/").map(Zi).join("/");
  const o = t.replace(/\\/g, "/").split("/").filter(Boolean), s = e.replace(/\\/g, "/").split("/").filter(Boolean).map(Zi), i = [...o];
  for (const r of s)
    r === ".." ? i.pop() : r !== "." && i.push(r);
  return i.join("/");
}
function X(t) {
  return t / 914400 * 96;
}
function vn(t) {
  return t / 6e4;
}
function Eo(t) {
  return t / 1e5;
}
function Ia(t) {
  return t * 96 / 72;
}
const Ta = [
  "dk1",
  "dk2",
  "lt1",
  "lt2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hlink",
  "folHlink"
];
function za(t) {
  const n = t.child("srgbClr");
  if (n.exists())
    return n.attr("val");
  const e = t.child("sysClr");
  if (e.exists())
    return e.attr("lastClr") ?? e.attr("val");
}
function Gi(t) {
  const n = {};
  for (const o of t.children("font")) {
    const s = o.attr("script"), i = o.attr("typeface");
    s && i && (n[s] = i);
  }
  const e = {
    latin: t.child("latin").attr("typeface") ?? "",
    ea: t.child("ea").attr("typeface") ?? "",
    cs: t.child("cs").attr("typeface") ?? ""
  };
  return Object.keys(n).length > 0 && (e.scripts = n), e;
}
function Hi(t) {
  const n = t.child("themeElements"), e = n.exists() ? n : t, o = e.child("clrScheme"), s = /* @__PURE__ */ new Map();
  for (const f of Ta) {
    const y = o.child(f);
    if (y.exists()) {
      const m = za(y);
      m !== void 0 && s.set(f, m);
    }
  }
  const i = e.child("fontScheme"), r = Gi(i.child("majorFont")), c = Gi(i.child("minorFont")), l = e.child("fmtScheme"), d = l.child("fillStyleLst").allChildren(), u = l.child("bgFillStyleLst").allChildren(), p = l.child("lnStyleLst").allChildren(), g = l.child("effectStyleLst").allChildren();
  return { colorScheme: s, majorFont: r, minorFont: c, fillStyles: d, bgFillStyles: u, lineStyles: p, effectStyles: g };
}
function Da(t) {
  for (const n of ["nvSpPr", "nvPicPr", "nvGraphicFramePr", "nvCxnSpPr"]) {
    const e = t.child(n);
    if (!e.exists()) continue;
    if (e.child("nvPr").child("ph").exists())
      return !0;
  }
  return !1;
}
function Oa(t) {
  const n = t.child("spPr").child("xfrm"), e = n.exists() ? n : t.child("xfrm");
  if (!e.exists()) return null;
  const o = e.child("off"), s = e.child("ext"), i = o.numAttr("x") ?? 0, r = o.numAttr("y") ?? 0, c = s.numAttr("cx") ?? 0, l = s.numAttr("cy") ?? 0;
  return { offX: i, offY: r, cx: c, cy: l };
}
function Na(t) {
  const n = t.child("grpSpPr");
  if (!n.exists()) return null;
  const e = n.child("xfrm");
  if (!e.exists()) return null;
  const o = e.child("off"), s = e.child("ext"), i = e.child("chOff"), r = e.child("chExt"), c = o.numAttr("x") ?? 0, l = o.numAttr("y") ?? 0, a = s.numAttr("cx") ?? 0, d = s.numAttr("cy") ?? 0, h = i.exists() ? i.numAttr("x") ?? 0 : 0, u = i.exists() ? i.numAttr("y") ?? 0 : 0, x = r.exists() ? r.numAttr("cx") ?? a : a, p = r.exists() ? r.numAttr("cy") ?? d : d;
  return {
    offX: c,
    offY: l,
    cx: a,
    cy: d,
    chOffX: h,
    chOffY: u,
    chExtCx: x > 0 ? x : 1,
    chExtCy: p > 0 ? p : 1
  };
}
function fs(t, n) {
  const e = [];
  for (const o of t.allChildren()) {
    if (o.localName === "grpSp") {
      const i = Na(o);
      if (i && i.chExtCx > 0 && i.chExtCy > 0) {
        const r = i.cx / i.chExtCx, c = i.cy / i.chExtCy, l = i.offX - i.chOffX * r, a = i.offY - i.chOffY * c, d = n ? {
          offX: n.offX + l * n.scaleX,
          offY: n.offY + a * n.scaleY,
          scaleX: n.scaleX * r,
          scaleY: n.scaleY * c
        } : { offX: l, offY: a, scaleX: r, scaleY: c };
        e.push(...fs(o, d));
      } else
        e.push(...fs(o, n));
      continue;
    }
    if (!Da(o)) continue;
    const s = Oa(o);
    if (!s) {
      e.push({ node: o });
      continue;
    }
    if (n) {
      const i = n.offX + s.offX * n.scaleX, r = n.offY + s.offY * n.scaleY, c = s.cx * n.scaleX, l = s.cy * n.scaleY;
      e.push({
        node: o,
        absoluteXfrm: {
          position: { x: X(i), y: X(r) },
          size: { w: X(c), h: X(l) }
        }
      });
    } else
      e.push({
        node: o,
        absoluteXfrm: {
          position: { x: X(s.offX), y: X(s.offY) },
          size: { w: X(s.cx), h: X(s.cy) }
        }
      });
  }
  return e;
}
function Za(t) {
  const n = /* @__PURE__ */ new Map(), e = t.element;
  if (!e) return n;
  const o = e.attributes;
  for (let s = 0; s < o.length; s++) {
    const i = o[s];
    n.set(i.localName, i.value);
  }
  return n;
}
function Ga(t) {
  const n = t.child("cSld"), e = n.child("bg"), o = e.exists() ? e : void 0, s = n.child("spTree"), i = t.child("clrMap"), r = Za(i), c = t.child("txStyles"), l = c.child("titleStyle"), a = c.child("bodyStyle"), d = c.child("otherStyle"), h = t.child("defaultTextStyle"), u = fs(s, null), x = u.map((p) => p.node);
  return {
    colorMap: r,
    background: o,
    textStyles: {
      titleStyle: l.exists() ? l : void 0,
      bodyStyle: a.exists() ? a : void 0,
      otherStyle: d.exists() ? d : void 0
    },
    defaultTextStyle: h.exists() ? h : void 0,
    placeholders: x,
    placeholderEntries: u,
    spTree: s,
    rels: /* @__PURE__ */ new Map()
    // populated later by buildPresentation
  };
}
const Ha = /* @__PURE__ */ new Set(["1", "true", "t", "on"]), Wa = /* @__PURE__ */ new Set(["0", "false", "f", "off"]);
function ue(t, n = !1) {
  if (t === void 0) return n;
  const e = t.trim().toLowerCase();
  return Ha.has(e) ? !0 : Wa.has(e) ? !1 : n;
}
function Ua(t) {
  return ue(t, !0);
}
function Va(t) {
  for (const n of ["nvSpPr", "nvPicPr", "nvGraphicFramePr", "nvCxnSpPr"]) {
    const e = t.child(n);
    if (!e.exists()) continue;
    if (e.child("nvPr").child("ph").exists())
      return !0;
  }
  return !1;
}
function _a(t) {
  const n = t.child("spPr").child("xfrm"), e = n.exists() ? n : t.child("xfrm");
  if (!e.exists()) return null;
  const o = e.child("off"), s = e.child("ext"), i = o.numAttr("x") ?? 0, r = o.numAttr("y") ?? 0, c = s.numAttr("cx") ?? 0, l = s.numAttr("cy") ?? 0;
  return { offX: i, offY: r, cx: c, cy: l };
}
function Xa(t) {
  const n = t.child("grpSpPr");
  if (!n.exists()) return null;
  const e = n.child("xfrm");
  if (!e.exists()) return null;
  const o = e.child("off"), s = e.child("ext"), i = e.child("chOff"), r = e.child("chExt"), c = o.numAttr("x") ?? 0, l = o.numAttr("y") ?? 0, a = s.numAttr("cx") ?? 0, d = s.numAttr("cy") ?? 0, h = i.exists() ? i.numAttr("x") ?? 0 : 0, u = i.exists() ? i.numAttr("y") ?? 0 : 0, x = r.exists() ? r.numAttr("cx") ?? a : a, p = r.exists() ? r.numAttr("cy") ?? d : d;
  return {
    offX: c,
    offY: l,
    cx: a,
    cy: d,
    chOffX: h,
    chOffY: u,
    chExtCx: x > 0 ? x : 1,
    chExtCy: p > 0 ? p : 1
  };
}
function $s(t, n) {
  const e = [];
  for (const o of t.allChildren()) {
    if (o.localName === "grpSp") {
      const i = Xa(o);
      if (i && i.chExtCx > 0 && i.chExtCy > 0) {
        const r = i.cx / i.chExtCx, c = i.cy / i.chExtCy, l = i.offX - i.chOffX * r, a = i.offY - i.chOffY * c, d = n ? {
          offX: n.offX + l * n.scaleX,
          offY: n.offY + a * n.scaleY,
          scaleX: n.scaleX * r,
          scaleY: n.scaleY * c
        } : { offX: l, offY: a, scaleX: r, scaleY: c }, h = $s(o, d);
        e.push(...h);
      } else
        e.push(...$s(o, n));
      continue;
    }
    if (!Va(o)) continue;
    const s = _a(o);
    if (!s) {
      e.push({ node: o });
      continue;
    }
    if (n) {
      const i = n.offX + s.offX * n.scaleX, r = n.offY + s.offY * n.scaleY, c = s.cx * n.scaleX, l = s.cy * n.scaleY;
      e.push({
        node: o,
        absoluteXfrm: {
          position: { x: X(i), y: X(r) },
          size: { w: X(c), h: X(l) }
        }
      });
    } else
      e.push({
        node: o,
        absoluteXfrm: {
          position: { x: X(s.offX), y: X(s.offY) },
          size: { w: X(s.cx), h: X(s.cy) }
        }
      });
  }
  return e;
}
function Ya(t) {
  const n = /* @__PURE__ */ new Map(), e = t.element;
  if (!e) return n;
  const o = e.attributes;
  for (let s = 0; s < o.length; s++) {
    const i = o[s];
    n.set(i.localName, i.value);
  }
  return n;
}
function qa(t) {
  const n = t.child("cSld"), e = n.child("bg"), o = e.exists() ? e : void 0, s = n.child("spTree");
  let i;
  const r = t.child("clrMapOvr");
  if (r.exists()) {
    const a = r.child("overrideClrMapping");
    a.exists() && (i = Ya(a));
  }
  const c = $s(s, null), l = Ua(t.attr("showMasterSp"));
  return {
    colorMapOverride: i,
    background: o,
    placeholders: c,
    spTree: s,
    rels: /* @__PURE__ */ new Map(),
    // populated later by buildPresentation
    showMasterSp: l
  };
}
function Qa(t) {
  const n = ["nvSpPr", "nvPicPr", "nvGrpSpPr", "nvGraphicFramePr", "nvCxnSpPr"];
  for (const e of n) {
    const o = t.child(e);
    if (o.exists())
      return {
        cNvPr: o.child("cNvPr"),
        nvPr: o.child("nvPr")
      };
  }
  return {
    cNvPr: t.child("cNvPr"),
    nvPr: t.child("nvPr")
  };
}
function Ka(t) {
  const n = t.child("spPr");
  if (n.exists()) {
    const s = n.child("xfrm");
    if (s.exists()) return s;
  }
  const e = t.child("grpSpPr");
  if (e.exists()) {
    const s = e.child("xfrm");
    if (s.exists()) return s;
  }
  const o = t.child("xfrm");
  return o.exists() ? o : t.child("__nonexistent__");
}
function Ja(t) {
  const n = t.child("ph");
  if (!n.exists()) return;
  const e = n.attr("type"), o = n.numAttr("idx");
  return { type: e, idx: o };
}
function en(t) {
  const { cNvPr: n, nvPr: e } = Qa(t), o = n.attr("id") ?? "", s = n.attr("name") ?? "", i = Ka(t), r = i.child("off"), c = i.child("ext"), l = {
    x: X(r.numAttr("x") ?? 0),
    y: X(r.numAttr("y") ?? 0)
  }, a = {
    w: X(c.numAttr("cx") ?? 0),
    h: X(c.numAttr("cy") ?? 0)
  }, d = vn(i.numAttr("rot") ?? 0), h = ue(i.attr("flipH")), u = ue(i.attr("flipV")), x = Ja(e);
  let p;
  const $ = n.child("hlinkClick");
  return $.exists() && (p = {
    action: $.attr("action") ?? void 0,
    rId: $.attr("id") ?? $.attr("r:id") ?? void 0,
    tooltip: $.attr("tooltip") ?? void 0
  }), {
    id: o,
    name: s,
    position: l,
    size: a,
    rotation: d,
    flipH: h,
    flipV: u,
    placeholder: x,
    hlinkClick: p,
    source: t
  };
}
function ja(t) {
  const n = t.child("pPr"), e = n.numAttr("lvl") ?? 0, o = [];
  for (const r of t.children("r")) {
    const c = r.child("rPr"), l = r.child("t");
    o.push({
      text: l.text(),
      properties: c.exists() ? c : void 0
    });
  }
  for (const r of t.allChildren())
    r.localName;
  const s = [];
  for (const r of t.allChildren()) {
    const c = r.localName;
    if (c === "r") {
      const l = r.child("rPr"), a = r.child("t");
      s.push({
        text: a.text(),
        properties: l.exists() ? l : void 0
      });
    } else if (c === "br") {
      const l = r.child("rPr");
      s.push({
        text: `
`,
        properties: l.exists() ? l : void 0
      });
    } else if (c === "tab")
      s.push({
        text: "	"
      });
    else if (c === "fld") {
      const l = r.child("rPr"), a = r.child("t");
      s.push({
        text: a.text(),
        properties: l.exists() ? l : void 0
      });
    }
  }
  const i = t.child("endParaRPr");
  return {
    properties: n.exists() ? n : void 0,
    runs: s.length > 0 ? s : o,
    level: e,
    endParaRPr: i.exists() ? i : void 0
  };
}
function lc(t) {
  if (!t.exists()) return;
  const n = t.child("bodyPr"), e = t.child("lstStyle"), o = [];
  for (const s of t.children("p"))
    o.push(ja(s));
  return {
    bodyProperties: n.exists() ? n : void 0,
    listStyle: e.exists() ? e : void 0,
    paragraphs: o
  };
}
const td = ["solidFill", "gradFill", "blipFill", "pattFill", "grpFill", "noFill"];
function ed(t) {
  for (const n of td) {
    const e = t.child(n);
    if (e.exists()) return e;
  }
}
function nd(t) {
  const n = /* @__PURE__ */ new Map();
  for (const e of t.children("gd")) {
    const o = e.attr("name"), s = e.attr("fmla") ?? "";
    if (!o) continue;
    const i = s.match(/val\s+(-?\d+)/);
    if (i)
      n.set(o, Number(i[1]));
    else {
      const r = Number(s);
      Number.isNaN(r) || n.set(o, r);
    }
  }
  return n;
}
function od(t) {
  const n = en(t), e = t.child("spPr"), o = e.child("prstGeom"), s = o.attr("prst"), i = o.child("avLst"), r = nd(i), c = e.child("custGeom"), l = c.exists() ? c : void 0, a = ed(e), d = e.child("ln"), h = d.exists() ? d : void 0;
  let u, x;
  if (d.exists()) {
    const y = d.child("headEnd");
    if (y.exists()) {
      const b = y.attr("type");
      b && b !== "none" && (u = { type: b, w: y.attr("w"), len: y.attr("len") });
    }
    const m = d.child("tailEnd");
    if (m.exists()) {
      const b = m.attr("type");
      b && b !== "none" && (x = { type: b, w: m.attr("w"), len: m.attr("len") });
    }
  }
  const p = t.child("txBody"), $ = lc(p);
  let g;
  const f = t.child("txXfrm");
  if (f.exists()) {
    const y = f.child("off"), m = f.child("ext"), b = e.child("xfrm"), M = b.child("off"), L = b.child("ext"), v = M.numAttr("x") ?? 0, k = M.numAttr("y") ?? 0, A = L.numAttr("cx") ?? 0, S = L.numAttr("cy") ?? 0, w = y.numAttr("x") ?? 0, F = y.numAttr("y") ?? 0, C = m.numAttr("cx") ?? 0, E = m.numAttr("cy") ?? 0;
    if (A > 0 && S > 0) {
      const P = vn(f.numAttr("rot") ?? 0), B = w - v, R = F - k, I = Math.abs(Math.round(P)) % 360 === 180, Z = I ? A - (B + C) : B, U = I ? S - (R + E) : R;
      g = {
        x: X(Z),
        y: X(U),
        w: X(C),
        h: X(E),
        rotation: P
      };
    }
  }
  return {
    ...n,
    nodeType: "shape",
    presetGeometry: s,
    adjustments: r,
    customGeometry: l,
    fill: a,
    line: h,
    headEnd: u,
    tailEnd: x,
    textBody: $,
    textBoxBounds: g
  };
}
const to = 1e5;
function ac(t) {
  const n = en(t), e = t.child("blipFill"), o = e.child("blip"), s = o.attr("embed") ?? o.attr("r:embed"), i = o.attr("link") ?? o.attr("r:link"), r = e.child("srcRect");
  let c;
  if (r.exists()) {
    const A = r.numAttr("t"), S = r.numAttr("b"), w = r.numAttr("l"), F = r.numAttr("r");
    (A !== void 0 || S !== void 0 || w !== void 0 || F !== void 0) && (c = {
      top: (A ?? 0) / to,
      bottom: (S ?? 0) / to,
      left: (w ?? 0) / to,
      right: (F ?? 0) / to
    });
  }
  const l = t.child("spPr"), a = l.child("solidFill"), d = l.child("gradFill"), h = a.exists() ? a : d.exists() ? d : void 0, u = l.child("ln"), x = u.exists() ? u : void 0, p = l.child("prstGeom"), $ = p.exists() ? p.attr("prst") : void 0, g = l.child("custGeom"), f = g.exists() ? g : void 0, m = t.child("nvPicPr").child("nvPr"), b = m.child("videoFile"), M = m.child("audioFile"), L = b.exists(), v = M.exists();
  let k;
  return L ? k = b.attr("link") ?? b.attr("r:link") : v && (k = M.attr("link") ?? M.attr("r:link")), {
    ...n,
    nodeType: "picture",
    blipEmbed: s,
    blipLink: i,
    crop: c,
    fill: h,
    line: x,
    presetGeometry: $,
    customGeometry: f,
    isVideo: L || void 0,
    isAudio: v || void 0,
    mediaRId: k
  };
}
function sd(t) {
  const n = t.numAttr("gridSpan") ?? 1, e = t.numAttr("rowSpan") ?? 1, o = ue(t.attr("hMerge")), s = ue(t.attr("vMerge")), i = t.child("txBody"), r = lc(i), c = t.child("tcPr");
  return {
    gridSpan: n,
    rowSpan: e,
    hMerge: o,
    vMerge: s,
    textBody: r,
    properties: c.exists() ? c : void 0
  };
}
function id(t) {
  const n = X(t.numAttr("h") ?? 0), e = [];
  for (const o of t.children("tc"))
    e.push(sd(o));
  return { height: n, cells: e };
}
function rd(t) {
  return t.child("graphic").child("graphicData").child("tbl");
}
function cd(t) {
  const n = t.child("tableStyleId");
  if (n.exists())
    return n.text() || n.attr("val") || void 0;
  const e = t.child("tblStyle");
  return e.exists() ? e.attr("val") ?? (e.text() || void 0) : t.attr("tblStyle") ?? void 0;
}
function ld(t) {
  const n = en(t), e = rd(t), o = e.child("tblGrid"), s = [];
  for (const l of o.children("gridCol"))
    s.push(X(l.numAttr("w") ?? 0));
  const i = [];
  for (const l of e.children("tr"))
    i.push(id(l));
  const r = e.child("tblPr"), c = cd(r);
  return {
    ...n,
    nodeType: "table",
    columns: s,
    rows: i,
    properties: r.exists() ? r : void 0,
    tableStyleId: c
  };
}
const ad = /* @__PURE__ */ new Set(["sp", "pic", "grpSp", "graphicFrame", "cxnSp"]);
function dd(t) {
  const n = en(t), o = t.child("grpSpPr").child("xfrm"), s = o.child("chOff"), i = o.child("chExt"), r = s.exists() ? { x: X(s.numAttr("x") ?? 0), y: X(s.numAttr("y") ?? 0) } : { x: 0, y: 0 }, c = (() => {
    if (!i.exists()) return { w: n.size.w, h: n.size.h };
    const a = i.numAttr("cx"), d = i.numAttr("cy");
    return {
      w: a !== void 0 && a > 0 ? X(a) : n.size.w,
      h: d !== void 0 && d > 0 ? X(d) : n.size.h
    };
  })(), l = [];
  for (const a of t.allChildren())
    ad.has(a.localName) && l.push(a);
  return {
    ...n,
    nodeType: "group",
    childOffset: r,
    childExtent: c,
    children: l
  };
}
function hd(t, n, e) {
  const o = en(t), i = t.child("graphic").child("graphicData");
  let r;
  for (const d of i.allChildren())
    if (d.localName === "chart") {
      r = d.attr("r:id") || d.attr("id");
      break;
    }
  if (!r) return;
  const c = n.get(r);
  if (!c) return;
  const l = e.substring(0, e.lastIndexOf("/")), a = ke(l, c.target);
  return {
    ...o,
    nodeType: "chart",
    chartPath: a
  };
}
const ud = /* @__PURE__ */ new Set(["sp", "pic", "grpSp", "graphicFrame", "cxnSp"]), fd = ["nvSpPr", "nvPicPr", "nvGrpSpPr", "nvGraphicFramePr", "nvCxnSpPr"];
function Cs(t) {
  for (const n of fd) {
    const e = t.child(n);
    if (e.exists() && e.child("nvPr").child("ph").exists()) return !0;
  }
  return !1;
}
function $d(t) {
  return t.child("graphic").child("graphicData").child("tbl").exists();
}
function pd(t) {
  return (t.child("graphic").child("graphicData").attr("uri") || "").includes("chart");
}
function xd(t) {
  return (t.child("graphic").child("graphicData").attr("uri") || "").includes("diagram");
}
function yd(t) {
  if (!t) return "";
  const n = t.lastIndexOf("/");
  return n >= 0 ? t.substring(0, n) : "";
}
function gd(t) {
  const n = t.child("graphic").child("graphicData");
  if (!(n.attr("uri") || "").includes("ole")) return null;
  const o = (r) => {
    const c = r.child("blipFill").child("blip");
    return !!(c.attr("embed") ?? c.attr("r:embed") ?? c.attr("link") ?? c.attr("r:link"));
  }, s = n.child("oleObj");
  if (s.exists()) {
    const r = s.child("pic");
    if (r.exists() && o(r)) return r;
  }
  const i = n.child("AlternateContent");
  if (!i.exists()) return null;
  for (const r of ["Fallback", "Choice"]) {
    const c = i.child(r).child("oleObj");
    if (!c.exists()) continue;
    const l = c.child("pic");
    if (l.exists() && o(l))
      return l;
  }
  return null;
}
function md(t) {
  const n = gd(t);
  if (!n) return;
  const e = en(t), o = ac(n);
  if (!(!o.blipEmbed && !o.blipLink))
    return {
      ...o,
      ...e,
      nodeType: "picture",
      source: n
    };
}
function bd(t, n) {
  const o = ge(n).child("spTree"), s = [];
  if (o.exists())
    for (const i of o.allChildren())
      ud.has(i.localName) && s.push(i);
  return {
    ...t,
    nodeType: "group",
    childOffset: { x: 0, y: 0 },
    childExtent: { w: Math.max(1, t.size.w), h: Math.max(1, t.size.h) },
    children: s
  };
}
function Md(t, n) {
  var r;
  if (!n.diagramDrawings) return;
  const e = en(t), o = yd(n.partPath), s = Array.from(n.rels.values()).filter(
    (c) => c.type.includes("diagramDrawing") || c.target.includes("diagrams/drawing")
  ).map((c) => {
    const l = c.target.match(/drawing(\d+)/);
    return {
      target: c.target,
      num: l ? Number.parseInt(l[1], 10) : void 0
    };
  }), i = t.child("graphic").child("graphicData").child("relIds");
  if (i.exists()) {
    const c = i.attr("r:dm") ?? i.attr("dm"), l = c ? n.rels.get(c) : void 0, a = (r = l == null ? void 0 : l.target.match(/data(\d+)/)) == null ? void 0 : r[1];
    if (a) {
      const d = Number.parseInt(a, 10);
      s.sort((h, u) => {
        const x = h.num === void 0 ? Number.POSITIVE_INFINITY : Math.abs(h.num - d), p = u.num === void 0 ? Number.POSITIVE_INFINITY : Math.abs(u.num - d);
        return x - p;
      });
    }
  }
  for (const c of s) {
    const l = ke(o, c.target), a = n.diagramDrawings.get(l);
    if (a) return bd(e, a);
  }
}
function Nn(t, n) {
  if (!(n.skipPlaceholders && Cs(t)))
    switch (t.localName) {
      case "sp":
      case "cxnSp":
        return od(t);
      case "pic":
        return ac(t);
      case "grpSp":
        return dd(t);
      case "graphicFrame":
        return $d(t) ? ld(t) : pd(t) ? hd(t, n.rels, n.partPath ?? "") : xd(t) ? Md(t, n) : md(t);
      default:
        return;
    }
}
function Wi(t) {
  return ue(t, !0);
}
function dc(t) {
  for (const [, n] of t)
    if (n.type.includes("slideLayout"))
      return n.target;
  return "";
}
function hc(t, n, e, o = "", s) {
  const i = t.child("cSld"), r = i.child("bg"), c = r.exists() ? r : void 0, l = i.child("spTree"), a = [];
  for (const x of l.allChildren()) {
    const p = Nn(x, {
      rels: e,
      partPath: o,
      diagramDrawings: s
    });
    p && a.push(p);
  }
  const d = dc(e), h = Wi(t.attr("showMasterSp")), u = !Wi(t.attr("show"));
  return {
    index: n,
    hidden: u,
    nodes: a,
    background: c,
    layoutIndex: d,
    rels: e,
    slidePath: o,
    showMasterSp: h,
    nodesMaterialized: !0
  };
}
function Ld(t, n, e, o = "") {
  return {
    index: n,
    nodes: [],
    layoutIndex: dc(e),
    rels: e,
    slidePath: o,
    showMasterSp: !0,
    sourceXml: t,
    nodesMaterialized: !1
  };
}
function vd(t, n) {
  if (t.nodesMaterialized) return;
  if (!t.sourceXml) {
    t.nodesMaterialized = !0;
    return;
  }
  const e = t.layoutIndex, o = hc(
    ge(t.sourceXml),
    t.index,
    t.rels,
    t.slidePath,
    n
  );
  t.hidden = o.hidden, t.nodes = o.nodes, t.background = o.background, t.layoutIndex = e || o.layoutIndex, t.showMasterSp = o.showMasterSp, t.nodesMaterialized = !0, t.sourceXml = void 0;
}
function je(t) {
  const n = t.lastIndexOf("/");
  return n >= 0 ? t.substring(0, n) : "";
}
function eo(t) {
  const n = je(t), e = t.substring(t.lastIndexOf("/") + 1);
  return `${n}/_rels/${e}.rels`;
}
function Ad(t) {
  return t.includes("wps") || t.includes("kso") || t.includes("Kingsoft") || t.includes("WPS");
}
function Bn(t, n) {
  for (const [, e] of t)
    if (e.type.includes(n))
      return e;
}
function Sd(t, n) {
  const e = [];
  for (const [o, s] of t)
    s.type.includes(n) && e.push([o, s]);
  return e;
}
function go(t, n = {}) {
  var k, A, S, w;
  const e = ge(t.presentation), o = Pn(t.presentationRels), s = e.child("sldSz"), i = X(s.numAttr("cx") ?? 9144e3), r = X(s.numAttr("cy") ?? 6858e3), c = Ad(t.presentation), l = e.child("defaultTextStyle"), a = /* @__PURE__ */ new Map();
  for (const [F, C] of t.themes) {
    const E = ge(C);
    a.set(F, Hi(E));
  }
  const d = /* @__PURE__ */ new Map(), h = /* @__PURE__ */ new Map();
  for (const [F, C] of t.slideMasters) {
    const E = ge(C), P = Ga(E), B = eo(F), R = t.slideMasterRels.get(B);
    if (R) {
      const I = Pn(R);
      P.rels = I;
      const Z = Bn(I, "theme");
      if (Z) {
        const U = ke(je(F), Z.target);
        h.set(F, U);
      }
    }
    d.set(F, P);
  }
  const u = /* @__PURE__ */ new Map(), x = /* @__PURE__ */ new Map();
  for (const [F, C] of t.slideLayouts) {
    const E = ge(C), P = qa(E), B = eo(F), R = t.slideLayoutRels.get(B);
    if (R) {
      const I = Pn(R);
      P.rels = I;
      const Z = Bn(I, "slideMaster");
      if (Z) {
        const U = ke(je(F), Z.target);
        x.set(F, U);
      }
    }
    u.set(F, P);
  }
  const p = /* @__PURE__ */ new Map(), $ = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map();
  for (const [F, C] of t.charts) {
    const E = ge(C);
    E.exists() && p.set(F, E);
    const P = eo(F), B = (k = t.chartRels) == null ? void 0 : k.get(P);
    if (!B) continue;
    const R = Pn(B), I = Bn(R, "chartStyle");
    if (I) {
      const T = ke(je(F), I.target), D = (A = t.chartStyles) == null ? void 0 : A.get(T);
      if (D) {
        const O = ge(D);
        O.exists() && g.set(F, O);
      }
    }
    const Z = Bn(R, "chartColorStyle");
    if (Z) {
      const T = ke(je(F), Z.target), D = (S = t.chartColors) == null ? void 0 : S.get(T);
      if (D) {
        const O = ge(D);
        O.exists() && f.set(F, O);
      }
    }
    const U = Bn(R, "themeOverride");
    if (!U) continue;
    const q = ke(je(F), U.target), Q = ((w = t.themeOverrides) == null ? void 0 : w.get(q)) ?? t.themes.get(q);
    if (!Q) continue;
    const G = ge(Q);
    G.exists() && $.set(F, Hi(G));
  }
  const y = e.child("sldIdLst"), m = [];
  for (const F of y.children("sldId")) {
    const C = F.attr("r:id") ?? F.attr("id");
    if (C) {
      const E = o.get(C);
      if (E) {
        const P = ke("ppt", E.target);
        m.push(P);
      }
    }
  }
  if (m.length === 0) {
    const F = Sd(o, "slide");
    F.sort((C, E) => {
      const P = parseInt(C[0].replace(/\D/g, ""), 10) || 0, B = parseInt(E[0].replace(/\D/g, ""), 10) || 0;
      return P - B;
    });
    for (const [, C] of F)
      if (C.type.includes("/slide") && !C.type.includes("slideLayout") && !C.type.includes("slideMaster")) {
        const E = ke("ppt", C.target);
        m.push(E);
      }
  }
  const b = [], M = /* @__PURE__ */ new Map();
  for (let F = 0; F < m.length; F++) {
    const C = m[F], E = t.slides.get(C);
    if (!E) continue;
    const P = eo(C), B = t.slideRels.get(P), R = B ? Pn(B) : /* @__PURE__ */ new Map(), I = n.lazySlides ? Ld(E, F, R, C) : hc(ge(E), F, R, C, t.diagramDrawings);
    if (I.layoutIndex) {
      const Z = ke(je(C), I.layoutIndex);
      I.layoutIndex = Z, M.set(F, Z);
    }
    b.push(I);
  }
  let L;
  if (t.tableStyles) {
    const F = ge(t.tableStyles);
    F.exists() && (L = F);
  }
  const v = {
    width: i,
    height: r,
    slides: b,
    layouts: u,
    masters: d,
    themes: a,
    slideToLayout: M,
    layoutToMaster: x,
    masterToTheme: h,
    media: t.media,
    mediaResolver: t.mediaResolver,
    tableStyles: L,
    defaultTextStyle: l.exists() ? l : void 0,
    charts: p,
    diagramDrawings: t.diagramDrawings,
    chartThemes: $,
    chartStyles: g,
    chartColorStyles: f,
    isWps: c
  };
  return n.lazySlides || Fd(v), v;
}
function ps(t) {
  for (const n of ["nvSpPr", "nvPicPr", "nvGrpSpPr", "nvGraphicFramePr", "nvCxnSpPr"]) {
    const e = t.child(n);
    if (e.exists()) {
      const s = e.child("nvPr").child("ph");
      if (s.exists()) {
        const i = s.attr("type"), r = s.attr("idx"), c = r !== void 0 ? Number(r) : void 0;
        return { type: i, idx: c !== void 0 && !isNaN(c) ? c : void 0 };
      }
    }
  }
  return {};
}
function Ui(t) {
  const n = t.child("spPr").child("xfrm"), e = n.exists() ? n : t.child("xfrm");
  if (e.exists()) {
    const o = e.child("off"), s = e.child("ext"), i = o.numAttr("x"), r = s.numAttr("cx");
    if (i !== void 0 && r !== void 0)
      return {
        position: { x: X(o.numAttr("x") ?? 0), y: X(o.numAttr("y") ?? 0) },
        size: { w: X(s.numAttr("cx") ?? 0), h: X(s.numAttr("cy") ?? 0) }
      };
  }
}
function Vi(t, n, e) {
  let o;
  for (const s of t) {
    const i = ps(s.node);
    if (n !== void 0 && i.type === n && e !== void 0 && i.idx === e || (n !== void 0 && i.type === n && !o && (o = s), e !== void 0 && i.idx === e && n === void 0 && i.type === void 0))
      return s;
  }
  if (n === void 0 && e !== void 0) {
    for (const s of t)
      if (ps(s.node).idx === e) return s;
  }
  return o;
}
function Cd(t) {
  return t.placeholderEntries ?? t.placeholders.map((n) => ({ node: n }));
}
function Fd(t) {
  for (let n = 0; n < t.slides.length; n++)
    uc(t, t.slides[n]);
}
function uc(t, n) {
  if (n.placeholderInheritanceResolved) return;
  const e = t.slideToLayout.get(n.index) || n.layoutIndex, o = e ? t.layouts.get(e) : void 0, s = e ? t.layoutToMaster.get(e) : void 0, i = s ? t.masters.get(s) : void 0;
  wd(n.nodes, o, i), n.placeholderInheritanceResolved = !0;
}
function Po(t, n) {
  vd(n, t.diagramDrawings), uc(t, n);
}
function Vp(t) {
  for (const n of t.slides)
    Po(t, n);
}
function Ko(t) {
  const n = t.child("txBody");
  if (!n.exists()) return;
  const e = n.child("bodyPr");
  return e.exists() ? e : void 0;
}
function Jo(t, n) {
  if (t.type) return;
  const e = ps(n);
  e.type && (t.type = e.type);
}
function kd(t, n) {
  const e = n.childExtent.w > 0 ? n.size.w / n.childExtent.w : 1, o = n.childExtent.h > 0 ? n.size.h / n.childExtent.h : 1;
  return e === 0 || o === 0 ? t : {
    position: {
      x: n.childOffset.x + (t.position.x - n.position.x) / e,
      y: n.childOffset.y + (t.position.y - n.position.y) / o
    },
    size: {
      w: t.size.w / e,
      h: t.size.h / o
    }
  };
}
function _i(t, n) {
  return n.parentGroup ? kd(t, n.parentGroup) : t;
}
function Bo(t, n, e, o = {}) {
  if (!t.placeholder) return;
  const { type: s, idx: i } = t.placeholder, r = () => {
    var d;
    return e ? Vi(
      Cd(e),
      ((d = t.placeholder) == null ? void 0 : d.type) ?? s,
      i
    ) : void 0;
  }, c = t.size.w === 0 && t.size.h === 0, l = t.position.y < 5;
  if (n) {
    const d = Vi(n.placeholders, s, i);
    if (d) {
      Jo(t.placeholder, d.node);
      const h = d.absoluteXfrm ?? Ui(d.node);
      if (h) {
        const u = _i(h, o);
        c ? (t.position = u.position, t.size = u.size) : l && (t.position = u.position);
      }
      if ("textBody" in t && t.textBody) {
        const u = Ko(d.node);
        u && (t.textBody.layoutBodyProperties = u);
      }
      if (h) {
        const u = r();
        if (u && (Jo(t.placeholder, u.node), "textBody" in t && t.textBody && !t.textBody.layoutBodyProperties)) {
          const x = Ko(u.node);
          x && (t.textBody.layoutBodyProperties = x);
        }
        return;
      }
    }
  }
  const a = r();
  if (a) {
    Jo(t.placeholder, a.node);
    const d = a.absoluteXfrm ?? Ui(a.node);
    if (d) {
      const h = _i(d, o);
      c ? (t.position = h.position, t.size = h.size) : l && (t.position = h.position);
    }
    if ("textBody" in t && t.textBody && !t.textBody.layoutBodyProperties) {
      const h = Ko(a.node);
      h && (t.textBody.layoutBodyProperties = h);
    }
  }
}
function wd(t, n, e) {
  for (const o of t)
    o.nodeType === "group" && "children" in o, Bo(o, n, e);
}
function Ed(t, n, e, o, s, i) {
  const r = t.slideToLayout.get(n.index) || "", c = t.layoutToMaster.get(r) || "", l = t.masterToTheme.get(c) || "", a = t.layouts.get(r) || {
    placeholders: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    spTree: {},
    rels: /* @__PURE__ */ new Map(),
    showMasterSp: !0
  }, d = t.masters.get(c) || {
    colorMap: /* @__PURE__ */ new Map(),
    textStyles: {},
    placeholders: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    spTree: {},
    rels: /* @__PURE__ */ new Map()
  }, h = t.themes.get(l) || {
    colorScheme: /* @__PURE__ */ new Map(),
    majorFont: { latin: "Calibri", ea: "", cs: "" },
    minorFont: { latin: "Calibri", ea: "", cs: "" },
    fillStyles: [],
    bgFillStyles: [],
    lineStyles: [],
    effectStyles: []
  };
  return {
    presentation: t,
    slide: n,
    theme: h,
    master: d,
    layout: a,
    partPath: n.slidePath,
    layoutPath: r,
    masterPath: c,
    mediaUrlCache: e ?? /* @__PURE__ */ new Map(),
    colorCache: /* @__PURE__ */ new Map(),
    pdfjs: s,
    signal: i,
    chartInstances: o
  };
}
function Et(t) {
  const n = t.replace(/^#/, "");
  if (n.length !== 6 && n.length !== 3)
    return { r: 0, g: 0, b: 0 };
  const e = n.length === 3 ? n[0] + n[0] + n[1] + n[1] + n[2] + n[2] : n, o = parseInt(e, 16);
  return {
    r: o >> 16 & 255,
    g: o >> 8 & 255,
    b: o & 255
  };
}
function qt(t, n, e) {
  const o = (s) => Math.max(0, Math.min(255, Math.round(s)));
  return "#" + [o(t), o(n), o(e)].map((s) => s.toString(16).padStart(2, "0")).join("");
}
function Ee(t, n, e) {
  const o = t / 255, s = n / 255, i = e / 255, r = Math.max(o, s, i), c = Math.min(o, s, i), l = (r + c) / 2;
  let a = 0, d = 0;
  if (r !== c) {
    const h = r - c;
    switch (d = l > 0.5 ? h / (2 - r - c) : h / (r + c), r) {
      case o:
        a = ((s - i) / h + (s < i ? 6 : 0)) * 60;
        break;
      case s:
        a = ((i - o) / h + 2) * 60;
        break;
      case i:
        a = ((o - s) / h + 4) * 60;
        break;
    }
  }
  return { h: a, s: d, l };
}
function be(t, n, e) {
  if (t = (t % 360 + 360) % 360, n = Math.max(0, Math.min(1, n)), e = Math.max(0, Math.min(1, e)), n === 0) {
    const c = Math.round(e * 255);
    return { r: c, g: c, b: c };
  }
  const o = (c, l, a) => (a < 0 && (a += 1), a > 1 && (a -= 1), a < 1 / 6 ? c + (l - c) * 6 * a : a < 1 / 2 ? l : a < 2 / 3 ? c + (l - c) * (2 / 3 - a) * 6 : c), s = e < 0.5 ? e * (1 + n) : e + n - e * n, i = 2 * e - s, r = t / 360;
  return {
    r: Math.round(o(i, s, r + 1 / 3) * 255),
    g: Math.round(o(i, s, r) * 255),
    b: Math.round(o(i, s, r - 1 / 3) * 255)
  };
}
function Ne(t) {
  const n = t / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}
function Ze(t) {
  const n = t <= 31308e-7 ? t * 12.92 : 1.055 * t ** 0.4166666666666667 - 0.055;
  return Math.max(0, Math.min(255, Math.round(n * 255)));
}
function fc(t, n) {
  const { r: e, g: o, b: s } = Et(t), i = n / 1e5, r = Ne(e), c = Ne(o), l = Ne(s);
  return qt(
    Ze(r * i + 1 * (1 - i)),
    Ze(c * i + 1 * (1 - i)),
    Ze(l * i + 1 * (1 - i))
  );
}
function Pd(t, n) {
  const { r: e, g: o, b: s } = Et(t), i = n / 1e5;
  return qt(
    Ze(Ne(e) * i),
    Ze(Ne(o) * i),
    Ze(Ne(s) * i)
  );
}
function Bd(t, n) {
  const { r: e, g: o, b: s } = Et(t), { h: i, s: r, l: c } = Ee(e, o, s), l = Math.max(0, Math.min(1, c * (n / 1e5))), a = be(i, r, l);
  return qt(a.r, a.g, a.b);
}
function Rd(t, n) {
  const { r: e, g: o, b: s } = Et(t), { h: i, s: r, l: c } = Ee(e, o, s), l = Math.max(0, Math.min(1, c + n / 1e5)), a = be(i, r, l);
  return qt(a.r, a.g, a.b);
}
function Id(t, n) {
  const { r: e, g: o, b: s } = Et(t), { h: i, s: r, l: c } = Ee(e, o, s), l = Math.max(0, Math.min(1, r * (n / 1e5))), a = be(i, l, c);
  return qt(a.r, a.g, a.b);
}
function Td(t, n) {
  const { r: e, g: o, b: s } = Et(t), { h: i, s: r, l: c } = Ee(e, o, s), l = i * (n / 1e5) % 360, a = be(l, r, c);
  return qt(a.r, a.g, a.b);
}
function zd(t, n) {
  const { r: e, g: o, b: s } = Et(t), { h: i, s: r, l: c } = Ee(e, o, s), l = n / 6e4, a = ((i + l) % 360 + 360) % 360, d = be(a, r, c);
  return qt(d.r, d.g, d.b);
}
function Dd(t, n) {
  const { r: e, g: o, b: s } = Et(t), { h: i, s: r, l: c } = Ee(e, o, s), l = Math.max(0, Math.min(1, r + n / 1e5)), a = be(i, l, c);
  return qt(a.r, a.g, a.b);
}
function $c(t) {
  return t / 1e5 * 255;
}
function Fs(t, n, e) {
  const o = Et(t);
  return o[n] = e(o[n]), qt(o.r, o.g, o.b);
}
function jo(t, n, e) {
  return Fs(t, n, (o) => o * (e / 1e5));
}
function ts(t, n, e) {
  return Fs(t, n, (o) => o + $c(e));
}
function es(t, n, e) {
  return Fs(t, n, () => $c(e));
}
function Od(t, n) {
  const { r: e, g: o, b: s } = Et(t), { h: i, s: r } = Ee(e, o, s), c = be(i, r, n / 1e5);
  return qt(c.r, c.g, c.b);
}
function Nd(t, n) {
  const { r: e, g: o, b: s } = Et(t), { h: i, l: r } = Ee(e, o, s), c = be(i, n / 1e5, r);
  return qt(c.r, c.g, c.b);
}
function Zd(t, n) {
  const { r: e, g: o, b: s } = Et(t), { s: i, l: r } = Ee(e, o, s), c = be(n / 6e4, i, r);
  return qt(c.r, c.g, c.b);
}
function Gd(t) {
  const { r: n, g: e, b: o } = Et(t);
  return qt(255 - n, 255 - e, 255 - o);
}
function Hd(t) {
  const { r: n, g: e, b: o } = Et(t), s = 0.2126 * n + 0.7152 * e + 0.0722 * o;
  return qt(s, s, s);
}
function Wd(t) {
  const { r: n, g: e, b: o } = Et(t), { h: s, s: i, l: r } = Ee(n, e, o), c = be(s + 180, i, r);
  return qt(c.r, c.g, c.b);
}
function Ud(t) {
  const { r: n, g: e, b: o } = Et(t);
  return qt(Ne(n) * 255, Ne(e) * 255, Ne(o) * 255);
}
function Vd(t) {
  const { r: n, g: e, b: o } = Et(t);
  return qt(Ze(n / 255), Ze(e / 255), Ze(o / 255));
}
function _d(t) {
  return Math.max(0, Math.min(1, t / 1e5));
}
function pe(t, n) {
  let e = t, o = 1;
  for (const s of n)
    switch (s.name.startsWith("a:") ? s.name.slice(2) : s.name) {
      case "tint":
        e = fc(e, s.val);
        break;
      case "shade":
        e = Pd(e, s.val);
        break;
      case "red":
        e = es(e, "r", s.val);
        break;
      case "green":
        e = es(e, "g", s.val);
        break;
      case "blue":
        e = es(e, "b", s.val);
        break;
      case "redMod":
        e = jo(e, "r", s.val);
        break;
      case "greenMod":
        e = jo(e, "g", s.val);
        break;
      case "blueMod":
        e = jo(e, "b", s.val);
        break;
      case "redOff":
        e = ts(e, "r", s.val);
        break;
      case "greenOff":
        e = ts(e, "g", s.val);
        break;
      case "blueOff":
        e = ts(e, "b", s.val);
        break;
      case "lum":
        e = Od(e, s.val);
        break;
      case "lumMod":
        e = Bd(e, s.val);
        break;
      case "lumOff":
        e = Rd(e, s.val);
        break;
      case "sat":
        e = Nd(e, s.val);
        break;
      case "satMod":
        e = Id(e, s.val);
        break;
      case "hue":
        e = Zd(e, s.val);
        break;
      case "hueMod":
        e = Td(e, s.val);
        break;
      case "hueOff":
        e = zd(e, s.val);
        break;
      case "satOff":
        e = Dd(e, s.val);
        break;
      case "inv":
        e = Gd(e);
        break;
      case "gray":
        e = Hd(e);
        break;
      case "comp":
        e = Wd(e);
        break;
      case "gamma":
        e = Ud(e);
        break;
      case "invGamma":
        e = Vd(e);
        break;
      case "alpha":
        o = _d(s.val);
        break;
      case "alphaMod":
      case "alphaModFix":
        o = Math.max(0, Math.min(1, o * (s.val / 1e5)));
        break;
      case "alphaOff":
        o = Math.max(0, Math.min(1, o + s.val / 1e5));
        break;
    }
  return { color: e, alpha: o };
}
const ns = {
  // Basic colors
  black: "#000000",
  white: "#FFFFFF",
  red: "#FF0000",
  green: "#008000",
  blue: "#0000FF",
  yellow: "#FFFF00",
  cyan: "#00FFFF",
  magenta: "#FF00FF",
  // Extended standard colors
  orange: "#FFA500",
  purple: "#800080",
  brown: "#A52A2A",
  pink: "#FFC0CB",
  gray: "#808080",
  grey: "#808080",
  lime: "#00FF00",
  navy: "#000080",
  teal: "#008080",
  maroon: "#800000",
  olive: "#808000",
  silver: "#C0C0C0",
  aqua: "#00FFFF",
  fuchsia: "#FF00FF",
  // OOXML-specific preset colors
  aliceBlue: "#F0F8FF",
  antiqueWhite: "#FAEBD7",
  aquamarine: "#7FFFD4",
  azure: "#F0FFFF",
  beige: "#F5F5DC",
  bisque: "#FFE4C4",
  blanchedAlmond: "#FFEBCD",
  blueViolet: "#8A2BE2",
  burlyWood: "#DEB887",
  cadetBlue: "#5F9EA0",
  chartreuse: "#7FFF00",
  chocolate: "#D2691E",
  coral: "#FF7F50",
  cornflowerBlue: "#6495ED",
  cornsilk: "#FFF8DC",
  crimson: "#DC143C",
  darkBlue: "#00008B",
  darkCyan: "#008B8B",
  darkGoldenrod: "#B8860B",
  darkGray: "#A9A9A9",
  darkGrey: "#A9A9A9",
  darkGreen: "#006400",
  darkKhaki: "#BDB76B",
  darkMagenta: "#8B008B",
  darkOliveGreen: "#556B2F",
  darkOrange: "#FF8C00",
  darkOrchid: "#9932CC",
  darkRed: "#8B0000",
  darkSalmon: "#E9967A",
  darkSeaGreen: "#8FBC8F",
  darkSlateBlue: "#483D8B",
  darkSlateGray: "#2F4F4F",
  darkSlateGrey: "#2F4F4F",
  darkTurquoise: "#00CED1",
  darkViolet: "#9400D3",
  deepPink: "#FF1493",
  deepSkyBlue: "#00BFFF",
  dimGray: "#696969",
  dimGrey: "#696969",
  dodgerBlue: "#1E90FF",
  firebrick: "#B22222",
  floralWhite: "#FFFAF0",
  forestGreen: "#228B22",
  gainsboro: "#DCDCDC",
  ghostWhite: "#F8F8FF",
  gold: "#FFD700",
  goldenrod: "#DAA520",
  greenYellow: "#ADFF2F",
  honeydew: "#F0FFF0",
  hotPink: "#FF69B4",
  indianRed: "#CD5C5C",
  indigo: "#4B0082",
  ivory: "#FFFFF0",
  khaki: "#F0E68C",
  lavender: "#E6E6FA",
  lavenderBlush: "#FFF0F5",
  lawnGreen: "#7CFC00",
  lemonChiffon: "#FFFACD",
  lightBlue: "#ADD8E6",
  lightCoral: "#F08080",
  lightCyan: "#E0FFFF",
  lightGoldenrodYellow: "#FAFAD2",
  lightGray: "#D3D3D3",
  lightGrey: "#D3D3D3",
  lightGreen: "#90EE90",
  lightPink: "#FFB6C1",
  lightSalmon: "#FFA07A",
  lightSeaGreen: "#20B2AA",
  lightSkyBlue: "#87CEFA",
  lightSlateGray: "#778899",
  lightSlateGrey: "#778899",
  lightSteelBlue: "#B0C4DE",
  lightYellow: "#FFFFE0",
  limeGreen: "#32CD32",
  linen: "#FAF0E6",
  mediumAquamarine: "#66CDAA",
  mediumBlue: "#0000CD",
  mediumOrchid: "#BA55D3",
  mediumPurple: "#9370DB",
  mediumSeaGreen: "#3CB371",
  mediumSlateBlue: "#7B68EE",
  mediumSpringGreen: "#00FA9A",
  mediumTurquoise: "#48D1CC",
  mediumVioletRed: "#C71585",
  midnightBlue: "#191970",
  mintCream: "#F5FFFA",
  mistyRose: "#FFE4E1",
  moccasin: "#FFE4B5",
  navajoWhite: "#FFDEAD",
  oldLace: "#FDF5E6",
  oliveDrab: "#6B8E23",
  orangeRed: "#FF4500",
  orchid: "#DA70D6",
  paleGoldenrod: "#EEE8AA",
  paleGreen: "#98FB98",
  paleTurquoise: "#AFEEEE",
  paleVioletRed: "#DB7093",
  papayaWhip: "#FFEFD5",
  peachPuff: "#FFDAB9",
  peru: "#CD853F",
  plum: "#DDA0DD",
  powderBlue: "#B0E0E6",
  rosyBrown: "#BC8F8F",
  royalBlue: "#4169E1",
  saddleBrown: "#8B4513",
  salmon: "#FA8072",
  sandyBrown: "#F4A460",
  seaGreen: "#2E8B57",
  seaShell: "#FFF5EE",
  sienna: "#A0522D",
  skyBlue: "#87CEEB",
  slateBlue: "#6A5ACD",
  slateGray: "#708090",
  slateGrey: "#708090",
  snow: "#FFFAFA",
  springGreen: "#00FF7F",
  steelBlue: "#4682B4",
  tan: "#D2B48C",
  thistle: "#D8BFD8",
  tomato: "#FF6347",
  turquoise: "#40E0D0",
  violet: "#EE82EE",
  wheat: "#F5DEB3",
  whiteSmoke: "#F5F5F5",
  yellowGreen: "#9ACD32"
};
function Xi(t) {
  if (ns[t] !== void 0)
    return ns[t];
  const n = t.toLowerCase();
  for (const [e, o] of Object.entries(ns))
    if (e.toLowerCase() === n)
      return o;
}
function Xd(t) {
  const n = [t.localName, t.attr("val") ?? ""];
  for (const e of t.allChildren()) {
    const o = e.localName, s = e.attr("val") ?? e.attr("amt");
    o && n.push(`${o}:${s ?? ""}`);
    for (const i of e.allChildren()) {
      const r = i.localName, c = i.attr("val") ?? i.attr("amt");
      r && n.push(`${r}:${c ?? ""}`);
    }
  }
  return n.join("|");
}
function De(t) {
  const n = [];
  for (const e of t.allChildren()) {
    const o = e.localName, s = e.numAttr("val") ?? e.numAttr("amt");
    s !== void 0 && o ? n.push({ name: o, val: s }) : (o === "inv" || o === "gray" || o === "comp" || o === "gamma" || o === "invGamma") && n.push({ name: o, val: 0 });
  }
  return n;
}
function Yi(t, n) {
  let e = t;
  if (n.layout.colorMapOverride) {
    const i = n.layout.colorMapOverride.get(t);
    i && (e = i);
  }
  if (e === t) {
    const i = n.master.colorMap.get(t);
    i && (e = i);
  }
  const o = n.theme.colorScheme.get(e);
  return o || n.theme.colorScheme.get(t) || "000000";
}
function Tt(t, n) {
  const e = Xd(t), o = n.colorCache.get(e);
  if (o) return o;
  const s = pc(t, n);
  return n.colorCache.set(e, s), s;
}
function pc(t, n, e) {
  for (const s of t.allChildren()) {
    const i = s.localName, r = De(s);
    switch (i) {
      case "srgbClr": {
        const c = s.attr("val") || "000000";
        return pe(c, r);
      }
      case "schemeClr": {
        const c = s.attr("val") || "tx1";
        if (c.toLowerCase() === "phclr" && (e != null && e.exists())) {
          const a = Tt(e, n), d = a.color.startsWith("#") ? a.color.slice(1) : a.color, h = pe(d, r);
          return { color: h.color, alpha: h.alpha * a.alpha };
        }
        const l = Yi(c, n);
        return pe(l, r);
      }
      case "sysClr": {
        const c = s.attr("lastClr") || s.attr("val") || "000000";
        return pe(c, r);
      }
      case "prstClr": {
        const c = s.attr("val") || "black", l = Xi(c) || "#000000";
        return pe(l.replace("#", ""), r);
      }
      case "hslClr": {
        const c = (s.numAttr("hue") ?? 0) / 6e4, l = (s.numAttr("sat") ?? 0) / 1e5, a = (s.numAttr("lum") ?? 0) / 1e5, d = be(c, l, a), h = qt(d.r, d.g, d.b).replace("#", "");
        return pe(h, r);
      }
      case "scrgbClr": {
        const c = Math.round((s.numAttr("r") ?? 0) / 1e5 * 255), l = Math.round((s.numAttr("g") ?? 0) / 1e5 * 255), a = Math.round((s.numAttr("b") ?? 0) / 1e5 * 255), d = qt(c, l, a).replace("#", "");
        return pe(d, r);
      }
    }
  }
  const o = t.localName;
  if (o === "srgbClr") {
    const s = t.attr("val") || "000000";
    return pe(s, De(t));
  }
  if (o === "schemeClr") {
    const s = t.attr("val") || "tx1";
    if (s.toLowerCase() === "phclr" && (e != null && e.exists())) {
      const r = Tt(e, n), c = r.color.startsWith("#") ? r.color.slice(1) : r.color, l = pe(c, De(t));
      return { color: l.color, alpha: l.alpha * r.alpha };
    }
    const i = Yi(s, n);
    return pe(i, De(t));
  }
  if (o === "sysClr") {
    const s = t.attr("lastClr") || t.attr("val") || "000000";
    return pe(s, De(t));
  }
  if (o === "prstClr") {
    const s = t.attr("val") || "black", i = Xi(s) || "#000000";
    return pe(i.replace("#", ""), De(t));
  }
  if (o === "hslClr") {
    const s = (t.numAttr("hue") ?? 0) / 6e4, i = (t.numAttr("sat") ?? 0) / 1e5, r = (t.numAttr("lum") ?? 0) / 1e5, c = be(s, i, r), l = qt(c.r, c.g, c.b).replace("#", "");
    return pe(l, De(t));
  }
  if (o === "scrgbClr") {
    const s = Math.round((t.numAttr("r") ?? 0) / 1e5 * 255), i = Math.round((t.numAttr("g") ?? 0) / 1e5 * 255), r = Math.round((t.numAttr("b") ?? 0) / 1e5 * 255), c = qt(s, i, r).replace("#", "");
    return pe(c, De(t));
  }
  return { color: "#000000", alpha: 1 };
}
function he(t, n) {
  const { color: e, alpha: o } = Tt(t, n);
  return Ae(e, o);
}
function Ae(t, n) {
  const e = t.startsWith("#") ? t : `#${t}`, { r: o, g: s, b: i } = Et(e);
  return n >= 1 ? e : `rgba(${o},${s},${i},${n.toFixed(3)})`;
}
function zn(t, n, e) {
  return e != null && e.exists() ? pc(t, n, e) : Tt(t, n);
}
function Ge(t, n) {
  const e = t.child("solidFill");
  if (e.exists()) {
    const { color: l, alpha: a } = Tt(e, n);
    return Ae(l, a);
  }
  const o = t.child("gradFill");
  if (o.exists())
    return yc(o, n);
  if (t.child("blipFill").exists())
    return "";
  const i = t.child("pattFill");
  return i.exists() ? xc(i, n) : t.child("grpFill").exists() ? n.groupFillNode ? Ge(n.groupFillNode, n) : "" : t.child("noFill").exists() ? "transparent" : "";
}
function xc(t, n, e) {
  const o = t.attr("prst") ?? "solid";
  let s = "#000000", i = "#ffffff";
  const r = t.child("fgClr");
  if (r.exists()) {
    const { color: h, alpha: u } = zn(r, n, e);
    s = Ae(h, u);
  }
  const c = t.child("bgClr");
  if (c.exists()) {
    const { color: h, alpha: u } = zn(c, n, e);
    i = Ae(h, u);
  }
  const l = 8, a = (h) => `${h} 0 0 / ${l}px ${l}px, ${i}`, d = (h, u) => `${h} 0 0 / ${l}px ${l}px, ${u} 0 0 / ${l}px ${l}px, ${i}`;
  switch (o) {
    // Solid fills
    case "solid":
    case "solidDmnd":
      return s;
    // Percentage fills (dots on background)
    case "pct5":
    case "pct10":
    case "pct20":
    case "pct25":
      return a(`radial-gradient(${s} 1px, transparent 1px)`);
    case "pct30":
    case "pct40":
    case "pct50":
      return a(`radial-gradient(${s} 1.5px, transparent 1.5px)`);
    case "pct60":
    case "pct70":
    case "pct75":
    case "pct80":
    case "pct90":
      return a(`radial-gradient(${s} 2.5px, transparent 2.5px)`);
    // Horizontal lines
    case "horz":
    case "ltHorz":
    case "narHorz":
    case "dkHorz":
      return a(
        `repeating-linear-gradient(0deg, ${s} 0px, ${s} 1px, transparent 1px, transparent ${l}px)`
      );
    // Vertical lines
    case "vert":
    case "ltVert":
    case "narVert":
    case "dkVert":
      return a(
        `repeating-linear-gradient(90deg, ${s} 0px, ${s} 1px, transparent 1px, transparent ${l}px)`
      );
    // Diagonal lines (down-right)
    case "dnDiag":
    case "ltDnDiag":
    case "narDnDiag":
    case "dkDnDiag":
    case "wdDnDiag":
      return a(
        `repeating-linear-gradient(45deg, ${s} 0px, ${s} 1px, transparent 1px, transparent ${l}px)`
      );
    // Diagonal lines (up-right)
    case "upDiag":
    case "ltUpDiag":
    case "narUpDiag":
    case "dkUpDiag":
    case "wdUpDiag":
      return a(
        `repeating-linear-gradient(-45deg, ${s} 0px, ${s} 1px, transparent 1px, transparent ${l}px)`
      );
    // Grid (horizontal + vertical)
    case "smGrid":
    case "lgGrid":
    case "cross":
      return d(
        `repeating-linear-gradient(0deg, ${s} 0px, ${s} 1px, transparent 1px, transparent ${l}px)`,
        `repeating-linear-gradient(90deg, ${s} 0px, ${s} 1px, transparent 1px, transparent ${l}px)`
      );
    // Diagonal cross
    case "smCheck":
    case "lgCheck":
    case "diagCross":
    case "openDmnd":
      return d(
        `repeating-linear-gradient(45deg, ${s} 0px, ${s} 1px, transparent 1px, transparent ${l}px)`,
        `repeating-linear-gradient(-45deg, ${s} 0px, ${s} 1px, transparent 1px, transparent ${l}px)`
      );
    // Dot patterns
    case "dotGrid":
    case "dotDmnd":
      return a(`radial-gradient(${s} 1px, transparent 1px)`);
    // Trellis / weave
    case "trellis":
    case "weave":
      return d(
        `repeating-linear-gradient(45deg, ${s} 0px, ${s} 2px, transparent 2px, transparent ${l}px)`,
        `repeating-linear-gradient(-45deg, ${s} 0px, ${s} 2px, transparent 2px, transparent ${l}px)`
      );
    // Dash variants
    case "dashDnDiag":
    case "dashUpDiag":
    case "dashHorz":
    case "dashVert": {
      const h = o.includes("Dn") ? "45deg" : o.includes("Up") ? "-45deg" : o.includes("Horz") ? "0deg" : "90deg";
      return a(
        `repeating-linear-gradient(${h}, ${s} 0px, ${s} 3px, transparent 3px, transparent ${l}px)`
      );
    }
    // Sphere / shingle — radial gradient approximation
    case "sphere":
    case "shingle":
    case "plaid":
    case "divot":
    case "zigZag":
      return a(`radial-gradient(${s} 2px, transparent 2px)`);
    default:
      return i;
  }
}
function yc(t, n, e) {
  const o = t.child("gsLst"), s = [];
  for (const l of o.children("gs")) {
    const a = l.numAttr("pos") ?? 0, d = Eo(a) * 100, { color: h, alpha: u } = zn(l, n, e);
    s.push({ position: d, color: Ae(h, u) });
  }
  if (s.length === 0)
    return "";
  s.sort((l, a) => l.position - a.position);
  const i = Qi(s), r = t.child("lin");
  if (r.exists())
    return `linear-gradient(${((vn(r.numAttr("ang") ?? 0) + 90) % 360).toFixed(1)}deg, ${i})`;
  const c = t.child("path");
  if (c.exists()) {
    const l = c.attr("path");
    if (l === "circle" || l === "shape" || l === "rect") {
      const a = gc(c), { cx: d, cy: h } = mc(a), u = Qi(
        Dn({
          stops: s,
          cx: d,
          cy: h,
          fillToRect: a
        })
      );
      return l === "rect" ? `radial-gradient(closest-side at ${(d * 100).toFixed(1)}% ${(h * 100).toFixed(1)}%, ${u})` : `radial-gradient(ellipse at ${(d * 100).toFixed(1)}% ${(h * 100).toFixed(1)}%, ${u})`;
    }
  }
  return `linear-gradient(180deg, ${i})`;
}
function Zn(t, n, e) {
  const o = t.numAttr("w") ?? 0;
  let s = X(o), i = "transparent";
  const r = t.child("solidFill");
  if (r.exists()) {
    const d = r.child("schemeClr");
    if (d.exists() && (d.attr("val") ?? "").toLowerCase() === "phclr" && e && e.exists()) {
      const u = Tt(e, n), x = u.color.startsWith("#") ? u.color.slice(1) : u.color, p = pe(x, De(d));
      i = Ae(p.color, p.alpha * u.alpha);
    } else {
      const u = Tt(r, n);
      i = Ae(u.color, u.alpha);
    }
  } else if (e && e.exists() && (e.numAttr("idx") ?? 0) > 0) {
    const d = e.numAttr("idx") ?? 0;
    if (d > 0 && n.theme.lineStyles && n.theme.lineStyles.length >= d) {
      const h = n.theme.lineStyles[d - 1];
      if (s === 0) {
        const x = h.numAttr("w") ?? 0;
        s = X(x);
      }
      const u = Tt(e, n);
      i = Ae(u.color, u.alpha);
    } else {
      const h = Tt(e, n);
      i = Ae(h.color, h.alpha), s === 0 && d > 0 && (s = d * 0.75);
    }
  }
  if (s === 0 && e && e.exists()) {
    const d = e.numAttr("idx") ?? 0;
    if (d > 0 && n.theme.lineStyles && n.theme.lineStyles.length >= d) {
      const u = n.theme.lineStyles[d - 1].numAttr("w") ?? 0;
      s = X(u);
    } else d > 0 && (s = d * 0.75);
  }
  s === 0 && i !== "transparent" && !t.child("noFill").exists() && (s = 1);
  let c = "solid", l = "solid";
  const a = t.child("prstDash");
  if (a.exists()) {
    const d = a.attr("val") || "solid";
    l = d, c = qi(d);
  }
  if (c === "solid" && e && e.exists()) {
    const d = e.numAttr("idx") ?? 0;
    if (d > 0 && n.theme.lineStyles && n.theme.lineStyles.length >= d) {
      const u = n.theme.lineStyles[d - 1].child("prstDash");
      u.exists() && (l = u.attr("val") || "solid", c = qi(l));
    }
  }
  return { width: s, color: i, dash: c, dashKind: l };
}
function qi(t) {
  switch (t) {
    case "solid":
      return "solid";
    case "dot":
    case "sysDot":
      return "dotted";
    case "dash":
    case "sysDash":
    case "lgDash":
      return "dashed";
    case "dashDot":
    case "lgDashDot":
    case "lgDashDotDot":
    case "sysDashDot":
    case "sysDashDotDot":
      return "dashed";
    default:
      return "solid";
  }
}
function gc(t) {
  const n = t.child("fillToRect");
  if (n.exists())
    return {
      l: (n.numAttr("l") ?? 0) / 1e5,
      t: (n.numAttr("t") ?? 0) / 1e5,
      r: (n.numAttr("r") ?? 0) / 1e5,
      b: (n.numAttr("b") ?? 0) / 1e5
    };
}
function mc(t) {
  return t ? {
    cx: (t.l + (1 - t.r)) / 2,
    cy: (t.t + (1 - t.b)) / 2
  } : { cx: 0.5, cy: 0.5 };
}
function os(t) {
  return Math.max(0, Math.min(1, t));
}
function Yd(t, n = {}) {
  const e = t.fillToRect;
  if (!e) return 0;
  const o = Math.max(0, 1 - e.l - e.r), s = Math.max(0, 1 - e.t - e.b);
  if (o <= 0 && s <= 0) return 0;
  const i = t.cx ?? 0.5, r = t.cy ?? 0.5, c = Math.max(Math.abs(i), Math.abs(1 - i)), l = Math.max(Math.abs(r), Math.abs(1 - r));
  if (n.axis === "x")
    return c > 0 ? os(o / 2 / c) : 0;
  if (n.axis === "y")
    return l > 0 ? os(s / 2 / l) : 0;
  const a = n.width ?? 1, d = n.height ?? 1, h = Math.hypot(o / 2 * a, s / 2 * d), u = Math.hypot(c * a, l * d);
  return u > 0 ? os(h / u) : 0;
}
function Dn(t, n = {}) {
  const e = Yd(t, n);
  return e <= 0 ? t.stops : t.stops.map((o) => ({
    ...o,
    position: e * 100 + o.position * (1 - e)
  }));
}
function Qi(t) {
  return t.map((n) => `${n.color} ${n.position.toFixed(1)}%`).join(", ");
}
function bc(t, n, e) {
  const o = t.child("gsLst"), s = [];
  for (const c of o.children("gs")) {
    const l = c.numAttr("pos") ?? 0, a = Eo(l) * 100, { color: d, alpha: h } = zn(c, n, e);
    s.push({ position: a, color: Ae(d, h) });
  }
  if (s.length === 0) return null;
  s.sort((c, l) => c.position - l.position);
  const i = t.child("lin");
  if (i.exists()) {
    const c = vn(i.numAttr("ang") ?? 0);
    return { type: "linear", stops: s, angle: c, colorInterpolation: "linearRGB" };
  }
  const r = t.child("path");
  if (r.exists()) {
    const c = r.attr("path");
    if (c === "circle" || c === "shape" || c === "rect") {
      const l = gc(r), { cx: a, cy: d } = mc(l);
      return {
        type: "radial",
        stops: s,
        angle: 0,
        cx: a,
        cy: d,
        pathType: c,
        fillToRect: l,
        colorInterpolation: "linearRGB"
      };
    }
  }
  return { type: "linear", stops: s, angle: 0, colorInterpolation: "linearRGB" };
}
function Mc(t, n) {
  let e = t.child("gradFill");
  return !e.exists() && t.child("grpFill").exists() && n.groupFillNode && (e = n.groupFillNode.child("gradFill")), e.exists() ? bc(e, n) : null;
}
function ks(t, n) {
  const e = t.numAttr("idx") ?? 0;
  return xs(t, n, n.theme.fillStyles, e);
}
function qd(t, n) {
  const e = t.numAttr("idx") ?? 0;
  return e >= 1001 ? xs(t, n, n.theme.bgFillStyles ?? [], e - 1e3) : xs(t, n, n.theme.fillStyles, e);
}
function xs(t, n, e, o) {
  if (o <= 0 || ((e == null ? void 0 : e.length) ?? 0) < o)
    return { fillCss: he(t, n), gradientFillData: null };
  const s = e == null ? void 0 : e[o - 1];
  if (!(s != null && s.exists()))
    return { fillCss: he(t, n), gradientFillData: null };
  if (s.localName === "solidFill") {
    const i = zn(s, n, t);
    return { fillCss: Ae(i.color, i.alpha), gradientFillData: null };
  }
  return s.localName === "gradFill" ? {
    fillCss: yc(s, n, t),
    gradientFillData: bc(s, n, t)
  } : s.localName === "pattFill" ? { fillCss: xc(s, n, t), gradientFillData: null } : s.localName === "noFill" ? { fillCss: "transparent", gradientFillData: null } : { fillCss: he(t, n), gradientFillData: null };
}
function Qd(t, n) {
  const e = t.child("gradFill");
  if (!e.exists()) return null;
  const o = e.child("gsLst"), s = [];
  for (const a of o.children("gs")) {
    const d = a.numAttr("pos") ?? 0, h = Eo(d) * 100, { color: u, alpha: x } = Tt(a, n), p = Ae(u, x);
    s.push({ position: h, color: p });
  }
  if (s.length === 0) return null;
  s.sort((a, d) => a.position - d.position);
  const i = e.child("lin");
  let r = 0;
  i.exists() && (r = vn(i.numAttr("ang") ?? 0));
  const c = t.numAttr("w") ?? 0;
  let l = X(c);
  return l <= 0 && (l = 1), { stops: s, angle: r, width: l, colorInterpolation: "linearRGB" };
}
const Kd = /* @__PURE__ */ new Set(["http:", "https:", "mailto:"]), Jd = /* @__PURE__ */ new Set(["http:", "https:"]);
function Lc(t) {
  try {
    return new URL(t).protocol.toLowerCase();
  } catch {
    return;
  }
}
function Ro(t) {
  const n = Lc(t);
  return n !== void 0 && Kd.has(n);
}
function An(t) {
  const n = Lc(t);
  return n !== void 0 && Jd.has(n);
}
const jd = 128;
function th(t, n) {
  if (!(n > 0)) return t;
  const e = t.trim();
  if (!e) return `${100 / n}%`;
  if (e.length > jd) return t;
  const o = eh(e);
  return o ? `${o.value / n}${o.unit || "%"}` : t;
}
function eh(t) {
  let n = 0;
  (t[n] === "-" || t[n] === "+") && n++;
  let e = 0;
  for (; uo(t.charCodeAt(n)); )
    n++, e++;
  if (t[n] === ".")
    for (n++; uo(t.charCodeAt(n)); )
      n++, e++;
  if (e === 0) return null;
  if (t[n] === "e" || t[n] === "E") {
    const i = n;
    n++, (t[n] === "-" || t[n] === "+") && n++;
    let r = 0;
    for (; uo(t.charCodeAt(n)); )
      n++, r++;
    r === 0 && (n = i);
  }
  const o = Number(t.slice(0, n));
  if (!Number.isFinite(o)) return null;
  const s = t.slice(n);
  return ih(s) ? { value: o, unit: s } : null;
}
function ws(t) {
  const n = nh(t);
  if (n < 0) return null;
  const e = t.slice(n + 1).trim();
  return sh(e) ? {
    imageLayers: oh(t.slice(0, n)),
    color: e
  } : null;
}
function nh(t) {
  let n = 0;
  for (let e = t.length - 1; e >= 0; e--) {
    const o = t[e];
    if (o === ")")
      n++;
    else if (o === "(")
      n > 0 && n--;
    else if (o === "," && n === 0)
      return e;
  }
  return -1;
}
function oh(t) {
  return t.split("0 0 / 8px 8px").join("").trimEnd();
}
function sh(t) {
  if (!t) return !1;
  if (t[0] === "#") {
    const e = t.length - 1;
    if (![3, 4, 6, 8].includes(e)) return !1;
    for (let o = 1; o < t.length; o++)
      if (!rh(t.charCodeAt(o))) return !1;
    return !0;
  }
  const n = t.toLowerCase();
  if (n.startsWith("rgb(") || n.startsWith("rgba("))
    return t.endsWith(")") && !t.slice(0, -1).includes(")");
  for (let e = 0; e < t.length; e++) {
    const o = t.charCodeAt(e);
    if (!vc(o)) return !1;
  }
  return !0;
}
function ih(t) {
  if (!t || t === "%") return !0;
  for (let n = 0; n < t.length; n++)
    if (!vc(t.charCodeAt(n))) return !1;
  return !0;
}
function uo(t) {
  return t >= 48 && t <= 57;
}
function vc(t) {
  return t >= 65 && t <= 90 || t >= 97 && t <= 122;
}
function rh(t) {
  return uo(t) || t >= 65 && t <= 70 || t >= 97 && t <= 102;
}
let ch = 0;
function Ac(t, n, e, o) {
  const s = Math.round(t * o + 255 * (1 - o)), i = Math.round(n * o + 255 * (1 - o)), r = Math.round(e * o + 255 * (1 - o));
  return `rgb(${s},${i},${r})`;
}
function Sc(t, n) {
  if (n.includes("gradient") && n.includes(" 0 0 / ")) {
    const e = ws(n);
    if (e) {
      t.style.backgroundImage = e.imageLayers, t.style.backgroundSize = "8px 8px", t.style.backgroundRepeat = "repeat", t.style.backgroundColor = e.color;
      return;
    }
  }
  n.includes("gradient") || n.startsWith("url(") || n.includes("repeating-") ? t.style.background = n : t.style.backgroundColor = n;
}
function lh(t) {
  const n = t * Math.PI / 180;
  return {
    x1: 50 - 50 * Math.cos(n),
    y1: 50 - 50 * Math.sin(n),
    x2: 50 + 50 * Math.cos(n),
    y2: 50 + 50 * Math.sin(n)
  };
}
function Ki(t, n) {
  const e = "http://www.w3.org/2000/svg";
  for (const o of n) {
    const s = document.createElementNS(e, "stop");
    s.setAttribute("offset", `${o.position}%`), s.setAttribute("stop-color", o.color), t.appendChild(s);
  }
}
function ah(t, n, e, o) {
  const s = "http://www.w3.org/2000/svg", i = document.createElementNS(s, "svg");
  i.setAttribute("data-pptx-background-gradient", "true"), i.setAttribute("viewBox", `0 0 ${e} ${o}`), i.setAttribute("width", "100%"), i.setAttribute("height", "100%"), i.style.position = "absolute", i.style.left = "0", i.style.top = "0", i.style.width = "100%", i.style.height = "100%", i.style.pointerEvents = "none", i.style.display = "block";
  const r = document.createElementNS(s, "defs");
  i.appendChild(r);
  const c = `bg-grad-${++ch}`;
  if (n.type === "radial" && n.pathType === "rect") {
    const l = n.cx ?? 0.5, a = n.cy ?? 0.5, d = (f, y) => {
      const m = Dn(n, { axis: y }), b = [];
      for (const M of m) {
        const L = M.position / 100;
        b.push({ offset: f - L * f, color: M.color }), b.push({ offset: f + L * (1 - f), color: M.color });
      }
      return b.sort((M, L) => M.offset - L.offset);
    }, h = `${c}-h`, u = document.createElementNS(s, "linearGradient");
    u.setAttribute("id", h), u.setAttribute("color-interpolation", n.colorInterpolation ?? "linearRGB"), u.setAttribute("x1", "0%"), u.setAttribute("y1", "0%"), u.setAttribute("x2", "100%"), u.setAttribute("y2", "0%");
    for (const f of d(l, "x")) {
      const y = document.createElementNS(s, "stop");
      y.setAttribute("offset", `${(f.offset * 100).toFixed(2)}%`), y.setAttribute("stop-color", f.color), u.appendChild(y);
    }
    r.appendChild(u);
    const x = `${c}-v`, p = document.createElementNS(s, "linearGradient");
    p.setAttribute("id", x), p.setAttribute("color-interpolation", n.colorInterpolation ?? "linearRGB"), p.setAttribute("x1", "0%"), p.setAttribute("y1", "0%"), p.setAttribute("x2", "0%"), p.setAttribute("y2", "100%");
    for (const f of d(a, "y")) {
      const y = document.createElementNS(s, "stop");
      y.setAttribute("offset", `${(f.offset * 100).toFixed(2)}%`), y.setAttribute("stop-color", f.color), p.appendChild(y);
    }
    r.appendChild(p);
    const $ = document.createElementNS(s, "g");
    $.setAttribute("style", "isolation: isolate");
    const g = document.createElementNS(s, "rect");
    g.setAttribute("width", String(e)), g.setAttribute("height", String(o)), g.setAttribute("fill", "black"), $.appendChild(g);
    for (const f of [h, x]) {
      const y = document.createElementNS(s, "rect");
      y.setAttribute("width", String(e)), y.setAttribute("height", String(o)), y.setAttribute("fill", `url(#${f})`), y.setAttribute("style", "mix-blend-mode: lighten"), $.appendChild(y);
    }
    i.appendChild($);
  } else if (n.type === "radial") {
    const l = document.createElementNS(s, "radialGradient");
    l.setAttribute("id", c), l.setAttribute(
      "color-interpolation",
      n.colorInterpolation ?? "linearRGB"
    ), l.setAttribute("gradientUnits", "userSpaceOnUse");
    const a = n.cx ?? 0.5, d = n.cy ?? 0.5;
    l.setAttribute("cx", String(a * e)), l.setAttribute("cy", String(d * o));
    const h = Math.max(a, 1 - a), u = Math.max(d, 1 - d);
    l.setAttribute("r", String(Math.hypot(h * e, u * o))), Ki(l, Dn(n, { width: e, height: o })), r.appendChild(l);
    const x = document.createElementNS(s, "rect");
    x.setAttribute("width", String(e)), x.setAttribute("height", String(o)), x.setAttribute("fill", `url(#${c})`), i.appendChild(x);
  } else {
    const l = document.createElementNS(s, "linearGradient");
    l.setAttribute("id", c), l.setAttribute(
      "color-interpolation",
      n.colorInterpolation ?? "linearRGB"
    ), l.setAttribute("gradientUnits", "userSpaceOnUse");
    const a = lh(n.angle);
    l.setAttribute("x1", String(a.x1 / 100 * e)), l.setAttribute("y1", String(a.y1 / 100 * o)), l.setAttribute("x2", String(a.x2 / 100 * e)), l.setAttribute("y2", String(a.y2 / 100 * o)), Ki(l, n.stops), r.appendChild(l);
    const d = document.createElementNS(s, "rect");
    d.setAttribute("width", String(e)), d.setAttribute("height", String(o)), d.setAttribute("fill", `url(#${c})`), i.appendChild(d);
  }
  t.style.position || (t.style.position = "relative"), t.style.background = "", t.querySelectorAll('svg[data-pptx-background-gradient="true"]').forEach((l) => {
    l.remove();
  }), t.insertBefore(i, t.firstChild);
}
function dh(t, n, e) {
  return Cc(Mc(t, n), n, e);
}
function Cc(t, n, e) {
  return t != null && t.pathType ? (ah(
    e,
    t,
    n.presentation.width,
    n.presentation.height
  ), !0) : !1;
}
function hh(t, n) {
  let e, o = t.slide.rels;
  if (t.slide.background ? (e = t.slide.background, o = t.slide.rels) : t.layout.background ? (e = t.layout.background, o = t.layout.rels) : t.master.background && (e = t.master.background, o = t.master.rels), !e) {
    n.style.backgroundColor = "#FFFFFF";
    return;
  }
  const s = e.child("bgPr");
  if (s.exists()) {
    uh(s, t, n, o);
    return;
  }
  const i = e.child("bgRef");
  if (i.exists()) {
    fh(i, t, n);
    return;
  }
  n.style.backgroundColor = "#FFFFFF";
}
function uh(t, n, e, o) {
  const s = t.child("solidFill");
  if (s.exists()) {
    const { color: a, alpha: d } = Tt(s, n), h = a.startsWith("#") ? a : `#${a}`;
    if (d < 1) {
      const { r: u, g: x, b: p } = Et(h);
      e.style.backgroundColor = Ac(u, x, p, d);
    } else
      e.style.backgroundColor = h;
    return;
  }
  if (t.child("gradFill").exists()) {
    if (dh(t, n, e))
      return;
    const a = Ge(t, n);
    a && (e.style.background = a);
    return;
  }
  if (t.child("pattFill").exists()) {
    const a = Ge(t, n);
    a && Sc(e, a);
    return;
  }
  const c = t.child("blipFill");
  if (c.exists()) {
    $h(c, n, e, o);
    return;
  }
  if (t.child("noFill").exists()) {
    e.style.backgroundColor = "#FFFFFF";
    return;
  }
}
function fh(t, n, e) {
  var c, l;
  const o = t.numAttr("idx") ?? 0;
  if (o >= 1001 && o - 1e3 <= (((c = n.theme.bgFillStyles) == null ? void 0 : c.length) ?? 0) || o > 0 && o <= (((l = n.theme.fillStyles) == null ? void 0 : l.length) ?? 0)) {
    const { fillCss: a, gradientFillData: d } = qd(t, n);
    if (Cc(d, n, e))
      return;
    Sc(e, a);
    return;
  }
  const { color: i, alpha: r } = Tt(t, n);
  if (i && i !== "#000000") {
    const a = i.startsWith("#") ? i : `#${i}`;
    if (r < 1) {
      const { r: d, g: h, b: u } = Et(a);
      e.style.backgroundColor = Ac(d, h, u, r);
    } else
      e.style.backgroundColor = a;
  } else
    e.style.backgroundColor = "#FFFFFF";
}
function $h(t, n, e, o) {
  var h;
  const s = t.child("blip"), i = s.attr("embed") ?? s.attr("r:embed"), r = s.attr("link") ?? s.attr("r:link"), c = i ?? r;
  if (!c) return;
  const a = (o ?? n.slide.rels).get(c);
  if (!a) return;
  let d;
  if (Ie(a.targetMode)) {
    if (!An(a.target)) return;
    d = a.target;
  } else {
    const u = Ln(a.target, n.presentation.media);
    if (!u) {
      if (n.presentation.mediaResolver) {
        const $ = As(
          a.target,
          n.presentation.media,
          n.presentation.mediaResolver
        ).then((g) => {
          if (!g) return;
          const f = tn(
            g.mediaPath,
            g.data,
            n.mediaUrlCache
          );
          Ji(t, e, f);
        }).catch(() => {
        });
        (h = n.asyncTasks) == null || h.push($), n.asyncTasks;
      }
      return;
    }
    const { mediaPath: x, data: p } = u;
    d = tn(x, p, n.mediaUrlCache);
  }
  Ji(t, e, d);
}
function Ji(t, n, e) {
  const o = mh(t.child("blip"));
  if (o < 1 || t.child("srcRect").exists()) {
    ph(t, n, e, o);
    return;
  }
  n.style.backgroundImage = `url("${e}")`;
  const s = t.child("stretch");
  s.exists() && (bh(n, s.child("fillRect")), n.style.backgroundRepeat = "no-repeat"), t.child("tile").exists() && (n.style.backgroundRepeat = "repeat", n.style.backgroundSize = "auto");
}
function ph(t, n, e, o) {
  n.style.position || (n.style.position = "relative"), n.style.backgroundImage = "", n.querySelectorAll('[data-pptx-background-image="true"]').forEach((a) => {
    a.remove();
  });
  const s = document.createElement("div");
  s.setAttribute("data-pptx-background-image", "true"), s.style.position = "absolute", s.style.pointerEvents = "none", s.style.opacity = `${Number(o.toFixed(4))}`;
  const i = t.child("stretch"), r = i.exists() ? i.child("fillRect") : new ve(null);
  yh(s, r);
  const c = t.child("srcRect");
  if (c.exists()) {
    s.style.overflow = "hidden";
    const a = document.createElement("div");
    a.setAttribute("data-pptx-background-crop", "true"), a.style.position = "absolute", a.style.backgroundImage = `url("${e}")`, a.style.backgroundSize = "100% 100%", a.style.backgroundRepeat = "no-repeat", gh(a, c), s.appendChild(a), n.insertBefore(s, n.firstChild);
    return;
  }
  s.style.backgroundImage = `url("${e}")`, i.exists() && (s.style.backgroundSize = "100% 100%", s.style.backgroundRepeat = "no-repeat"), t.child("tile").exists() && (s.style.backgroundRepeat = "repeat", s.style.backgroundSize = "auto"), n.insertBefore(s, n.firstChild);
}
function xh(t) {
  if (!t.exists())
    return { left: 0, top: 0, width: 100, height: 100 };
  const n = Se(t, "l"), e = Se(t, "t"), o = Se(t, "r"), s = Se(t, "b");
  return {
    left: n,
    top: e,
    width: 100 - n - o,
    height: 100 - e - s
  };
}
function yh(t, n) {
  const e = xh(n);
  t.style.left = `${e.left}%`, t.style.top = `${e.top}%`, t.style.width = `${e.width}%`, t.style.height = `${e.height}%`;
}
function gh(t, n) {
  const e = Se(n, "l") / 100, o = Se(n, "t") / 100, s = Se(n, "r") / 100, i = Se(n, "b") / 100, r = 1 - e - s, c = 1 - o - i;
  if (r <= 1e-3 || c <= 1e-3) {
    t.style.left = "0%", t.style.top = "0%", t.style.width = "100%", t.style.height = "100%";
    return;
  }
  const l = 1 / r, a = 1 / c;
  t.style.left = `${-e * l * 100}%`, t.style.top = `${-o * a * 100}%`, t.style.width = `${l * 100}%`, t.style.height = `${a * 100}%`;
}
function mh(t) {
  let n = 1;
  const e = t.child("alphaModFix");
  e.exists() && (n *= (e.numAttr("amt") ?? 1e5) / 1e5);
  const o = t.child("alphaMod");
  o.exists() && (n *= (o.numAttr("val") ?? 1e5) / 1e5);
  const s = t.child("alphaOff");
  return s.exists() && (n += (s.numAttr("val") ?? 0) / 1e5), Math.max(0, Math.min(1, n));
}
function Se(t, n) {
  return (t.numAttr(n) ?? 0) / 1e3;
}
function ji(t, n) {
  const e = t + n;
  return Math.abs(e) < 1e-4 ? 0 : t / e * 100;
}
function bh(t, n) {
  if (!n.exists()) {
    t.style.backgroundSize = "100% 100%", t.style.backgroundPosition = "";
    return;
  }
  const e = Se(n, "l"), o = Se(n, "t"), s = Se(n, "r"), i = Se(n, "b"), r = 100 - e - s, c = 100 - o - i;
  t.style.backgroundSize = `${r}% ${c}%`, t.style.backgroundPosition = `${ji(e, s)}% ${ji(o, i)}%`;
}
function fo(t, n) {
  var s, i;
  const e = (s = t == null ? void 0 : t.bodyProperties) == null ? void 0 : s.child(n);
  if (e != null && e.exists()) return e;
  const o = (i = t == null ? void 0 : t.layoutBodyProperties) == null ? void 0 : i.child(n);
  if (o != null && o.exists()) return o;
}
const Mh = /^\+(mj|mn)-(lt|ea|cs)$/, Lh = {
  lt: "latin",
  ea: "ea",
  cs: "cs"
}, vh = ["Hans", "Hant", "Jpan", "Hang"];
function Ah(t) {
  return Array.isArray(t) ? t.filter((n) => typeof n == "string" && n.length > 0) : typeof t == "string" && t.length > 0 ? [t] : [];
}
function Sh(t) {
  const n = t.toLowerCase();
  if (n.startsWith("zh"))
    return /-(tw|hk|mo)\b/.test(n) ? "Hant" : "Hans";
  if (n.startsWith("ja")) return "Jpan";
  if (n.startsWith("ko")) return "Hang";
  if (n.startsWith("ar")) return "Arab";
  if (n.startsWith("he")) return "Hebr";
  if (n.startsWith("th")) return "Thai";
  if (n.startsWith("hi") || n.startsWith("mr") || n.startsWith("ne"))
    return "Deva";
}
function Ch(t, n) {
  if (t) {
    for (const e of Ah(n)) {
      const o = Sh(e);
      if (o && t[o]) return t[o];
    }
    for (const e of vh)
      if (t[e]) return t[e];
  }
}
function In(t, n, e) {
  const o = t.match(Mh);
  if (!o) return t;
  const s = o[1], i = o[2], r = s === "mj" ? n.theme.majorFont : n.theme.minorFont, c = Lh[i], l = r[c];
  if (l) return l;
  if (i === "ea") {
    const a = Ch(r.scripts, e);
    if (a) return a;
  }
  return r.latin || r.ea || r.cs || t;
}
function gn(t, n, e) {
  const o = /* @__PURE__ */ new Set(), s = [];
  for (const i of t) {
    if (!i) continue;
    const r = In(i, n, e).trim();
    if (!r) continue;
    const c = r.toLowerCase();
    o.has(c) || (o.add(c), s.push(r));
  }
  return s;
}
const Fh = /* @__PURE__ */ new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "emoji",
  "math",
  "fangsong"
]), kh = [
  "PingFang SC",
  "Hiragino Sans GB",
  "Noto Sans CJK SC",
  "Source Han Sans SC",
  "Arial Unicode MS",
  "sans-serif"
], wh = /* @__PURE__ */ new Set([
  "microsoft yahei",
  "microsoft yahei ui",
  "微软雅黑",
  "dengxian",
  "等线",
  "simhei",
  "黑体",
  "heiti sc"
]), Eh = {
  calibri: ["Calibri", "Aptos", "Carlito", "system-ui", "Arial", "Helvetica", "sans-serif"],
  "calibri light": [
    "Calibri Light",
    "Aptos Display",
    "Aptos",
    "Carlito",
    "system-ui",
    "Arial",
    "Helvetica",
    "sans-serif"
  ],
  aptos: ["Aptos", "system-ui", "Arial", "Helvetica", "sans-serif"],
  "aptos display": ["Aptos Display", "Aptos", "system-ui", "Arial", "Helvetica", "sans-serif"],
  "microsoft yahei": ["Microsoft YaHei", "微软雅黑"],
  "microsoft yahei ui": ["Microsoft YaHei UI", "Microsoft YaHei", "微软雅黑"],
  微软雅黑: ["微软雅黑", "Microsoft YaHei"],
  dengxian: ["DengXian", "等线"],
  等线: ["等线", "DengXian"],
  simhei: ["SimHei", "黑体"],
  黑体: ["黑体", "SimHei"],
  "heiti sc": ["Heiti SC", "黑体", "SimHei"]
};
function mo(t) {
  return t.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
}
function Ph(t) {
  const n = mo(t);
  return Fh.has(n) ? n : `"${t.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function tr(t) {
  const n = mo(t);
  return Eh[n] ?? [t.trim()];
}
function mn(t) {
  const n = Array.isArray(t) ? t.flatMap(tr) : tr(t), o = n.some(
    (r) => wh.has(mo(r))
  ) ? [...n, ...kh] : n, s = /* @__PURE__ */ new Set();
  return o.filter((r) => {
    const c = mo(r);
    return s.has(c) ? !1 : (s.add(c), !0);
  }).map(Ph).join(", ");
}
function Bh(t) {
  const n = t.replace(/\\/g, "/"), e = n.lastIndexOf("/");
  return e >= 0 ? n.slice(0, e) : "";
}
function Fc(t) {
  const n = t.search(/[?#]/);
  return n >= 0 ? t.slice(0, n) : t;
}
function bo(t) {
  return Fc(t).replace(/\\/g, "/").replace(/^\/+/, "");
}
function Rh(t, n) {
  if (Ie(n.targetMode)) return;
  const e = Bh(t.slide.slidePath || "ppt/slides/slide1.xml"), o = bo(ke(e, n.target)), s = t.presentation.slides.findIndex(
    (r) => bo(r.slidePath || "") === o
  );
  if (s >= 0) return s;
  const i = Fc(n.target).match(/(?:^|[\\/])slide(\d+)\.xml$/i);
  if (i)
    return parseInt(i[1], 10) - 1;
}
function er(t) {
  const n = t.slide.index;
  if (n >= 0 && n < t.presentation.slides.length) return n;
  const e = bo(t.slide.slidePath || ""), o = t.presentation.slides.findIndex(
    (s) => bo(s.slidePath || "") === e
  );
  return o >= 0 ? o : 0;
}
function nr(t) {
  try {
    return decodeURIComponent(t.replace(/\+/g, " "));
  } catch {
    return t;
  }
}
function Ih(t, n) {
  const e = n.toLowerCase();
  for (const o of t.split("&")) {
    const [s, ...i] = o.split("=");
    if (nr(s).toLowerCase() === e)
      return nr(i.join("="));
  }
}
function Th(t, n) {
  var i;
  const e = n.match(/^ppaction:\/\/hlinkshowjump\?(.+)$/i);
  if (!e) return;
  const o = (i = Ih(e[1], "jump")) == null ? void 0 : i.toLowerCase(), s = t.presentation.slides.length;
  if (s !== 0)
    switch (o) {
      case "firstslide":
        return 0;
      case "lastslide":
        return s - 1;
      case "nextslide": {
        const r = er(t) + 1;
        return r < s ? r : void 0;
      }
      case "previousslide": {
        const r = er(t) - 1;
        return r >= 0 ? r : void 0;
      }
      default:
        return;
    }
}
function Es(t, n, e) {
  if ((n == null ? void 0 : n.toLowerCase()) === "ppaction://hlinksldjump" && e)
    return Rh(t, e);
  if (n)
    return Th(t, n);
}
function Ps(t) {
  return `Go to slide ${t + 1}`;
}
function kc(t) {
  if (!t) return;
  const n = t.trim();
  if (!(n.length === 0 || n.length > 32))
    return /^[+-]?(?:\d+(?:[.,]\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)\s*(?:%|[A-Za-z]{1,4})?$/.test(
      n
    ) ? n : void 0;
}
function zh(t) {
  return kc(t) !== void 0;
}
function or(t, n) {
  n && t.appendChild(document.createTextNode(n.replace(/ {2}/g, "  ")));
}
function Dh(t) {
  const n = /* @__PURE__ */ new Map();
  let e = 1;
  for (let o = 0; o < t.length; o++) {
    if (n.has(o)) continue;
    let s = "", i = -1;
    for (let r = o; r < t.length && r < o + 4; r++) {
      const c = t[r].text;
      if (c === void 0 || c === `
` || c.includes("	") || (s += c, s.trim().length > 32)) break;
      r > o && zh(s) && (i = r);
    }
    if (i > o) {
      const r = e++;
      for (let c = o; c <= i; c++)
        n.set(c, r);
      o = i;
    }
  }
  return n;
}
function _e(t, n) {
  if (!t || !t.exists())
    return new ve(null);
  const e = t.child(`lvl${n + 1}pPr`);
  return e.exists() ? e : t.child("defPPr");
}
function Oh(t) {
  if (!t || !t.type) return "other";
  const n = t.type;
  return n === "title" || n === "ctrTitle" ? "title" : n === "body" || n === "subTitle" || n === "obj" || n === "dt" || n === "ftr" || n === "sldNum" ? "body" : "other";
}
function sr(t, n) {
  for (const e of t) {
    let o;
    const s = e.child("nvSpPr");
    if (s.exists() && (o = s.child("nvPr").child("ph")), !o || !o.exists()) {
      const c = e.child("nvPicPr");
      c.exists() && (o = c.child("nvPr").child("ph"));
    }
    if (!o || !o.exists()) continue;
    const i = o.attr("type"), r = o.numAttr("idx");
    if (n.idx !== void 0 && r === n.idx || n.type && i === n.type) return e;
  }
}
function ir(t) {
  const n = t.child("txBody");
  if (!n.exists()) return;
  const e = n.child("lstStyle");
  return e.exists() ? e : void 0;
}
function Qe(t, n) {
  if (!n.exists()) return;
  const e = n.attr("algn");
  e && (t.align = e);
  const o = n.attr("rtl");
  o !== void 0 && (t.rtl = ue(o));
  const s = n.numAttr("marL");
  s !== void 0 && (t.marginLeft = X(s));
  const i = n.numAttr("indent");
  i !== void 0 && (t.textIndent = X(i));
  const r = n.numAttr("defTabSz");
  r !== void 0 && (t.defaultTabSize = X(r));
  const c = n.child("lnSpc");
  if (c.exists()) {
    const b = c.child("spcPct");
    if (b.exists()) {
      const L = b.numAttr("val");
      L !== void 0 && (t.lineHeight = `${(L / 1e5).toFixed(3)}`);
    }
    const M = c.child("spcPts");
    if (M.exists()) {
      const L = M.numAttr("val");
      L !== void 0 && (t.lineHeight = `${L / 100}pt`, t.lineHeightAbsolute = !0);
    }
  }
  const l = n.child("spcBef");
  if (l.exists()) {
    const b = l.child("spcPts");
    if (b.exists()) {
      const L = b.numAttr("val");
      L !== void 0 && (t.spaceBefore = L / 100);
    }
    const M = l.child("spcPct");
    if (M.exists()) {
      const L = M.numAttr("val");
      L !== void 0 && (t.spaceBeforePct = L / 1e5);
    }
  }
  const a = n.child("spcAft");
  if (a.exists()) {
    const b = a.child("spcPts");
    if (b.exists()) {
      const L = b.numAttr("val");
      L !== void 0 && (t.spaceAfter = L / 100);
    }
    const M = a.child("spcPct");
    if (M.exists()) {
      const L = M.numAttr("val");
      L !== void 0 && (t.spaceAfterPct = L / 1e5);
    }
  }
  const d = n.child("buChar");
  d.exists() && (t.bulletChar = d.attr("char") || "", t.bulletNone = !1);
  const h = n.child("buAutoNum");
  if (h.exists()) {
    t.bulletAutoNum = h.attr("type") || "arabicPeriod";
    const b = h.numAttr("startAt");
    b !== void 0 && (t.bulletAutoNumStartAt = b), t.bulletNone = !1;
  }
  n.child("buNone").exists() && (t.bulletNone = !0, t.bulletChar = void 0, t.bulletAutoNum = void 0);
  const x = n.child("buFont");
  x.exists() && (t.bulletFont = x.attr("typeface"));
  const p = n.child("buSzPct");
  if (p.exists()) {
    const b = p.numAttr("val");
    b !== void 0 && (t.bulletSizePct = b / 1e5, t.bulletSizePt = void 0);
  }
  const $ = n.child("buSzPts");
  if ($.exists()) {
    const b = $.numAttr("val");
    b !== void 0 && (t.bulletSizePt = b / 100, t.bulletSizePct = void 0);
  }
  n.child("buSzTx").exists() && (t.bulletSizePct = void 0, t.bulletSizePt = void 0), n.child("buClrTx").exists() && (t.bulletColorFollowsText = !0, t.bulletColorNode = void 0);
  const y = n.child("buClr");
  y.exists() && (t.bulletColorNode = y, t.bulletColorFollowsText = !1);
  const m = n.child("defRPr");
  m.exists() && (t.defRPr = m, t.defRPrs ?? (t.defRPrs = []), t.defRPrs.push(m));
}
function Nh(t) {
  if (!(t != null && t.exists())) return "none";
  if (t.child("gradFill").exists()) return "explicit";
  const n = t.child("solidFill");
  if (!n.exists()) return "none";
  const e = n.child("schemeClr").attr("val");
  return e === "tx1" || e === "tx2" ? "defaultTextScheme" : "explicit";
}
function xn(t, n, e) {
  if (!n.exists()) return;
  const o = n.numAttr("sz");
  o !== void 0 && (t.fontSize = o / 100);
  const s = n.attr("b");
  s !== void 0 && (t.bold = ue(s));
  const i = n.attr("i");
  i !== void 0 && (t.italic = ue(i));
  const r = n.attr("u");
  r !== void 0 && r !== "none" && (t.underline = !0), r === "none" && (t.underline = !1);
  const c = n.attr("strike");
  c !== void 0 && c !== "noStrike" && (t.strikethrough = !0), c === "noStrike" && (t.strikethrough = !1);
  const l = n.child("highlight");
  l.exists() && (t.highlightColor = he(l, e));
  const a = n.child("uFill");
  if (a.exists()) {
    const A = a.child("solidFill");
    A.exists() && (t.underlineColor = he(A, e), t.underlineFollowsText = !1);
  }
  n.child("uFillTx").exists() && (t.underlineFollowsText = !0, t.underlineColor = void 0);
  const h = n.child("solidFill");
  if (h.exists()) {
    delete t.textGradientCss, delete t.textPatternCss, delete t.textNoFill;
    const { color: A, alpha: S } = Tt(h, e), w = A.startsWith("#") ? A : `#${A}`;
    if (S < 1) {
      const { r: F, g: C, b: E } = Bs(w);
      t.color = `rgba(${F},${C},${E},${S.toFixed(3)})`;
    } else
      t.color = w;
  }
  const u = n.child("gradFill");
  if (u.exists()) {
    delete t.color, delete t.textPatternCss, delete t.textNoFill;
    const A = hr(u, e);
    A && (t.textGradientCss = A);
  }
  if (n.child("pattFill").exists()) {
    delete t.color, delete t.textGradientCss, delete t.textNoFill;
    const A = Ge(n, e);
    A && (t.textPatternCss = A);
  }
  const p = [], $ = [n.attr("lang"), n.attr("altLang")];
  for (const A of ["latin", "ea", "cs"]) {
    const S = n.child(A);
    if (!S.exists()) continue;
    const w = S.attr("typeface");
    w && p.push(In(w, e, $));
  }
  p.length > 0 && (t.fontFamily = p[0], t.fontFamilyStack = p);
  const g = n.child("hlinkClick");
  if (g.exists()) {
    const A = g.attr("id") ?? g.attr("r:id"), S = A ? e.slide.rels.get(A) : void 0, w = g.attr("action"), F = Es(e, w, S);
    F !== void 0 && e.onNavigate ? (t.hlinkSlideIndex = F, t.hlinkTooltip = g.attr("tooltip"), t.underline === void 0 && (t.underline = !0)) : S && Ie(S.targetMode) && Ro(S.target) && (t.hlinkClick = S.target, t.underline === void 0 && (t.underline = !0));
  }
  const f = n.numAttr("spc");
  f !== void 0 && (t.letterSpacingPt = f / 100);
  const y = n.numAttr("kern");
  y !== void 0 && (t.kern = y / 100);
  const m = n.attr("cap");
  m !== void 0 && (t.cap = m);
  const b = n.numAttr("baseline");
  b !== void 0 && (t.baseline = b);
  const M = n.child("effectLst"), L = M.child("outerShdw");
  if (L.exists()) {
    const A = Gh(L, e);
    A && cr(t, A);
  }
  const v = M.child("glow");
  if (v.exists()) {
    const A = Zh(v, e);
    A && cr(t, A);
  }
  n.child("noFill").exists() && (delete t.color, delete t.textGradientCss, delete t.textPatternCss, t.textNoFill = !0);
  const k = n.child("ln");
  if (k.exists() && !k.child("noFill").exists()) {
    const A = k.numAttr("w");
    t.textOutlineWidth = A ? X(A) : 0.75;
    const S = k.child("solidFill");
    if (S.exists()) {
      const { color: F, alpha: C } = Tt(S, e);
      t.textOutlineColor = Io(F, C);
    }
    const w = k.child("gradFill");
    w.exists() && (t.textOutlineGradientCss = hr(w, e));
  }
}
function wc(t, n, e) {
  for (const o of n.defRPrs ?? [])
    xn(t, o, e);
}
function rr(t, n) {
  const e = {};
  return wc(e, t, n), e;
}
function Bs(t) {
  const n = t.replace(/^#/, ""), e = parseInt(
    n.length === 3 ? n[0] + n[0] + n[1] + n[1] + n[2] + n[2] : n,
    16
  );
  return { r: e >> 16 & 255, g: e >> 8 & 255, b: e & 255 };
}
function Io(t, n) {
  const e = t.startsWith("#") ? t : `#${t}`;
  if (n >= 1) return e;
  const { r: o, g: s, b: i } = Bs(e);
  return `rgba(${o},${s},${i},${n.toFixed(3)})`;
}
function Zh(t, n) {
  const e = X(t.numAttr("rad") ?? 0);
  if (!(e > 0)) return;
  const { color: o, alpha: s } = Tt(t, n);
  if (!(!o || s <= 0))
    return `0px 0px ${e.toFixed(1)}px ${Io(o, s)}`;
}
function Gh(t, n) {
  const e = X(t.numAttr("dist") ?? 0), o = X(t.numAttr("blurRad") ?? 0), s = (t.numAttr("dir") ?? 0) / 6e4, i = e * Math.cos(s * Math.PI / 180), r = e * Math.sin(s * Math.PI / 180), { color: c, alpha: l } = Tt(t, n);
  if (!(!c || l <= 0))
    return `${i.toFixed(1)}px ${r.toFixed(1)}px ${o.toFixed(1)}px ${Io(c, l)}`;
}
function cr(t, n) {
  t.textShadow = t.textShadow ? `${t.textShadow}, ${n}` : n;
}
function lr(t, n) {
  if (!(t != null && t.exists())) return;
  const e = {};
  return xn(e, t, n), e.color;
}
function ar(t) {
  if (!t) return;
  const n = t.trim().toLowerCase();
  if (n.startsWith("#")) {
    const { r: l, g: a, b: d } = Bs(n);
    return `${l},${a},${d},1`;
  }
  const e = n.match(/^rgba?\(([^)]+)\)$/);
  if (!e) return n;
  const o = e[1].split(",").map((l) => l.trim());
  if (o.length < 3) return n;
  const [s, i, r] = o, c = o[3] ?? "1";
  return `${Number(s)},${Number(i)},${Number(r)},${Number(c)}`;
}
function dr(t, n) {
  const e = ar(t), o = ar(n);
  return e !== void 0 && e === o;
}
function Hh(t) {
  return (t == null ? void 0 : t.child("solidFill").child("srgbClr").exists()) ?? !1;
}
function Wh(t) {
  return (t == null ? void 0 : t.child("hlinkClick").exists()) ?? !1;
}
function Uh(t) {
  return !!t.hlinkClick || t.hlinkSlideIndex !== void 0;
}
function Vh(t, n, e, o) {
  if (!e) return !1;
  for (const i of n.runs) {
    if (i === t || Wh(i.properties)) continue;
    const r = lr(i.properties, o);
    if (dr(e, r)) return !0;
  }
  const s = lr(n.endParaRPr, o);
  return dr(e, s);
}
function _h(t, n, e, o, s, i) {
  return Uh(e) ? !s || o === "defaultTextScheme" ? !0 : o !== "explicit" || !Hh(t.properties) ? !1 : Vh(t, n, e.color, i) : !1;
}
function hr(t, n) {
  const e = t.child("gsLst"), o = [];
  for (const r of e.children("gs")) {
    const c = r.numAttr("pos") ?? 0, l = Eo(c) * 100, { color: a, alpha: d } = Tt(r, n);
    o.push({ position: l, color: Io(a, d) });
  }
  if (o.length === 0) return "";
  o.sort((r, c) => r.position - c.position);
  const s = o.map((r) => `${r.color} ${r.position.toFixed(1)}%`).join(", "), i = t.child("lin");
  return i.exists() ? `linear-gradient(${((vn(i.numAttr("ang") ?? 0) + 90) % 360).toFixed(1)}deg, ${s})` : `linear-gradient(180deg, ${s})`;
}
function ur(t, n) {
  var e;
  if (t.style.background = n, !t.style.background && n.includes(" 0 0 / 8px 8px, ")) {
    const o = n.split(" 0 0 / 8px 8px, "), s = (e = o[o.length - 1]) == null ? void 0 : e.trim(), i = o.slice(0, -1).map((r) => r.trim());
    i.length > 0 && (t.style.backgroundImage = i.join(", "), t.style.backgroundSize = i.map(() => "8px 8px").join(", ")), s && (t.style.backgroundColor = s);
  }
  t.style.webkitBackgroundClip = "text", t.style.backgroundClip = "text", t.style.color = "transparent";
}
function Xh(t, n) {
  switch (t) {
    case "arabicPeriod":
      return `${n}.`;
    case "arabicParenR":
      return `${n})`;
    case "arabicParenBoth":
      return `(${n})`;
    case "arabicPlain":
      return `${n}`;
    case "romanUcPeriod":
      return `${fr(n)}.`;
    case "romanLcPeriod":
      return `${fr(n).toLowerCase()}.`;
    case "alphaUcPeriod":
      return `${String.fromCharCode(64 + ((n - 1) % 26 + 1))}.`;
    case "alphaLcPeriod":
      return `${String.fromCharCode(96 + ((n - 1) % 26 + 1))}.`;
    case "alphaUcParenR":
      return `${String.fromCharCode(64 + ((n - 1) % 26 + 1))})`;
    case "alphaLcParenR":
      return `${String.fromCharCode(96 + ((n - 1) % 26 + 1))})`;
    default:
      return `${n}.`;
  }
}
function fr(t) {
  const n = [1e3, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1], e = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let o = "", s = t;
  for (let i = 0; i < n.length; i++)
    for (; s >= n[i]; )
      o += e[i], s -= n[i];
  return o;
}
function Ec(t, n, e, o, s) {
  var p, $, g, f, y;
  const i = Oh(n);
  let r = 1, c = 0;
  const l = fo(t, "normAutofit");
  if (l != null && l.exists()) {
    const m = l.numAttr("fontScale");
    m !== void 0 && (r = m / 1e5);
    const b = l.numAttr("lnSpcReduction");
    b !== void 0 && (c = b / 1e5);
  }
  const a = /* @__PURE__ */ new Map(), d = t.paragraphs.map((m, b) => ({
    index: b,
    visible: m.runs.some((M) => M.text != null && M.text.length > 0)
  })).filter((m) => m.visible).map((m) => m.index), h = d[0], u = d[d.length - 1], x = d.length === 1 ? d[0] : void 0;
  for (const [m, b] of t.paragraphs.entries()) {
    const M = document.createElement("div");
    M.style.width = "100%", M.style.minWidth = "0px", M.style.maxWidth = "100%", M.style.boxSizing = "border-box", M.style.overflowWrap = "anywhere";
    const L = b.level;
    s != null && s.isVerticalText && (M.style.wordBreak = "keep-all");
    const v = b.runs.some((G) => G.text === `
`), k = (s == null ? void 0 : s.compactSingleLineSpacing) && m === x && !v, A = {};
    Qe(A, _e(e.presentation.defaultTextStyle, L)), Qe(A, _e(e.master.defaultTextStyle, L));
    const S = i === "title" ? e.master.textStyles.titleStyle : i === "body" ? e.master.textStyles.bodyStyle : e.master.textStyles.otherStyle;
    if (Qe(A, _e(S, L)), n) {
      const G = sr(e.master.placeholders, n);
      if (G) {
        const T = ir(G);
        Qe(A, _e(T, L));
      }
    }
    if (n) {
      const G = sr(
        e.layout.placeholders.map((T) => T.node),
        n
      );
      if (G) {
        const T = ir(G);
        Qe(A, _e(T, L));
      }
    }
    if (Qe(A, _e(t.listStyle, L)), b.properties && Qe(A, b.properties), A.align) {
      const G = {
        l: "left",
        ctr: "center",
        r: "right",
        just: "justify",
        justLow: "justify",
        dist: "justify",
        thaiDist: "justify"
      };
      M.style.textAlign = G[A.align] || "left";
    }
    A.rtl !== void 0 && (M.style.direction = A.rtl ? "rtl" : "ltr"), A.marginLeft !== void 0 && (M.style.paddingLeft = `${A.marginLeft}px`), A.textIndent !== void 0 && (M.style.textIndent = `${A.textIndent}px`);
    let w = A.lineHeight ?? (s == null ? void 0 : s.defaultLineHeight);
    if (w) {
      if (c > 0) {
        const G = parseFloat(w);
        isNaN(G) || (w.includes("pt") ? w = `${(G * (1 - c)).toFixed(2)}pt` : w = `${(G * (1 - c)).toFixed(3)}`);
      }
      s != null && s.isVerticalText && !A.lineHeightAbsolute ? w = "1" : k && A.lineHeightAbsolute && (w = "normal"), M.style.lineHeight = w;
    }
    let F = 12;
    const C = rr(A, e);
    if (C.fontSize !== void 0 && (F = C.fontSize), b.runs.length > 0 && b.runs[0].properties) {
      const G = b.runs[0].properties.numAttr("sz");
      G !== void 0 && (F = G / 100);
    } else if (b.runs.length === 0 && b.endParaRPr) {
      const G = b.endParaRPr.numAttr("sz");
      G !== void 0 && (F = G / 100);
    }
    M.style.fontSize = `${F * r}pt`;
    const E = (s == null ? void 0 : s.trimOuterParagraphSpacing) && m === h, P = (s == null ? void 0 : s.trimOuterParagraphSpacing) && m === u;
    E ? M.style.marginTop = "0px" : A.spaceBefore !== void 0 ? M.style.marginTop = `${A.spaceBefore}pt` : A.spaceBeforePct !== void 0 && (M.style.marginTop = `${A.spaceBeforePct * F}pt`), P ? M.style.marginBottom = "0px" : A.spaceAfter !== void 0 ? M.style.marginBottom = `${A.spaceAfter}pt` : A.spaceAfterPct !== void 0 && (M.style.marginBottom = `${A.spaceAfterPct * F}pt`);
    const R = !b.runs.some((G) => G.text != null && G.text.length > 0) || (n == null ? void 0 : n.type) === "sldNum" || (n == null ? void 0 : n.type) === "dt" || (n == null ? void 0 : n.type) === "ftr" || (n == null ? void 0 : n.type) === "title" || (n == null ? void 0 : n.type) === "ctrTitle" || (n == null ? void 0 : n.type) === "subTitle";
    let I = "";
    if (!R && A.bulletNone !== !0) {
      if (A.bulletChar)
        I = A.bulletChar;
      else if (A.bulletAutoNum) {
        const G = `${L}:${A.bulletAutoNum}`, T = A.bulletAutoNumStartAt ?? a.get(G) ?? 1;
        I = Xh(A.bulletAutoNum, T), a.set(G, T + 1);
      }
    }
    if (I) {
      const G = document.createElement("span");
      G.textContent = I + " ";
      const T = A.marginLeft, D = A.textIndent;
      if (T !== void 0 && T > 0 && D !== void 0 && D < 0) {
        const it = Math.max(0, T + D), lt = Math.max(0, T - it);
        M.style.textIndent = "0px", A.align === "ctr" || A.align === "r" ? (M.style.paddingLeft = "0px", G.style.display = "inline-block", G.style.width = `${lt}px`, G.style.whiteSpace = "pre") : (M.style.position = "relative", G.style.position = "absolute", G.style.left = `${it}px`, G.style.top = "0px", G.style.width = `${lt}px`, G.style.whiteSpace = "pre");
      }
      A.bulletFont && (G.style.fontFamily = mn(In(A.bulletFont, e)));
      const ot = A.bulletSizePt ?? F * (A.bulletSizePct ?? 1);
      G.style.fontSize = `${ot * r}pt`;
      let J;
      const W = () => {
        const it = b.runs.find(
          (Pt) => Pt.text != null && Pt.text.length > 0
        );
        if (!it) return;
        const lt = rr(A, e);
        return it.properties && xn(lt, it.properties, e), lt.color ?? (s == null ? void 0 : s.fontRefColor) ?? (s == null ? void 0 : s.cellTextColor) ?? (lt.textNoFill ? "transparent" : void 0);
      };
      if (A.bulletColorNode && A.bulletColorNode.exists() && (J = he(A.bulletColorNode, e)), J === void 0 && (J = W()), J === void 0 && t.listStyle) {
        const it = _e(t.listStyle, L);
        if (it.exists()) {
          const lt = it.child("defRPr");
          if (lt.exists()) {
            const Pt = {};
            xn(Pt, lt, e), Pt.color !== void 0 && (J = Pt.color);
          }
        }
      }
      G.style.color = J ?? (s == null ? void 0 : s.fontRefColor) ?? (s == null ? void 0 : s.cellTextColor) ?? "#000000", M.appendChild(G);
    }
    const Z = Dh(b.runs), U = /* @__PURE__ */ new Map();
    if (b.runs.length === 0 && M.appendChild(document.createElement("br")), b.runs.some((G) => {
      var T;
      return (T = G.text) == null ? void 0 : T.includes("	");
    })) {
      const G = A.defaultTabSize ?? 96;
      M.style.tabSize = `${G}px`;
    }
    const q = A.lineHeightAbsolute && v && w;
    let Q = null;
    q && (Q = document.createElement("div"), Q.style.height = w, Q.style.overflow = "visible", M.appendChild(Q));
    for (const [G, T] of b.runs.entries()) {
      if (T.text === `
`) {
        q ? (Q = document.createElement("div"), Q.style.height = w, Q.style.overflow = "visible", M.appendChild(Q)) : M.appendChild(document.createElement("br"));
        continue;
      }
      const D = {};
      if (wc(D, A, e), T.properties && xn(D, T.properties, e), D.color === void 0 && t.listStyle) {
        const Y = _e(t.listStyle, L);
        if (Y.exists()) {
          const Bt = Y.child("defRPr");
          if (Bt.exists()) {
            const Ft = {};
            xn(Ft, Bt, e), Ft.color !== void 0 && (D.color = Ft.color);
          }
        }
      }
      let O;
      if (D.hlinkSlideIndex !== void 0) {
        const Y = document.createElement("span"), Bt = D.hlinkSlideIndex;
        Y.setAttribute("role", "link"), Y.tabIndex = 0, Y.title = D.hlinkTooltip || Ps(Bt), Y.style.cursor = "pointer", Y.addEventListener("click", (Ft) => {
          var Xt;
          Ft.stopPropagation(), (Xt = e.onNavigate) == null || Xt.call(e, { slideIndex: Bt });
        }), Y.addEventListener("keydown", (Ft) => {
          var Xt;
          Ft.key !== "Enter" && Ft.key !== " " || (Ft.preventDefault(), Ft.stopPropagation(), (Xt = e.onNavigate) == null || Xt.call(e, { slideIndex: Bt }));
        }), O = Y;
      } else if (D.hlinkClick) {
        const Y = document.createElement("a");
        Y.href = D.hlinkClick, Y.target = "_blank", Y.rel = "noopener noreferrer", O = Y;
      } else
        O = document.createElement("span");
      const ot = kc(T.text), J = !!D.textGradientCss || !!D.textPatternCss || !!D.textNoFill || D.textOutlineWidth !== void 0 || !!D.textOutlineColor || !!D.textOutlineGradientCss, W = !!T.text && !!ot && T.text !== ot && !J;
      if (T.text && T.text.includes("	"))
        O.textContent = T.text, O.style.whiteSpace = "pre";
      else if (W) {
        const Y = T.text.indexOf(ot), Bt = Y + ot.length;
        or(O, T.text.slice(0, Y));
        const Ft = document.createElement("span");
        Ft.textContent = ot, Ft.style.whiteSpace = "nowrap", O.appendChild(Ft), or(O, T.text.slice(Bt));
      } else if (T.text && / {2}/.test(T.text)) {
        const Y = T.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ {2}/g, "  ");
        O.innerHTML = Y;
      } else
        O.textContent = T.text;
      ot && (T.text === ot || T.text && T.text !== ot && J) && (O.style.whiteSpace = "nowrap");
      const it = D.fontSize || 12;
      O.style.fontSize = `${it * r}pt`, (((p = T.properties) == null ? void 0 : p.attr("b")) !== void 0 ? D.bold : (s == null ? void 0 : s.cellTextBold) ?? D.bold) && (O.style.fontWeight = "bold"), ((($ = T.properties) == null ? void 0 : $.attr("i")) !== void 0 ? D.italic : (s == null ? void 0 : s.cellTextItalic) ?? D.italic) && (O.style.fontStyle = "italic");
      const Rt = [];
      D.underline && Rt.push("underline"), D.strikethrough && Rt.push("line-through"), Rt.length > 0 && (O.style.textDecoration = Rt.join(" ")), D.highlightColor && (O.style.backgroundColor = D.highlightColor);
      const Wt = Nh(T.properties), Nt = Wt !== "none";
      let ft;
      if (s != null && s.fontRefColor ? ft = Nt ? D.color : s.fontRefColor : s != null && s.cellTextColor && !Nt ? ft = s.cellTextColor : ft = D.color, _h(
        T,
        b,
        D,
        Wt,
        Nt,
        e
      )) {
        const Y = e.theme.colorScheme.get("hlink");
        Y && (ft = Y.startsWith("#") ? Y : `#${Y}`);
      }
      if (ft ? O.style.color = ft : O.style.color = "#000000", D.underlineFollowsText && ft && (O.style.textDecorationColor = ft), D.underlineColor && (O.style.textDecorationColor = D.underlineColor), D.textShadow && (O.style.textShadow = D.textShadow), D.textGradientCss && ur(O, D.textGradientCss), D.textPatternCss && ur(O, D.textPatternCss), D.textNoFill || D.textOutlineWidth) {
        const Y = D.textOutlineWidth ?? 0.75;
        if (D.textNoFill && D.textOutlineGradientCss) {
          const Bt = "#ffffff";
          O.style.color = "transparent", O.style.webkitTextStrokeWidth = `${Y}px`, O.style.webkitTextStrokeColor = Bt, O.style.paintOrder = "stroke fill";
          const Ft = D.textOutlineGradientCss;
          O.style.maskImage = Ft, O.style.webkitMaskImage = Ft;
        } else D.textNoFill && D.textOutlineColor ? (O.style.color = "transparent", O.style.webkitTextStrokeWidth = `${Y}px`, O.style.webkitTextStrokeColor = D.textOutlineColor, O.style.paintOrder = "stroke fill") : D.textNoFill ? O.style.color = "transparent" : D.textOutlineColor && (O.style.webkitTextStrokeWidth = `${Y}px`, O.style.webkitTextStrokeColor = D.textOutlineColor, O.style.paintOrder = "stroke fill");
      }
      const Dt = ((g = T.properties) == null ? void 0 : g.child("latin").exists()) || ((f = T.properties) == null ? void 0 : f.child("ea").exists()) || ((y = T.properties) == null ? void 0 : y.child("cs").exists()) ? D.fontFamilyStack ?? D.fontFamily : (s == null ? void 0 : s.cellTextFontFamily) ?? D.fontFamilyStack ?? D.fontFamily;
      if (Dt) {
        const Y = Array.isArray(Dt) ? Dt.map((Bt) => In(Bt, e)) : In(Dt, e);
        O.style.fontFamily = mn(Y);
      } else {
        const Y = e.theme.minorFont.latin || e.theme.minorFont.ea;
        Y && (O.style.fontFamily = mn(Y));
      }
      if (D.letterSpacingPt !== void 0 && (O.style.letterSpacing = `${D.letterSpacingPt}pt`), D.kern !== void 0) {
        const Y = (D.fontSize || 12) * r;
        O.style.fontKerning = Y >= D.kern ? "normal" : "none";
      }
      if (D.cap === "all" ? O.style.textTransform = "uppercase" : D.cap === "small" && (O.style.fontVariant = "small-caps"), D.baseline !== void 0 && D.baseline !== 0) {
        const Y = D.baseline / 1e3;
        O.style.verticalAlign = `${Y}%`, Math.abs(Y) >= 20 && (O.style.fontSize = `${it * r * 0.65}pt`);
      }
      const Ot = Q ?? M, Ut = Z.get(G);
      if (Ut !== void 0) {
        let Y = U.get(Ut);
        Y || (Y = document.createElement("span"), Y.style.whiteSpace = "nowrap", U.set(Ut, Y), Ot.appendChild(Y)), Y.appendChild(O);
      } else
        Ot.appendChild(O);
    }
    if (b.endParaRPr) {
      const G = b.runs[b.runs.length - 1];
      if ((G == null ? void 0 : G.text) === `
`) {
        const T = b.endParaRPr.numAttr("sz");
        if (T !== void 0) {
          const D = document.createElement("span");
          D.textContent = "​", D.style.fontSize = `${T / 100 * r}pt`, (Q ?? M).appendChild(D);
        }
      }
    }
    o.appendChild(M);
  }
}
function Yh(t) {
  let n = 0, e = 0;
  for (const o of t.allChildren()) {
    if (o.localName === "moveTo" || o.localName === "lnTo") {
      const s = o.child("pt");
      n = Math.max(n, s.numAttr("x") ?? 0), e = Math.max(e, s.numAttr("y") ?? 0);
      continue;
    }
    if (o.localName === "cubicBezTo" || o.localName === "quadBezTo") {
      for (const s of o.children("pt"))
        n = Math.max(n, s.numAttr("x") ?? 0), e = Math.max(e, s.numAttr("y") ?? 0);
      continue;
    }
    o.localName === "arcTo" && (n = Math.max(n, o.numAttr("wR") ?? 0), e = Math.max(e, o.numAttr("hR") ?? 0));
  }
  return {
    w: Math.max(1, n),
    h: Math.max(1, e)
  };
}
function Pc(t, n, e, o) {
  const s = t.child("pathLst");
  if (!s.exists()) return "";
  const i = s.children("path"), r = [];
  for (const c of i) {
    const l = Yh(c), a = c.numAttr("w") ?? (o == null ? void 0 : o.w) ?? l.w, d = c.numAttr("h") ?? (o == null ? void 0 : o.h) ?? l.h, h = a > 0 ? n / a : 1, u = d > 0 ? e / d : 1;
    let x = 0, p = 0;
    const $ = c.allChildren();
    for (const g of $)
      switch (g.localName) {
        case "moveTo": {
          const f = g.child("pt"), y = (f.numAttr("x") ?? 0) * h, m = (f.numAttr("y") ?? 0) * u;
          r.push(`M${y},${m}`), x = y, p = m;
          break;
        }
        case "lnTo": {
          const f = g.child("pt"), y = (f.numAttr("x") ?? 0) * h, m = (f.numAttr("y") ?? 0) * u;
          r.push(`L${y},${m}`), x = y, p = m;
          break;
        }
        case "cubicBezTo": {
          const f = g.children("pt");
          if (f.length >= 3) {
            const y = (f[0].numAttr("x") ?? 0) * h, m = (f[0].numAttr("y") ?? 0) * u, b = (f[1].numAttr("x") ?? 0) * h, M = (f[1].numAttr("y") ?? 0) * u, L = (f[2].numAttr("x") ?? 0) * h, v = (f[2].numAttr("y") ?? 0) * u;
            r.push(`C${y},${m} ${b},${M} ${L},${v}`), x = L, p = v;
          }
          break;
        }
        case "quadBezTo": {
          const f = g.children("pt");
          if (f.length >= 2) {
            const y = (f[0].numAttr("x") ?? 0) * h, m = (f[0].numAttr("y") ?? 0) * u, b = (f[1].numAttr("x") ?? 0) * h, M = (f[1].numAttr("y") ?? 0) * u;
            r.push(`Q${y},${m} ${b},${M}`), x = b, p = M;
          }
          break;
        }
        case "arcTo": {
          const f = g.numAttr("wR") ?? 0, y = g.numAttr("hR") ?? 0, m = f * h, b = y * u, M = g.numAttr("stAng") ?? 0, L = g.numAttr("swAng") ?? 0, v = M / 6e4, k = L / 6e4;
          if (m === 0 || b === 0 || k === 0)
            break;
          const A = v * Math.PI / 180, S = Math.atan2(f * Math.sin(A), y * Math.cos(A)), w = (v + k) * Math.PI / 180, F = Math.atan2(f * Math.sin(w), y * Math.cos(w)), C = x / h, E = p / u, P = C - f * Math.cos(S), B = E - y * Math.sin(S), R = (P + f * Math.cos(F)) * h, I = (B + y * Math.sin(F)) * u, Z = Math.abs(k) > 180 ? 1 : 0, U = k > 0 ? 1 : 0;
          r.push(`A${m},${b} 0 ${Z},${U} ${R},${I}`), x = R, p = I;
          break;
        }
        case "close": {
          r.push("Z");
          break;
        }
      }
  }
  return r.join(" ");
}
function qh(t, n, e, o, s, i, r) {
  const c = s * Math.PI / 180, l = i * Math.PI / 180, a = t + e * Math.cos(c), d = n + o * Math.sin(c), h = t + e * Math.cos(l), u = n + o * Math.sin(l);
  let x = ((i - s) % 360 + 360) % 360;
  x === 0 && s !== i && (x = 360);
  const p = x > 180 ? 1 : 0;
  return `M${a},${d} A${e},${o} 0 ${p},1 ${h},${u}`;
}
function st(t, n, e) {
  return ((t == null ? void 0 : t.get(n)) ?? e) / 1e5;
}
function jt(t, n, e) {
  return (t == null ? void 0 : t.get(n)) ?? e;
}
function Sn(t, n, e, o = 0.4) {
  const s = t / 2, i = n / 2, r = t / 2, c = n / 2, l = r * o, a = c * o, d = e * 2, h = [];
  for (let u = 0; u < d; u++) {
    const x = 2 * Math.PI * u / d - Math.PI / 2, p = u % 2 === 0, $ = p ? r : l, g = p ? c : a, f = s + $ * Math.cos(x), y = i + g * Math.sin(x);
    h.push(u === 0 ? `M${f},${y}` : `L${f},${y}`);
  }
  return h.push("Z"), h.join(" ");
}
function Qh(t, n) {
  const e = t.match(/[MLAZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!e) return t;
  const o = [];
  let s = 0;
  for (; s < e.length; ) {
    const i = e[s++];
    if (!i) break;
    if (o.push(i), i !== "Z") {
      if (i === "M" || i === "L") {
        const r = Number(e[s++]), c = Number(e[s++]);
        o.push(String(n - r), String(c));
        continue;
      }
      if (i === "A") {
        const r = e[s++], c = e[s++], l = e[s++], a = e[s++], d = Number(e[s++]), h = Number(e[s++]), u = Number(e[s++]);
        o.push(r, c, l, a, String(d ? 0 : 1), String(n - h), String(u));
        continue;
      }
      return t;
    }
  }
  return o.join(" ");
}
function Kh(t, n) {
  const e = t.match(/[MLAZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!e) return t;
  const o = [];
  let s = 0;
  for (; s < e.length; ) {
    const i = e[s++];
    if (!i) break;
    if (o.push(i), i !== "Z") {
      if (i === "M" || i === "L") {
        const r = Number(e[s++]), c = Number(e[s++]);
        o.push(String(r), String(n - c));
        continue;
      }
      if (i === "A") {
        const r = e[s++], c = e[s++], l = e[s++], a = e[s++], d = Number(e[s++]), h = Number(e[s++]), u = Number(e[s++]);
        o.push(r, c, l, a, String(d ? 0 : 1), String(h), String(n - u));
      }
    }
  }
  return o.join(" ");
}
const z = /* @__PURE__ */ new Map();
z.set("rect", (t, n) => `M0,0 L${t},0 L${t},${n} L0,${n} Z`);
z.set("roundRect", (t, n, e) => {
  const o = st(e, "adj", 16667), s = Math.min(t, n) * o;
  return [
    `M${s},0`,
    `L${t - s},0`,
    `A${s},${s} 0 0,1 ${t},${s}`,
    `L${t},${n - s}`,
    `A${s},${s} 0 0,1 ${t - s},${n}`,
    `L${s},${n}`,
    `A${s},${s} 0 0,1 0,${n - s}`,
    `L0,${s}`,
    `A${s},${s} 0 0,1 ${s},0`,
    "Z"
  ].join(" ");
});
z.set("plaque", (t, n, e) => {
  const o = Math.min(Math.max(jt(e, "adj", 16667), 0), 5e4), s = Math.min(t, n) * o / 1e5, i = t - s, r = n - s, c = K(0, s, s, s, 90, -90), l = K(i, 0, s, s, 180, -90), a = K(t, r, s, s, 270, -90), d = K(s, n, s, s, 0, -90);
  return [
    `M0,${s}`,
    c.svg,
    `L${i},0`,
    l.svg,
    `L${t},${r}`,
    a.svg,
    `L${s},${n}`,
    d.svg,
    "Z"
  ].join(" ");
});
z.set("cornerTabs", (t, n) => {
  const e = Math.sqrt(t * t + n * n) / 20;
  return [
    `M0,0 L${e},0 L0,${e} Z`,
    `M${t},0 L${t - e},0 L${t},${e} Z`,
    `M${t},${n} L${t - e},${n} L${t},${n - e} Z`,
    `M0,${n} L${e},${n} L0,${n - e} Z`
  ].join(" ");
});
z.set("squareTabs", (t, n) => {
  const e = Math.sqrt(t * t + n * n) / 20;
  return [
    `M0,0 L${e},0 L${e},${e} L0,${e} Z`,
    `M${t - e},0 L${t},0 L${t},${e} L${t - e},${e} Z`,
    `M0,${n - e} L${e},${n - e} L${e},${n} L0,${n} Z`,
    `M${t - e},${n - e} L${t},${n - e} L${t},${n} L${t - e},${n} Z`
  ].join(" ");
});
z.set("plaqueTabs", (t, n) => {
  const e = Math.sqrt(t * t + n * n) / 20;
  return [
    `M0,0 L${e},0 A${e},${e} 0 0,1 0,${e} Z`,
    `M${t},0 L${t - e},0 A${e},${e} 0 0,0 ${t},${e} Z`,
    `M0,${n} L0,${n - e} A${e},${e} 0 0,1 ${e},${n} Z`,
    `M${t},${n} L${t - e},${n} A${e},${e} 0 0,1 ${t},${n - e} Z`
  ].join(" ");
});
z.set("ellipse", (t, n) => {
  const e = t / 2, o = n / 2;
  return [`M${t},${o}`, `A${e},${o} 0 1,1 0,${o}`, `A${e},${o} 0 1,1 ${t},${o}`, "Z"].join(
    " "
  );
});
z.set("triangle", (t, n, e) => {
  const o = st(e, "adj", 5e4);
  return `M${t * o},0 L${t},${n} L0,${n} Z`;
});
z.set("isosTriangle", (t, n, e) => {
  const o = st(e, "adj", 5e4);
  return `M${t * o},0 L${t},${n} L0,${n} Z`;
});
z.set("rtTriangle", (t, n) => `M0,0 L${t},${n} L0,${n} Z`);
z.set("diamond", (t, n) => {
  const e = t / 2, o = n / 2;
  return `M${e},0 L${t},${o} L${e},${n} L0,${o} Z`;
});
z.set("pentagon", (t, n) => {
  const e = t / 2, o = e * 105146 / 1e5, s = n / 2 * 110557 / 1e5, i = s, r = o * Math.cos(18 * Math.PI / 180), c = o * Math.cos(54 * Math.PI / 180), l = s * Math.sin(18 * Math.PI / 180), a = s * Math.sin(54 * Math.PI / 180);
  return [
    `M${e - r},${i - l}`,
    // x1, y1 (upper-left)
    `L${e},0`,
    // hc, t (top)
    `L${e + r},${i - l}`,
    // x4, y1 (upper-right)
    `L${e + c},${i + a}`,
    // x3, y2 (lower-right)
    `L${e - c},${i + a}`,
    // x2, y2 (lower-left)
    "Z"
  ].join(" ");
});
z.set("hexagon", (t, n, e) => {
  const o = Math.min(t, n), s = Math.min(
    Math.max(jt(e, "adj", 25e3), 0),
    o > 0 ? 5e4 * t / o : 5e4
  ), r = n / 2 * 115470 / 1e5, c = o * s / 1e5, l = t - c, a = n / 2, d = r * Math.sin(60 * Math.PI / 180), h = a - d, u = a + d;
  return [
    `M0,${a}`,
    `L${c},${h}`,
    `L${l},${h}`,
    `L${t},${a}`,
    `L${l},${u}`,
    `L${c},${u}`,
    "Z"
  ].join(" ");
});
z.set("octagon", (t, n, e) => {
  const o = Math.min(t, n), s = Math.min(Math.max(jt(e, "adj", 29289), 0), 5e4), i = o * s / 1e5, r = t - i, c = n - i;
  return [
    `M0,${i}`,
    `L${i},0`,
    `L${r},0`,
    `L${t},${i}`,
    `L${t},${c}`,
    `L${r},${n}`,
    `L${i},${n}`,
    `L0,${c}`,
    "Z"
  ].join(" ");
});
z.set("heptagon", (t, n) => {
  const e = t / 2, o = e * 102572 / 1e5, s = n / 2 * 105210 / 1e5, i = n / 2 * 105210 / 1e5, r = o * 97493 / 1e5, c = o * 78183 / 1e5, l = o * 43388 / 1e5, a = s * 62349 / 1e5, d = s * 22252 / 1e5, h = s * 90097 / 1e5;
  return [
    `M${e - r},${i + d}`,
    // x1, y2 (left)
    `L${e - c},${i - a}`,
    // x2, y1 (upper-left)
    `L${e},0`,
    // hc, t (top: svc - shd2 = 0)
    `L${e + c},${i - a}`,
    // x5, y1 (upper-right)
    `L${e + r},${i + d}`,
    // x6, y2 (right)
    `L${e + l},${i + h}`,
    // x4, y3 (lower-right)
    `L${e - l},${i + h}`,
    // x3, y3 (lower-left)
    "Z"
  ].join(" ");
});
z.set("decagon", (t, n) => {
  const e = t / 2, o = n / 2, s = o * 105146 / 1e5, i = e * Math.cos(36 * Math.PI / 180), r = e * Math.cos(72 * Math.PI / 180), c = s * Math.sin(72 * Math.PI / 180), l = s * Math.sin(36 * Math.PI / 180);
  return [
    `M0,${o}`,
    // l, vc
    `L${e - i},${o - l}`,
    // x1, y2
    `L${e - r},${o - c}`,
    // x2, y1
    `L${e + r},${o - c}`,
    // x3, y1
    `L${e + i},${o - l}`,
    // x4, y2
    `L${t},${o}`,
    // r, vc
    `L${e + i},${o + l}`,
    // x4, y3
    `L${e + r},${o + c}`,
    // x3, y4
    `L${e - r},${o + c}`,
    // x2, y4
    `L${e - i},${o + l}`,
    // x1, y3
    "Z"
  ].join(" ");
});
z.set("dodecagon", (t, n) => {
  const e = t * 2894 / 21600, o = t * 7906 / 21600, s = t * 13694 / 21600, i = t * 18706 / 21600, r = n * 2894 / 21600, c = n * 7906 / 21600, l = n * 13694 / 21600, a = n * 18706 / 21600;
  return [
    `M0,${c}`,
    `L${e},${r}`,
    `L${o},0`,
    `L${s},0`,
    `L${i},${r}`,
    `L${t},${c}`,
    `L${t},${l}`,
    `L${i},${a}`,
    `L${s},${n}`,
    `L${o},${n}`,
    `L${e},${a}`,
    `L0,${l}`,
    "Z"
  ].join(" ");
});
z.set("parallelogram", (t, n, e) => {
  const o = Math.min(t, n), s = o > 0 ? 1e5 * t / o : 1e5, i = Math.min(Math.max(jt(e, "adj", 25e3), 0), s), r = o * i / 1e5, c = t - r;
  return `M0,${n} L${r},0 L${t},0 L${c},${n} Z`;
});
z.set("trapezoid", (t, n, e) => {
  const o = Math.min(t, n), s = o > 0 ? 5e4 * t / o : 5e4, i = Math.min(Math.max(jt(e, "adj", 25e3), 0), s), r = o * i / 1e5, c = t - r;
  return `M0,${n} L${r},0 L${c},0 L${t},${n} Z`;
});
z.set("nonIsoscelesTrapezoid", (t, n, e) => {
  const o = Math.min(t, n), s = o > 0 ? 5e4 * t / o : 5e4, i = Math.min(Math.max(jt(e, "adj1", 25e3), 0), s), r = Math.min(Math.max(jt(e, "adj2", 25e3), 0), s), c = o * i / 1e5, l = o * r / 1e5, a = t - l;
  return `M0,${n} L${c},0 L${a},0 L${t},${n} Z`;
});
z.set("corner", (t, n, e) => {
  const o = Math.min(t, n), s = Math.min(Math.max(st(e, "adj1", 5e4), 0), 1), i = Math.min(Math.max(st(e, "adj2", 5e4), 0), 1), r = o * i, c = o * s, l = n - c;
  return ["M0,0", `L${r},0`, `L${r},${l}`, `L${t},${l}`, `L${t},${n}`, `L0,${n}`, "Z"].join(
    " "
  );
});
z.set("diagStripe", (t, n, e) => {
  const o = Math.min(Math.max(st(e, "adj", 5e4), 0), 1), s = t * o;
  return [`M0,${n * o}`, `L${s},0`, `L${t},0`, `L0,${n}`, "Z"].join(" ");
});
z.set("star4", (t, n, e) => {
  const o = st(e, "adj", 12500) * 2;
  return Sn(t, n, 4, Math.min(Math.max(o, 0), 1));
});
z.set("star5", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj")) ?? 19098, s = Math.min(Math.max(o, 0), 5e4), i = 105146, r = 110557, c = t / 2 * i / 1e5, l = n / 2 * r / 1e5, a = n / 2 * r / 1e5, d = c * s / 5e4, h = l * s / 5e4, u = t / 2, x = 2 * Math.PI / 5, p = x / 2, $ = -Math.PI / 2, g = [];
  for (let f = 0; f < 5; f++) {
    const y = $ + x * f, m = y + p, b = u + c * Math.cos(y), M = a + l * Math.sin(y), L = u + d * Math.cos(m), v = a + h * Math.sin(m);
    g.push(f === 0 ? `M${b},${M}` : `L${b},${M}`), g.push(`L${L},${v}`);
  }
  return g.push("Z"), g.join(" ");
});
z.set("star6", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj")) ?? 28868, s = Math.min(Math.max(o, 0), 5e4), r = t / 2 * 115470 / 1e5, c = n / 2, l = r * s / 5e4, a = c * s / 5e4, d = t / 2, h = n / 2, u = 2 * Math.PI / 6, x = u / 2, p = -Math.PI / 2, $ = [];
  for (let g = 0; g < 6; g++) {
    const f = p + u * g, y = f + x, m = d + r * Math.cos(f), b = h + c * Math.sin(f), M = d + l * Math.cos(y), L = h + a * Math.sin(y);
    $.push(g === 0 ? `M${m},${b}` : `L${m},${b}`), $.push(`L${M},${L}`);
  }
  return $.push("Z"), $.join(" ");
});
z.set("star7", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj")) ?? 34601, s = Math.min(Math.max(o, 0), 5e4), i = t / 2 * 102572 / 1e5, r = n / 2 * 105210 / 1e5, c = r, l = i * s / 5e4, a = r * s / 5e4, d = t / 2, h = 2 * Math.PI / 7, u = h / 2, x = -Math.PI / 2, p = [];
  for (let $ = 0; $ < 7; $++) {
    const g = x + h * $, f = g + u, y = d + i * Math.cos(g), m = c + r * Math.sin(g), b = d + l * Math.cos(f), M = c + a * Math.sin(f);
    p.push($ === 0 ? `M${y},${m}` : `L${y},${m}`), p.push(`L${b},${M}`);
  }
  return p.push("Z"), p.join(" ");
});
z.set("star8", (t, n, e) => {
  const o = st(e, "adj", 37500) * 2;
  return Sn(t, n, 8, Math.min(Math.max(o, 0), 1));
});
z.set("star10", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj")) ?? 42533, s = Math.min(Math.max(o, 0), 5e4), r = t / 2 * 105146 / 1e5, c = n / 2, l = r * s / 5e4, a = c * s / 5e4, d = t / 2, h = n / 2, u = 2 * Math.PI / 10, x = u / 2, p = -Math.PI / 2, $ = [];
  for (let g = 0; g < 10; g++) {
    const f = p + u * g, y = f + x, m = d + r * Math.cos(f), b = h + c * Math.sin(f), M = d + l * Math.cos(y), L = h + a * Math.sin(y);
    $.push(g === 0 ? `M${m},${b}` : `L${m},${b}`), $.push(`L${M},${L}`);
  }
  return $.push("Z"), $.join(" ");
});
z.set("star12", (t, n, e) => {
  const o = st(e, "adj", 37500) * 2;
  return Sn(t, n, 12, Math.min(Math.max(o, 0), 1));
});
z.set("star16", (t, n, e) => {
  const o = st(e, "adj", 37500) * 2;
  return Sn(t, n, 16, Math.min(Math.max(o, 0), 1));
});
z.set("star24", (t, n, e) => {
  const o = st(e, "adj", 37500) * 2;
  return Sn(t, n, 24, Math.min(Math.max(o, 0), 1));
});
z.set("star32", (t, n, e) => {
  const o = st(e, "adj", 37500) * 2;
  return Sn(t, n, 32, Math.min(Math.max(o, 0), 1));
});
z.set("line", (t, n) => {
  const e = n || 1, o = t || 1;
  return t === 0 ? `M0.5,0 L0.5,${e}` : n === 0 ? `M0,0.5 L${o},0.5` : `M0,0 L${t},${n}`;
});
z.set("lineInv", (t, n) => {
  const e = n || 1, o = t || 1;
  return t === 0 ? `M0.5,0 L0.5,${e}` : n === 0 ? `M0,0.5 L${o},0.5` : `M${t},0 L0,${n}`;
});
z.set("straightConnector1", (t, n) => {
  const e = n || 1, o = t || 1;
  return t === 0 ? `M0.5,0 L0.5,${e}` : n === 0 ? `M0,0.5 L${o},0.5` : `M0,0 L${t},${n}`;
});
z.set("bentConnector2", (t, n) => `M0,0 L${t},0 L${t},${n}`);
z.set("bentConnector3", (t, n, e) => {
  const o = st(e, "adj1", 5e4), s = t * o;
  return `M0,0 L${s},0 L${s},${n} L${t},${n}`;
});
z.set("bentConnector4", (t, n, e) => {
  const o = st(e, "adj1", 5e4), s = st(e, "adj2", 5e4), i = t * o, r = n * s;
  return `M0,0 L${i},0 L${i},${r} L${t},${r} L${t},${n}`;
});
z.set("curvedConnector2", (t, n) => `M0,0 C${t / 2},0 ${t},${n / 2} ${t},${n}`);
z.set("curvedConnector3", (t, n, e) => {
  const o = t * st(e, "adj1", 5e4), s = o / 2, i = (t + o) / 2, r = n / 2, c = n / 4, l = n * 3 / 4;
  return `M0,0 C${s},0 ${o},${c} ${o},${r} C${o},${l} ${i},${n} ${t},${n}`;
});
z.set("curvedConnector4", (t, n, e) => {
  const o = t * st(e, "adj1", 5e4), s = n * st(e, "adj2", 5e4), i = o / 2, r = (t + o) / 2, c = (o + r) / 2, l = (r + t) / 2, a = s / 2, d = a / 2, h = (a + s) / 2, u = (n + s) / 2;
  return [
    "M0,0",
    `C${i},0 ${o},${d} ${o},${a}`,
    `C${o},${h} ${c},${s} ${r},${s}`,
    `C${l},${s} ${t},${u} ${t},${n}`
  ].join(" ");
});
z.set("curvedConnector5", (t, n, e) => {
  const o = t * st(e, "adj1", 5e4), s = n * st(e, "adj2", 5e4), i = t * st(e, "adj3", 5e4), r = (o + i) / 2, c = o / 2, l = (o + r) / 2, a = (i + r) / 2, d = (i + t) / 2, h = s / 2, u = h / 2, x = (h + s) / 2, p = (n + s) / 2, $ = (p + s) / 2, g = (p + n) / 2;
  return [
    "M0,0",
    `C${c},0 ${o},${u} ${o},${h}`,
    `C${o},${x} ${l},${s} ${r},${s}`,
    `C${a},${s} ${i},${$} ${i},${p}`,
    `C${i},${g} ${d},${n} ${t},${n}`
  ].join(" ");
});
z.set("bentConnector5", (t, n, e) => {
  const o = st(e, "adj1", 5e4), s = st(e, "adj2", 5e4), i = st(e, "adj3", 5e4), r = t * o, c = n * s, l = t * i;
  return `M0,0 L${r},0 L${r},${c} L${l},${c} L${l},${n} L${t},${n}`;
});
z.set("rightArrow", (t, n, e) => {
  const o = st(e, "adj1", 5e4), s = st(e, "adj2", 5e4), i = Math.min(t, n), r = n * o / 2, c = i * s, l = n / 2, a = t - c;
  return [
    `M0,${l - r}`,
    `L${a},${l - r}`,
    `L${a},0`,
    `L${t},${l}`,
    `L${a},${n}`,
    `L${a},${l + r}`,
    `L0,${l + r}`,
    "Z"
  ].join(" ");
});
z.set("leftArrow", (t, n, e) => {
  const o = st(e, "adj1", 5e4), s = st(e, "adj2", 5e4), i = Math.min(t, n), r = n * o / 2, c = i * s, l = n / 2;
  return [
    `M${t},${l - r}`,
    `L${c},${l - r}`,
    `L${c},0`,
    `L0,${l}`,
    `L${c},${n}`,
    `L${c},${l + r}`,
    `L${t},${l + r}`,
    "Z"
  ].join(" ");
});
z.set("upArrow", (t, n, e) => {
  const o = st(e, "adj1", 5e4), s = st(e, "adj2", 5e4), i = t * o / 2, r = n * s, c = t / 2;
  return [
    `M${c - i},${n}`,
    `L${c - i},${r}`,
    `L0,${r}`,
    `L${c},0`,
    `L${t},${r}`,
    `L${c + i},${r}`,
    `L${c + i},${n}`,
    "Z"
  ].join(" ");
});
z.set("downArrow", (t, n, e) => {
  const o = st(e, "adj1", 5e4), s = st(e, "adj2", 5e4), i = t * o / 2, r = n * s, c = t / 2, l = n - r;
  return [
    `M${c - i},0`,
    `L${c + i},0`,
    `L${c + i},${l}`,
    `L${t},${l}`,
    `L${c},${n}`,
    `L0,${l}`,
    `L${c - i},${l}`,
    "Z"
  ].join(" ");
});
z.set("downArrowCallout", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 25e3, s = (e == null ? void 0 : e.get("adj2")) ?? 25e3, i = (e == null ? void 0 : e.get("adj3")) ?? 25e3, r = (e == null ? void 0 : e.get("adj4")) ?? 64977, c = Math.min(t, n), l = Math.max(0, Math.min(s, 5e4 * t / Math.max(c, 1))), a = Math.max(0, Math.min(o, l * 2)), d = Math.max(0, Math.min(i, 1e5 * n / Math.max(c, 1))), h = d * c / Math.max(n, 1), u = Math.max(0, Math.min(r, 1e5 - h)), x = t / 2, p = c * l / 1e5, $ = c * a / 2e5, g = x - p, f = x - $, y = x + $, m = x + p, b = n - c * d / 1e5, M = n * u / 1e5;
  return [
    "M0,0",
    `L${t},0`,
    `L${t},${M}`,
    `L${y},${M}`,
    `L${y},${b}`,
    `L${m},${b}`,
    `L${x},${n}`,
    `L${g},${b}`,
    `L${f},${b}`,
    `L${f},${M}`,
    `L0,${M}`,
    "Z"
  ].join(" ");
});
z.set("rightArrowCallout", (t, n, e) => {
  const o = Math.min(t, n), s = 5e4 * n / Math.max(o, 1), i = Math.max(0, Math.min((e == null ? void 0 : e.get("adj2")) ?? 25e3, s)), r = Math.max(0, Math.min((e == null ? void 0 : e.get("adj1")) ?? 25e3, i * 2)), c = 1e5 * t / Math.max(o, 1), l = Math.max(0, Math.min((e == null ? void 0 : e.get("adj3")) ?? 25e3, c)), a = l * o / Math.max(t, 1), d = Math.max(0, Math.min((e == null ? void 0 : e.get("adj4")) ?? 64977, 1e5 - a)), h = n / 2, u = o * i / 1e5, x = o * r / 2e5, p = h - u, $ = h - x, g = h + x, f = h + u, y = o * l / 1e5, m = t - y, b = t * d / 1e5;
  return [
    "M0,0",
    `L${b},0`,
    `L${b},${$}`,
    `L${m},${$}`,
    `L${m},${p}`,
    `L${t},${h}`,
    `L${m},${f}`,
    `L${m},${g}`,
    `L${b},${g}`,
    `L${b},${n}`,
    `L0,${n}`,
    "Z"
  ].join(" ");
});
z.set("leftArrowCallout", (t, n, e) => {
  const o = Math.min(t, n), s = 5e4 * n / Math.max(o, 1), i = Math.max(0, Math.min((e == null ? void 0 : e.get("adj2")) ?? 25e3, s)), r = Math.max(0, Math.min((e == null ? void 0 : e.get("adj1")) ?? 25e3, i * 2)), c = 1e5 * t / Math.max(o, 1), l = Math.max(0, Math.min((e == null ? void 0 : e.get("adj3")) ?? 25e3, c)), a = l * o / Math.max(t, 1), d = Math.max(0, Math.min((e == null ? void 0 : e.get("adj4")) ?? 64977, 1e5 - a)), h = n / 2, u = o * i / 1e5, x = o * r / 2e5, p = h - u, $ = h - x, g = h + x, f = h + u, y = o * l / 1e5, m = t * d / 1e5, b = t - m;
  return [
    `M0,${h}`,
    `L${y},${p}`,
    `L${y},${$}`,
    `L${b},${$}`,
    `L${b},0`,
    `L${t},0`,
    `L${t},${n}`,
    `L${b},${n}`,
    `L${b},${g}`,
    `L${y},${g}`,
    `L${y},${f}`,
    "Z"
  ].join(" ");
});
z.set("upArrowCallout", (t, n, e) => {
  const o = Math.min(t, n), s = 5e4 * t / Math.max(o, 1), i = Math.max(0, Math.min((e == null ? void 0 : e.get("adj2")) ?? 25e3, s)), r = Math.max(0, Math.min((e == null ? void 0 : e.get("adj1")) ?? 25e3, i * 2)), c = 1e5 * n / Math.max(o, 1), l = Math.max(0, Math.min((e == null ? void 0 : e.get("adj3")) ?? 25e3, c)), a = l * o / Math.max(n, 1), d = Math.max(0, Math.min((e == null ? void 0 : e.get("adj4")) ?? 64977, 1e5 - a)), h = t / 2, u = o * i / 1e5, x = o * r / 2e5, p = h - u, $ = h - x, g = h + x, f = h + u, y = o * l / 1e5, m = n * d / 1e5, b = n - m;
  return [
    `M0,${b}`,
    `L${$},${b}`,
    `L${$},${y}`,
    `L${p},${y}`,
    `L${h},0`,
    `L${f},${y}`,
    `L${g},${y}`,
    `L${g},${b}`,
    `L${t},${b}`,
    `L${t},${n}`,
    `L0,${n}`,
    "Z"
  ].join(" ");
});
z.set("upDownArrowCallout", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 25e3, s = (e == null ? void 0 : e.get("adj2")) ?? 25e3, i = (e == null ? void 0 : e.get("adj3")) ?? 25e3, r = (e == null ? void 0 : e.get("adj4")) ?? 48123, c = Math.min(t, n), l = Math.max(0, Math.min(s, 5e4 * t / Math.max(c, 1))), a = Math.max(0, Math.min(o, l * 2)), d = Math.max(0, Math.min(i, 5e4 * n / Math.max(c, 1))), h = d * c / Math.max(n, 1), u = Math.max(0, Math.min(r, 1e5 - h - h)), x = c * l / 1e5, p = c * a / 2e5, $ = t / 2, g = $ - x, f = $ - p, y = $ + p, m = $ + x, b = c * d / 1e5, M = n * u / 2e5, L = n / 2 - M, v = n / 2 + M, k = n - b;
  return [
    `M${$},0`,
    `L${m},${b}`,
    `L${y},${b}`,
    `L${y},${L}`,
    `L${t},${L}`,
    `L${t},${v}`,
    `L${y},${v}`,
    `L${y},${k}`,
    `L${m},${k}`,
    `L${$},${n}`,
    `L${g},${k}`,
    `L${f},${k}`,
    `L${f},${v}`,
    `L0,${v}`,
    `L0,${L}`,
    `L${f},${L}`,
    `L${f},${b}`,
    `L${g},${b}`,
    "Z"
  ].join(" ");
});
z.set("leftRightArrowCallout", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 25e3, s = (e == null ? void 0 : e.get("adj2")) ?? 25e3, i = (e == null ? void 0 : e.get("adj3")) ?? 25e3, r = (e == null ? void 0 : e.get("adj4")) ?? 48123, c = Math.min(t, n), l = Math.max(0, Math.min(s, 5e4 * n / Math.max(c, 1))), a = Math.max(0, Math.min(o, l * 2)), d = Math.max(0, Math.min(i, 5e4 * t / Math.max(c, 1))), h = d * c / Math.max(t, 1), u = Math.max(0, Math.min(r, 1e5 - h - h)), x = c * l / 1e5, p = c * a / 2e5, $ = n / 2, g = $ - x, f = $ - p, y = $ + p, m = $ + x, b = c * d / 1e5, M = t * u / 2e5, L = t / 2 - M, v = t / 2 + M, k = t - b;
  return [
    `M0,${$}`,
    `L${b},${g}`,
    `L${b},${f}`,
    `L${L},${f}`,
    `L${L},0`,
    `L${v},0`,
    `L${v},${f}`,
    `L${k},${f}`,
    `L${k},${g}`,
    `L${t},${$}`,
    `L${k},${m}`,
    `L${k},${y}`,
    `L${v},${y}`,
    `L${v},${n}`,
    `L${L},${n}`,
    `L${L},${y}`,
    `L${b},${y}`,
    `L${b},${m}`,
    "Z"
  ].join(" ");
});
z.set("uturnArrow", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 25e3, s = (e == null ? void 0 : e.get("adj2")) ?? 25e3, i = (e == null ? void 0 : e.get("adj3")) ?? 25e3, r = (e == null ? void 0 : e.get("adj4")) ?? 43750, c = (e == null ? void 0 : e.get("adj5")) ?? 75e3, l = Math.min(t, n), a = Math.max(0, Math.min(s, 25e3)), d = Math.max(0, Math.min(o, a * 2)), u = 1e5 - d * l / Math.max(n, 1), x = Math.max(0, Math.min(i, u * n / Math.max(l, 1))), p = (x + d) * l / Math.max(n, 1), $ = Math.max(p, Math.min(c, 1e5)), g = l * d / 1e5, f = l * a / 1e5, y = g / 2, m = f - y, b = n * $ / 1e5, M = l * x / 1e5, L = b - M, v = t - m, k = Math.min(v / 2, L), A = Math.max(0, Math.min(r, 1e5 * k / Math.max(l, 1))), S = l * A / 1e5, w = Math.max(S - g, 0), F = g + w, C = t - f, E = C - f, P = E + m, B = v - S, R = P - w;
  return [
    `M0,${n}`,
    `L0,${S}`,
    S > 0.1 ? `A${S},${S} 0 0,1 ${S},0` : "L0,0",
    `L${B},0`,
    S > 0.1 ? `A${S},${S} 0 0,1 ${v},${S}` : `L${v},0`,
    `L${v},${L}`,
    `L${t},${L}`,
    `L${C},${b}`,
    `L${E},${L}`,
    `L${P},${L}`,
    `L${P},${F}`,
    w > 0.1 ? `A${w},${w} 0 0,0 ${R},${g}` : `L${R},${g}`,
    `L${F},${g}`,
    w > 0.1 ? `A${w},${w} 0 0,0 ${g},${F}` : `L${g},${F}`,
    `L${g},${n}`,
    "Z"
  ].join(" ");
});
z.set("leftRightArrow", (t, n, e) => {
  const o = Math.min(t, n), s = n / 2, i = o > 0 ? 5e4 * t / o : 0, r = Math.min(Math.max((e == null ? void 0 : e.get("adj1")) ?? 5e4, 0), 1e5), c = Math.min(Math.max((e == null ? void 0 : e.get("adj2")) ?? 5e4, 0), i), l = o * c / 1e5, a = t - l, d = n * r / 2e5, h = s, u = h - d, x = h + d;
  return [
    `M0,${h}`,
    `L${l},0`,
    `L${l},${u}`,
    `L${a},${u}`,
    `L${a},0`,
    `L${t},${h}`,
    `L${a},${n}`,
    `L${a},${x}`,
    `L${l},${x}`,
    `L${l},${n}`,
    "Z"
  ].join(" ");
});
z.set("leftUpArrow", (t, n, e) => {
  const o = Math.max(0, Math.min((e == null ? void 0 : e.get("adj2")) ?? 25e3, 5e4)), s = o * 2, i = Math.max(0, Math.min((e == null ? void 0 : e.get("adj1")) ?? 25e3, s)), r = 1e5 - s, c = Math.max(0, Math.min((e == null ? void 0 : e.get("adj3")) ?? 25e3, r)), l = Math.min(t, n), a = l * c / 1e5, d = l * o / 5e4, h = t - d, u = n - d, x = l * o / 1e5, p = t - x, $ = n - x, g = l * i / 2e5, f = p - g, y = p + g, m = $ - g, b = $ + g;
  return [
    `M0,${$}`,
    `L${a},${u}`,
    `L${a},${m}`,
    `L${f},${m}`,
    `L${f},${a}`,
    `L${h},${a}`,
    `L${p},0`,
    `L${t},${a}`,
    `L${y},${a}`,
    `L${y},${b}`,
    `L${a},${b}`,
    `L${a},${n}`,
    "Z"
  ].join(" ");
});
z.set("upDownArrow", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 5e4, s = (e == null ? void 0 : e.get("adj2")) ?? 5e4, i = Math.min(t, n), r = 5e4 * n / Math.max(i, 1), c = Math.max(0, Math.min(s, r)), l = Math.max(0, Math.min(o, 1e5)), a = i * l / 2e5, d = i * c / 1e5, h = t / 2;
  return [
    `M${h},0`,
    `L${t},${d}`,
    `L${h + a},${d}`,
    `L${h + a},${n - d}`,
    `L${t},${n - d}`,
    `L${h},${n}`,
    `L0,${n - d}`,
    `L${h - a},${n - d}`,
    `L${h - a},${d}`,
    `L0,${d}`,
    "Z"
  ].join(" ");
});
z.set("notchedRightArrow", (t, n, e) => {
  const o = st(e, "adj1", 5e4), s = st(e, "adj2", 5e4), i = Math.min(t, n), r = n * o / 2, c = i * s, l = n / 2, a = t - c, d = l > 0 ? r * c / l : 0;
  return [
    `M0,${l - r}`,
    `L${a},${l - r}`,
    `L${a},0`,
    `L${t},${l}`,
    `L${a},${n}`,
    `L${a},${l + r}`,
    `L0,${l + r}`,
    `L${d},${l}`,
    "Z"
  ].join(" ");
});
z.set("chevron", (t, n, e) => {
  const o = st(e, "adj", 5e4), i = Math.min(t, n) * o;
  return [
    "M0,0",
    `L${t - i},0`,
    `L${t},${n / 2}`,
    `L${t - i},${n}`,
    `L0,${n}`,
    `L${i},${n / 2}`,
    "Z"
  ].join(" ");
});
z.set("homePlate", (t, n, e) => {
  const o = st(e, "adj", 5e4), i = Math.min(t, n) * o, r = t - i;
  return ["M0,0", `L${r},0`, `L${t},${n / 2}`, `L${r},${n}`, `L0,${n}`, "Z"].join(
    " "
  );
});
z.set("stripedRightArrow", (t, n, e) => {
  const o = Math.min(t, n), s = o > 0 ? 84375 * t / o : 84375, i = Math.min(Math.max(jt(e, "adj1", 5e4), 0), 1e5), r = Math.min(Math.max(jt(e, "adj2", 5e4), 0), s), c = n * i / 2e5, l = o * r / 1e5, a = t - l, d = n / 2, h = d - c, u = d + c, x = o / 32, p = o / 16, $ = o / 8, g = o * 5 / 32;
  return [
    // Stripe 1: 0 to ssd32
    `M0,${h} L${x},${h} L${x},${u} L0,${u} Z`,
    // Stripe 2: ssd16 to ssd8
    `M${p},${h} L${$},${h} L${$},${u} L${p},${u} Z`,
    // Main body + arrowhead: x4 to r
    `M${g},${h}`,
    `L${a},${h}`,
    `L${a},0`,
    `L${t},${d}`,
    `L${a},${n}`,
    `L${a},${u}`,
    `L${g},${u}`,
    "Z"
  ].join(" ");
});
z.set("bentArrow", (t, n, e) => {
  const o = Math.min(t, n), s = Math.max(0, Math.min((e == null ? void 0 : e.get("adj2")) ?? 25e3, 5e4)), i = s * 2, r = Math.max(0, Math.min((e == null ? void 0 : e.get("adj1")) ?? 25e3, i)), c = Math.max(0, Math.min((e == null ? void 0 : e.get("adj3")) ?? 25e3, 5e4)), l = o * r / 1e5, a = o * s / 1e5, d = l / 2, h = a - d, u = o * c / 1e5, x = t - u, p = n - h, $ = Math.min(x, p), g = $ > 0 ? 1e5 * $ / o : 0, f = Math.max(0, Math.min((e == null ? void 0 : e.get("adj4")) ?? 43750, g)), y = o * f / 1e5, m = Math.max(y - l, 0), b = l + m, M = t - u, L = h + l, v = L + h, k = h + y, A = L + m, S = [
    `M0,${n}`,
    // bottom-left
    `L0,${k}`
    // up left edge to arc start
  ];
  return y > 0.1 ? S.push(`A${y},${y} 0 0,1 ${y},${h}`) : S.push(`L0,${h}`), S.push(
    `L${M},${h}`,
    // horizontal to arrowhead base (top)
    `L${M},0`,
    // up to arrowhead top-left wing
    `L${t},${a}`,
    // arrowhead tip (pointing right)
    `L${M},${v}`,
    // arrowhead bottom wing
    `L${M},${L}`,
    // back to arrowhead base (bottom)
    `L${b},${L}`
    // horizontal back toward bend
  ), m > 0.1 ? S.push(`A${m},${m} 0 0,0 ${l},${A}`) : S.push(`L${l},${L}`), S.push(
    `L${l},${n}`,
    // down right side of shaft to bottom
    "Z"
  ), S.join(" ");
});
z.set("bentUpArrow", (t, n, e) => {
  const o = Math.max(0, Math.min((e == null ? void 0 : e.get("adj1")) ?? 25e3, 5e4)), s = Math.max(0, Math.min((e == null ? void 0 : e.get("adj2")) ?? 25e3, 5e4)), i = Math.max(0, Math.min((e == null ? void 0 : e.get("adj3")) ?? 25e3, 5e4)), r = Math.min(t, n), c = r * i / 1e5, l = r * s / 5e4, a = t - l, d = r * s / 1e5, h = t - d, u = r * o / 2e5, x = h - u, p = h + u, $ = r * o / 1e5, g = n - $;
  return [
    `M0,${g}`,
    `L${x},${g}`,
    `L${x},${c}`,
    `L${a},${c}`,
    `L${h},0`,
    `L${t},${c}`,
    `L${p},${c}`,
    `L${p},${n}`,
    `L0,${n}`,
    "Z"
  ].join(" ");
});
z.set("curvedRightArrow", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 25e3, s = (e == null ? void 0 : e.get("adj2")) ?? 5e4, i = (e == null ? void 0 : e.get("adj3")) ?? 25e3, r = 5e4, c = 1e5, l = n / 2, a = t, d = n, h = 0, u = 270, x = 180, p = 90, $ = Math.max(Math.min(t, n), 1), g = r * n / $, f = Math.max(0, Math.min(s, g)), y = Math.max(0, Math.min(o, f)), m = $ * y / c, b = $ * f / c, M = (m + b) / 4, L = l - M, v = L * 2, k = v * v, A = m * m, S = Math.max(k - A, 0), F = Math.sqrt(S) * t / Math.max(v, 1e-6), C = c * F / $, E = Math.max(0, Math.min(i, C)), P = $ * E / c, B = L + m, R = t * t, I = P * P, Z = Math.max(R - I, 0), q = Math.sqrt(Z) * L / Math.max(t, 1e-6), Q = L + q, G = B + q, D = (b - m) / 2, O = Q - D, ot = G + D, J = b / 2, W = d - J, it = a - P, lt = Math.atan(q / Math.max(P, 1e-6)), Pt = Math.PI - lt, Rt = -lt, Wt = m / 2, ft = Math.atan2(Wt, Math.max(F, 1e-6)) - Math.PI / 2, Zt = Pt * 180 / Math.PI, Dt = Rt * 180 / Math.PI, Ot = lt * 180 / Math.PI, Ut = ft * 180 / Math.PI, Y = (Bt, Ft, Xt, H, N, et) => {
    const nt = N * Math.PI / 180, at = et * Math.PI / 180, bt = Bt + Xt * Math.cos(nt), Mt = Ft + H * Math.sin(nt), tt = Bt + Xt * Math.cos(at), ht = Ft + H * Math.sin(at), ut = et - N, zt = Math.abs(ut) > 180 ? 1 : 0, te = ut >= 0 ? 1 : 0;
    return `M${bt},${Mt} A${Xt},${H} 0 ${zt},${te} ${tt},${ht}`;
  };
  return [
    `M${h},${L}`,
    Y(t, L, t, L, x, x + Dt).replace("M", "L"),
    `L${it},${Q}`,
    `L${it},${O}`,
    `L${a},${W}`,
    `L${it},${ot}`,
    `L${it},${G}`,
    Y(t, B, t, L, Zt, Zt + Ot).replace("M", "L"),
    "Z",
    Y(t, L, t, L, x, x + p),
    `L${a},${m}`,
    Y(t, B, t, L, u, u + Ut).replace("M", "L"),
    "Z"
  ].join(" ");
});
z.set(
  "curvedLeftArrow",
  (t, n, e) => Qh(z.get("curvedRightArrow")(t, n, e), t)
);
function Bc(t) {
  const n = t.indexOf("Z");
  if (n === -1)
    return { outer: t, remainder: "" };
  const e = t.slice(0, n + 1).trim(), o = t.slice(n + 1).trim();
  return { outer: e, remainder: o };
}
function Rc(t, n, e, o) {
  const s = z.get(t)(n, e, o), { outer: i, remainder: r } = Bc(s);
  return r ? t === "curvedRightArrow" ? [
    { d: r, fill: "norm", stroke: !0 },
    { d: i, fill: "norm", stroke: !0 }
  ] : [
    { d: i, fill: "norm", stroke: !0 },
    { d: r, fill: "norm", stroke: !0 }
  ] : [{ d: s, fill: "norm", stroke: !0 }];
}
function Ic(t, n, e, o) {
  const s = z.get("curvedDownArrow")(n, e, o), { outer: i, remainder: r } = Bc(s), c = r ? [
    { d: r, fill: "norm", stroke: !0 },
    { d: i, fill: "norm", stroke: !0 }
  ] : [{ d: s, fill: "norm", stroke: !0 }];
  return t === "curvedDownArrow" ? c : c.map((a) => ({
    ...a,
    d: Kh(a.d, e)
  })).reverse();
}
z.set("curvedUpArrow", (t, n, e) => {
  const o = (G, T, D, O, ot, J) => {
    const W = ot * Math.PI / 180, it = J * Math.PI / 180, lt = G + D * Math.cos(W), Pt = T + O * Math.sin(W), Rt = G + D * Math.cos(it), Wt = T + O * Math.sin(it), Nt = J - ot, ft = Math.abs(Nt) > 180 ? 1 : 0, Zt = Nt >= 0 ? 1 : 0;
    return `M${lt},${Pt} A${D},${O} 0 ${ft},${Zt} ${Rt},${Wt}`;
  }, s = Math.min(t, n), i = t / 2, r = (e == null ? void 0 : e.get("adj1")) ?? 25e3, c = (e == null ? void 0 : e.get("adj2")) ?? 5e4, l = (e == null ? void 0 : e.get("adj3")) ?? 25e3, a = 5e4 * t / Math.max(s, 1), d = Math.max(0, Math.min(c, a)), h = Math.max(0, Math.min(r, 1e5)), u = s * h / 1e5, x = s * d / 1e5, p = (u + x) / 4, $ = i - p, g = $ * 2, f = Math.sqrt(Math.max(g * g - u * u, 0)) * n / Math.max(g, 1), y = 1e5 * f / Math.max(s, 1), m = Math.max(0, Math.min(l, y)), b = s * m / 1e5, M = $ + u, L = Math.sqrt(Math.max(n * n - b * b, 0)) * $ / Math.max(n, 1), v = $ + L, k = M + L, A = (x - u) / 2, S = v - A, w = k + A, F = t - x / 2, C = b, E = Math.atan2(L, b), P = Math.atan2(u / 2, f), B = Math.PI / 2 - P, R = P - E, I = Math.PI / 2 - E, Z = B * 180 / Math.PI, U = R * 180 / Math.PI, q = I * 180 / Math.PI, Q = E * 180 / Math.PI;
  return [
    o($, 0, $, n, Z, Z + U),
    `L${v},${C}`,
    `L${S},${C}`,
    `L${F},0`,
    `L${w},${C}`,
    `L${k},${C}`,
    o(M, 0, $, n, q, q + Q).replace("M", "L"),
    `L${$},${n}`,
    o($, 0, $, n, 90, 180).replace("M", "L"),
    `L${u},0`,
    o(M, 0, $, n, 180, 90).replace("M", "L"),
    "Z"
  ].join(" ");
});
z.set("curvedDownArrow", (t, n, e) => {
  const o = (Q, G, T, D, O, ot) => {
    const J = O * Math.PI / 180, W = ot * Math.PI / 180, it = Q + T * Math.cos(J), lt = G + D * Math.sin(J), Pt = Q + T * Math.cos(W), Rt = G + D * Math.sin(W), Wt = ot - O, Nt = Math.abs(Wt) > 180 ? 1 : 0, ft = Wt >= 0 ? 1 : 0;
    return `M${it},${lt} A${T},${D} 0 ${Nt},${ft} ${Pt},${Rt}`;
  }, s = Math.min(t, n), i = t / 2, r = (e == null ? void 0 : e.get("adj1")) ?? 25e3, c = (e == null ? void 0 : e.get("adj2")) ?? 5e4, l = (e == null ? void 0 : e.get("adj3")) ?? 25e3, a = 5e4 * t / Math.max(s, 1), d = Math.max(0, Math.min(c, a)), h = Math.max(0, Math.min(r, 1e5)), u = s * h / 1e5, x = s * d / 1e5, p = (u + x) / 4, $ = i - p, g = $ * 2, f = Math.sqrt(Math.max(g * g - u * u, 0)) * n / Math.max(g, 1), y = 1e5 * f / Math.max(s, 1), m = Math.max(0, Math.min(l, y)), b = s * m / 1e5, M = $ + u, L = Math.sqrt(Math.max(n * n - b * b, 0)) * $ / Math.max(n, 1), v = $ + L, k = M + L, A = (x - u) / 2, S = v - A, w = k + A, F = t - x / 2, C = n - b, P = Math.atan2(L, b) * 180 / Math.PI, R = Math.atan2(u / 2, f) * 180 / Math.PI, I = 270 + P, Z = 270 - R, U = R - 90, q = 90 + R;
  return [
    `M${F},${n}`,
    `L${S},${C}`,
    `L${v},${C}`,
    o($, n, $, n, I, I - P).replace("M", "L"),
    `L${M},0`,
    o(M, n, $, n, 270, 270 + P).replace("M", "L"),
    `L${v + u},${C}`,
    `L${w},${C}`,
    "Z",
    `M${M},0`,
    o(M, n, $, n, Z, Z + U).replace("M", "L"),
    o($, n, $, n, 180, 180 + q).replace("M", "L"),
    "Z"
  ].join(" ");
});
function Tc(t, n, e, o = !1, s = "circularArrow") {
  const i = t / 2, r = n / 2, c = t / 2, l = n / 2, a = Math.min(t, n), d = 108e5, h = (Ht) => Ht / 6e4 * Math.PI / 180, u = (Ht, oe) => Ht * Math.sin(h(oe)), x = (Ht, oe) => Ht * Math.cos(h(oe)), p = (Ht, oe, Ve) => Ht * Math.cos(Math.atan2(Ve, oe)), $ = (Ht, oe, Ve) => Ht * Math.sin(Math.atan2(Ve, oe)), g = (Ht, oe) => Math.atan2(oe, Ht) * 180 / Math.PI * 6e4, f = (Ht, oe, Ve) => Math.sqrt(Ht * Ht + oe * oe + Ve * Ve), y = s === "leftCircularArrow", m = (e == null ? void 0 : e.get("adj1")) ?? 12500, b = (e == null ? void 0 : e.get("adj2")) ?? (y ? -1142319 : 1142319), M = (e == null ? void 0 : e.get("adj3")) ?? (y ? 1142319 : 20457681), L = (e == null ? void 0 : e.get("adj4")) ?? 108e5, v = (e == null ? void 0 : e.get("adj5")) ?? 12500, k = Math.max(0, Math.min(v, 25e3)), A = k * 2, S = Math.max(0, Math.min(m, A)), w = Math.max(1, Math.min(M, 21599999)), F = Math.max(0, Math.min(L, 21599999)), C = a * S / 1e5, E = a * k / 1e5, P = C / 2, B = c + P - E, R = l + P - E, I = B - C, Z = R - C, U = I + P, q = Z + P, Q = u(U, w), G = x(q, w), T = p(U, G, Q), D = $(q, G, Q), O = i + T, ot = r + D, J = Math.min(I, Z), W = T * T, it = D * D, lt = J * J, Pt = W - lt, Rt = it - lt, Wt = it !== 0 ? Pt * Rt / W : 0, ft = 1 - (it !== 0 ? Wt / it : 0), Zt = Math.sqrt(Math.max(0, ft)), Dt = T !== 0 ? Pt / T : 0, Ot = D !== 0 ? Dt / D : 0, Ut = Ot !== 0 ? (1 + Zt) / Ot : 0, Y = g(1, Ut), Bt = Y + 216e5, Xt = (Y >= 0 ? Y : Bt) - w, H = Xt + 216e5, N = Xt >= 0 ? Xt : H, et = N - d, nt = N - 216e5, at = et >= 0 ? nt : N, bt = Math.abs(at);
  let Mt;
  if (y) {
    const Ht = -bt, oe = -Math.abs(b);
    Mt = Math.max(Ht, Math.min(oe, 0));
  } else
    Mt = Math.max(0, Math.min(b, bt));
  const tt = w + Mt, ht = u(U, tt), ut = x(q, tt), zt = p(U, ut, ht), te = $(q, ut, ht), Me = i + zt, yt = r + te, ee = u(B, F), ce = x(R, F), rt = p(B, ce, ee), $t = $(R, ce, ee), vt = i + rt, j = r + $t, At = x(E, tt), It = u(E, tt), ct = O + At, xt = ot + It, St = O - At, dt = ot - It, Vt = St - i, Ct = dt - r, Lt = ct - i, kt = xt - r, gt = Math.min(B, R), Qt = B !== 0 ? Vt * gt / B : 0, Yt = R !== 0 ? Ct * gt / R : 0, mt = B !== 0 ? Lt * gt / B : 0, _t = R !== 0 ? kt * gt / R : 0, fe = mt - Qt, $e = _t - Yt, le = f(fe, $e, 0), Jt = Qt * _t, Gt = mt * Yt, ae = Jt - Gt, cn = gt * gt, xe = le * le, Ue = cn * xe, qe = ae * ae, Do = Ue - qe, Pe = Math.max(Do, 0), Xn = Math.sqrt(Pe), Yn = $e * -1 >= 0 ? -1 : 1, Cn = Yn * fe * Xn, ye = ae * $e, Fn = xe !== 0 ? (ye + Cn) / xe : 0, kn = ye - Cn, ln = xe !== 0 ? kn / xe : 0, an = Math.abs($e) * Xn, qn = ae * fe * -1, No = xe !== 0 ? (qn + an) / xe : 0, ni = qn - an, oi = xe !== 0 ? ni / xe : 0, Bl = mt - Fn, Rl = mt - ln, Il = _t - No, Tl = _t - oi, zl = f(Bl, Il, 0), si = f(Rl, Tl, 0) - zl, Dl = si >= 0 ? Fn : ln, Ol = si >= 0 ? No : oi, ii = gt !== 0 ? Dl * B / gt : 0, ri = gt !== 0 ? Ol * R / gt : 0, Zo = i + ii, Go = r + ri, Qn = I !== 0 ? Vt * J / I : 0, Kn = Z !== 0 ? Ct * J / Z : 0, ci = I !== 0 ? Lt * J / I : 0, li = Z !== 0 ? kt * J / Z : 0, Ho = ci - Qn, Wo = li - Kn, ai = f(Ho, Wo, 0), Nl = Qn * li, Zl = ci * Kn, Jn = Nl - Zl, Gl = J * J, ze = ai * ai, Hl = Gl * ze, Wl = Jn * Jn, Ul = Hl - Wl, Vl = Math.max(Ul, 0), di = Math.sqrt(Vl), hi = Yn * Ho * di, ui = Jn * Wo, fi = ze !== 0 ? (ui + hi) / ze : 0, _l = ui - hi, $i = ze !== 0 ? _l / ze : 0, pi = Math.abs(Wo) * di, xi = Jn * Ho * -1, yi = ze !== 0 ? (xi + pi) / ze : 0, Xl = xi - pi, gi = ze !== 0 ? Xl / ze : 0, Yl = Qn - fi, ql = Qn - $i, Ql = Kn - yi, Kl = Kn - gi, Jl = f(Yl, Ql, 0), mi = f(ql, Kl, 0) - Jl, jl = mi >= 0 ? fi : $i, ta = mi >= 0 ? yi : gi, bi = J !== 0 ? jl * I / J : 0, Mi = J !== 0 ? ta * Z / J : 0, Uo = i + bi, Vo = r + Mi, _o = g(bi, Mi), ea = _o + 216e5, Xo = _o >= 0 ? _o : ea, dn = F - Xo;
  let Yo, wn;
  if (y) {
    const Ht = dn >= 0 ? dn : dn + 216e5;
    Yo = Xo + Ht, wn = -Ht;
  } else
    Yo = Xo, wn = dn >= 0 ? dn - 216e5 : dn;
  const na = Zo - Uo, oa = Go - Vo, jn = f(na, oa, 0) / 2 - E, Li = jn >= 0 ? Zo : ct, vi = jn >= 0 ? Go : xt, Ai = jn >= 0 ? Uo : St, Si = jn >= 0 ? Vo : dt, qo = g(ii, ri), sa = qo + 216e5, hn = (qo >= 0 ? qo : sa) - F;
  let Qo, En;
  if (y) {
    const Ht = hn >= 0 ? hn - 216e5 : hn;
    Qo = F + Ht, En = -Ht;
  } else {
    const Ht = hn >= 0 ? hn : hn + 216e5;
    Qo = F, En = Ht;
  }
  const Ci = Qo + En, Fi = u(B, Ci), ki = x(R, Ci), wi = i + p(B, ki, Fi), Ei = r + $(R, ki, Fi), Pi = Yo + wn, Bi = u(I, Pi), Ri = x(Z, Pi), Ii = i + p(I, Ri, Bi), Ti = r + $(Z, Ri, Bi), zi = Math.abs(En / 6e4) > 180 ? 1 : 0, Di = En > 0 ? 1 : 0, Oi = Math.abs(wn / 6e4) > 180 ? 1 : 0, Ni = wn > 0 ? 1 : 0;
  if (y) {
    const Ht = u(I, F), oe = x(Z, F), Ve = i + p(I, oe, Ht), ia = r + $(Z, oe, Ht);
    return [
      `M${vt},${j}`,
      `L${Ve},${ia}`,
      `A${I},${Z} 0 ${Oi},${Ni} ${Ii},${Ti}`,
      `L${Ai},${Si}`,
      `L${Me},${yt}`,
      `L${Li},${vi}`,
      `L${Zo},${Go}`,
      `A${B},${R} 0 ${zi},${Di} ${wi},${Ei}`,
      "Z"
    ].join(" ");
  }
  return [
    `M${vt},${j}`,
    `A${B},${R} 0 ${zi},${Di} ${wi},${Ei}`,
    `L${Li},${vi}`,
    `L${Me},${yt}`,
    `L${Ai},${Si}`,
    `L${Uo},${Vo}`,
    `A${I},${Z} 0 ${Oi},${Ni} ${Ii},${Ti}`,
    "Z"
  ].join(" ");
}
z.set("circularArrow", (t, n, e) => Tc(t, n, e, !1, "circularArrow"));
z.set("leftCircularArrow", (t, n, e) => Tc(t, n, e, !1, "leftCircularArrow"));
z.set("leftRightCircularArrow", (t, n, e) => {
  const o = t / 400, s = n / 280, i = (S, w) => ({ x: S * o, y: w * s }), r = i(35, 140), c = i(19.9536, 89.9471), l = i(33.4296, 89.9471), a = i(74.6127, 28.1974), d = i(182.5744, 0.5489), h = i(274.5688, 28.1924), u = i(315.4978, 40.4912), x = i(348.2481, 62.4743), p = i(366.5707, 89.9471), $ = i(380.0463, 89.9471), g = i(365, 140), f = i(310.0463, 89.9471), y = i(320.9838, 89.9471), m = i(274.3848, 50.3095), b = i(182.4425, 40.5864), M = i(115.6249, 68.2298), L = i(101.3589, 74.1319), v = i(88.9651, 81.4842), k = i(79.0159, 89.947), A = i(89.9536, 89.9471);
  return [
    `M${r.x},${r.y}`,
    `L${c.x},${c.y}`,
    `L${l.x},${l.y}`,
    `C${a.x},${a.y} ${d.x},${d.y} ${h.x},${h.y}`,
    `C${u.x},${u.y} ${x.x},${x.y} ${p.x},${p.y}`,
    `L${$.x},${$.y}`,
    `L${g.x},${g.y}`,
    `L${f.x},${f.y}`,
    `L${y.x},${y.y}`,
    `C${m.x},${m.y} ${b.x},${b.y} ${M.x},${M.y}`,
    `C${L.x},${L.y} ${v.x},${v.y} ${k.x},${k.y}`,
    `L${A.x},${A.y}`,
    "Z"
  ].join(" ");
});
z.set("quadArrow", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 22500, s = (e == null ? void 0 : e.get("adj2")) ?? 22500, i = (e == null ? void 0 : e.get("adj3")) ?? 22500, r = n / 2, c = t / 2, l = Math.min(t, n), a = Math.max(0, Math.min(s, 5e4)), d = Math.max(0, Math.min(o, 2 * a)), h = Math.max(0, Math.min(i, (1e5 - 2 * a) / 2)), u = l * h / 1e5, x = l * a / 1e5, p = c - x, $ = c + x, g = l * d / 2e5, f = c - g, y = c + g, m = t - u, b = r - x, M = r + x, L = r - g, v = r + g, k = n - u;
  return [
    `M0,${r}`,
    `L${u},${b}`,
    `L${u},${L}`,
    `L${f},${L}`,
    `L${f},${u}`,
    `L${p},${u}`,
    `L${c},0`,
    `L${$},${u}`,
    `L${y},${u}`,
    `L${y},${L}`,
    `L${m},${L}`,
    `L${m},${b}`,
    `L${t},${r}`,
    `L${m},${M}`,
    `L${m},${v}`,
    `L${y},${v}`,
    `L${y},${k}`,
    `L${$},${k}`,
    `L${c},${n}`,
    `L${p},${k}`,
    `L${f},${k}`,
    `L${f},${v}`,
    `L${u},${v}`,
    `L${u},${M}`,
    "Z"
  ].join(" ");
});
z.set("quadArrowCallout", (t, n, e) => {
  const o = Math.min(t, n), s = t / 2, i = n / 2, r = Math.max(0, Math.min((e == null ? void 0 : e.get("adj2")) ?? 18515, 5e4)), c = Math.max(0, Math.min((e == null ? void 0 : e.get("adj1")) ?? 18515, r * 2)), l = 5e4 - r, a = Math.max(0, Math.min((e == null ? void 0 : e.get("adj3")) ?? 18515, l)), d = a * 2, h = Math.max(c, Math.min((e == null ? void 0 : e.get("adj4")) ?? 48123, 1e5 - d)), u = o * r / 1e5, x = o * c / 2e5, p = o * a / 1e5, $ = t * h / 2e5, g = n * h / 2e5, f = t - p, y = s - $, m = s + $, b = s - u, M = s + u, L = s - x, v = s + x, k = n - p, A = i - g, S = i + g, w = i - u, F = i + u, C = i - x, E = i + x;
  return [
    `M0,${i}`,
    `L${p},${w}`,
    `L${p},${C}`,
    `L${y},${C}`,
    `L${y},${A}`,
    `L${L},${A}`,
    `L${L},${p}`,
    `L${b},${p}`,
    `L${s},0`,
    `L${M},${p}`,
    `L${v},${p}`,
    `L${v},${A}`,
    `L${m},${A}`,
    `L${m},${C}`,
    `L${f},${C}`,
    `L${f},${w}`,
    `L${t},${i}`,
    `L${f},${F}`,
    `L${f},${E}`,
    `L${m},${E}`,
    `L${m},${S}`,
    `L${v},${S}`,
    `L${v},${k}`,
    `L${M},${k}`,
    `L${s},${n}`,
    `L${b},${k}`,
    `L${L},${k}`,
    `L${L},${S}`,
    `L${y},${S}`,
    `L${y},${E}`,
    `L${p},${E}`,
    `L${p},${F}`,
    "Z"
  ].join(" ");
});
z.set("leftRightUpArrow", (t, n, e) => {
  const o = Math.max(0, Math.min((e == null ? void 0 : e.get("adj2")) ?? 25e3, 5e4)), s = o * 2, i = Math.max(0, Math.min((e == null ? void 0 : e.get("adj1")) ?? 25e3, s)), c = (1e5 - s) / 2, l = Math.max(0, Math.min((e == null ? void 0 : e.get("adj3")) ?? 25e3, c)), a = Math.min(t, n), d = t / 2, h = a * l / 1e5, u = a * o / 1e5, x = d - u, p = d + u, $ = a * i / 2e5, g = d - $, f = d + $, y = t - h, m = a * o / 5e4, b = n - m, M = n - u, L = M - $, v = M + $;
  return [
    `M0,${M}`,
    `L${h},${b}`,
    `L${h},${L}`,
    `L${g},${L}`,
    `L${g},${h}`,
    `L${x},${h}`,
    `L${d},0`,
    `L${p},${h}`,
    `L${f},${h}`,
    `L${f},${L}`,
    `L${y},${L}`,
    `L${y},${b}`,
    `L${t},${M}`,
    `L${y},${n}`,
    `L${y},${v}`,
    `L${h},${v}`,
    `L${h},${n}`,
    "Z"
  ].join(" ");
});
z.set("swooshArrow", (t, n, e) => {
  const o = Math.min(t, n), s = (e == null ? void 0 : e.get("adj1")) ?? 25e3, i = (e == null ? void 0 : e.get("adj2")) ?? 16667, r = Math.max(1, Math.min(s, 75e3)), c = 7e4 * t / o, l = Math.max(0, Math.min(i, c)), a = n * r / 1e5, d = o * l / 1e5, h = o / 8, u = n / 6, x = Math.PI / 2 / 14, p = Math.tan(x), $ = t - d, g = h, f = h * p, y = $ - f, m = a * p, b = g + a, M = $ + m, L = M + f, v = b + h, A = v / 2, S = n / 20, w = A + S, F = t / 6, C = u + u, E = u / 2, P = b + E, B = t / 4;
  return [
    `M0,${n}`,
    `Q${F},${C} ${$},${g}`,
    `L${y},0`,
    `L${t},${w}`,
    `L${L},${v}`,
    `L${M},${b}`,
    `Q${B},${P} 0,${n}`,
    "Z"
  ].join(" ");
});
z.set("flowChartProcess", (t, n) => `M0,0 L${t},0 L${t},${n} L0,${n} Z`);
z.set("flowChartDecision", (t, n) => {
  const e = t / 2, o = n / 2;
  return `M${e},0 L${t},${o} L${e},${n} L0,${o} Z`;
});
z.set("flowChartTerminator", (t, n) => {
  const e = t * 3475 / 21600, o = t * 18125 / 21600, s = e, i = n / 2;
  return [
    `M${e},0`,
    `L${o},0`,
    `A${s},${i} 0 0,1 ${o},${n}`,
    `L${e},${n}`,
    `A${s},${i} 0 0,1 ${e},0`,
    "Z"
  ].join(" ");
});
z.set("flowChartDocument", (t, n) => {
  const e = n * 17322 / 21600, o = e, s = n * 23922 / 21600, i = n * 20172 / 21600;
  return ["M0,0", `L${t},0`, `L${t},${e}`, `C${t / 2},${o} ${t / 2},${s} 0,${i}`, "Z"].join(
    " "
  );
});
z.set("flowChartInputOutput", (t, n) => {
  const e = t / 5;
  return `M${e},0 L${t},0 L${t - e},${n} L0,${n} Z`;
});
z.set("flowChartPredefinedProcess", (t, n) => {
  const e = t / 8;
  return [
    // Outer rectangle
    `M0,0 L${t},0 L${t},${n} L0,${n} Z`,
    // Left inner line
    `M${e},0 L${e},${n}`,
    // Right inner line
    `M${t - e},0 L${t - e},${n}`
  ].join(" ");
});
z.set("flowChartAlternateProcess", (t, n) => {
  const e = Math.min(t, n) / 6;
  return [
    `M${e},0`,
    `L${t - e},0`,
    `A${e},${e} 0 0,1 ${t},${e}`,
    `L${t},${n - e}`,
    `A${e},${e} 0 0,1 ${t - e},${n}`,
    `L${e},${n}`,
    `A${e},${e} 0 0,1 0,${n - e}`,
    `L0,${e}`,
    `A${e},${e} 0 0,1 ${e},0`,
    "Z"
  ].join(" ");
});
z.set("flowChartManualInput", (t, n) => `M0,${n * 0.2} L${t},0 L${t},${n} L0,${n} Z`);
z.set("flowChartManualOperation", (t, n) => `M0,0 L${t},0 L${t * 4 / 5},${n} L${t / 5},${n} Z`);
z.set("flowChartPreparation", (t, n) => {
  const e = t * 0.2, o = n / 2;
  return `M${e},0 L${t - e},0 L${t},${o} L${t - e},${n} L${e},${n} L0,${o} Z`;
});
z.set("flowChartData", (t, n) => {
  const e = t * 0.15;
  return `M${e},0 L${t},0 L${t - e},${n} L0,${n} Z`;
});
z.set("flowChartInternalStorage", (t, n) => {
  const e = t / 8, o = n / 8;
  return [
    `M0,0 L${t},0 L${t},${n} L0,${n} Z`,
    `M${e},0 L${e},${n}`,
    `M0,${o} L${t},${o}`
  ].join(" ");
});
z.set("flowChartMagneticDisk", (t, n) => {
  const e = n / 6, o = e, s = n - e;
  return [
    // Top ellipse
    `M0,${o}`,
    `A${t / 2},${e} 0 1,1 ${t},${o}`,
    // Right side down
    `L${t},${s}`,
    // Bottom ellipse
    `A${t / 2},${e} 0 1,1 0,${s}`,
    // Left side up
    `L0,${o}`,
    "Z",
    // Top ellipse visible arc (back half)
    `M${t},${o}`,
    `A${t / 2},${e} 0 1,1 0,${o}`
  ].join(" ");
});
z.set("flowChartDelay", (t, n) => {
  const e = t / 2, o = K(e, 0, e, n / 2, 270, 180);
  return ["M0,0", `L${e},0`, o.svg, `L0,${n}`, "Z"].join(" ");
});
z.set("flowChartDisplay", (t, n) => {
  const e = t / 6, o = n / 6, s = e, i = o * 3, r = K(5 * e, 0, s, i, 270, 180);
  return [`M0,${3 * o}`, `L${e},0`, `L${5 * e},0`, r.svg, `L${e},${n}`, "Z"].join(" ");
});
z.set("flowChartExtract", (t, n) => `M${t / 2},0 L${t},${n} L0,${n} Z`);
z.set("flowChartMerge", (t, n) => `M0,0 L${t},0 L${t / 2},${n} Z`);
z.set("flowChartOffpageConnector", (t, n) => {
  const e = n * 0.2;
  return ["M0,0", `L${t},0`, `L${t},${n - e}`, `L${t / 2},${n}`, `L0,${n - e}`, "Z"].join(
    " "
  );
});
z.set("flowChartConnector", (t, n) => {
  const e = t / 2, o = n / 2;
  return [`M${t},${o}`, `A${e},${o} 0 1,1 0,${o}`, `A${e},${o} 0 1,1 ${t},${o}`, "Z"].join(
    " "
  );
});
z.set("flowChartSort", (t, n) => {
  const e = t / 2, o = n / 2;
  return [`M${e},0 L${t},${o} L${e},${n} L0,${o} Z`, `M0,${o} L${t},${o}`].join(" ");
});
z.set("flowChartCollate", (t, n) => {
  const e = t / 2, o = n / 2;
  return [
    // top inverted triangle
    `M0,0 L${t},0 L${e},${o} Z`,
    // bottom upright triangle
    `M0,${n} L${t},${n} L${e},${o} Z`
  ].join(" ");
});
z.set("flowChartPunchedTape", (t, n) => {
  const e = t / 20, o = n / 20, s = (x, p, $, g, f, y) => {
    const m = f / 6e4, b = y / 6e4, M = m * Math.PI / 180, L = (m + b) * Math.PI / 180, v = x - $ * Math.cos(M), k = p - g * Math.sin(M), A = v + $ * Math.cos(L), S = k + g * Math.sin(L), w = Math.abs(b) > 180 ? 1 : 0, F = b > 0 ? 1 : 0;
    return { endX: A, endY: S, svg: `A${$},${g} 0 ${w},${F} ${A},${S}` };
  }, i = 5 * e, r = 2 * o;
  let c = 0, l = 2 * o;
  const a = [`M${c},${l}`];
  let d = s(c, l, i, r, 108e5, -108e5);
  a.push(d.svg), c = d.endX, l = d.endY, d = s(c, l, i, r, 108e5, 108e5), a.push(d.svg), c = d.endX, l = d.endY;
  const h = 20 * e, u = 18 * o;
  return a.push(`L${h},${u}`), c = h, l = u, d = s(c, l, i, r, 0, -108e5), a.push(d.svg), c = d.endX, l = d.endY, d = s(c, l, i, r, 0, 108e5), a.push(d.svg), a.push("Z"), a.join(" ");
});
z.set("flowChartPunchedCard", (t, n) => {
  const e = t / 5;
  return `M0,${n / 5} L${e},0 L${t},0 L${t},${n} L0,${n} Z`;
});
z.set("flowChartSummingJunction", (t, n) => {
  const e = t / 2, o = n / 2, s = e * Math.cos(Math.PI / 4), i = o * Math.sin(Math.PI / 4), r = e - s, c = e + s, l = o - i, a = o + i;
  return [
    // Circle
    `M0,${o}`,
    `A${e},${o} 0 1,1 ${t},${o}`,
    `A${e},${o} 0 1,1 0,${o}`,
    "Z",
    // X cross
    `M${r},${l} L${c},${a}`,
    `M${c},${l} L${r},${a}`
  ].join(" ");
});
z.set("flowChartOr", (t, n) => {
  const e = t / 2, o = n / 2;
  return [
    // Circle
    `M0,${o}`,
    `A${e},${o} 0 1,1 ${t},${o}`,
    `A${e},${o} 0 1,1 0,${o}`,
    "Z",
    // + cross
    `M${e},0 L${e},${n}`,
    `M0,${o} L${t},${o}`
  ].join(" ");
});
z.set("flowChartOnlineStorage", (t, n) => {
  const e = t / 6;
  return [
    `M${e},0`,
    `L${t},0`,
    `A${e},${n / 2} 0 0,0 ${t},${n}`,
    `L${e},${n}`,
    `A${e},${n / 2} 0 0,1 ${e},0`,
    "Z"
  ].join(" ");
});
z.set("flowChartMagneticDrum", (t, n) => {
  const e = t / 6, o = t * 5 / 6, s = n / 2;
  return [
    // Body
    `M${e},0`,
    `L${o},0`,
    `A${e},${s} 0 0,1 ${o},${n}`,
    `L${e},${n}`,
    `A${e},${s} 0 0,1 ${e},0`,
    "Z",
    // Right ellipse back-face (visible part)
    `M${o},${n}`,
    `A${e},${s} 0 0,1 ${o},0`
  ].join(" ");
});
z.set("flowChartMagneticTape", (t, n) => {
  const e = t / 2, o = n / 2, s = e, i = o, r = Math.atan2(n, t), c = i + o * Math.sin(Math.PI / 4), l = (g, f, y, m, b, M) => {
    const L = b * Math.PI / 180, v = (b + M) * Math.PI / 180, k = g - y * Math.cos(L), A = f - m * Math.sin(L), S = k + y * Math.cos(v), w = A + m * Math.sin(v), F = Math.abs(M) > 180 ? 1 : 0, C = M > 0 ? 1 : 0;
    return { endX: S, endY: w, svg: `A${y},${m} 0 ${F},${C} ${S},${w}` };
  };
  let a = s, d = n;
  const h = l(a, d, e, o, 90, 90);
  a = h.endX, d = h.endY;
  const u = l(a, d, e, o, 180, 90);
  a = u.endX, d = u.endY;
  const x = l(a, d, e, o, 270, 90);
  a = x.endX, d = x.endY;
  const p = r * 180 / Math.PI, $ = l(a, d, e, o, 0, p);
  return [`M${s},${n}`, h.svg, u.svg, x.svg, $.svg, `L${t},${c}`, `L${t},${n}`, "Z"].join(
    " "
  );
});
z.set("flowChartMultidocument", (t, n) => {
  const e = (s) => t * s / 21600, o = (s) => n * s / 21600;
  return [
    // Front doc (bottom layer, with wave)
    `M0,${o(20782)}`,
    `C${e(9298)},${o(23542)} ${e(9298)},${o(18022)} ${e(18595)},${o(18022)}`,
    `L${e(18595)},${o(3675)} L0,${o(3675)} Z`,
    // Middle doc
    `M${e(1532)},${o(3675)} L${e(1532)},${o(1815)} L${e(2e4)},${o(1815)}`,
    `L${e(2e4)},${o(16252)}`,
    `C${e(19298)},${o(16252)} ${e(18595)},${o(16352)} ${e(18595)},${o(16352)}`,
    `L${e(18595)},${o(3675)} Z`,
    // Back doc (top layer)
    `M${e(2972)},${o(1815)} L${e(2972)},0 L${t},0`,
    `L${t},${o(14392)}`,
    `C${e(20800)},${o(14392)} ${e(2e4)},${o(14467)} ${e(2e4)},${o(14467)}`,
    `L${e(2e4)},${o(1815)} Z`
  ].join(" ");
});
z.set("wedgeRectCallout", (t, n, e) => {
  const o = t / 2, s = n / 2, i = t * ((e == null ? void 0 : e.get("adj1")) ?? -20833) / 1e5, r = n * ((e == null ? void 0 : e.get("adj2")) ?? 62500) / 1e5, c = o + i, l = s + r, a = i * n / t, d = Math.abs(r), h = Math.abs(a), u = d - h, x = t * (i >= 0 ? 7 : 2) / 12, p = t * (i >= 0 ? 10 : 5) / 12, $ = n * (r >= 0 ? 7 : 2) / 12, g = n * (r >= 0 ? 10 : 5) / 12, f = u > 0 || i >= 0 ? 0 : c, y = u > 0 ? r >= 0 ? x : c : x, m = u > 0 ? t : i >= 0 ? c : t, b = u > 0 && r >= 0 ? c : x, M = u > 0 || i >= 0 ? $ : l, L = u > 0 ? r >= 0 ? 0 : l : 0, v = u > 0 ? $ : i >= 0 ? l : $, k = u > 0 && r >= 0 ? l : n;
  return [
    "M0,0",
    `L${x},0`,
    `L${y},${L}`,
    `L${p},0`,
    `L${t},0`,
    `L${t},${$}`,
    `L${m},${v}`,
    `L${t},${g}`,
    `L${t},${n}`,
    `L${p},${n}`,
    `L${b},${k}`,
    `L${x},${n}`,
    `L0,${n}`,
    `L0,${g}`,
    `L${f},${M}`,
    `L0,${$}`,
    "Z"
  ].join(" ");
});
z.set("wedgeRoundRectCallout", (t, n, e) => {
  const o = t / 2, s = n / 2, i = Math.min(t, n), r = t * ((e == null ? void 0 : e.get("adj1")) ?? -20833) / 1e5, c = n * ((e == null ? void 0 : e.get("adj2")) ?? 62500) / 1e5, l = i * ((e == null ? void 0 : e.get("adj3")) ?? 16667) / 1e5, a = o + r, d = s + c, h = r * n / t, u = Math.abs(c), x = Math.abs(h), p = u - x, $ = t - l, g = n - l, f = t * (r >= 0 ? 7 : 2) / 12, y = t * (r >= 0 ? 10 : 5) / 12, m = n * (c >= 0 ? 7 : 2) / 12, b = n * (c >= 0 ? 10 : 5) / 12, M = p > 0 || r >= 0 ? 0 : a, L = p > 0 ? c >= 0 ? f : a : f, v = p > 0 ? t : r >= 0 ? a : t, k = p > 0 && c >= 0 ? a : f, A = p > 0 || r >= 0 ? m : d, S = p > 0 ? c >= 0 ? 0 : d : 0, w = p > 0 ? m : r >= 0 ? d : m, F = p > 0 && c >= 0 ? d : n;
  return [
    `M0,${l}`,
    `A${l},${l} 0 0,1 ${l},0`,
    `L${f},0`,
    `L${L},${S}`,
    `L${y},0`,
    `L${$},0`,
    `A${l},${l} 0 0,1 ${t},${l}`,
    `L${t},${m}`,
    `L${v},${w}`,
    `L${t},${b}`,
    `L${t},${g}`,
    `A${l},${l} 0 0,1 ${$},${n}`,
    `L${y},${n}`,
    `L${k},${F}`,
    `L${f},${n}`,
    `L${l},${n}`,
    `A${l},${l} 0 0,1 0,${g}`,
    `L0,${b}`,
    `L${M},${A}`,
    `L0,${m}`,
    "Z"
  ].join(" ");
});
z.set("wedgeEllipseCallout", (t, n, e) => {
  const o = st(e, "adj1", -20833), s = st(e, "adj2", 62500), i = t / 2, r = n / 2, c = i + t * o, l = r + n * s, a = Math.atan2(l - r, c - i), d = 0.15;
  return [
    qh(
      i,
      r,
      i,
      r,
      (a + d) * 180 / Math.PI,
      (a - d + 2 * Math.PI) * 180 / Math.PI
    ),
    `L${c},${l}`,
    "Z"
  ].join(" ");
});
z.set("cloudCallout", (t, n, e) => {
  const o = st(e, "adj1", -20833), s = st(e, "adj2", 62500), i = t / 2 + t * o, r = n / 2 + n * s, c = z.get("cloud")(t, n), l = t / 2, a = n / 2, d = i - l, h = r - a, u = Math.min(t, n) * 0.04, x = Math.min(t, n) * 0.025, p = l + d * 0.5, $ = a + h * 0.5, g = l + d * 0.75, f = a + h * 0.75;
  return [
    c,
    // Connector circles (approximated as small ellipses)
    `M${p + u},${$} A${u},${u} 0 1,1 ${p - u},${$} A${u},${u} 0 1,1 ${p + u},${$} Z`,
    `M${g + x},${f} A${x},${x} 0 1,1 ${g - x},${f} A${x},${x} 0 1,1 ${g + x},${f} Z`
  ].join(" ");
});
z.set("borderCallout1", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 112500) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -38333) / 1e5;
  return `M0,0 L${t},0 L${t},${n} L0,${n} Z M${s},${o} L${r},${i}`;
});
z.set("cube", (t, n, e) => {
  const o = st(e, "adj", 25e3), s = Math.min(t, n) * o;
  return [
    // Front face
    `M0,${s} L${t - s},${s} L${t - s},${n} L0,${n} Z`,
    // Top face
    `M0,${s} L${s},0 L${t},0 L${t - s},${s} Z`,
    // Right face
    `M${t - s},${s} L${t},0 L${t},${n - s} L${t - s},${n} Z`
  ].join(" ");
});
z.set("plus", (t, n, e) => {
  const o = Math.min(t, n), s = Math.min(Math.max(jt(e, "adj", 25e3), 0), 5e4), i = o * s / 1e5, r = t - i, c = n - i;
  return [
    `M0,${i}`,
    `L${i},${i}`,
    `L${i},0`,
    `L${r},0`,
    `L${r},${i}`,
    `L${t},${i}`,
    `L${t},${c}`,
    `L${r},${c}`,
    `L${r},${n}`,
    `L${i},${n}`,
    `L${i},${c}`,
    `L0,${c}`,
    "Z"
  ].join(" ");
});
z.set("heart", (t, n) => {
  const e = t / 2, o = n / 4, s = n / 3, i = t * 49 / 48, r = t * 10 / 48, c = e - i, l = e - r, a = e + r, d = e + i, h = -s;
  return [
    `M${e},${o}`,
    `C${a},${h} ${d},${o} ${e},${n}`,
    `C${c},${o} ${l},${h} ${e},${o}`,
    "Z"
  ].join(" ");
});
z.set("cloud", (t, n) => {
  const e = t / 43200, o = n / 43200, s = [
    [6753, 9190, -11429249, 7426832],
    [5333, 7267, -8646143, 5396714],
    [4365, 5945, -8748475, 5983381],
    [4857, 6595, -7859164, 7034504],
    [5333, 7273, -4722533, 6541615],
    [6775, 9220, -2776035, 7816140],
    [5785, 7867, 37501, 6842e3],
    [6752, 9215, 1347096, 6910353],
    [7720, 10543, 3974558, 4542661],
    [4360, 5918, -16496525, 8804134],
    [4345, 5945, -14809710, 9151131]
  ];
  let i = 3900 * e, r = 14370 * o;
  const c = [`M${i},${r}`];
  let l = 3900, a = 14370;
  for (const [d, h, u, x] of s) {
    const p = u / 6e4, $ = x / 6e4, g = p * Math.PI / 180, f = Math.atan2(d * Math.sin(g), h * Math.cos(g)), y = (p + $) * Math.PI / 180, m = Math.atan2(d * Math.sin(y), h * Math.cos(y)), b = l - d * Math.cos(f), M = a - h * Math.sin(f), L = b + d * Math.cos(m), v = M + h * Math.sin(m), k = L * e, A = v * o, S = d * e, w = h * o, F = Math.abs($) > 180 ? 1 : 0, C = $ > 0 ? 1 : 0;
    c.push(`A${S},${w} 0 ${F},${C} ${k},${A}`), l = L, a = v, i = k, r = A;
  }
  return c.push("Z"), c.join(" ");
});
z.set("frame", (t, n, e) => {
  const o = st(e, "adj1", 12500), s = Math.min(t, n) * o;
  return [
    // Outer rectangle
    `M0,0 L${t},0 L${t},${n} L0,${n} Z`,
    // Inner rectangle (counter-clockwise for hole)
    `M${s},${s} L${s},${n - s} L${t - s},${n - s} L${t - s},${s} Z`
  ].join(" ");
});
z.set("halfFrame", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 33333, s = (e == null ? void 0 : e.get("adj2")) ?? 33333, i = Math.min(t, n), r = Math.max(0, Math.min(s, 1e5 * t / Math.max(i, 1))), c = i * r / 1e5, l = n * c / Math.max(t, 1), a = n - l, d = Math.max(0, Math.min(o, 1e5 * a / Math.max(i, 1))), h = i * d / 1e5, u = t - h * t / Math.max(n, 1), x = n - c * n / Math.max(t, 1);
  return ["M0,0", `L${t},0`, `L${u},${h}`, `L${c},${h}`, `L${c},${x}`, `L0,${n}`, "Z"].join(
    " "
  );
});
z.set("donut", (t, n, e) => {
  const o = Math.min(t, n), s = Math.min(Math.max(jt(e, "adj", 25e3), 0), 5e4), i = o * s / 1e5, r = t / 2, c = n / 2, l = Math.max(0, r - i), a = Math.max(0, c - i);
  return [
    // Outer circle (CW)
    `M0,${c}`,
    `A${r},${c} 0 1,1 ${t},${c}`,
    `A${r},${c} 0 1,1 0,${c}`,
    "Z",
    // Inner circle (CCW for evenodd hole)
    `M${i},${c}`,
    `A${l},${a} 0 1,0 ${t - i},${c}`,
    `A${l},${a} 0 1,0 ${i},${c}`,
    "Z"
  ].join(" ");
});
z.set("noSmoking", (t, n, e) => {
  const o = Math.min(t, n), s = Math.min(Math.max(jt(e, "adj", 18750), 0), 5e4), i = o * s / 1e5, r = t / 2, c = n / 2, l = t / 2, a = n / 2, d = r - i, h = c - i, u = Math.atan2(n, t), x = h * Math.cos(u), p = d * Math.sin(u), $ = Math.sqrt(x * x + p * p) || 1, g = d * h / $, f = i / 2, y = Math.atan2(f, g), m = y * 2, b = -(Math.PI - m), M = u - y, L = M - Math.PI, v = (B) => {
    const R = h * Math.cos(B), I = d * Math.sin(B), Z = Math.sqrt(R * R + I * I) || 1, U = d * h / Z;
    return { x: l + U * Math.cos(B), y: a + U * Math.sin(B) };
  }, k = v(M), A = v(L), S = M + b, w = L + b, F = v(S), C = v(w), E = Math.abs(b) > Math.PI ? 1 : 0, P = b > 0 ? 1 : 0;
  return [
    // Outer circle (CW)
    `M0,${a}`,
    `A${r},${c} 0 1,1 ${t},${a}`,
    `A${r},${c} 0 1,1 0,${a}`,
    "Z",
    // First diagonal band arc (inner ellipse)
    `M${k.x},${k.y}`,
    `A${d},${h} 0 ${E},${P} ${F.x},${F.y}`,
    "Z",
    // Second diagonal band arc (opposite quadrant)
    `M${A.x},${A.y}`,
    `A${d},${h} 0 ${E},${P} ${C.x},${C.y}`,
    "Z"
  ].join(" ");
});
z.set("blockArc", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 108e5, s = (e == null ? void 0 : e.get("adj2")) ?? 0, i = (e == null ? void 0 : e.get("adj3")) ?? 25e3, r = Math.min(Math.max(o / 6e4, 0), 360), c = Math.min(Math.max(s / 6e4, 0), 360), l = (c - r + 360) % 360 || 360, a = r + l, d = c - l, h = t / 2, u = n / 2, x = Math.min(t, n) * Math.max(0, Math.min(i, 5e4)) / 1e5, p = Math.max(1, h - x), $ = Math.max(1, u - x), g = (L, v, k, A, S) => {
    const w = S * Math.PI / 180;
    return { x: L + k * Math.cos(w), y: v + A * Math.sin(w) };
  }, f = g(h, u, h, u, r), y = g(h, u, h, u, a), m = g(h, u, p, $, c), b = g(h, u, p, $, d), M = l > 180 ? 1 : 0;
  return [
    `M${f.x},${f.y}`,
    `A${h},${u} 0 ${M},1 ${y.x},${y.y}`,
    `L${m.x},${m.y}`,
    `A${p},${$} 0 ${M},0 ${b.x},${b.y}`,
    "Z"
  ].join(" ");
});
z.set("gear6", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 15e3, s = (e == null ? void 0 : e.get("adj2")) ?? 3526;
  return zc(t, n, 6, o, s);
});
z.set("gear9", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 1e4, s = (e == null ? void 0 : e.get("adj2")) ?? 1763;
  return zc(t, n, 9, o, s);
});
function zc(t, n, e, o, s) {
  const i = t / 2, r = n / 2, c = Math.min(t, n), l = e === 6 ? 5358 : 2679, a = Math.min(Math.max(o, 0), 2e4), d = Math.min(Math.max(s, 0), l), h = c * a / 1e5, u = c * d / 1e5, x = t / 2 - h, p = n / 2 - h;
  if (x <= 0 || p <= 0) return `M0,0 L${t},0 L${t},${n} L0,${n} Z`;
  const $ = h / 2 + u / 2, g = Math.min(x, p), f = Math.atan2($, g), y = e === 6 ? [330, 30, 90, 150, 210, 270] : [310, 350, 30, 70, 110, 150, 190, 230, 270], m = [];
  for (let b = 0; b < y.length; b++) {
    const M = y[b] * Math.PI / 180, L = M - f, v = M + f, k = i + x * Math.cos(L), A = r + p * Math.sin(L), S = i + x * Math.cos(v), w = r + p * Math.sin(v), F = S - k, C = w - A, E = Math.sqrt(F * F + C * C), P = Math.cos(M), B = Math.sin(M);
    let R = P, I = B;
    E > 0 && (R = -C / E, I = F / E), R * P + I * B < 0 && (R = -R, I = -I);
    const Z = E > 0 ? F / E : 0, U = E > 0 ? C / E : 0, q = k + Z * u, Q = A + U * u, G = S - Z * u, T = w - U * u, D = q + R * h, O = Q + I * h, ot = G + R * h, J = T + I * h;
    if (b === 0) {
      const W = y[y.length - 1] * Math.PI / 180 + f, it = i + x * Math.cos(W), lt = r + p * Math.sin(W);
      m.push(`M${it},${lt}`), m.push(`A${x},${p} 0 0,1 ${k},${A}`);
    }
    if (m.push(`L${D},${O}`), m.push(`L${ot},${J}`), m.push(`L${S},${w}`), b < y.length - 1) {
      const W = y[b + 1] * Math.PI / 180 - f, it = i + x * Math.cos(W), lt = r + p * Math.sin(W);
      m.push(`A${x},${p} 0 0,1 ${it},${lt}`);
    }
  }
  return m.push("Z"), m.join(" ");
}
z.set("mathPlus", (t, n, e) => {
  const o = Math.min(t, n), s = Math.min(Math.max(jt(e, "adj", 23520), 0), 73490), i = t * 73490 / 2e5, r = n * 73490 / 2e5, c = o * s / 2e5, l = t / 2, a = n / 2, d = l - i, h = l - c, u = l + c, x = l + i, p = a - r, $ = a - c, g = a + c, f = a + r;
  return [
    `M${d},${$}`,
    `L${h},${$}`,
    `L${h},${p}`,
    `L${u},${p}`,
    `L${u},${$}`,
    `L${x},${$}`,
    `L${x},${g}`,
    `L${u},${g}`,
    `L${u},${f}`,
    `L${h},${f}`,
    `L${h},${g}`,
    `L${d},${g}`,
    "Z"
  ].join(" ");
});
z.set("mathMinus", (t, n, e) => {
  const o = Math.min(Math.max(jt(e, "adj1", 23520), 0), 1e5), s = n * o / 2e5, i = t * 73490 / 2e5, r = t / 2, c = n / 2, l = r - i, a = r + i, d = c - s, h = c + s;
  return `M${l},${d} L${a},${d} L${a},${h} L${l},${h} Z`;
});
z.set("mathMultiply", (t, n, e) => {
  const o = Math.min(t, n), s = t / 2, i = n / 2, r = Math.min(Math.max(jt(e, "adj1", 23520), 0), 51965), c = o * r / 1e5, l = Math.atan2(n, t), a = Math.sin(l), d = Math.cos(l), h = a / d, u = Math.sqrt(t * t + n * n), x = u * 51965 / 1e5, p = u - x, $ = d * p / 2, g = a * p / 2, f = a * c / 2, y = d * c / 2, m = $ - f, b = g + y, M = $ + f, L = g - y, A = (s - M) * h + L, S = t - M, w = t - m, C = (i - b) / h, E = w - C, P = m + C, B = n - b, R = n - L, I = n - A;
  return [
    `M${m},${b}`,
    `L${M},${L}`,
    `L${s},${A}`,
    `L${S},${L}`,
    `L${w},${b}`,
    `L${E},${i}`,
    `L${w},${B}`,
    `L${S},${R}`,
    `L${s},${I}`,
    `L${M},${R}`,
    `L${m},${B}`,
    `L${P},${i}`,
    "Z"
  ].join(" ");
});
z.set("mathDivide", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 23520, s = (e == null ? void 0 : e.get("adj2")) ?? 5880, i = (e == null ? void 0 : e.get("adj3")) ?? 11760, r = Math.min(Math.max(o, 1e3), 36745), c = Math.min((73490 - r) / 4, 36745 * t / Math.max(n, 1)), l = Math.min(Math.max(i, 1e3), c), a = 73490 - 4 * l - r, d = Math.min(Math.max(s, 0), a), h = t / 2, u = n / 2, x = n * r / 2e5, p = n * d / 1e5, $ = n * l / 1e5, g = t * 73490 / 2e5, f = u - x, y = u + x, b = f - (p + $) - $, M = n - b, L = h - g, v = h + g;
  return [
    // Top dot
    `M${h + $},${b + $} A${$},${$} 0 1,1 ${h - $},${b + $} A${$},${$} 0 1,1 ${h + $},${b + $} Z`,
    // Bottom dot
    `M${h + $},${M - $} A${$},${$} 0 1,1 ${h - $},${M - $} A${$},${$} 0 1,1 ${h + $},${M - $} Z`,
    // Bar
    `M${L},${f} L${v},${f} L${v},${y} L${L},${y} Z`
  ].join(" ");
});
z.set("mathEqual", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 23520, s = (e == null ? void 0 : e.get("adj2")) ?? 11760, i = Math.min(Math.max(o, 0), 36745), r = 1e5 - i * 2, c = Math.min(Math.max(s, 0), Math.max(r, 0)), l = n * i / 1e5, a = n * c / 2e5, d = t * 73490 / 2e5, h = t / 2, u = n / 2, x = u - a, p = u + a, $ = x - l, g = p + l, f = h - d, y = h + d;
  return [
    `M${f},${$} L${y},${$} L${y},${x} L${f},${x} Z`,
    `M${f},${p} L${y},${p} L${y},${g} L${f},${g} Z`
  ].join(" ");
});
z.set("mathNotEqual", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 23520, s = e == null ? void 0 : e.get("adj2"), i = (e == null ? void 0 : e.get("adj3")) ?? 11760, r = t / 2, c = n / 2, l = n / 2, a = Math.min(Math.max(o, 0), 5e4), d = (() => {
    if (s === void 0) return 110 * Math.PI / 180;
    const lt = s / 6e4 * Math.PI / 180, Pt = 70 * Math.PI / 180, Rt = 110 * Math.PI / 180;
    return Math.min(Math.max(lt, Pt), Rt);
  })(), h = 1e5 - a * 2, u = Math.min(Math.max(i, 0), h), x = n * a / 1e5, p = n * u / 2e5, $ = t * 73490 / 2e5, g = r - $, f = r + $, y = c - p, m = c + p, b = y - x, M = m + x, L = d - Math.PI / 2, v = l * Math.tan(L), k = Math.hypot(v, l) || 1, A = k * x / l, S = A / 2, w = r + v - S, F = w - v * b / l, C = w - v * y / l, E = w - v * m / l, P = w - v * M / l, B = w + A, R = F + A, I = C + A, Z = E + A, U = P + A, q = x * l / k, Q = L > 0 ? w + q : B, G = L > 0 ? w : B - q, T = x * v / k, D = L > 0 ? T : 0, O = L > 0 ? 0 : -T, ot = t - Q, J = t - G, W = n - D, it = n - O;
  return [
    `M${g},${b}`,
    `L${F},${b}`,
    `L${G},${O}`,
    `L${Q},${D}`,
    `L${R},${b}`,
    `L${f},${b}`,
    `L${f},${y}`,
    `L${I},${y}`,
    `L${Z},${m}`,
    `L${f},${m}`,
    `L${f},${M}`,
    `L${U},${M}`,
    `L${J},${it}`,
    `L${ot},${W}`,
    `L${P},${M}`,
    `L${g},${M}`,
    `L${g},${m}`,
    `L${E},${m}`,
    `L${C},${y}`,
    `L${g},${y}`,
    "Z"
  ].join(" ");
});
z.set("round1Rect", (t, n, e) => {
  const o = st(e, "adj", 16667), s = Math.min(t, n) * o;
  return ["M0,0", `L${t - s},0`, `A${s},${s} 0 0,1 ${t},${s}`, `L${t},${n}`, `L0,${n}`, "Z"].join(
    " "
  );
});
z.set("round2SameRect", (t, n, e) => {
  const o = st(e, "adj1", 16667), s = st(e, "adj2", 0), i = Math.min(t, n) * o, r = Math.min(t, n) * s;
  return [
    `M${i},0`,
    `L${t - i},0`,
    `A${i},${i} 0 0,1 ${t},${i}`,
    `L${t},${n - r}`,
    `A${r},${r} 0 0,1 ${t - r},${n}`,
    `L${r},${n}`,
    `A${r},${r} 0 0,1 0,${n - r}`,
    `L0,${i}`,
    `A${i},${i} 0 0,1 ${i},0`,
    "Z"
  ].join(" ");
});
z.set("round2DiagRect", (t, n, e) => {
  const o = st(e, "adj1", 16667), s = st(e, "adj2", 0), i = Math.min(t, n) * o, r = Math.min(t, n) * s;
  return [
    `M${i},0`,
    `L${t},0`,
    `L${t},${n - r}`,
    `A${r},${r} 0 0,1 ${t - r},${n}`,
    `L0,${n}`,
    `L0,${i}`,
    `A${i},${i} 0 0,1 ${i},0`,
    "Z"
  ].join(" ");
});
z.set("snip1Rect", (t, n, e) => {
  const o = st(e, "adj", 16667), s = Math.min(t, n) * o;
  return `M0,0 L${t - s},0 L${t},${s} L${t},${n} L0,${n} Z`;
});
z.set("snip2SameRect", (t, n, e) => {
  const o = st(e, "adj1", 16667), s = st(e, "adj2", 0), i = Math.min(t, n) * o, r = Math.min(t, n) * s;
  return `M${i},0 L${t - i},0 L${t},${i} L${t},${n - r} L${t - r},${n} L${r},${n} L0,${n - r} L0,${i} Z`;
});
z.set("snip2DiagRect", (t, n, e) => {
  const o = Math.min(t, n), s = Math.min(Math.max((e == null ? void 0 : e.get("adj1")) ?? 0, 0), 5e4), i = Math.min(Math.max((e == null ? void 0 : e.get("adj2")) ?? 16667, 0), 5e4), r = o * s / 1e5, c = t - r, l = n - r, a = o * i / 1e5, d = t - a, h = n - a;
  return `M${r},0 L${d},0 L${t},${a} L${t},${l} L${c},${n} L${a},${n} L0,${h} L0,${r} Z`;
});
z.set("snipRoundRect", (t, n, e) => {
  const o = st(e, "adj1", 16667), s = st(e, "adj2", 16667), i = Math.min(t, n) * o, r = Math.min(t, n) * s;
  return [
    `M${i},0`,
    `L${t - r},0`,
    `L${t},${r}`,
    `L${t},${n}`,
    `L0,${n}`,
    `L0,${i}`,
    `A${i},${i} 0 0,1 ${i},0`,
    "Z"
  ].join(" ");
});
z.set("bevel", (t, n, e) => {
  const o = st(e, "adj", 12500), s = Math.min(t, n) * o;
  return [
    // Outer
    `M0,0 L${t},0 L${t},${n} L0,${n} Z`,
    // Inner
    `M${s},${s} L${s},${n - s} L${t - s},${n - s} L${t - s},${s} Z`,
    // Connecting triangles (top)
    `M0,0 L${t},0 L${t - s},${s} L${s},${s} Z`,
    // Right
    `M${t},0 L${t},${n} L${t - s},${n - s} L${t - s},${s} Z`,
    // Bottom
    `M${t},${n} L0,${n} L${s},${n - s} L${t - s},${n - s} Z`,
    // Left
    `M0,${n} L0,0 L${s},${s} L${s},${n - s} Z`
  ].join(" ");
});
z.set("foldedCorner", (t, n, e) => {
  const o = st(e, "adj", 16667), s = Math.min(t, n) * o * 0.7;
  return [
    `M0,0 L${t},0 L${t},${n} L0,${n} Z`,
    // Fold triangle
    `M${t - s},${n} L${t},${n} L${t},${n - s}`
  ].join(" ");
});
z.set("sun", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj")) ?? 25e3, s = Math.min(Math.max(o, 12500), 46875), i = 5e4 - s, r = i * 30274 / 32768, c = i * 12540 / 32768, l = 5e4 - r, a = 5e4 - c, d = l * 3 / 4, h = a * 3 / 4, u = d + 3662, x = h + 3662, p = h + 12500, $ = 1e5 - d, g = 1e5 - u, f = 1e5 - x, y = 1e5 - p, m = t / 2, b = n / 2, M = t * 18436 / 21600, L = n * 3163 / 21600, v = t * 3163 / 21600, k = n * 18436 / 21600, A = (W, it) => it * W / 1e5, S = A(d, t), w = A(u, t), F = A(x, t), C = A(p, t), E = A($, t), P = A(g, t), B = A(f, t), R = A(y, t), I = A(i, t), Z = A(i, n), U = A(d, n), q = A(u, n), Q = A(x, n), G = A(p, n), T = A($, n), D = A(g, n), O = A(f, n), ot = A(y, n), J = A(s, t);
  return [
    // Ray 0: right
    `M${t},${b} L${E},${ot} L${E},${G} Z`,
    // Ray 1: top-right
    `M${M},${L} L${P},${Q} L${B},${q} Z`,
    // Ray 2: top
    `M${m},0 L${R},${U} L${C},${U} Z`,
    // Ray 3: top-left
    `M${v},${L} L${F},${q} L${w},${Q} Z`,
    // Ray 4: left
    `M0,${b} L${S},${G} L${S},${ot} Z`,
    // Ray 5: bottom-left
    `M${v},${k} L${w},${O} L${F},${D} Z`,
    // Ray 6: bottom
    `M${m},${n} L${C},${T} L${R},${T} Z`,
    // Ray 7: bottom-right
    `M${M},${k} L${B},${D} L${P},${O} Z`,
    // Center ellipse (arcTo from x19,vc with wR,hR, startAngle=180°, sweep=360°)
    `M${J},${b}`,
    `A${I},${Z} 0 1,1 ${J + 2 * I},${b}`,
    `A${I},${Z} 0 1,1 ${J},${b}`,
    "Z"
  ].join(" ");
});
z.set("moon", (t, n, e) => {
  if (t <= 0 || n <= 0) return `M0,0 L${t},0 L${t},${n} L0,${n} Z`;
  const o = Math.min(t, n), s = n / 2, i = Math.min(Math.max((e == null ? void 0 : e.get("adj")) ?? 5e4, 0), 87500), r = o * i / 1e5, c = o - r;
  if (c <= 0) return `M0,0 L${t},0 L${t},${n} L0,${n} Z`;
  const l = r * t / o, a = (2 * o * o - r * r) / c, d = (a - r) * t / o, u = (a / 2 - r) * s / o, x = (d - l) / 2;
  return [
    `M${t},${n}`,
    `A${t},${s} 0 0,1 ${t},0`,
    // outer: (w,h) → left semicircle → (w,0)
    `A${x},${u} 0 0,0 ${t},${n}`,
    // inner: (w,0) → concave arc → (w,h)
    "Z"
  ].join(" ");
});
z.set("lightningBolt", (t, n) => [
  `M${t * 0.3895},${n * 0}`,
  `L${t * 0},${n * 0.1821}`,
  `L${t * 0.3425},${n * 0.3845}`,
  `L${t * 0.2265},${n * 0.4452}`,
  `L${t * 0.5497},${n * 0.6391}`,
  `L${t * 0.453},${n * 0.683}`,
  `L${t * 0.9972},${n * 0.9983}`,
  `L${t * 0.6796},${n * 0.5919}`,
  `L${t * 0.7624},${n * 0.5514}`,
  `L${t * 0.5138},${n * 0.3153}`,
  `L${t * 0.5939},${n * 0.2816}`,
  "Z"
].join(" "));
z.set("bracketPair", (t, n, e) => {
  const o = Math.min(t, n), s = Math.min(Math.max(jt(e, "adj", 16667), 0), 5e4), i = o * s / 1e5, r = t - i, c = n - i;
  return [
    // Left bracket: bottom-left arc → vertical → top-left arc
    `M${i},${n}`,
    `A${i},${i} 0 0,1 0,${c}`,
    `L0,${i}`,
    `A${i},${i} 0 0,1 ${i},0`,
    // Right bracket: top-right arc → vertical → bottom-right arc
    `M${r},0`,
    `A${i},${i} 0 0,1 ${t},${i}`,
    `L${t},${c}`,
    `A${i},${i} 0 0,1 ${r},${n}`
  ].join(" ");
});
z.set("bracePair", (t, n, e) => {
  const o = st(e, "adj", 8333), s = Math.min(t, n) * o, i = n / 2;
  return [
    // Left brace
    `M${s * 2},0`,
    `A${s},${s} 0 0,0 ${s},${s}`,
    `L${s},${i - s}`,
    `A${s},${s} 0 0,1 0,${i}`,
    `A${s},${s} 0 0,1 ${s},${i + s}`,
    `L${s},${n - s}`,
    `A${s},${s} 0 0,0 ${s * 2},${n}`,
    // Right brace
    `M${t - s * 2},0`,
    `A${s},${s} 0 0,1 ${t - s},${s}`,
    `L${t - s},${i - s}`,
    `A${s},${s} 0 0,0 ${t},${i}`,
    `A${s},${s} 0 0,0 ${t - s},${i + s}`,
    `L${t - s},${n - s}`,
    `A${s},${s} 0 0,1 ${t - s * 2},${n}`
  ].join(" ");
});
z.set("leftBracket", (t, n, e) => {
  const o = Math.min(t, n), s = o > 0 ? 5e4 * n / o : 0, i = Math.max(0, Math.min((e == null ? void 0 : e.get("adj")) ?? 8333, s)), r = o * i / 1e5, c = (h) => h / 6e4, l = (h, u, x, p, $, g) => {
    const f = c($) * Math.PI / 180, y = c(g) * Math.PI / 180, m = h - x * Math.cos(f), b = u - p * Math.sin(f), M = m + x * Math.cos(f + y), L = b + p * Math.sin(f + y), v = Math.abs(c(g)) > 180 ? 1 : 0;
    return { cmd: `A${x},${p} 0 ${v},1 ${M},${L}`, x: M, y: L };
  }, a = l(t, n, t, r, 54e5, 54e5), d = l(0, r, t, r, 108e5, 54e5);
  return [`M${t},${n}`, a.cmd, `L0,${r}`, d.cmd].join(" ");
});
z.set("rightBracket", (t, n, e) => {
  const o = Math.min(t, n), s = o > 0 ? 5e4 * n / o : 0, i = Math.max(0, Math.min((e == null ? void 0 : e.get("adj")) ?? 8333, s)), r = o * i / 1e5, c = n - r, l = (u) => u / 6e4, a = (u, x, p, $, g, f) => {
    const y = l(g) * Math.PI / 180, m = l(f) * Math.PI / 180, b = u - p * Math.cos(y), M = x - $ * Math.sin(y), L = b + p * Math.cos(y + m), v = M + $ * Math.sin(y + m), k = Math.abs(l(f)) > 180 ? 1 : 0;
    return { cmd: `A${p},${$} 0 ${k},1 ${L},${v}`, x: L, y: v };
  }, d = a(0, 0, t, r, 162e5, 54e5), h = a(t, c, t, r, 0, 54e5);
  return ["M0,0", d.cmd, `L${t},${c}`, h.cmd].join(" ");
});
z.set("leftBrace", (t, n, e) => {
  const o = Math.min(t, n), s = Math.max(0, Math.min((e == null ? void 0 : e.get("adj2")) ?? 5e4, 1e5)), i = 1e5 - s, c = Math.min(i, s) / 2, l = o > 0 ? c * n / o : 0, a = Math.max(0, Math.min((e == null ? void 0 : e.get("adj1")) ?? 8333, l)), d = o * a / 1e5, u = n * s / 1e5 + d, x = t / 2, p = t / 2, $ = (v) => v / 6e4, g = (v, k, A, S, w, F) => {
    const C = $(w) * Math.PI / 180, E = $(F) * Math.PI / 180, P = v - A * Math.cos(C), B = k - S * Math.sin(C), R = P + A * Math.cos(C + E), I = B + S * Math.sin(C + E), Z = Math.abs($(F)) > 180 ? 1 : 0, U = F >= 0 ? 1 : 0;
    return { cmd: `A${A},${S} 0 ${Z},${U} ${R},${I}`, x: R, y: I };
  };
  let f = t, y = n;
  const m = g(f, y, x, d, 54e5, 54e5);
  f = m.x, y = m.y;
  const b = g(p, u, x, d, 0, -54e5), M = g(b.x, b.y, x, d, 54e5, -54e5), L = g(p, d, x, d, 108e5, 54e5);
  return [
    `M${t},${n}`,
    m.cmd,
    `L${p},${u}`,
    b.cmd,
    M.cmd,
    `L${p},${d}`,
    L.cmd
  ].join(" ");
});
z.set("rightBrace", (t, n, e) => {
  const o = Math.min(t, n), s = Math.max(0, Math.min((e == null ? void 0 : e.get("adj2")) ?? 5e4, 1e5)), i = 1e5 - s, c = Math.min(i, s) / 2, l = o > 0 ? c * n / o : 0, a = Math.max(0, Math.min((e == null ? void 0 : e.get("adj1")) ?? 8333, l)), d = o * a / 1e5, u = n * s / 1e5 - d, x = n - d, p = t / 2, $ = t / 2, g = (L) => L / 6e4, f = (L, v, k, A, S, w) => {
    const F = g(S) * Math.PI / 180, C = g(w) * Math.PI / 180, E = L - k * Math.cos(F), P = v - A * Math.sin(F), B = E + k * Math.cos(F + C), R = P + A * Math.sin(F + C), I = Math.abs(g(w)) > 180 ? 1 : 0, Z = w >= 0 ? 1 : 0;
    return { cmd: `A${k},${A} 0 ${I},${Z} ${B},${R}`, x: B, y: R };
  }, y = f(0, 0, p, d, 162e5, 54e5), m = f($, u, p, d, 108e5, -54e5), b = f(m.x, m.y, p, d, 162e5, -54e5), M = f($, x, p, d, 0, 54e5);
  return ["M0,0", y.cmd, `L${$},${u}`, m.cmd, b.cmd, `L${$},${x}`, M.cmd].join(
    " "
  );
});
z.set("actionButtonBlank", (t, n) => `M0,0 L${t},0 L${t},${n} L0,${n} Z`);
const He = /* @__PURE__ */ new Map();
He.set("actionButtonForwardNext", (t, n) => {
  const e = t / 2, o = n / 2, s = Math.min(t, n) * 0.3;
  return `M${e - s * 0.5},${o - s} L${e + s},${o} L${e - s * 0.5},${o + s} Z`;
});
He.set("actionButtonBackPrevious", (t, n) => {
  const e = t / 2, o = n / 2, s = Math.min(t, n) * 0.3;
  return `M${e + s * 0.5},${o - s} L${e - s},${o} L${e + s * 0.5},${o + s} Z`;
});
He.set("actionButtonReturn", (t, n) => {
  const e = t / 2, o = n / 2, s = Math.min(t, n) * 0.28, i = s * 0.22, r = o + s * 0.4, c = o - s * 0.4, l = e - s * 0.6, a = e + s * 0.6, d = (r - c) / 2;
  return [
    // Outer edge: bottom-left → right → arc up → left to arrowhead junction
    `M${l},${r}`,
    `L${a},${r}`,
    `A${d},${d} 0 0,1 ${a},${c}`,
    `L${l + s * 0.15},${c}`,
    // Inner edge: top → right → arc down → bottom-left
    `L${l + s * 0.15},${c + i}`,
    `L${a - i * 0.3},${c + i}`,
    `A${d - i},${d - i} 0 0,0 ${a - i * 0.3},${r - i}`,
    `L${l},${r - i}`,
    "Z",
    // Arrowhead pointing left at top-left
    `M${l - s * 0.3},${c + i / 2}`,
    `L${l + s * 0.15},${c - s * 0.2}`,
    `L${l + s * 0.15},${c + i + s * 0.2}`,
    "Z"
  ].join(" ");
});
He.set("actionButtonBeginning", (t, n) => {
  const e = t / 2, o = n / 2, s = Math.min(t, n) * 0.28;
  return [
    // Left bar
    `M${e - s},${o - s} L${e - s + s * 0.2},${o - s} L${e - s + s * 0.2},${o + s} L${e - s},${o + s} Z`,
    // Left-pointing triangle
    `M${e + s},${o - s} L${e - s + s * 0.35},${o} L${e + s},${o + s} Z`
  ].join(" ");
});
He.set("actionButtonEnd", (t, n) => {
  const e = t / 2, o = n / 2, s = Math.min(t, n) * 0.28;
  return [
    // Right bar
    `M${e + s - s * 0.2},${o - s} L${e + s},${o - s} L${e + s},${o + s} L${e + s - s * 0.2},${o + s} Z`,
    // Right-pointing triangle
    `M${e - s},${o - s} L${e + s - s * 0.35},${o} L${e - s},${o + s} Z`
  ].join(" ");
});
He.set("actionButtonInformation", (t, n) => {
  const e = t / 2, o = n / 2, s = Math.min(t, n) * 0.28;
  return [
    // Dot
    `M${e - s * 0.1},${o - s * 0.65} L${e + s * 0.1},${o - s * 0.65} L${e + s * 0.1},${o - s * 0.4} L${e - s * 0.1},${o - s * 0.4} Z`,
    // Stem
    `M${e - s * 0.12},${o - s * 0.2} L${e + s * 0.12},${o - s * 0.2} L${e + s * 0.12},${o + s * 0.65} L${e - s * 0.12},${o + s * 0.65} Z`
  ].join(" ");
});
He.set("actionButtonDocument", (t, n) => {
  const e = t / 2, o = n / 2, s = Math.min(t, n) * 0.28, i = s * 0.7, r = s, c = s * 0.3;
  return [
    `M${e - i},${o - r}`,
    `L${e + i - c},${o - r} L${e + i},${o - r + c}`,
    `L${e + i},${o + r} L${e - i},${o + r} Z`,
    `M${e + i - c},${o - r} L${e + i - c},${o - r + c} L${e + i},${o - r + c}`
  ].join(" ");
});
function Jh(t, n, e) {
  const o = t.toLowerCase(), s = He.get(o) ?? He.get(t);
  return s == null ? void 0 : s(n, e);
}
z.set("wave", (t, n, e) => {
  const o = Math.min(Math.max(jt(e, "adj1", 12500), 0), 2e4), s = Math.min(Math.max(jt(e, "adj2", 0), -1e4), 1e4), i = n * o / 1e5, r = i * 10 / 3, c = i - r, l = i + r, a = n - i, d = a - r, h = a + r, u = t * s / 5e4, x = u < 0 ? 0 : u, p = u < 0 ? u : 0, $ = -x, g = t - p, f = (g - $) / 3, y = $ + f, m = (y + g) / 2, b = p, M = t + x, L = b + (M - b) / 3, v = (L + M) / 2;
  return [
    `M${$},${i}`,
    `C${y},${c} ${m},${l} ${g},${i}`,
    `L${M},${a}`,
    `C${v},${h} ${L},${d} ${b},${a}`,
    "Z"
  ].join(" ");
});
z.set("doubleWave", (t, n, e) => {
  const o = Math.min(Math.max(jt(e, "adj1", 6250), 0), 12500), s = Math.min(Math.max(jt(e, "adj2", 0), -1e4), 1e4), i = n * o / 1e5, r = i * 10 / 3, c = i - r, l = i + r, a = n - i, d = a - r, h = a + r, u = t * s / 5e4, x = u < 0 ? 0 : u, p = u < 0 ? u : 0, $ = -x, g = t - p, f = (g - $) / 6, y = $ + f, m = (g - $) / 3, b = $ + m, M = ($ + g) / 2, L = M + f, v = (L + g) / 2, k = p, A = t + x, S = (A - k) / 6, w = k + S, F = k + (A - k) / 3, C = (k + A) / 2, E = C + S, P = (E + A) / 2;
  return [
    `M${$},${i}`,
    `C${y},${c} ${b},${l} ${M},${i}`,
    `C${L},${c} ${v},${l} ${g},${i}`,
    `L${A},${a}`,
    `C${P},${h} ${E},${d} ${C},${a}`,
    `C${F},${h} ${w},${d} ${k},${a}`,
    "Z"
  ].join(" ");
});
z.set("irregularSeal1", (t, n) => {
  const e = (s) => t * s / 21600, o = (s) => n * s / 21600;
  return [
    `M${e(10800)},${o(5800)}`,
    `L${e(14522)},0`,
    `L${e(14155)},${o(5325)}`,
    `L${e(18380)},${o(4457)}`,
    `L${e(16702)},${o(7315)}`,
    `L${e(21097)},${o(8137)}`,
    `L${e(17607)},${o(10475)}`,
    `L${e(21600)},${o(13290)}`,
    `L${e(16837)},${o(12942)}`,
    `L${e(18145)},${o(18095)}`,
    `L${e(14020)},${o(14457)}`,
    `L${e(13247)},${o(19737)}`,
    `L${e(10532)},${o(14935)}`,
    `L${e(8485)},${o(21600)}`,
    `L${e(7715)},${o(15627)}`,
    `L${e(4762)},${o(17617)}`,
    `L${e(5667)},${o(13937)}`,
    `L${e(135)},${o(14587)}`,
    `L${e(3722)},${o(11775)}`,
    `L0,${o(8615)}`,
    `L${e(4627)},${o(7617)}`,
    `L${e(370)},${o(2295)}`,
    `L${e(7312)},${o(6320)}`,
    `L${e(8352)},${o(2295)}`,
    "Z"
  ].join(" ");
});
z.set("irregularSeal2", (t, n) => [
  `M${t * 11462 / 21600},${n * 4342 / 21600}`,
  `L${t * 14790 / 21600},0`,
  `L${t * 14525 / 21600},${n * 5777 / 21600}`,
  `L${t * 18007 / 21600},${n * 3172 / 21600}`,
  `L${t * 16380 / 21600},${n * 6532 / 21600}`,
  `L${t},${n * 6645 / 21600}`,
  `L${t * 16985 / 21600},${n * 9402 / 21600}`,
  `L${t * 18270 / 21600},${n * 11290 / 21600}`,
  `L${t * 16380 / 21600},${n * 12310 / 21600}`,
  `L${t * 18877 / 21600},${n * 15632 / 21600}`,
  `L${t * 14640 / 21600},${n * 14350 / 21600}`,
  `L${t * 14942 / 21600},${n * 17370 / 21600}`,
  `L${t * 12180 / 21600},${n * 15935 / 21600}`,
  `L${t * 11612 / 21600},${n * 18842 / 21600}`,
  `L${t * 9872 / 21600},${n * 17370 / 21600}`,
  `L${t * 8700 / 21600},${n * 19712 / 21600}`,
  `L${t * 7527 / 21600},${n * 18125 / 21600}`,
  `L${t * 4917 / 21600},${n}`,
  `L${t * 4805 / 21600},${n * 18240 / 21600}`,
  `L${t * 1285 / 21600},${n * 17825 / 21600}`,
  `L${t * 3330 / 21600},${n * 15370 / 21600}`,
  `L0,${n * 12877 / 21600}`,
  `L${t * 3935 / 21600},${n * 11592 / 21600}`,
  `L${t * 1172 / 21600},${n * 8270 / 21600}`,
  `L${t * 5372 / 21600},${n * 7817 / 21600}`,
  `L${t * 4502 / 21600},${n * 3625 / 21600}`,
  `L${t * 8550 / 21600},${n * 6382 / 21600}`,
  `L${t * 9722 / 21600},${n * 1887 / 21600}`,
  "Z"
].join(" "));
z.set("teardrop", (t, n) => {
  const e = t / 2, o = n / 2;
  return [`M${t},${o}`, `A${e},${o} 0 1,1 ${e},0`, `L${t},0`, `L${t},${o}`, "Z"].join(" ");
});
z.set("pie", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 0, s = (e == null ? void 0 : e.get("adj2")) ?? 162e5, i = o / 6e4 % 360, r = s / 6e4 % 360;
  let c = ((r - i) % 360 + 360) % 360;
  c === 0 && i !== r && (c = 360);
  const l = t / 2, a = n / 2, d = (m) => m * Math.PI / 180, h = (m) => Math.atan2(Math.sin(d(m)) / a, Math.cos(d(m)) / l), u = h(i), x = h(r), p = l + l * Math.cos(u), $ = a + a * Math.sin(u), g = l + l * Math.cos(x), f = a + a * Math.sin(x), y = c > 180 ? 1 : 0;
  return [`M${l},${a}`, `L${p},${$}`, `A${l},${a} 0 ${y},1 ${g},${f}`, "Z"].join(
    " "
  );
});
z.set("pieWedge", (t, n) => [`M0,${n}`, `A${t},${n} 0 0,1 ${t},0`, `L${t},${n}`, "Z"].join(" "));
z.set("arc", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 162e5, s = (e == null ? void 0 : e.get("adj2")) ?? 0, i = o / 6e4, r = s / 6e4, c = t / 2, l = n / 2, a = (m) => m * Math.PI / 180, d = (m) => Math.atan2(Math.sin(a(m)) / l, Math.cos(a(m)) / c), h = d(i), u = d(r), x = c + c * Math.cos(h), p = l + l * Math.sin(h), $ = c + c * Math.cos(u), g = l + l * Math.sin(u);
  let f = ((r - i) % 360 + 360) % 360;
  f === 0 && i !== r && (f = 360);
  const y = f > 180 ? 1 : 0;
  return `M${x},${p} A${c},${l} 0 ${y},1 ${$},${g}`;
});
z.set("chord", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 27e5, s = (e == null ? void 0 : e.get("adj2")) ?? 162e5, i = o / 6e4, r = s / 6e4, c = t / 2, l = n / 2, a = t / 2, d = n / 2, h = (M) => M * Math.PI / 180, u = (M) => Math.atan2(Math.sin(h(M)) / d, Math.cos(h(M)) / a), x = u(i), p = u(r), $ = c + a * Math.cos(x), g = l + d * Math.sin(x), f = c + a * Math.cos(p), y = l + d * Math.sin(p);
  let m = ((r - i) % 360 + 360) % 360;
  if (m === 0 && i !== r && (m = 360), m === 0)
    return `M${c - a},${l} A${a},${d} 0 1,1 ${c + a},${l} A${a},${d} 0 1,1 ${c - a},${l} Z`;
  const b = m > 180 ? 1 : 0;
  return `M${$},${g} A${a},${d} 0 ${b},1 ${f},${y} Z`;
});
z.set("funnel", (t, n) => {
  const e = Math.min(t, n), o = t / 2, s = n / 4, i = t / 2, r = n, c = e / 20, l = o - c, a = s - c, d = 8 * Math.PI / 180, h = o * Math.cos(d), u = s * Math.sin(d), x = Math.atan2(u, h), p = Math.PI - x, $ = Math.PI + 2 * x, g = Math.PI - 2 * x, f = o / 4, y = s / 4, m = s * Math.cos(p), b = o * Math.sin(p), M = Math.sqrt(m * m + b * b), L = o * s / M, v = L * Math.cos(p), k = L * Math.sin(p), A = i + v, S = s + k, w = p + $, F = s * Math.cos(w), C = o * Math.sin(w), E = Math.sqrt(F * F + C * C), P = o * s / E, B = P * Math.cos(w), R = P * Math.sin(w), I = i + B, Z = s + R, U = r - y, q = y * Math.cos(x), Q = f * Math.sin(x), G = Math.sqrt(q * q + Q * Q), T = f * y / G, D = T * Math.cos(x), O = T * Math.sin(x), ot = i + D, J = U + O, W = x + g, it = y * Math.cos(W), lt = f * Math.sin(W), Pt = Math.sqrt(it * it + lt * lt), Rt = f * y / Pt, Wt = Rt * Math.cos(W), Nt = Rt * Math.sin(W), ft = i + Wt, Zt = U + Nt, Dt = $ * 180 / Math.PI, Ot = Math.abs(Dt) > 180 ? 1 : 0, Ut = $ > 0 ? 1 : 0, Y = g * 180 / Math.PI, Bt = Math.abs(Y) > 180 ? 1 : 0, Ft = g > 0 ? 1 : 0, Xt = [
    `M${A},${S}`,
    `A${o},${s} 0 ${Ot},${Ut} ${I},${Z}`,
    `L${ot},${J}`,
    `A${f},${y} 0 ${Bt},${Ft} ${ft},${Zt}`,
    "Z"
  ].join(" "), H = o - l, N = o + l, et = [
    `M${H},${s}`,
    `A${l},${a} 0 1,0 ${N},${s}`,
    `A${l},${a} 0 1,0 ${H},${s}`,
    "Z"
  ].join(" ");
  return `${Xt} ${et}`;
});
const jh = /* @__PURE__ */ new Map();
jh.set("can", (t, n) => {
  const e = n * 0.1, o = t / 2;
  return [
    {
      path: [`M0,${e}`, `A${o},${e} 0 0,1 ${t},${e}`, `A${o},${e} 0 0,1 0,${e}`, "Z"].join(
        " "
      ),
      fillModifier: "lighten"
    }
  ];
});
const pt = /* @__PURE__ */ new Map();
function Te(t, n) {
  const e = Math.min(t, n), o = t / 2, s = n / 2, i = e * 3 / 8;
  return {
    ss: e,
    hc: o,
    vc: s,
    dx2: i,
    g9: s - i,
    g10: s + i,
    g11: o - i,
    g12: o + i,
    g13: e * 3 / 4
  };
}
const Kt = (t, n) => `M0,0 L${t},0 L${t},${n} L0,${n} Z`;
pt.set("actionButtonForwardNext", (t, n) => {
  const { g9: e, g10: o, g11: s, g12: i, vc: r } = Te(t, n), c = `M${i},${r} L${s},${e} L${s},${o} Z`;
  return [
    { d: `${Kt(t, n)} ${c}`, fill: "norm", stroke: !1 },
    { d: c, fill: "darken", stroke: !1 },
    { d: c, fill: "none", stroke: !0 },
    { d: Kt(t, n), fill: "none", stroke: !0 }
  ];
});
pt.set("actionButtonForward", (t, n) => {
  const e = pt.get("actionButtonForwardNext");
  return e ? e(t, n) : [];
});
pt.set("actionButtonBackPrevious", (t, n) => {
  const { g9: e, g10: o, g11: s, g12: i, vc: r } = Te(t, n), c = `M${s},${r} L${i},${e} L${i},${o} Z`;
  return [
    { d: `${Kt(t, n)} ${c}`, fill: "norm", stroke: !1 },
    { d: c, fill: "darken", stroke: !1 },
    { d: c, fill: "none", stroke: !0 },
    { d: Kt(t, n), fill: "none", stroke: !0 }
  ];
});
pt.set("actionButtonBeginning", (t, n) => {
  const { g9: e, g10: o, g11: s, g12: i, g13: r, vc: c } = Te(t, n), l = r / 8, a = r / 4, d = s + l, u = `M${s + a},${c} L${i},${e} L${i},${o} Z`, x = `M${d},${e} L${s},${e} L${s},${o} L${d},${o} Z`, p = `${u} ${x}`;
  return [
    { d: `${Kt(t, n)} ${p}`, fill: "norm", stroke: !1 },
    { d: p, fill: "darken", stroke: !1 },
    { d: p, fill: "none", stroke: !0 },
    { d: Kt(t, n), fill: "none", stroke: !0 }
  ];
});
pt.set("actionButtonEnd", (t, n) => {
  const { g9: e, g10: o, g11: s, g12: i, g13: r, vc: c } = Te(t, n), l = r * 3 / 4, a = r * 7 / 8, d = s + l, h = s + a, u = `M${d},${c} L${s},${e} L${s},${o} Z`, x = `M${h},${e} L${i},${e} L${i},${o} L${h},${o} Z`, p = `${u} ${x}`;
  return [
    { d: `${Kt(t, n)} ${p}`, fill: "norm", stroke: !1 },
    { d: p, fill: "darken", stroke: !1 },
    { d: p, fill: "none", stroke: !0 },
    { d: Kt(t, n), fill: "none", stroke: !0 }
  ];
});
pt.set("actionButtonReturn", (t, n) => {
  const { g9: e, g10: o, g11: s, g12: i, g13: r, hc: c } = Te(t, n), l = r * 7 / 8, a = r * 3 / 4, d = r * 5 / 8, h = r * 3 / 8, u = r / 4, x = r / 8, p = e + a, $ = e + d, g = e + u, f = s + l, y = s + a, m = s + d, b = s + h, M = s + u, L = [
    `M${i},${g}`,
    `L${y},${e}`,
    `L${c},${g}`,
    `L${m},${g}`,
    `L${m},${$}`,
    `A${x},${x} 0 0,1 ${m - x},${p}`,
    // arc 1: inner bottom-right corner
    `L${b},${p}`,
    // across inner bottom
    `A${x},${x} 0 0,1 ${M},${$}`,
    // arc 2: inner bottom-left corner
    `L${M},${g}`,
    `L${s},${g}`,
    `L${s},${$}`,
    `A${h},${h} 0 0,0 ${b},${o}`,
    // arc 3: outer bottom-left curve
    `L${c},${o}`,
    // across outer bottom
    `A${h},${h} 0 0,0 ${c + h},${o - h}`,
    // arc 4: outer bottom-right curve
    `L${f},${g}`,
    "Z"
  ].join(" "), v = [
    `M${i},${g}`,
    `L${f},${g}`,
    `L${f},${$}`,
    `A${h},${h} 0 0,1 ${s + r / 2},${o}`,
    // arc A: outer bottom-right (0°→90°)
    `L${b},${o}`,
    // across outer bottom
    `A${h},${h} 0 0,1 ${s},${$}`,
    // arc B: outer bottom-left (90°→180°)
    `L${s},${g}`,
    `L${M},${g}`,
    `L${M},${$}`,
    `A${x},${x} 0 0,0 ${b},${p}`,
    // arc C: inner bottom-left (180°→90°, CCW)
    `L${c},${p}`,
    // across inner bottom
    `A${x},${x} 0 0,0 ${m},${$}`,
    // arc D: inner bottom-right (90°→0°, CCW)
    `L${m},${g}`,
    `L${c},${g}`,
    `L${y},${e}`,
    "Z"
  ].join(" ");
  return [
    { d: `${Kt(t, n)} ${L}`, fill: "norm", stroke: !1 },
    { d: L, fill: "darken", stroke: !1 },
    { d: v, fill: "none", stroke: !0 },
    { d: Kt(t, n), fill: "none", stroke: !0 }
  ];
});
pt.set("actionButtonSound", (t, n) => {
  const { g9: e, g10: o, g11: s, g12: i, g13: r, vc: c } = Te(t, n), l = r / 8, a = r * 5 / 16, d = r * 5 / 8, h = r * 11 / 16, u = r * 3 / 4, x = r * 7 / 8, p = e + l, $ = e + a, g = e + h, f = e + x, y = s + a, m = s + d, b = s + u, M = `M${s},${$} L${s},${g} L${y},${g} L${m},${o} L${m},${e} L${y},${$} Z`, L = `M${s},${$} L${y},${$} L${m},${e} L${m},${o} L${y},${g} L${s},${g} Z`, v = `M${b},${$} L${i},${p}`, k = `M${b},${c} L${i},${c}`, A = `M${b},${g} L${i},${f}`, S = `${L} ${v} ${k} ${A}`;
  return [
    { d: `${Kt(t, n)} ${M}`, fill: "norm", stroke: !1 },
    { d: M, fill: "darken", stroke: !1 },
    { d: S, fill: "none", stroke: !0 },
    { d: Kt(t, n), fill: "none", stroke: !0 }
  ];
});
pt.set("actionButtonInformation", (t, n) => {
  const { g9: e, g10: o, g11: s, g13: i, hc: r, dx2: c } = Te(t, n), l = i / 32, a = i * 5 / 16, d = i * 3 / 8, h = i * 13 / 32, u = i * 19 / 32, x = i * 11 / 16, p = i * 13 / 16, $ = i * 7 / 8, g = i * 3 / 32, f = e + l, y = e + a, m = e + d, b = e + p, M = e + $, L = s + a, v = s + h, k = s + u, A = s + x, S = `M${r},${e} A${c},${c} 0 1,1 ${r},${o} A${c},${c} 0 1,1 ${r},${e} Z`, w = `M${r},${f} A${g},${g} 0 1,1 ${r},${f + g * 2} A${g},${g} 0 1,1 ${r},${f} Z`, F = `M${L},${y} L${A},${y} L${A},${m} L${k},${m} L${k},${b} L${A},${b} L${A},${M} L${L},${M} L${L},${b} L${v},${b} L${v},${m} L${L},${m} Z`, C = `${w} ${F}`;
  return [
    { d: `${Kt(t, n)} ${S}`, fill: "norm", stroke: !1 },
    { d: `${S} ${C}`, fill: "darken", stroke: !1 },
    { d: C, fill: "lighten", stroke: !1 },
    { d: `${S} ${C}`, fill: "none", stroke: !0 },
    { d: Kt(t, n), fill: "none", stroke: !0 }
  ];
});
pt.set("actionButtonHome", (t, n) => {
  const { g9: e, g10: o, g11: s, g12: i, g13: r, hc: c, vc: l } = Te(t, n), a = r / 16, d = r / 8, h = r * 3 / 16, u = r * 5 / 16, x = r * 7 / 16, p = r * 9 / 16, $ = r * 11 / 16, g = r * 3 / 4, f = r * 13 / 16, y = r * 7 / 8, m = e + a, b = e + h, M = e + u, L = e + g, v = s + d, k = s + x, A = s + p, S = s + $, w = s + f, F = s + y, C = `M${c},${e} L${s},${l} L${v},${l} L${v},${o} L${F},${o} L${F},${l} L${i},${l} L${w},${M} L${w},${m} L${S},${m} L${S},${b} Z`, E = `M${w},${M} L${w},${m} L${S},${m} L${S},${b} Z`, P = `M${v},${l} L${v},${o} L${k},${o} L${k},${L} L${A},${L} L${A},${o} L${F},${o} L${F},${l} Z`, B = `M${c},${e} L${s},${l} L${i},${l} Z`, R = `M${k},${L} L${A},${L} L${A},${o} L${k},${o} Z`, I = `M${c},${e} L${S},${b} L${S},${m} L${w},${m} L${w},${M} L${i},${l} L${F},${l} L${F},${o} L${v},${o} L${v},${l} L${s},${l} Z M${S},${b} L${w},${M} M${F},${l} L${v},${l} M${k},${o} L${k},${L} L${A},${L} L${A},${o}`;
  return [
    { d: `${Kt(t, n)} ${C}`, fill: "norm", stroke: !1 },
    { d: `${E} ${P}`, fill: "darkenLess", stroke: !1 },
    { d: `${B} ${R}`, fill: "darken", stroke: !1 },
    { d: I, fill: "none", stroke: !0 },
    { d: Kt(t, n), fill: "none", stroke: !0 }
  ];
});
pt.set("actionButtonHelp", (t, n) => {
  const { g9: e, g11: o, g13: s, hc: i } = Te(t, n), r = s / 7, c = s * 3 / 14, l = s * 2 / 7, a = s * 3 / 7, d = s * 4 / 7, h = s * 17 / 28, u = s * 21 / 28, x = s * 11 / 14, p = s / 14, $ = s * 3 / 28, g = e + l, f = e + h, y = e + u, m = e + x, b = o + c, M = o + a, L = o + d, v = (Z, U, q, Q, G, T) => {
    const D = G * Math.PI / 180, O = (G + T) * Math.PI / 180, ot = Z - q * Math.cos(D), J = U - Q * Math.sin(D), W = ot + q * Math.cos(O), it = J + Q * Math.sin(O), lt = Math.abs(T) > 180 ? 1 : 0, Pt = T > 0 ? 1 : 0;
    return { endX: W, endY: it, svg: `A${q},${Q} 0 ${lt},${Pt} ${W},${it}` };
  };
  let k = b, A = g;
  const S = v(k, A, l, l, 180, 180);
  k = S.endX, A = S.endY;
  const w = v(k, A, r, c, 0, 90);
  k = w.endX, A = w.endY;
  const F = v(k, A, p, $, 270, -90), C = v(M, f, r, c, 180, 90), E = v(C.endX, C.endY, p, $, 90, -90), P = v(E.endX, E.endY, r, r, 0, -180), B = `M${i},${m} A${$},${$} 0 1,1 ${i},${m + $ * 2} A${$},${$} 0 1,1 ${i},${m} Z`, I = `${`M${b},${g} ${S.svg} ${w.svg} ${F.svg} L${L},${y} L${M},${y} L${M},${f} ${C.svg} ${E.svg} ${P.svg} Z`} ${B}`;
  return [
    { d: `${Kt(t, n)} ${I}`, fill: "norm", stroke: !1 },
    // Background with icon cutout
    { d: I, fill: "darken", stroke: !1 },
    // Darkened icon fill
    { d: I, fill: "none", stroke: !0 },
    // Icon outline
    { d: Kt(t, n), fill: "none", stroke: !0 }
    // Rect outline
  ];
});
pt.set("actionButtonDocument", (t, n) => {
  const e = Math.min(t, n), o = t / 2, s = n / 2, i = e * 3 / 8, r = e * 9 / 32, c = s - i, l = s + i, a = o - r, d = o + r, h = e * 3 / 16, u = d - h, x = c + h, p = `M${a},${c} L${u},${c} L${d},${x} L${d},${l} L${a},${l} Z`, $ = `M${u},${c} L${u},${x} L${d},${x} Z`, g = `${p} M${d},${x} L${u},${x} L${u},${c}`;
  return [
    { d: `${Kt(t, n)} ${p}`, fill: "norm", stroke: !1 },
    { d: p, fill: "darkenLess", stroke: !1 },
    { d: $, fill: "darken", stroke: !1 },
    { d: g, fill: "none", stroke: !0 },
    { d: Kt(t, n), fill: "none", stroke: !0 }
  ];
});
pt.set("actionButtonMovie", (t, n) => {
  const { g9: e, g11: o, g12: s, g13: i } = Te(t, n), r = i * 1455 / 21600, c = i * 1905 / 21600, l = i * 2325 / 21600, a = i * 16155 / 21600, d = i * 17010 / 21600, h = i * 19335 / 21600, u = i * 19725 / 21600, x = i * 20595 / 21600, p = i * 5280 / 21600, $ = i * 5730 / 21600, g = i * 6630 / 21600, f = i * 7492 / 21600, y = i * 9067 / 21600, m = i * 9555 / 21600, b = i * 13342 / 21600, M = i * 14580 / 21600, L = i * 15592 / 21600, v = o + r, k = o + c, A = o + l, S = o + a, w = o + d, F = o + h, C = o + u, E = o + x, P = e + p, B = e + $, R = e + g, I = e + f, Z = e + y, U = e + m, q = e + b, Q = e + M, G = e + L, T = [
    `M${o},${P}`,
    `L${o},${U}`,
    `L${v},${U}`,
    `L${k},${Z}`,
    `L${A},${Z}`,
    `L${A},${G}`,
    `L${w},${G}`,
    `L${w},${q}`,
    `L${F},${q}`,
    `L${E},${Q}`,
    `L${s},${Q}`,
    `L${s},${R}`,
    `L${E},${R}`,
    `L${C},${I}`,
    `L${w},${I}`,
    `L${w},${R}`,
    `L${S},${B}`,
    `L${k},${B}`,
    `L${v},${P}`,
    "Z"
  ].join(" ");
  return [
    { d: `${Kt(t, n)} ${T}`, fill: "norm", stroke: !1 },
    { d: T, fill: "darken", stroke: !1 },
    { d: T, fill: "none", stroke: !0 },
    { d: Kt(t, n), fill: "none", stroke: !0 }
  ];
});
pt.set("flowChartOfflineStorage", (t, n) => {
  const e = `M0,0 L${t},0 L${t / 2},${n} Z`, o = n * 4 / 5, s = `M${t * 2 / 5},${o} L${t * 3 / 5},${o}`;
  return [
    { d: e, fill: "norm", stroke: !1 },
    { d: s, fill: "none", stroke: !0 },
    { d: e, fill: "none", stroke: !0 }
  ];
});
pt.set("cube", (t, n, e) => {
  const o = Math.min(Math.max(st(e, "adj", 25e3), 0), 0.45), s = Math.min(t, n) * o, i = [
    `M0,${s}`,
    `L${t - s},${s}`,
    `L${t - s},${n}`,
    `L0,${n}`,
    "Z"
  ].join(" "), r = [`M0,${s}`, `L${s},0`, `L${t},0`, `L${t - s},${s}`, "Z"].join(" "), c = [
    `M${t - s},${s}`,
    `L${t},0`,
    `L${t},${n - s}`,
    `L${t - s},${n}`,
    "Z"
  ].join(" ");
  return [
    { d: i, fill: "norm", stroke: !0 },
    { d: r, fill: "lightenLess", stroke: !0 },
    { d: c, fill: "darkenLess", stroke: !0 }
  ];
});
pt.set("bevel", (t, n, e) => {
  const o = Math.min(Math.max(st(e, "adj", 12500), 0), 0.45), s = Math.min(t, n) * o, i = `M${s},${s} L${t - s},${s} L${t - s},${n - s} L${s},${n - s} Z`, r = `M0,0 L${t},0 L${t - s},${s} L${s},${s} Z`, c = `M0,${n} L${s},${n - s} L${t - s},${n - s} L${t},${n} Z`, l = `M0,0 L${s},${s} L${s},${n - s} L0,${n} Z`, a = `M${t},0 L${t},${n} L${t - s},${n - s} L${t - s},${s} Z`;
  return [
    { d: i, fill: "norm", stroke: !0 },
    { d: r, fill: "lightenLess", stroke: !0 },
    { d: a, fill: "darken", stroke: !0 },
    { d: c, fill: "darken", stroke: !0 },
    { d: l, fill: "lighten", stroke: !0 }
  ];
});
pt.set("leftRightRibbon", (t, n, e) => {
  const o = Math.min(t, n), s = t / 2, i = t / 32, r = t / 2, c = n / 2, l = Math.min(Math.max(((e == null ? void 0 : e.get("adj3")) ?? 16667) / 1e5, 0), 0.33333), a = 1 - l, d = Math.min(Math.max(((e == null ? void 0 : e.get("adj1")) ?? 5e4) / 1e5, 0), a), u = (s - i) / o, x = Math.min(Math.max(((e == null ? void 0 : e.get("adj2")) ?? 5e4) / 1e5, 0), u), p = o * x, $ = t - p, g = n * d / 2, f = -n * l / 2, y = c + f - g, m = c + g - f, b = y + g, M = n - b, L = b * 2, v = n - L, k = L - y, A = n - k, S = l * o / 4, w = r - i, F = r + i, C = y + S, E = A - S, P = (J, W, it, lt, Pt, Rt) => {
    const Wt = Pt * Math.PI / 180, Nt = (Pt + Rt) * Math.PI / 180, ft = J - it * Math.cos(Wt), Zt = W - lt * Math.sin(Wt), Dt = ft + it * Math.cos(Nt), Ot = Zt + lt * Math.sin(Nt), Ut = Math.abs(Rt) > 180 ? 1 : 0, Y = Rt > 0 ? 1 : 0;
    return { endX: Dt, endY: Ot, svg: `A${it},${lt} 0 ${Ut},${Y} ${Dt},${Ot}` };
  }, I = P(r, y, i, S, 270, 180), Z = P(I.endX, I.endY, i, S, 270, -180), Q = P(r, m, i, S, 90, 90), G = [
    `M0,${b}`,
    `L${p},0`,
    `L${p},${y}`,
    `L${r},${y}`,
    I.svg,
    Z.svg,
    `L${$},${A}`,
    `L${$},${v}`,
    `L${t},${M}`,
    `L${$},${n}`,
    `L${$},${m}`,
    `L${r},${m}`,
    Q.svg,
    `L${w},${k}`,
    `L${p},${k}`,
    `L${p},${L}`,
    "Z"
  ].join(" "), T = P(F, C, i, S, 0, 90), D = P(T.endX, T.endY, i, S, 270, -180), O = [`M${F},${C}`, T.svg, D.svg, `L${F},${A}`, "Z"].join(" "), ot = [G, `M${F},${C} L${F},${A}`, `M${w},${E} L${w},${k}`].join(" ");
  return [
    { d: G, fill: "norm", stroke: !1 },
    { d: O, fill: "darkenLess", stroke: !1 },
    { d: ot, fill: "none", stroke: !0 }
  ];
});
pt.set("ellipseRibbon", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 25e3, s = (e == null ? void 0 : e.get("adj2")) ?? 5e4, i = (e == null ? void 0 : e.get("adj3")) ?? 12500, r = Math.max(0, Math.min(o, 1e5)), c = Math.max(25e3, Math.min(s, 75e3)), a = (1e5 - r) / 2, d = r - a, h = Math.max(0, d), u = Math.max(h, Math.min(i, r)), x = t * c / 2e5, p = t / 2 - x, $ = p + t / 8, g = t - $, f = t - p, y = t - t / 8, m = n * u / 1e5, b = t > 0 ? 4 * m / t : 0, M = (Rt) => b * (Rt - Rt * Rt / t), L = M($), v = $ / 2, k = b * v, A = t - v, S = n * r / 1e5, w = S - m, F = M(p), C = F + w, B = m + w - C + m + w, R = n - S, Z = (m * 14 / 16 + R) / 2, U = F + R, q = C + R, Q = p / 2, G = b * Q + R, T = t - Q, D = B + R, O = L + w, ot = S + S - O, J = t / 2, W = t / 8, it = [
    "M0,0",
    `Q${v},${k} ${$},${L}`,
    `L${p},${C}`,
    `Q${J},${B} ${f},${C}`,
    `L${g},${L}`,
    `Q${A},${k} ${t},0`,
    `L${y},${Z}`,
    `L${t},${R}`,
    `Q${T},${G} ${f},${U}`,
    `L${f},${q}`,
    `Q${J},${D} ${p},${q}`,
    `L${p},${U}`,
    `Q${Q},${G} 0,${R}`,
    `L${W},${Z}`,
    "Z"
  ].join(" "), lt = [
    `M${$},${O}`,
    `L${$},${L}`,
    `L${p},${C}`,
    `Q${J},${B} ${f},${C}`,
    `L${g},${L}`,
    `L${g},${O}`,
    `Q${J},${ot} ${$},${O}`,
    "Z"
  ].join(" "), Pt = [
    "M0,0",
    `Q${v},${k} ${$},${L}`,
    `L${p},${C}`,
    `Q${J},${B} ${f},${C}`,
    `L${g},${L}`,
    `Q${A},${k} ${t},0`,
    `L${y},${Z}`,
    `L${t},${R}`,
    `Q${T},${G} ${f},${U}`,
    `L${f},${q}`,
    `Q${J},${D} ${p},${q}`,
    `L${p},${U}`,
    `Q${Q},${G} 0,${R}`,
    `L${W},${Z}`,
    "Z",
    `M${p},${U} L${p},${C}`,
    `M${f},${C} L${f},${U}`,
    `M${$},${L} L${$},${O}`,
    `M${g},${O} L${g},${L}`
  ].join(" ");
  return [
    { d: it, fill: "norm", stroke: !1 },
    { d: lt, fill: "darkenLess", stroke: !1 },
    { d: Pt, fill: "none", stroke: !0 }
  ];
});
pt.set("ellipseRibbon2", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 25e3, s = (e == null ? void 0 : e.get("adj2")) ?? 5e4, i = (e == null ? void 0 : e.get("adj3")) ?? 12500, r = Math.max(0, Math.min(o, 1e5)), c = Math.max(25e3, Math.min(s, 75e3)), a = (1e5 - r) / 2, d = r - a, h = Math.max(0, d), u = Math.max(h, Math.min(i, r)), x = n, p = t * c / 2e5, $ = t / 2 - p, g = $ + t / 8, f = t - g, y = t - $, m = t - t / 8, b = n * u / 1e5, M = t > 0 ? 4 * b / t : 0, L = M * (g - g * g / t), v = x - L, k = g / 2, A = M * k, S = x - A, w = t - k, F = n * r / 1e5, C = F - b, E = M * ($ - $ * $ / t), P = E + C, B = x - P, Z = b + C - P + b + C, U = x - Z, q = x - F, G = (b * 14 / 16 + q) / 2, T = x - G, D = E + q, O = x - D, ot = P + q, J = x - ot, W = $ / 2, it = M * W + q, lt = x - it, Pt = t - W, Rt = Z + q, Wt = x - Rt, Nt = L + C, ft = x - Nt, Zt = F + F - Nt, Dt = x - Zt, Ot = t / 2, Ut = t / 8, Y = [
    `M0,${x}`,
    `Q${k},${S} ${g},${v}`,
    `L${$},${B}`,
    `Q${Ot},${U} ${y},${B}`,
    `L${f},${v}`,
    `Q${w},${S} ${t},${x}`,
    `L${m},${T}`,
    `L${t},${F}`,
    `Q${Pt},${lt} ${y},${O}`,
    `L${y},${J}`,
    `Q${Ot},${Wt} ${$},${J}`,
    `L${$},${O}`,
    `Q${W},${lt} 0,${F}`,
    `L${Ut},${T}`,
    "Z"
  ].join(" "), Bt = [
    `M${g},${ft}`,
    `L${g},${v}`,
    `L${$},${B}`,
    `Q${Ot},${U} ${y},${B}`,
    `L${f},${v}`,
    `L${f},${ft}`,
    `Q${Ot},${Dt} ${g},${ft}`,
    "Z"
  ].join(" "), Ft = [
    `M0,${x}`,
    `L${Ut},${T}`,
    `L0,${F}`,
    `Q${W},${lt} ${$},${O}`,
    `L${$},${J}`,
    `Q${Ot},${Wt} ${y},${J}`,
    `L${y},${O}`,
    `Q${Pt},${lt} ${t},${F}`,
    `L${m},${T}`,
    `L${t},${x}`,
    `Q${w},${S} ${f},${v}`,
    `L${y},${B}`,
    `Q${Ot},${U} ${$},${B}`,
    `L${g},${v}`,
    `Q${k},${S} 0,${x}`,
    "Z",
    `M${$},${B} L${$},${O}`,
    `M${y},${O} L${y},${B}`,
    `M${g},${ft} L${g},${v}`,
    `M${f},${v} L${f},${ft}`
  ].join(" ");
  return [
    { d: Y, fill: "norm", stroke: !1 },
    { d: Bt, fill: "darkenLess", stroke: !1 },
    { d: Ft, fill: "none", stroke: !0 }
  ];
});
pt.set("smileyFace", (t, n, e) => {
  const o = t / 2, s = n / 2, i = t / 2, r = n / 2, c = (e == null ? void 0 : e.get("adj")) ?? 4653, l = Math.max(-4653, Math.min(c, 4653)), a = t * 6215 / 21600, d = t * 13135 / 21600, h = n * 7570 / 21600, u = t * 1125 / 21600, x = n * 1125 / 21600, p = t * 4969 / 21699, $ = t * 16640 / 21600, g = n * 16515 / 21600, f = n * l / 1e5, y = g - f, m = g + f, b = n * l / 5e4, M = m + b, L = `M${t},${r} A${o},${s} 0 1,1 0,${r} A${o},${s} 0 1,1 ${t},${r} Z`, v = `M${(a + u).toFixed(2)},${h.toFixed(2)} A${u.toFixed(2)},${x.toFixed(2)} 0 1,1 ${(a - u).toFixed(2)},${h.toFixed(2)} A${u.toFixed(2)},${x.toFixed(2)} 0 1,1 ${(a + u).toFixed(2)},${h.toFixed(2)} Z`, k = `M${(d + u).toFixed(2)},${h.toFixed(2)} A${u.toFixed(2)},${x.toFixed(2)} 0 1,1 ${(d - u).toFixed(2)},${h.toFixed(2)} A${u.toFixed(2)},${x.toFixed(2)} 0 1,1 ${(d + u).toFixed(2)},${h.toFixed(2)} Z`, A = `M${p.toFixed(2)},${y.toFixed(2)} Q${i.toFixed(2)},${M.toFixed(2)} ${$.toFixed(2)},${y.toFixed(2)}`, S = `M${t},${r} A${o},${s} 0 1,1 0,${r} A${o},${s} 0 1,1 ${t},${r} Z`;
  return [
    { d: L, fill: "norm", stroke: !1 },
    { d: `${v} ${k}`, fill: "darkenLess", stroke: !1 },
    { d: A, fill: "none", stroke: !0 },
    { d: S, fill: "none", stroke: !0 }
  ];
});
pt.set("foldedCorner", (t, n, e) => {
  const o = st(e, "adj", 16667), s = Math.min(t, n) * o * 0.7, i = `M0,0 L${t},0 L${t},${n - s} L${t - s},${n} L0,${n} Z`, r = `M${t - s},${n} L${t - s},${n - s} L${t},${n - s} Z`, c = `M${t - s},${n} L${t - s},${n - s}`;
  return [
    { d: i, fill: "norm", stroke: !0 },
    { d: r, fill: "darkenLess", stroke: !1 },
    { d: c, fill: "none", stroke: !0 }
  ];
});
pt.set("can", (t, n, e) => {
  const o = Math.min(t, n), s = 5e4 * n / o, i = Math.min(Math.max((e == null ? void 0 : e.get("adj")) ?? 25e3, 0), s), r = o * i / 2e5, c = n - r, l = t / 2, a = (b, M, L, v, k, A) => {
    const S = k * Math.PI / 180, w = (k + A) * Math.PI / 180, F = b - L * Math.cos(S), C = M - v * Math.sin(S), E = F + L * Math.cos(w), P = C + v * Math.sin(w), B = Math.abs(A) > 180 ? 1 : 0, R = A > 0 ? 1 : 0;
    return { endX: E, endY: P, svg: `A${L},${v} 0 ${B},${R} ${E},${P}` };
  }, d = a(0, r, l, r, 180, -180), h = a(t, c, l, r, 0, 180), u = `M0,${r} ${d.svg} L${t},${c} ${h.svg} Z`, x = a(0, r, l, r, 180, 180), p = a(x.endX, x.endY, l, r, 0, 180), $ = `M0,${r} ${x.svg} ${p.svg} Z`, g = a(t, r, l, r, 0, 180), f = a(g.endX, g.endY, l, r, 180, 180), y = a(t, c, l, r, 0, 180), m = `M${t},${r} ${g.svg} ${f.svg} L${t},${c} ${y.svg} L0,${r}`;
  return [
    { d: u, fill: "norm", stroke: !1 },
    { d: $, fill: "lighten", stroke: !1 },
    { d: m, fill: "none", stroke: !0 }
  ];
});
pt.set(
  "curvedrightarrow",
  (t, n, e) => Rc("curvedRightArrow", t, n, e)
);
pt.set(
  "curvedleftarrow",
  (t, n, e) => Rc("curvedLeftArrow", t, n, e)
);
pt.set(
  "curveduparrow",
  (t, n, e) => Ic("curvedUpArrow", t, n, e)
);
pt.set(
  "curveddownarrow",
  (t, n, e) => Ic("curvedDownArrow", t, n, e)
);
pt.set("bordercallout1", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 112500) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -38333) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !0 },
    { d: `M${s},${o} L${r},${i}`, fill: "none", stroke: !0 }
  ];
});
pt.set("accentcallout1", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 112500) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -38333) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !1 },
    { d: `M${s},0 L${s},${n}`, fill: "none", stroke: !0 },
    { d: `M${s},${o} L${r},${i}`, fill: "none", stroke: !0 }
  ];
});
pt.set("accentcallout2", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 18750) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -16667) / 1e5, c = n * ((e == null ? void 0 : e.get("adj5")) ?? 112500) / 1e5, l = t * ((e == null ? void 0 : e.get("adj6")) ?? -46667) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !1 },
    { d: `M${s},0 L${s},${n}`, fill: "none", stroke: !0 },
    { d: `M${s},${o} L${r},${i} L${l},${c}`, fill: "none", stroke: !0 }
  ];
});
pt.set("accentcallout3", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 18750) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -16667) / 1e5, c = n * ((e == null ? void 0 : e.get("adj5")) ?? 1e5) / 1e5, l = t * ((e == null ? void 0 : e.get("adj6")) ?? -16667) / 1e5, a = n * ((e == null ? void 0 : e.get("adj7")) ?? 112963) / 1e5, d = t * ((e == null ? void 0 : e.get("adj8")) ?? -8333) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !1 },
    { d: `M${s},0 L${s},${n}`, fill: "none", stroke: !0 },
    { d: `M${s},${o} L${r},${i} L${l},${c} L${d},${a}`, fill: "none", stroke: !0 }
  ];
});
pt.set("callout1", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 112500) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -38333) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !1 },
    { d: `M${s},${o} L${r},${i}`, fill: "none", stroke: !0 }
  ];
});
pt.set("callout2", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 18750) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -16667) / 1e5, c = n * ((e == null ? void 0 : e.get("adj5")) ?? 112500) / 1e5, l = t * ((e == null ? void 0 : e.get("adj6")) ?? -46667) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !1 },
    { d: `M${s},${o} L${r},${i} L${l},${c}`, fill: "none", stroke: !0 }
  ];
});
pt.set("callout3", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 18750) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -16667) / 1e5, c = n * ((e == null ? void 0 : e.get("adj5")) ?? 1e5) / 1e5, l = t * ((e == null ? void 0 : e.get("adj6")) ?? -16667) / 1e5, a = n * ((e == null ? void 0 : e.get("adj7")) ?? 112963) / 1e5, d = t * ((e == null ? void 0 : e.get("adj8")) ?? -8333) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !1 },
    { d: `M${s},${o} L${r},${i} L${l},${c} L${d},${a}`, fill: "none", stroke: !0 }
  ];
});
pt.set("bordercallout2", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 18750) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -16667) / 1e5, c = n * ((e == null ? void 0 : e.get("adj5")) ?? 112500) / 1e5, l = t * ((e == null ? void 0 : e.get("adj6")) ?? -46667) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !0 },
    { d: `M${s},${o} L${r},${i} L${l},${c}`, fill: "none", stroke: !0 }
  ];
});
pt.set("bordercallout3", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 18750) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -16667) / 1e5, c = n * ((e == null ? void 0 : e.get("adj5")) ?? 1e5) / 1e5, l = t * ((e == null ? void 0 : e.get("adj6")) ?? -16667) / 1e5, a = n * ((e == null ? void 0 : e.get("adj7")) ?? 112963) / 1e5, d = t * ((e == null ? void 0 : e.get("adj8")) ?? -8333) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !0 },
    { d: `M${s},${o} L${r},${i} L${l},${c} L${d},${a}`, fill: "none", stroke: !0 }
  ];
});
pt.set("accentbordercallout1", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 112500) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -38333) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !0 },
    { d: `M${s},0 L${s},${n}`, fill: "none", stroke: !0 },
    { d: `M${s},${o} L${r},${i}`, fill: "none", stroke: !0 }
  ];
});
pt.set("accentbordercallout2", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 18750) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -16667) / 1e5, c = n * ((e == null ? void 0 : e.get("adj5")) ?? 112500) / 1e5, l = t * ((e == null ? void 0 : e.get("adj6")) ?? -46667) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !0 },
    { d: `M${s},0 L${s},${n}`, fill: "none", stroke: !0 },
    { d: `M${s},${o} L${r},${i} L${l},${c}`, fill: "none", stroke: !0 }
  ];
});
pt.set("accentbordercallout3", (t, n, e) => {
  const o = n * ((e == null ? void 0 : e.get("adj1")) ?? 18750) / 1e5, s = t * ((e == null ? void 0 : e.get("adj2")) ?? -8333) / 1e5, i = n * ((e == null ? void 0 : e.get("adj3")) ?? 18750) / 1e5, r = t * ((e == null ? void 0 : e.get("adj4")) ?? -16667) / 1e5, c = n * ((e == null ? void 0 : e.get("adj5")) ?? 1e5) / 1e5, l = t * ((e == null ? void 0 : e.get("adj6")) ?? -16667) / 1e5, a = n * ((e == null ? void 0 : e.get("adj7")) ?? 112963) / 1e5, d = t * ((e == null ? void 0 : e.get("adj8")) ?? -8333) / 1e5;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !0 },
    { d: `M${s},0 L${s},${n}`, fill: "none", stroke: !0 },
    { d: `M${s},${o} L${r},${i} L${l},${c} L${d},${a}`, fill: "none", stroke: !0 }
  ];
});
pt.set("chartx", (t, n) => [
  { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !1 },
  { d: `M0,0 L${t},${n} M${t},0 L0,${n}`, fill: "none", stroke: !0 }
]);
pt.set("chartplus", (t, n) => {
  const e = t / 2, o = n / 2;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !1 },
    { d: `M${e},0 L${e},${n} M0,${o} L${t},${o}`, fill: "none", stroke: !0 }
  ];
});
pt.set("chartstar", (t, n) => {
  const e = t / 2;
  return [
    { d: `M0,0 L${t},0 L${t},${n} L0,${n} Z`, fill: "norm", stroke: !1 },
    {
      d: `M0,0 L${t},${n} M${t},0 L0,${n} M${e},0 L${e},${n}`,
      fill: "none",
      stroke: !0
    }
  ];
});
function K(t, n, e, o, s, i) {
  const r = s * Math.PI / 180, c = t - e * Math.cos(r), l = n - o * Math.sin(r), a = (s + i) * Math.PI / 180, d = c + e * Math.cos(a), h = l + o * Math.sin(a), x = Math.abs(i) > 180 ? 1 : 0, p = i >= 0 ? 1 : 0;
  return { svg: `A${e},${o} 0 ${x},${p} ${d},${h}`, x: d, y: h };
}
pt.set("ribbon", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 16667, s = (e == null ? void 0 : e.get("adj2")) ?? 5e4, i = Math.min(Math.max(o, 0), 33333), r = Math.min(Math.max(s, 25e3), 75e3), c = t / 2, l = t / 8, a = t / 32, d = t - l, h = t * r / 2e5, u = c - h, x = c + h, p = u + a, $ = x - a, g = u + l, f = x - l, y = g - a, m = f + a, b = n * i / 2e5, M = n * i / 1e5, L = n - M, v = L / 2, k = n * i / 4e5, A = n - k, S = M - k;
  let w, F, C;
  const E = [];
  w = 0, F = 0, E.push("M0,0"), E.push(`L${y},0`), w = y, F = 0, C = K(w, F, a, k, 270, 180), E.push(C.svg), w = C.x, F = C.y, E.push(`L${p},${b}`), w = p, F = b, C = K(w, F, a, k, 270, -180), E.push(C.svg), w = C.x, F = C.y, E.push(`L${$},${M}`), w = $, F = M, C = K(w, F, a, k, 90, -180), E.push(C.svg), w = C.x, F = C.y, E.push(`L${m},${b}`), w = m, F = b, C = K(w, F, a, k, 90, 180), E.push(C.svg), w = C.x, F = C.y, E.push(`L${t},0`), E.push(`L${d},${v}`), E.push(`L${t},${L}`), E.push(`L${x},${L}`), E.push(`L${x},${A}`), w = x, F = A, C = K(w, F, a, k, 0, 90), E.push(C.svg), w = C.x, F = C.y, E.push(`L${p},${n}`), w = p, F = n, C = K(w, F, a, k, 90, 90), E.push(C.svg), w = C.x, F = C.y, E.push(`L${u},${L}`), E.push(`L0,${L}`), E.push(`L${l},${v}`), E.push("Z");
  const P = [];
  w = g, F = k, P.push(`M${w},${F}`), C = K(w, F, a, k, 0, 90), P.push(C.svg), w = C.x, F = C.y, P.push(`L${p},${b}`), w = p, F = b, C = K(w, F, a, k, 270, -180), P.push(C.svg), w = C.x, F = C.y, P.push(`L${g},${M}`), P.push("Z"), w = f, F = k, P.push(`M${w},${F}`), C = K(w, F, a, k, 180, -90), P.push(C.svg), w = C.x, F = C.y, P.push(`L${$},${b}`), w = $, F = b, C = K(w, F, a, k, 270, 180), P.push(C.svg), w = C.x, F = C.y, P.push(`L${f},${M}`), P.push("Z");
  const B = [];
  return w = 0, F = 0, B.push("M0,0"), B.push(`L${y},0`), w = y, F = 0, C = K(w, F, a, k, 270, 180), B.push(C.svg), w = C.x, F = C.y, B.push(`L${p},${b}`), w = p, F = b, C = K(w, F, a, k, 270, -180), B.push(C.svg), w = C.x, F = C.y, B.push(`L${$},${M}`), w = $, F = M, C = K(w, F, a, k, 90, -180), B.push(C.svg), w = C.x, F = C.y, B.push(`L${m},${b}`), w = m, F = b, C = K(w, F, a, k, 90, 180), B.push(C.svg), w = C.x, F = C.y, B.push(`L${t},0`), B.push(`L${d},${v}`), B.push(`L${t},${L}`), B.push(`L${x},${L}`), B.push(`L${x},${A}`), w = x, F = A, C = K(w, F, a, k, 0, 90), B.push(C.svg), w = C.x, F = C.y, B.push(`L${p},${n}`), w = p, F = n, C = K(w, F, a, k, 90, 90), B.push(C.svg), w = C.x, F = C.y, B.push(`L${u},${L}`), B.push(`L0,${L}`), B.push(`L${l},${v}`), B.push("Z"), B.push(`M${g},${k} L${g},${M}`), B.push(`M${f},${M} L${f},${k}`), B.push(`M${u},${L} L${u},${S}`), B.push(`M${x},${S} L${x},${L}`), [
    { d: E.join(" "), fill: "norm", stroke: !1 },
    { d: P.join(" "), fill: "darkenLess", stroke: !1 },
    { d: B.join(" "), fill: "none", stroke: !0 }
  ];
});
pt.set("ribbon2", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj1")) ?? 16667, s = (e == null ? void 0 : e.get("adj2")) ?? 5e4, i = Math.min(Math.max(o, 0), 33333), r = Math.min(Math.max(s, 25e3), 75e3), c = t / 2, l = t / 8, a = t / 32, d = t - l, h = t * r / 2e5, u = c - h, x = c + h, p = u + a, $ = x - a, g = u + l, f = x - l, y = g - a, m = f + a, b = n * i / 2e5, M = n - b, L = n * i / 1e5, v = n - L, k = L, A = (k + n) / 2, S = n * i / 4e5, w = n - S, F = M - S;
  let C, E, P;
  const B = [];
  B.push(`M0,${n}`), B.push(`L${y},${n}`), C = y, E = n, P = K(C, E, a, S, 90, -180), B.push(P.svg), C = P.x, E = P.y, B.push(`L${p},${M}`), C = p, E = M, P = K(C, E, a, S, 90, 180), B.push(P.svg), C = P.x, E = P.y, B.push(`L${$},${v}`), C = $, E = v, P = K(C, E, a, S, 270, 180), B.push(P.svg), C = P.x, E = P.y, B.push(`L${m},${M}`), C = m, E = M, P = K(C, E, a, S, 270, -180), B.push(P.svg), C = P.x, E = P.y, B.push(`L${t},${n}`), B.push(`L${d},${A}`), B.push(`L${t},${k}`), B.push(`L${x},${k}`), B.push(`L${x},${S}`), C = x, E = S, P = K(C, E, a, S, 0, -90), B.push(P.svg), C = P.x, E = P.y, B.push(`L${p},0`), C = p, E = 0, P = K(C, E, a, S, 270, -90), B.push(P.svg), C = P.x, E = P.y, B.push(`L${u},${k}`), B.push(`L0,${k}`), B.push(`L${l},${A}`), B.push("Z");
  const R = [];
  C = g, E = w, R.push(`M${C},${E}`), P = K(C, E, a, S, 0, -90), R.push(P.svg), C = P.x, E = P.y, R.push(`L${p},${M}`), C = p, E = M, P = K(C, E, a, S, 90, 180), R.push(P.svg), C = P.x, E = P.y, R.push(`L${g},${v}`), R.push("Z"), C = f, E = w, R.push(`M${C},${E}`), P = K(C, E, a, S, 180, 90), R.push(P.svg), C = P.x, E = P.y, R.push(`L${$},${M}`), C = $, E = M, P = K(C, E, a, S, 90, -180), R.push(P.svg), C = P.x, E = P.y, R.push(`L${f},${v}`), R.push("Z");
  const I = [];
  return I.push(`M0,${n}`), I.push(`L${l},${A}`), I.push(`L0,${k}`), I.push(`L${u},${k}`), I.push(`L${u},${S}`), C = u, E = S, P = K(C, E, a, S, 180, 90), I.push(P.svg), C = P.x, E = P.y, I.push(`L${$},0`), C = $, E = 0, P = K(C, E, a, S, 270, 90), I.push(P.svg), C = P.x, E = P.y, I.push(`L${x},${k}`), I.push(`L${t},${k}`), I.push(`L${d},${A}`), I.push(`L${t},${n}`), I.push(`L${m},${n}`), C = m, E = n, P = K(C, E, a, S, 90, 180), I.push(P.svg), C = P.x, E = P.y, I.push(`L${$},${M}`), C = $, E = M, P = K(C, E, a, S, 90, -180), I.push(P.svg), C = P.x, E = P.y, I.push(`L${p},${v}`), C = p, E = v, P = K(C, E, a, S, 270, -180), I.push(P.svg), C = P.x, E = P.y, I.push(`L${y},${M}`), C = y, E = M, P = K(C, E, a, S, 270, 180), I.push(P.svg), C = P.x, E = P.y, I.push("Z"), I.push(`M${g},${v} L${g},${w}`), I.push(`M${f},${w} L${f},${v}`), I.push(`M${u},${F} L${u},${k}`), I.push(`M${x},${k} L${x},${F}`), [
    { d: B.join(" "), fill: "norm", stroke: !1 },
    { d: R.join(" "), fill: "darkenLess", stroke: !1 },
    { d: I.join(" "), fill: "none", stroke: !0 }
  ];
});
pt.set("horizontalscroll", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj")) ?? 12500, s = Math.min(Math.max(o, 0), 25e3), r = Math.min(t, n) * s / 1e5, c = r / 2, l = r / 4, a = r + c, d = r + r, h = n - r, u = n - c, x = h - c, p = t - r, $ = t - c, g = [];
  let f, y;
  f = t, y = c, g.push(`M${f},${y}`);
  let m = K(f, y, c, c, 0, 90);
  g.push(m.svg), f = m.x, y = m.y, g.push(`L${$},${c}`), m = K($, c, l, l, 0, 180), g.push(m.svg), f = m.x, y = m.y, g.push(`L${p},${r}`), g.push(`L${c},${r}`), f = c, y = r, m = K(f, y, c, c, 270, -90), g.push(m.svg), f = m.x, y = m.y, g.push(`L0,${u}`), f = 0, y = u, m = K(f, y, c, c, 180, -180), g.push(m.svg), f = m.x, y = m.y, g.push(`L${r},${h}`), g.push(`L${$},${h}`), f = $, y = h, m = K(f, y, c, c, 90, -90), g.push(m.svg), g.push("Z"), f = c, y = d, g.push(`M${f},${y}`), m = K(f, y, c, c, 90, -90), g.push(m.svg), f = m.x, y = m.y, m = K(f, y, l, l, 0, -180), g.push(m.svg), g.push("Z");
  const b = [];
  f = c, y = d, b.push(`M${f},${y}`), m = K(f, y, c, c, 90, -90), b.push(m.svg), f = m.x, y = m.y, m = K(f, y, l, l, 0, -180), b.push(m.svg), b.push("Z"), f = $, y = r, b.push(`M${f},${y}`), m = K(f, y, c, c, 90, -270), b.push(m.svg), f = m.x, y = m.y, m = K(f, y, l, l, 180, -180), b.push(m.svg), b.push("Z");
  const M = [];
  return f = 0, y = a, M.push(`M${f},${y}`), m = K(f, y, c, c, 180, 90), M.push(m.svg), f = m.x, y = m.y, M.push(`L${p},${r}`), M.push(`L${p},${c}`), f = p, y = c, m = K(f, y, c, c, 180, 180), M.push(m.svg), f = m.x, y = m.y, M.push(`L${t},${x}`), f = t, y = x, m = K(f, y, c, c, 0, 90), M.push(m.svg), f = m.x, y = m.y, M.push(`L${r},${h}`), M.push(`L${r},${u}`), f = r, y = u, m = K(f, y, c, c, 0, 180), M.push(m.svg), M.push("Z"), M.push(`M${p},${r}`), M.push(`L${$},${r}`), f = $, y = r, m = K(f, y, c, c, 90, -90), M.push(m.svg), M.push(`M${$},${r}`), M.push(`L${$},${c}`), f = $, y = c, m = K(f, y, l, l, 0, 180), M.push(m.svg), M.push(`M${c},${d}`), M.push(`L${c},${a}`), f = c, y = a, m = K(f, y, l, l, 180, 180), M.push(m.svg), f = m.x, y = m.y, m = K(f, y, c, c, 0, 180), M.push(m.svg), M.push(`M${r},${a}`), M.push(`L${r},${h}`), [
    { d: g.join(" "), fill: "norm", stroke: !1 },
    { d: b.join(" "), fill: "darkenLess", stroke: !1 },
    { d: M.join(" "), fill: "none", stroke: !0 }
  ];
});
pt.set("verticalscroll", (t, n, e) => {
  const o = (e == null ? void 0 : e.get("adj")) ?? 12500, s = Math.min(Math.max(o, 0), 25e3), r = Math.min(t, n) * s / 1e5, c = r / 2, l = r / 4, a = r + c, d = r + r, h = t - r, u = t - c, x = n - r, p = n - c, $ = [];
  let g, f;
  g = c, f = n, $.push(`M${g},${f}`);
  let y = K(g, f, c, c, 90, -90);
  $.push(y.svg), g = y.x, f = y.y, $.push(`L${c},${p}`), g = c, f = p, y = K(g, f, l, l, 90, -180), $.push(y.svg), g = y.x, f = y.y, $.push(`L${r},${x}`), $.push(`L${r},${c}`), g = r, f = c, y = K(g, f, c, c, 180, 90), $.push(y.svg), g = y.x, f = y.y, $.push(`L${u},0`), g = u, f = 0, y = K(g, f, c, c, 270, 180), $.push(y.svg), g = y.x, f = y.y, $.push(`L${h},${r}`), $.push(`L${h},${p}`), g = h, f = p, y = K(g, f, c, c, 0, 90), $.push(y.svg), $.push("Z"), g = d, f = c, $.push(`M${g},${f}`), y = K(g, f, c, c, 0, 90), $.push(y.svg), g = y.x, f = y.y, y = K(g, f, l, l, 90, 180), $.push(y.svg), $.push("Z");
  const m = [];
  g = d, f = c, m.push(`M${g},${f}`), y = K(g, f, c, c, 0, 90), m.push(y.svg), g = y.x, f = y.y, y = K(g, f, l, l, 90, 180), m.push(y.svg), m.push("Z"), g = r, f = p, m.push(`M${g},${f}`), y = K(g, f, c, c, 0, 270), m.push(y.svg), g = y.x, f = y.y, y = K(g, f, l, l, 270, 180), m.push(y.svg), m.push("Z");
  const b = [];
  return g = r, f = x, b.push(`M${g},${f}`), b.push(`L${r},${c}`), g = r, f = c, y = K(g, f, c, c, 180, 90), b.push(y.svg), g = y.x, f = y.y, b.push(`L${u},0`), g = u, f = 0, y = K(g, f, c, c, 270, 180), b.push(y.svg), g = y.x, f = y.y, b.push(`L${h},${r}`), b.push(`L${h},${p}`), g = h, f = p, y = K(g, f, c, c, 0, 90), b.push(y.svg), g = y.x, f = y.y, b.push(`L${c},${n}`), g = c, f = n, y = K(g, f, c, c, 90, 180), b.push(y.svg), b.push("Z"), b.push(`M${a},0`), g = a, f = 0, y = K(g, f, c, c, 270, 180), b.push(y.svg), g = y.x, f = y.y, y = K(g, f, l, l, 90, 180), b.push(y.svg), g = y.x, f = y.y, b.push(`L${d},${c}`), b.push(`M${h},${r}`), b.push(`L${a},${r}`), b.push(`M${c},${x}`), g = c, f = x, y = K(g, f, l, l, 270, 180), b.push(y.svg), g = y.x, f = y.y, b.push(`L${r},${p}`), b.push(`M${c},${n}`), g = c, f = n, y = K(g, f, c, c, 90, -90), b.push(y.svg), g = y.x, f = y.y, b.push(`L${r},${x}`), [
    { d: $.join(" "), fill: "norm", stroke: !1 },
    { d: m.join(" "), fill: "darkenLess", stroke: !1 },
    { d: b.join(" "), fill: "none", stroke: !0 }
  ];
});
function tu(t, n, e, o) {
  const s = t.toLowerCase(), i = pt.get(s) ?? pt.get(t);
  return i ? i(n, e, o) : null;
}
function Rs(t, n, e, o) {
  if (t === "textNoShape" || t.toLowerCase() === "textnoshape") return "";
  const s = t.toLowerCase(), i = z.get(s) ?? z.get(t);
  return i ? i(n, e, o) : (console.warn(`Unknown preset shape: "${t}", falling back to rectangle`), `M0,0 L${n},0 L${n},${e} L0,${e} Z`);
}
const eu = 1e5;
function nu(t, n, e, o, s) {
  if (!t || !o && !s) return t;
  const i = Gn(t);
  if (!i) return t;
  const r = [];
  let c = 0;
  const l = (d) => {
    if (c + d > i.length) return null;
    const h = i.slice(c, c + d).map(Number);
    return h.some((u) => !Number.isFinite(u)) ? null : (c += d, h);
  }, a = (d, h) => {
    const u = o ? n - d : d, x = s ? e - h : h;
    return `${Ke(u)},${Ke(x)}`;
  };
  for (; c < i.length; ) {
    const d = i[c++];
    if (d === "Z" || d === "z") {
      r.push("Z");
      continue;
    }
    const h = d === "C" ? 6 : d === "Q" ? 4 : d === "A" ? 7 : 2;
    if (d !== "M" && d !== "L" && d !== "C" && d !== "Q" && d !== "A")
      return t;
    const u = l(h);
    if (!u) return t;
    if (d === "M" || d === "L")
      r.push(`${d}${a(u[0], u[1])}`);
    else if (d === "C")
      r.push(
        `C${a(u[0], u[1])} ${a(u[2], u[3])} ${a(u[4], u[5])}`
      );
    else if (d === "Q")
      r.push(`Q${a(u[0], u[1])} ${a(u[2], u[3])}`);
    else {
      const [x, p, $, g, f, y, m] = u, b = o !== s ? f ? 0 : 1 : f, M = o ? n - y : y, L = s ? e - m : m;
      r.push(
        `A${Ke(x)},${Ke(p)} ${Ke(
          o !== s ? -$ : $
        )} ${g},${b} ${Ke(M)},${Ke(L)}`
      );
    }
  }
  return r.join(" ");
}
function Gn(t, n = eu) {
  if (!t || t.length > n) return null;
  const e = [];
  let o = 0;
  for (; o < t.length; ) {
    const s = t.charCodeAt(o);
    if (cu(s)) {
      o++;
      continue;
    }
    if (lu(s)) {
      e.push(t[o++]);
      continue;
    }
    const i = ru(t, o);
    if (i > o) {
      e.push(t.slice(o, i)), o = i;
      continue;
    }
    o++;
  }
  return e;
}
function Dc(t) {
  const n = Gn(t);
  if (!n || n.length !== 6 || n[0] !== "M" || n[3] !== "L") return null;
  const e = Be(n, 1), o = Be(n, 4);
  return e && o ? { start: e, end: o } : null;
}
function ou(t) {
  const n = Gn(t);
  if (!n || n.length < 3 || n[0] !== "M") return null;
  const e = [];
  let o = 1;
  const s = Be(n, o);
  if (!s) return null;
  for (e.push(s), o += 2; o < n.length; ) {
    if (n[o++] !== "L") return null;
    const r = Be(n, o);
    if (!r) return null;
    e.push(r), o += 2;
  }
  return e.length >= 2 ? e : null;
}
function su(t) {
  const n = Gn(t);
  if (!n || n.length < 8 || n[0] !== "M") return null;
  const e = Be(n, 1);
  if (!e) return null;
  const o = [];
  let s = 3;
  for (; s < n.length; ) {
    if (n[s++] !== "C") return null;
    const r = Be(n, s), c = Be(n, s + 2), l = Be(n, s + 4);
    if (!r || !c || !l) return null;
    o.push({ c1: r, c2: c, end: l }), s += 6;
  }
  return o.length > 0 ? { start: e, segments: o } : null;
}
function iu(t) {
  const n = Gn(t);
  if (!n || n.length !== 11 || n[0] !== "M" || n[3] !== "A") return null;
  const e = Be(n, 1), o = Number(n[4]), s = Number(n[5]), i = Number(n[6]), r = Number(n[7]) ? 1 : 0, c = Number(n[8]) ? 1 : 0, l = Be(n, 9);
  return !e || !l || !Number.isFinite(o) || !Number.isFinite(s) || !Number.isFinite(i) ? null : { start: e, arc: { rx: o, ry: s, xAxisRotation: i, largeArc: r, sweep: c, end: l } };
}
function Be(t, n) {
  if (n + 1 >= t.length) return null;
  const e = Number(t[n]), o = Number(t[n + 1]);
  return !Number.isFinite(e) || !Number.isFinite(o) ? null : { x: e, y: o };
}
function Ke(t) {
  return Number.isInteger(t) ? String(t) : String(Number(t.toFixed(6)));
}
function ru(t, n) {
  let e = n;
  (t[e] === "-" || t[e] === "+") && e++;
  let o = 0;
  for (; ss(t.charCodeAt(e)); )
    e++, o++;
  if (t[e] === ".")
    for (e++; ss(t.charCodeAt(e)); )
      e++, o++;
  if (o === 0) return n;
  if (t[e] === "e" || t[e] === "E") {
    const s = e;
    e++, (t[e] === "-" || t[e] === "+") && e++;
    let i = 0;
    for (; ss(t.charCodeAt(e)); )
      e++, i++;
    if (i === 0) return s;
  }
  return e;
}
function cu(t) {
  return t === 44 || t === 32 || t === 9 || t === 10 || t === 13 || t === 12;
}
function ss(t) {
  return t >= 48 && t <= 57;
}
function lu(t) {
  return t >= 65 && t <= 90 || t >= 97 && t <= 122;
}
function au(t) {
  for (const n of t.paragraphs)
    for (const e of n.runs)
      if (e.text != null && e.text.trim().length > 0) return !0;
  return !1;
}
function is(t) {
  let n = 0;
  for (const e of t.paragraphs)
    if (e.runs.some((s) => s.text != null && s.text.length > 0) && (n++, n > 1 || e.runs.some((s) => s.text === `
`)))
      return !1;
  return n === 1;
}
function du(t) {
  const n = t.paragraphs.filter(
    (e) => e.runs.some((o) => o.text != null && o.text.length > 0)
  );
  return n.length === 0 ? !1 : n.every((e) => {
    var o;
    return ((o = e.properties) == null ? void 0 : o.attr("algn")) === "ctr";
  });
}
const Oc = 36;
function Nc(t) {
  const n = t.paragraphs.flatMap((e) => e.runs.map((o) => o.text ?? "")).join("").replace(/\s+/g, "");
  return Array.from(n).length;
}
function hu(t) {
  const n = Nc(t);
  return n > 0 && n <= Oc;
}
function uu(t) {
  return t.paragraphs.filter(
    (n) => n.runs.some((e) => e.text != null && e.text.length > 0)
  ).length;
}
function fu(t) {
  return t.paragraphs.some((n) => {
    const e = n.properties;
    return (e == null ? void 0 : e.child("lnSpc").exists()) || (e == null ? void 0 : e.child("spcBef").exists()) || (e == null ? void 0 : e.child("spcAft").exists());
  });
}
function $u(t, n) {
  var o, s;
  const e = [
    n.properties,
    (o = t.listStyle) == null ? void 0 : o.child(`lvl${n.level + 1}pPr`),
    (s = t.listStyle) == null ? void 0 : s.child("defPPr")
  ];
  for (const i of e)
    if (i != null && i.exists()) {
      if (i.child("buNone").exists()) return !1;
      if (i.child("buChar").exists() || i.child("buAutoNum").exists() || i.child("buBlip").exists())
        return !0;
    }
  return !1;
}
function pu(t) {
  return t.paragraphs.some(
    (n) => n.runs.some((e) => e.text != null && e.text.length > 0) && $u(t, n)
  );
}
function xu(t) {
  return (t == null ? void 0 : t.type) === "title" || (t == null ? void 0 : t.type) === "ctrTitle";
}
function rs(t, n) {
  t.style.transform = `${t.style.transform || ""} ${n}`.trim();
}
function Zc(t, n) {
  const e = t.style.filter.trim();
  t.style.filter = e ? `${e} ${n}` : n;
}
function ie(t) {
  return Number.isInteger(t) ? String(t) : String(Number(t.toFixed(6)));
}
function yu(t, n) {
  const e = X(t.numAttr("rad") ?? 0);
  if (!(e > 0)) return;
  const { color: o, alpha: s } = Tt(t, n);
  if (!o || s <= 0) return;
  const i = o.startsWith("#") ? o : `#${o}`, { r, g: c, b: l } = Et(i);
  return `drop-shadow(0px 0px ${e.toFixed(1)}px rgba(${r},${c},${l},${s.toFixed(3)}))`;
}
function gu(t, n, e) {
  const o = yu(n, e);
  o && Zc(t, o);
}
function $r(t, n) {
  return th(t, n);
}
function no(t, n, e = !1, o = "vertical-rl") {
  t.style.writingMode = o, t.style.justifyContent = "center", t.style.alignItems = n === "b" ? "flex-end" : n === "ctr" ? "center" : "flex-start", e && (t.style.textOrientation = "upright", t.style.whiteSpace = "normal");
}
const mu = 1.1, bu = 1.25, cs = 1, Mu = 0.9, Lu = 0.9;
function vu(t) {
  var o;
  const n = (o = t.bodyProperties) == null ? void 0 : o.child("prstTxWarp"), e = n == null ? void 0 : n.attr("prst");
  return e === "textArchDown" || e === "textArchUp" ? e : null;
}
function Au(t) {
  let n = "", e = 0;
  for (const o of t.paragraphs) {
    const s = o.runs.filter((i) => i.text != null && i.text.length > 0);
    if (s.length !== 0) {
      if (e++, e > 1 || s.some((i) => i.text === `
`)) return null;
      n += s.map((i) => i.text).join("");
    }
  }
  return n.length > 0 ? n : null;
}
function Su(t) {
  for (const n of t.paragraphs)
    for (const e of n.runs)
      if (e.text != null && e.text.length > 0) return e.properties;
}
function Cu(t, n, e) {
  const o = Math.min(Math.max(n * 0.04, 4), 18), s = o, i = Math.max(s, n - o);
  if (t === "textArchDown") {
    const c = e * 0.36;
    return `M${s},${c} Q${n / 2},${e * 0.9} ${i},${c}`;
  }
  const r = e * 0.66;
  return `M${s},${r} Q${n / 2},${e * 0.08} ${i},${r}`;
}
function Fu(t, n) {
  if (!t.textBody) return null;
  const e = vu(t.textBody);
  if (!e) return null;
  const o = Au(t.textBody);
  if (!o) return null;
  const s = Su(t.textBody), i = (s == null ? void 0 : s.numAttr("sz")) !== void 0 ? s.numAttr("sz") / 100 : 12, r = gn(
    [
      s == null ? void 0 : s.child("latin").attr("typeface"),
      s == null ? void 0 : s.child("ea").attr("typeface"),
      s == null ? void 0 : s.child("cs").attr("typeface")
    ],
    n,
    [s == null ? void 0 : s.attr("lang"), s == null ? void 0 : s.attr("altLang")]
  ), c = ue(s == null ? void 0 : s.attr("b")) ? "bold" : void 0, l = s == null ? void 0 : s.child("solidFill"), a = l != null && l.exists() ? he(l, n) : "#000000", d = "http://www.w3.org/2000/svg", h = document.createElementNS(d, "svg");
  h.setAttribute("viewBox", `0 0 ${t.size.w} ${t.size.h}`), h.setAttribute("width", String(t.size.w)), h.setAttribute("height", String(t.size.h)), h.style.position = "absolute", h.style.left = "0", h.style.top = "0", h.style.overflow = "visible";
  const u = document.createElementNS(d, "defs"), x = document.createElementNS(d, "path"), p = `text-warp-${++Le}`;
  x.setAttribute("id", p), x.setAttribute("d", Cu(e, t.size.w, t.size.h)), x.setAttribute("fill", "none"), u.appendChild(x), h.appendChild(u);
  const $ = document.createElementNS(d, "text");
  $.setAttribute("font-size", `${i}pt`), r.length > 0 && $.setAttribute("font-family", mn(r)), c && $.setAttribute("font-weight", c), $.setAttribute("fill", a), $.setAttribute("dominant-baseline", "middle");
  const g = document.createElementNS(d, "textPath");
  return g.setAttribute("href", `#${p}`), g.setAttribute("startOffset", "50%"), g.setAttribute("text-anchor", "middle"), g.setAttribute("xml:space", "preserve"), g.textContent = o, $.appendChild(g), h.appendChild($), h;
}
function ku(t, n) {
  const e = t.child("blip"), o = e.attr("embed") ?? e.attr("r:embed"), s = e.attr("link") ?? e.attr("r:link"), i = o ?? s;
  if (!i) return null;
  const r = n.slide.rels.get(i);
  if (!r) return null;
  if (Ie(r.targetMode))
    return An(r.target) ? r.target : null;
  const c = Ln(r.target, n.presentation.media);
  if (!c) return null;
  const { mediaPath: l, data: a } = c;
  return tn(l, a, n.mediaUrlCache);
}
async function wu(t, n) {
  const e = t.child("blip"), o = e.attr("embed") ?? e.attr("r:embed"), s = e.attr("link") ?? e.attr("r:link"), i = o ?? s;
  if (!i) return null;
  const r = n.slide.rels.get(i);
  if (!r) return null;
  if (Ie(r.targetMode))
    return An(r.target) ? r.target : null;
  const c = await As(
    r.target,
    n.presentation.media,
    n.presentation.mediaResolver
  );
  if (!c) return null;
  const { mediaPath: l, data: a } = c;
  return tn(l, a, n.mediaUrlCache);
}
function oo(t, n) {
  return (t.numAttr(n) ?? 0) / 1e3;
}
function Eu(t, n) {
  const e = t.child("stretch");
  if (!e.exists())
    return { x: 0, y: 0, w: n.w, h: n.h, preserveAspectRatio: "xMidYMid slice" };
  const o = e.child("fillRect"), s = o.exists() ? oo(o, "l") : 0, i = o.exists() ? oo(o, "t") : 0, r = o.exists() ? oo(o, "r") : 0, c = o.exists() ? oo(o, "b") : 0;
  return {
    x: n.w * (s / 100),
    y: n.h * (i / 100),
    w: n.w * ((100 - s - r) / 100),
    h: n.h * ((100 - i - c) / 100),
    preserveAspectRatio: "none"
  };
}
function pr(t, n, e, o, s, i, r, c) {
  const l = `shape-clip-${++Le}`, a = document.createElementNS(t, "clipPath");
  a.setAttribute("id", l);
  const d = document.createElementNS(t, "path");
  d.setAttribute("d", s), a.appendChild(d), e.appendChild(a);
  const h = document.createElementNS(t, "image"), u = Eu(o, i);
  h.setAttributeNS("http://www.w3.org/1999/xlink", "href", r), h.setAttribute("x", String(u.x)), h.setAttribute("y", String(u.y)), h.setAttribute("width", String(u.w)), h.setAttribute("height", String(u.h)), h.setAttribute("clip-path", `url(#${l})`), h.setAttribute("preserveAspectRatio", u.preserveAspectRatio), e.parentNode || n.appendChild(e), (c == null ? void 0 : c.parentNode) === n ? n.insertBefore(h, c) : n.appendChild(h);
}
let Pu = 0, Le = 0;
function xr(t, n, e, o, s) {
  const i = `shape-shadow-${++Le}`, r = document.createElementNS(t, "filter"), c = Math.max(Math.abs(s.dx), Math.abs(s.dy)) + s.blur * 4 + 4;
  r.setAttribute("id", i), r.setAttribute("filterUnits", "userSpaceOnUse"), r.setAttribute("x", String(-c)), r.setAttribute("y", String(-c)), r.setAttribute("width", String(o.w + c * 2)), r.setAttribute("height", String(o.h + c * 2));
  const l = document.createElementNS(t, "feDropShadow");
  l.setAttribute("dx", s.dx.toFixed(1)), l.setAttribute("dy", s.dy.toFixed(1)), l.setAttribute("stdDeviation", Math.max(0, s.blur / 2).toFixed(2)), l.setAttribute(
    "flood-color",
    `rgb(${s.color.r},${s.color.g},${s.color.b})`
  ), l.setAttribute("flood-opacity", s.opacity.toFixed(4)), r.appendChild(l), n.appendChild(r), !n.parentNode && e.ownerSVGElement && e.ownerSVGElement.insertBefore(n, e.ownerSVGElement.firstChild), e.setAttribute("filter", `url(#${i})`);
}
function Bu(t, n, e, o, s) {
  const i = `shape-inner-shadow-${++Le}`, r = document.createElementNS(t, "filter"), c = Math.max(Math.abs(s.dx), Math.abs(s.dy)) + s.blur * 4 + 4;
  r.setAttribute("id", i), r.setAttribute("filterUnits", "userSpaceOnUse"), r.setAttribute("x", String(-c)), r.setAttribute("y", String(-c)), r.setAttribute("width", String(o.w + c * 2)), r.setAttribute("height", String(o.h + c * 2));
  const l = document.createElementNS(t, "feOffset");
  l.setAttribute("in", "SourceAlpha"), l.setAttribute("dx", s.dx.toFixed(1)), l.setAttribute("dy", s.dy.toFixed(1)), l.setAttribute("result", "innerOffset"), r.appendChild(l);
  const a = document.createElementNS(t, "feGaussianBlur");
  a.setAttribute("in", "innerOffset"), a.setAttribute("stdDeviation", Math.max(0, s.blur / 2).toFixed(2)), a.setAttribute("result", "innerBlur"), r.appendChild(a);
  const d = document.createElementNS(t, "feComposite");
  d.setAttribute("in", "innerBlur"), d.setAttribute("in2", "SourceAlpha"), d.setAttribute("operator", "in"), d.setAttribute("result", "innerMask"), r.appendChild(d);
  const h = document.createElementNS(t, "feFlood");
  h.setAttribute("flood-color", `rgb(${s.color.r},${s.color.g},${s.color.b})`), h.setAttribute("flood-opacity", s.opacity.toFixed(4)), h.setAttribute("result", "innerColor"), r.appendChild(h);
  const u = document.createElementNS(t, "feComposite");
  u.setAttribute("in", "innerColor"), u.setAttribute("in2", "innerMask"), u.setAttribute("operator", "in"), u.setAttribute("result", "innerShadow"), r.appendChild(u);
  const x = document.createElementNS(t, "feMerge"), p = document.createElementNS(t, "feMergeNode");
  p.setAttribute("in", "SourceGraphic");
  const $ = document.createElementNS(t, "feMergeNode");
  $.setAttribute("in", "innerShadow"), x.appendChild(p), x.appendChild($), r.appendChild(x), n.appendChild(r), !n.parentNode && e.ownerSVGElement && e.ownerSVGElement.insertBefore(n, e.ownerSVGElement.firstChild), e.setAttribute("filter", `url(#${i})`);
}
function Ru(t, n, e, o, s) {
  const i = `shape-soft-edge-${++Le}`, r = document.createElementNS(t, "filter"), c = Math.max(s * 4 + 4, o.w, o.h);
  r.setAttribute("id", i), r.setAttribute("filterUnits", "userSpaceOnUse"), r.setAttribute("x", String(-c)), r.setAttribute("y", String(-c)), r.setAttribute("width", String(o.w + c * 2)), r.setAttribute("height", String(o.h + c * 2));
  const l = document.createElementNS(t, "feGaussianBlur");
  l.setAttribute("in", "SourceGraphic"), l.setAttribute("stdDeviation", Math.max(0, s / 2).toFixed(2)), r.appendChild(l), n.appendChild(r), !n.parentNode && e.ownerSVGElement && e.ownerSVGElement.insertBefore(n, e.ownerSVGElement.firstChild);
  const a = e.parentNode;
  if (!a) return;
  const d = document.createElementNS(t, "g");
  d.setAttribute("filter", `url(#${i})`), a.insertBefore(d, e), d.appendChild(e);
}
function yr(t, n) {
  const e = Math.max(n, 1);
  switch (t) {
    case "dot":
    case "sysDot":
      return `${e},${e * 2}`;
    case "dash":
    case "sysDash":
      return `${e * 4},${e * 2}`;
    case "lgDash":
      return `${e * 8},${e * 3}`;
    case "dashDot":
    case "sysDashDot":
      return `${e * 4},${e * 2},${e},${e * 2}`;
    case "lgDashDot":
      return `${e * 8},${e * 3},${e},${e * 3}`;
    case "lgDashDotDot":
    case "sysDashDotDot":
      return `${e * 8},${e * 3},${e},${e * 2},${e},${e * 2}`;
    default:
      return null;
  }
}
function Iu(t, n, e, o) {
  if (!e.exists()) return null;
  const s = e.attr("prst") ?? "solid";
  if (s === "solid" || s === "solidDmnd") return null;
  const i = 8, r = 1, c = e.child("fgClr"), l = e.child("bgClr"), a = c.exists() ? he(c, o) : "#000000", d = l.exists() ? he(l, o) : "#ffffff", h = `shape-pattern-${++Le}`, u = document.createElementNS(t, "pattern");
  u.setAttribute("id", h), u.setAttribute("patternUnits", "userSpaceOnUse"), u.setAttribute("width", String(i)), u.setAttribute("height", String(i));
  const x = document.createElementNS(t, "rect");
  x.setAttribute("width", String(i)), x.setAttribute("height", String(i)), x.setAttribute("fill", d), u.appendChild(x);
  let p = !1;
  const $ = (M, L, v, k, A) => {
    const S = document.createElementNS(t, "line");
    S.setAttribute("x1", String(M)), S.setAttribute("y1", String(L)), S.setAttribute("x2", String(v)), S.setAttribute("y2", String(k)), S.setAttribute("stroke", a), S.setAttribute("stroke-width", String(r)), A && S.setAttribute("stroke-dasharray", A), u.appendChild(S), p = !0;
  }, g = (M, L, v) => {
    const k = document.createElementNS(t, "circle");
    k.setAttribute("cx", String(M)), k.setAttribute("cy", String(L)), k.setAttribute("r", String(v)), k.setAttribute("fill", a), u.appendChild(k), p = !0;
  }, f = r / 2, y = r, m = `${r * 3},${r * 2}`;
  let b = 0;
  switch (s) {
    case "pct5":
    case "pct10":
    case "pct20":
    case "pct25":
      g(i / 2, i / 2, y * 0.75);
      break;
    case "pct30":
    case "pct40":
    case "pct50":
    case "dotGrid":
    case "dotDmnd":
      g(i / 2, i / 2, y);
      break;
    case "pct60":
    case "pct70":
    case "pct75":
    case "pct80":
    case "pct90":
    case "sphere":
    case "shingle":
    case "plaid":
    case "divot":
    case "zigZag":
      g(i / 2, i / 2, y * 1.5);
      break;
    case "horz":
    case "ltHorz":
    case "narHorz":
    case "dkHorz":
      $(0, f, i, f);
      break;
    case "vert":
    case "ltVert":
    case "narVert":
    case "dkVert":
      $(f, 0, f, i);
      break;
    case "dnDiag":
    case "ltDnDiag":
    case "narDnDiag":
    case "dkDnDiag":
    case "wdDnDiag":
      $(0, i, i, 0);
      break;
    case "upDiag":
    case "ltUpDiag":
    case "narUpDiag":
    case "dkUpDiag":
    case "wdUpDiag":
      $(0, 0, i, i);
      break;
    case "smGrid":
    case "lgGrid":
    case "cross":
      b = -3, $(0, f, i, f), $(f, 0, f, i);
      break;
    case "smCheck":
    case "lgCheck":
    case "diagCross":
    case "openDmnd":
    case "trellis":
    case "weave":
      $(0, i, i, 0), $(0, 0, i, i);
      break;
    case "dashHorz":
      $(0, f, i, f, m);
      break;
    case "dashVert":
      $(f, 0, f, i, m);
      break;
    case "dashDnDiag":
      $(0, i, i, 0, m);
      break;
    case "dashUpDiag":
      $(0, 0, i, i, m);
      break;
    default:
      return null;
  }
  return p ? (b !== 0 && u.setAttribute("y", String(b)), n.appendChild(u), h) : null;
}
function gr(t) {
  if (!t) return null;
  const n = t.trim();
  if (n.startsWith("#"))
    return Et(n);
  const e = n.match(/rgba?\(([^)]+)\)/i);
  if (!e) return null;
  const o = e[1].split(",").map((s) => Number.parseFloat(s.trim()));
  return o.length < 3 || o.some((s) => Number.isNaN(s)) ? null : {
    r: Math.max(0, Math.min(255, o[0])),
    g: Math.max(0, Math.min(255, o[1])),
    b: Math.max(0, Math.min(255, o[2]))
  };
}
function un(t, n, e) {
  const o = Math.max(0, Math.min(1, e));
  return qt(
    t.r + (n.r - t.r) * o,
    t.g + (n.g - t.g) * o,
    t.b + (n.b - t.b) * o
  );
}
function so(t) {
  const n = t * Math.PI / 180, e = Math.round(50 + 50 * Math.cos(n)), o = Math.round(50 + 50 * Math.sin(n)), s = Math.round(50 - 50 * Math.cos(n)), i = Math.round(50 - 50 * Math.sin(n));
  return {
    x1: `${s}%`,
    y1: `${i}%`,
    x2: `${e}%`,
    y2: `${o}%`
  };
}
function mr(t) {
  switch (t) {
    case "sm":
      return 0.5;
    case "lg":
      return 1.5;
    default:
      return 1;
  }
}
function Is(t, n) {
  const e = mr(t.w), o = mr(t.len), s = Math.max(n * 3, 10), i = Math.max(n * 2.5, 7.5);
  return {
    markerW: s * o,
    markerH: i * e
  };
}
function Tu(t, n) {
  return t.type !== "triangle" && t.type !== "arrow" && t.type !== "stealth" ? 0 : Is(t, n).markerW;
}
function zu(t, n) {
  return t.type !== "triangle" && t.type !== "arrow" && t.type !== "stealth" ? 0 : Is(t, n).markerW;
}
function br(t) {
  if (!t) return !0;
  const n = t.trim().toLowerCase();
  if (n === "transparent") return !0;
  const e = n.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)$/);
  return e ? Number(e[1]) <= 1e-3 : !1;
}
function Mr(t, n, e) {
  var r, c;
  if (t.length === 0) return e;
  const o = n === "start" ? 0 : t.length - 1, s = n === "start" ? 1 : -1, i = (r = t[o]) == null ? void 0 : r.color;
  if (i && !br(i)) return i;
  for (let l = o; l >= 0 && l < t.length; l += s) {
    const a = (c = t[l]) == null ? void 0 : c.color;
    if (a && !br(a)) return a;
  }
  return i || e;
}
function ne(t, n, e) {
  return {
    x: t.x + (n.x - t.x) * e,
    y: t.y + (n.y - t.y) * e
  };
}
function Du(t, n, e, o, s) {
  const i = ne(t, n, s), r = ne(n, e, s), c = ne(e, o, s), l = ne(i, r, s), a = ne(r, c, s);
  return ne(l, a, s);
}
function Mo(t, n, e, o, s) {
  let r = 0, c = t;
  for (let l = 1; l <= 24; l++) {
    const a = Du(t, n, e, o, s * l / 24);
    r += Math.hypot(a.x - c.x, a.y - c.y), c = a;
  }
  return r;
}
function Gc(t) {
  return su(t);
}
function Hc(t, n) {
  const e = [`M${ie(t.x)},${ie(t.y)}`];
  for (const o of n)
    e.push(
      [
        `C${ie(o.c1.x)},${ie(o.c1.y)}`,
        `${ie(o.c2.x)},${ie(o.c2.y)}`,
        `${ie(o.end.x)},${ie(o.end.y)}`
      ].join(" ")
    );
  return e.join(" ");
}
function Wc(t) {
  return iu(t);
}
function Ou(t, n, e, o) {
  const s = t * e + n * o, i = Math.hypot(t, n) * Math.hypot(e, o), r = Math.acos(Math.min(1, Math.max(-1, i > 0 ? s / i : 1)));
  return t * o - n * e < 0 ? -r : r;
}
function Uc(t, n) {
  if (n.xAxisRotation !== 0) return null;
  let e = Math.abs(n.rx), o = Math.abs(n.ry);
  if (!(e > 0) || !(o > 0)) return null;
  const s = (t.x - n.end.x) / 2, i = (t.y - n.end.y) / 2, r = s * s / (e * e) + i * i / (o * o);
  if (r > 1) {
    const v = Math.sqrt(r);
    e *= v, o *= v;
  }
  const c = e * e, l = o * o, a = s * s, d = i * i, h = c * d + l * a;
  if (!(h > 0)) return null;
  const x = (n.largeArc === n.sweep ? -1 : 1) * Math.sqrt(Math.max(0, (c * l - c * d - l * a) / h)), p = x * e * i / o, $ = -x * o * s / e, g = {
    x: (t.x + n.end.x) / 2 + p,
    y: (t.y + n.end.y) / 2 + $
  }, f = (s - p) / e, y = (i - $) / o, m = (-s - p) / e, b = (-i - $) / o, M = Math.atan2(y, f);
  let L = Ou(f, y, m, b);
  return n.sweep === 0 && L > 0 && (L -= Math.PI * 2), n.sweep === 1 && L < 0 && (L += Math.PI * 2), {
    center: g,
    rx: e,
    ry: o,
    startAngle: M,
    deltaAngle: L,
    xAxisRotation: n.xAxisRotation,
    sweep: n.sweep
  };
}
function Lo(t, n) {
  const e = t.startAngle + t.deltaAngle * n;
  return {
    x: t.center.x + t.rx * Math.cos(e),
    y: t.center.y + t.ry * Math.sin(e)
  };
}
function vo(t, n) {
  let o = 0, s = Lo(t, 0);
  for (let i = 1; i <= 24; i++) {
    const r = Lo(t, n * i / 24);
    o += Math.hypot(r.x - s.x, r.y - s.y), s = r;
  }
  return o;
}
function Vc(t, n, e, o) {
  const s = Math.abs(n.deltaAngle * e) > Math.PI ? 1 : 0;
  return [
    `M${ie(t.x)},${ie(t.y)}`,
    `A${ie(n.rx)},${ie(n.ry)}`,
    ie(n.xAxisRotation),
    `${s},${n.sweep}`,
    `${ie(o.x)},${ie(o.y)}`
  ].join(" ");
}
function Nu(t, n) {
  const e = Gc(t);
  if (!e) return t;
  const o = e.start, s = e.segments[0], i = s.c1, r = s.c2, c = s.end, l = Mo(o, i, r, c, 1);
  if (!(l > 0)) return t;
  const a = Math.min(n, l * 0.95);
  let d = 0, h = 1;
  for (let b = 0; b < 24; b++) {
    const M = (d + h) / 2;
    Mo(o, i, r, c, M) < a ? d = M : h = M;
  }
  const u = h, x = ne(o, i, u), p = ne(i, r, u), $ = ne(r, c, u), g = ne(x, p, u), f = ne(p, $, u), y = ne(g, f, u), m = e.segments.slice();
  return m[0] = { c1: f, c2: $, end: c }, Hc(y, m);
}
function Zu(t, n) {
  const e = Wc(t);
  if (!e) return null;
  const o = Uc(e.start, e.arc);
  if (!o) return null;
  const s = vo(o, 1);
  if (!(s > 0)) return null;
  const i = Math.min(n, s * 0.95);
  let r = 0, c = 1;
  for (let a = 0; a < 24; a++) {
    const d = (r + c) / 2;
    vo(o, d) < i ? r = d : c = d;
  }
  const l = c;
  return Vc(Lo(o, l), o, 1 - l, e.arc.end);
}
function Gu(t, n) {
  const e = Gc(t);
  if (!e) return null;
  const o = e.segments.length - 1, s = o === 0 ? e.start : e.segments[o - 1].end, i = e.segments[o], r = Mo(s, i.c1, i.c2, i.end, 1);
  if (!(r > 0)) return null;
  const c = r - Math.min(n, r * 0.95);
  let l = 0, a = 1;
  for (let f = 0; f < 24; f++) {
    const y = (l + a) / 2;
    Mo(s, i.c1, i.c2, i.end, y) < c ? l = y : a = y;
  }
  const d = a, h = ne(s, i.c1, d), u = ne(i.c1, i.c2, d), x = ne(i.c2, i.end, d), p = ne(h, u, d), $ = ne(p, ne(u, x, d), d), g = e.segments.slice();
  return g[o] = { c1: h, c2: p, end: $ }, Hc(e.start, g);
}
function Hu(t, n) {
  const e = Wc(t);
  if (!e) return null;
  const o = Uc(e.start, e.arc);
  if (!o) return null;
  const s = vo(o, 1);
  if (!(s > 0)) return null;
  const i = s - Math.min(n, s * 0.95);
  let r = 0, c = 1;
  for (let a = 0; a < 24; a++) {
    const d = (r + c) / 2;
    vo(o, d) < i ? r = d : c = d;
  }
  const l = c;
  return Vc(e.start, o, l, Lo(o, l));
}
function Wu(t, n) {
  if (!(n > 0)) return t;
  const e = Dc(t);
  if (!e)
    return Vu(t, n) ?? Zu(t, n) ?? Nu(t, n);
  const o = e.start.x, s = e.start.y, i = e.end.x, r = e.end.y, c = i - o, l = r - s, a = Math.hypot(c, l);
  if (!(a > 0)) return t;
  const d = Math.min(n, a * 0.95), h = o + c / a * d, u = s + l / a * d;
  return `M${h},${u} L${i},${r}`;
}
function Uu(t, n) {
  if (!(n > 0)) return t;
  const e = Dc(t);
  if (!e)
    return _u(t, n) ?? Gu(t, n) ?? Hu(t, n) ?? t;
  const o = e.start.x, s = e.start.y, i = e.end.x, r = e.end.y, c = i - o, l = r - s, a = Math.hypot(c, l);
  if (!(a > 0)) return t;
  const d = Math.min(n, a * 0.95), h = i - c / a * d, u = r - l / a * d;
  return `M${o},${s} L${h},${u}`;
}
function Ts(t) {
  return ou(t);
}
function zs(t) {
  return t.map((n, e) => `${e === 0 ? "M" : "L"}${ie(n.x)},${ie(n.y)}`).join(" ");
}
function io(t, n) {
  return Math.hypot(n.x - t.x, n.y - t.y);
}
function Vu(t, n) {
  const e = Ts(t);
  if (!e || e.length < 3) return null;
  const o = e[0], s = e[1], i = s.x - o.x, r = s.y - o.y, c = Math.hypot(i, r);
  if (!(c > n)) return null;
  const l = {
    x: o.x + i / c * n,
    y: o.y + r / c * n
  };
  return zs([l, ...e.slice(1)]);
}
function _u(t, n) {
  const e = Ts(t);
  if (!e || e.length < 3) return null;
  const o = e[e.length - 1], s = e[e.length - 2], i = o.x - s.x, r = o.y - s.y, c = Math.hypot(i, r);
  if (!(c > n)) return null;
  const l = {
    x: o.x - i / c * n,
    y: o.y - r / c * n
  };
  return zs([...e.slice(0, -1), l]);
}
const Xu = 2, Yu = 4;
function qu(t, n, e, o) {
  if (!e && !o) return t;
  const s = Ts(t);
  if (!s || s.length < 3) return t;
  const i = Math.min(
    Math.max(Xu, n * 1.5),
    Yu
  );
  let r = s.slice();
  if (e && r.length >= 3) {
    const c = io(r[0], r[1]), l = io(r[1], r[2]);
    c <= i && l > i && (r = r.slice(1));
  }
  if (o && r.length >= 3) {
    const c = r.length - 1, l = io(r[c - 1], r[c]), a = io(r[c - 2], r[c - 1]);
    l <= i && a > i && (r = r.slice(0, -1));
  }
  return r.length === s.length ? t : zs(r);
}
function Lr(t, n, e, o, s) {
  const i = document.createElementNS(t, "marker"), r = `arrow-marker-${++Pu}`;
  i.setAttribute("id", r), i.setAttribute("markerUnits", "userSpaceOnUse"), i.setAttribute("orient", "auto");
  const { markerW: c, markerH: l } = Is(n, o);
  switch (n.type) {
    case "triangle":
    case "arrow": {
      i.setAttribute("viewBox", "0 0 10 10"), i.setAttribute("refX", s ? "10" : "0"), i.setAttribute("refY", "5"), i.setAttribute("markerWidth", String(c)), i.setAttribute("markerHeight", String(l));
      const a = document.createElementNS(t, "polygon");
      s ? a.setAttribute("points", "0,5 10,0 10,10") : a.setAttribute("points", "10,5 0,0 0,10"), a.setAttribute("fill", e), i.appendChild(a);
      break;
    }
    case "stealth": {
      i.setAttribute("viewBox", "0 0 10 10"), i.setAttribute("refX", s ? "10" : "0"), i.setAttribute("refY", "5"), i.setAttribute("markerWidth", String(c)), i.setAttribute("markerHeight", String(l));
      const a = document.createElementNS(t, "path");
      s ? a.setAttribute("d", "M0,5 L10,0 L7,5 L10,10 Z") : a.setAttribute("d", "M10,5 L0,0 L3,5 L0,10 Z"), a.setAttribute("fill", e), i.appendChild(a);
      break;
    }
    case "diamond": {
      i.setAttribute("viewBox", "0 0 10 10"), i.setAttribute("refX", "5"), i.setAttribute("refY", "5"), i.setAttribute("markerWidth", String(c)), i.setAttribute("markerHeight", String(l));
      const a = document.createElementNS(t, "polygon");
      a.setAttribute("points", "5,0 10,5 5,10 0,5"), a.setAttribute("fill", e), i.appendChild(a);
      break;
    }
    case "oval": {
      i.setAttribute("viewBox", "0 0 10 10"), i.setAttribute("refX", "5"), i.setAttribute("refY", "5"), i.setAttribute("markerWidth", String(c)), i.setAttribute("markerHeight", String(l));
      const a = document.createElementNS(t, "circle");
      a.setAttribute("cx", "5"), a.setAttribute("cy", "5"), a.setAttribute("r", "4"), a.setAttribute("fill", e), i.appendChild(a);
      break;
    }
    default:
      return null;
  }
  return i._markerId = r, i;
}
function Qu(t) {
  const n = {}, e = t.child("headEnd");
  if (e.exists()) {
    const s = e.attr("type");
    s && s !== "none" && (n.headEnd = { type: s, w: e.attr("w"), len: e.attr("len") });
  }
  const o = t.child("tailEnd");
  if (o.exists()) {
    const s = o.attr("type");
    s && s !== "none" && (n.tailEnd = { type: s, w: o.attr("w"), len: o.attr("len") });
  }
  return n;
}
const vr = /* @__PURE__ */ new WeakMap();
function Ku(t) {
  return !t || t.size === 0 ? "" : Array.from(t.entries()).sort(([n], [e]) => n.localeCompare(e)).map(([n, e]) => `${n}:${e}`).join("|");
}
function Ju(t, n, e, o) {
  var l;
  const s = Ku(t.adjustments), i = vr.get(t);
  if (i && i.effectivePreset === n && i.w === e && i.h === o && i.adjustmentKey === s)
    return {
      pathD: i.pathD,
      multiPaths: i.multiPaths
    };
  const r = tu(n, e, o, t.adjustments), c = r ? ((l = r[0]) == null ? void 0 : l.d) ?? "" : Rs(n, e, o, t.adjustments);
  return vr.set(t, {
    effectivePreset: n,
    w: e,
    h: o,
    adjustmentKey: s,
    pathD: c,
    multiPaths: r
  }), { pathD: c, multiPaths: r };
}
function ju(t, n) {
  var D, O, ot, J, W, it, lt, Pt, Rt, Wt, Nt, ft, Zt, Dt, Ot, Ut, Y, Bt, Ft, Xt;
  const e = document.createElement("div");
  e.style.position = "absolute", e.style.left = `${t.position.x}px`, e.style.top = `${t.position.y}px`, e.style.width = `${t.size.w}px`;
  const o = ((D = t.presetGeometry) == null ? void 0 : D.toLowerCase()) ?? "", s = /* @__PURE__ */ new Set(["arc"]), i = !!o && (o === "line" || o === "lineinv" || o.startsWith("straightconnector") || o.startsWith("bentconnector") || o.startsWith("curvedconnector") || s.has(o)), r = t.source.localName === "cxnSp", c = t.size.w > 0 && t.size.h < 1 || t.size.w < 1 && t.size.h > 0, l = i || r || c, a = l && t.size.h < 1 ? 1 : t.size.h, d = l && t.size.w < 1 ? 1 : t.size.w;
  e.style.height = `${a}px`, t.size.w === 0 && (e.style.width = `${d}px`), e.style.overflow = "visible";
  const h = [];
  t.rotation !== 0 && h.push(`rotate(${t.rotation}deg)`), t.flipH && !l && h.push("scaleX(-1)"), t.flipV && !l && h.push("scaleY(-1)"), h.length > 0 && (e.style.transform = h.join(" "));
  const u = t.size.w, x = t.size.h, p = u, $ = x, g = t.source.child("style"), f = g.exists() ? g.child("lnRef") : void 0, y = g.exists() ? g.child("fillRef") : void 0;
  let m = "", b = null;
  if (t.presetGeometry) {
    let H = t.presetGeometry;
    r && H === "line" && (H = "straightConnector1");
    const N = Ju(t, H, p, $);
    m = N.pathD, b = N.multiPaths;
  } else if (t.customGeometry) {
    const H = t.source.child("spPr").child("xfrm").child("ext"), N = {
      w: H.numAttr("cx") ?? 0,
      h: H.numAttr("cy") ?? 0
    };
    m = Pc(t.customGeometry, p, $, N);
  }
  !m && l && ((O = t.line) != null && O.exists() || f != null && f.exists() && (f.numAttr("idx") ?? 0) > 0 && (((ot = n.theme.lineStyles) == null ? void 0 : ot.length) ?? 0) >= (f.numAttr("idx") ?? 0)) && (m = Rs(
    r ? "straightConnector1" : "line",
    p,
    $,
    void 0
  )), m && l && (t.flipH || t.flipV) && (m = nu(m, p, $, t.flipH, t.flipV));
  const M = t.source.child("spPr");
  let L = "", v = t.fill ? Mc(M, n) : null;
  if (t.fill && t.fill.exists()) {
    if (t.fill.localName === "solidFill") {
      const H = t.fill.child("srgbClr").exists() ? t.fill.child("srgbClr") : t.fill.child("schemeClr").exists() ? t.fill.child("schemeClr") : t.fill.child("scrgbClr").exists() ? t.fill.child("scrgbClr") : t.fill.child("sysClr").exists() ? t.fill.child("sysClr") : void 0;
      H != null && H.exists() && (L = he(H, n));
    }
    L || (L = Ge(M, n));
  }
  if (!L) {
    const H = M.child("solidFill");
    if (H.exists()) {
      const N = H.child("srgbClr").exists() ? H.child("srgbClr") : H.child("schemeClr").exists() ? H.child("schemeClr") : H.child("scrgbClr").exists() ? H.child("scrgbClr") : H.child("sysClr").exists() ? H.child("sysClr") : void 0;
      N != null && N.exists() && (L = he(N, n));
    }
  }
  if (!L && y && y.exists() && (y.numAttr("idx") ?? 0) > 0) {
    const H = ks(y, n);
    L = H.fillCss, v || (v = H.gradientFillData);
  }
  l && (L = "", v = null);
  let k = "none", A = 0, S = "", w = "solid", F = "", C = "", E = null;
  const P = t.line && t.line.child("noFill").exists(), B = t.line && !P, R = !B && !P && (f != null && f.exists()) && (f.numAttr("idx") ?? 0) > 0 && (((J = n.theme.lineStyles) == null ? void 0 : J.length) ?? 0) >= (f.numAttr("idx") ?? 0) ? n.theme.lineStyles[(f.numAttr("idx") ?? 1) - 1] : void 0;
  let I = B ? t.line : R;
  if (P && (I = void 0), I != null && I.exists()) {
    if (E = Qd(I, n), !E) {
      const N = Zn(I, n, f);
      k = N.color, A = N.width, S = N.dash, w = N.dashKind;
    }
    const H = I.attr("cap");
    H === "rnd" ? F = "round" : H === "sq" ? F = "square" : H === "flat" && (F = "butt"), I.child("round").exists() ? C = "round" : I.child("bevel").exists() ? C = "bevel" : I.child("miter").exists() && (C = "miter");
  }
  P && (k = "none", A = 0, E = null);
  const Z = ((W = t.presetGeometry) == null ? void 0 : W.toLowerCase()) === "circulararrow";
  if (Z && (k = "none", A = 0, E = null, !L)) {
    const H = M.child("solidFill");
    if (H.exists()) {
      const N = H.child("srgbClr").exists() ? H.child("srgbClr") : H.child("schemeClr").exists() ? H.child("schemeClr") : H.child("scrgbClr").exists() ? H.child("scrgbClr") : H.child("sysClr").exists() ? H.child("sysClr") : void 0;
      N != null && N.exists() && (L = he(N, n));
    }
  }
  let U = null, q = null, Q = null, G = null;
  if (m) {
    const H = "http://www.w3.org/2000/svg", N = document.createElementNS(H, "svg"), et = l ? d : u, nt = l ? a : x;
    N.setAttribute("viewBox", `0 0 ${et} ${nt}`), N.setAttribute("width", String(et)), N.setAttribute("height", String(nt)), N.style.position = "absolute", N.style.left = "0", N.style.top = "0", N.style.overflow = "visible";
    const at = M.child("blipFill"), bt = at.exists() ? ku(at, n) : null;
    if (bt) {
      const Mt = document.createElementNS(H, "defs");
      pr(H, N, Mt, at, m, { w: et, h: nt }, bt);
      const tt = b && ((it = b[0]) == null ? void 0 : it.stroke) === !1;
      if (!Z && !tt && !E && A > 0 && k !== "none" && k !== "transparent") {
        const ht = document.createElementNS(H, "path");
        ht.setAttribute("d", m), ht.setAttribute("fill", "none"), ht.setAttribute("stroke", k), ht.setAttribute("stroke-width", String(A)), F && ht.setAttribute("stroke-linecap", F), C && ht.setAttribute("stroke-linejoin", C);
        const ut = yr(w, A);
        ut ? ht.setAttribute("stroke-dasharray", ut) : S === "dashed" ? ht.setAttribute("stroke-dasharray", `${A * 4},${A * 2}`) : S === "dotted" && ht.setAttribute("stroke-dasharray", `${A},${A * 2}`), N.appendChild(ht);
      }
      e.appendChild(N);
    } else {
      const Mt = document.createElementNS(H, "defs"), tt = document.createElementNS(H, "path");
      tt.setAttribute("d", m), U = H, q = Mt, Q = tt, G = { w: et, h: nt };
      const ht = (lt = t.presetGeometry) == null ? void 0 : lt.toLowerCase();
      if (ht === "curveduparrow" || ht === "curveddownarrow" ? (tt.setAttribute("fill-rule", "evenodd"), tt.setAttribute("stroke-linejoin", "round")) : ht === "funnel" && tt.setAttribute("fill-rule", "evenodd"), L) {
        const rt = M.child("pattFill"), $t = rt.exists() ? Iu(H, Mt, rt, n) : null;
        if ($t)
          tt.setAttribute("fill", `url(#${$t})`);
        else if (v && v.stops.length > 0) {
          const vt = `grad-fill-${++Le}`;
          if (v.type === "radial" && v.pathType === "rect") {
            const j = v.cx ?? 0.5, At = v.cy ?? 0.5, It = (mt, _t) => {
              const fe = Dn(v, { axis: _t }), $e = [];
              for (const le of fe) {
                const Jt = le.position / 100, Gt = mt - Jt * mt, ae = mt + Jt * (1 - mt);
                $e.push({ offset: Gt, color: le.color }), $e.push({ offset: ae, color: le.color });
              }
              return $e.sort((le, Jt) => le.offset - Jt.offset), $e;
            }, ct = `${vt}-h`, xt = document.createElementNS(H, "linearGradient");
            xt.setAttribute("id", ct), xt.setAttribute(
              "color-interpolation",
              v.colorInterpolation ?? "linearRGB"
            ), xt.setAttribute("x1", "0%"), xt.setAttribute("y1", "0%"), xt.setAttribute("x2", "100%"), xt.setAttribute("y2", "0%");
            for (const mt of It(j, "x")) {
              const _t = document.createElementNS(H, "stop");
              _t.setAttribute("offset", `${(mt.offset * 100).toFixed(2)}%`), _t.setAttribute("stop-color", mt.color), xt.appendChild(_t);
            }
            Mt.appendChild(xt);
            const St = `${vt}-v`, dt = document.createElementNS(H, "linearGradient");
            dt.setAttribute("id", St), dt.setAttribute(
              "color-interpolation",
              v.colorInterpolation ?? "linearRGB"
            ), dt.setAttribute("x1", "0%"), dt.setAttribute("y1", "0%"), dt.setAttribute("x2", "0%"), dt.setAttribute("y2", "100%");
            for (const mt of It(At, "y")) {
              const _t = document.createElementNS(H, "stop");
              _t.setAttribute("offset", `${(mt.offset * 100).toFixed(2)}%`), _t.setAttribute("stop-color", mt.color), dt.appendChild(_t);
            }
            Mt.appendChild(dt);
            const Vt = `${vt}-clip`, Ct = document.createElementNS(H, "clipPath");
            Ct.setAttribute("id", Vt);
            const Lt = document.createElementNS(H, "path");
            Lt.setAttribute("d", m), Ct.appendChild(Lt), Mt.appendChild(Ct);
            const kt = document.createElementNS(H, "g");
            kt.setAttribute("clip-path", `url(#${Vt})`), kt.setAttribute("style", "isolation: isolate");
            const gt = document.createElementNS(H, "rect");
            gt.setAttribute("width", "100%"), gt.setAttribute("height", "100%"), gt.setAttribute("fill", "black"), kt.appendChild(gt);
            const Qt = document.createElementNS(H, "path");
            Qt.setAttribute("d", m), Qt.setAttribute("fill", `url(#${ct})`), Qt.setAttribute("style", "mix-blend-mode: lighten"), kt.appendChild(Qt);
            const Yt = document.createElementNS(H, "path");
            Yt.setAttribute("d", m), Yt.setAttribute("fill", `url(#${St})`), Yt.setAttribute("style", "mix-blend-mode: lighten"), kt.appendChild(Yt), tt.setAttribute("fill", "none"), tt.__rectBlendGroup = kt;
          } else if (v.type === "radial") {
            const j = document.createElementNS(H, "radialGradient");
            j.setAttribute("id", vt), j.setAttribute(
              "color-interpolation",
              v.colorInterpolation ?? "linearRGB"
            ), j.setAttribute("gradientUnits", "userSpaceOnUse");
            const At = v.cx ?? 0.5, It = v.cy ?? 0.5;
            j.setAttribute("cx", String(At * et)), j.setAttribute("cy", String(It * nt));
            const ct = Math.max(At, 1 - At), xt = Math.max(It, 1 - It);
            j.setAttribute("r", String(Math.hypot(ct * et, xt * nt)));
            for (const St of Dn(v, {
              width: et,
              height: nt
            })) {
              const dt = document.createElementNS(H, "stop");
              dt.setAttribute("offset", `${St.position}%`), dt.setAttribute("stop-color", St.color), j.appendChild(dt);
            }
            Mt.appendChild(j);
          } else {
            const j = document.createElementNS(H, "linearGradient");
            j.setAttribute("id", vt), j.setAttribute(
              "color-interpolation",
              v.colorInterpolation ?? "linearRGB"
            ), j.setAttribute("gradientUnits", "userSpaceOnUse");
            const At = so(v.angle);
            j.setAttribute("x1", String(parseFloat(At.x1) / 100 * et)), j.setAttribute("y1", String(parseFloat(At.y1) / 100 * nt)), j.setAttribute("x2", String(parseFloat(At.x2) / 100 * et)), j.setAttribute("y2", String(parseFloat(At.y2) / 100 * nt));
            for (const It of v.stops) {
              const ct = document.createElementNS(H, "stop");
              ct.setAttribute("offset", `${It.position}%`), ct.setAttribute("stop-color", It.color), j.appendChild(ct);
            }
            Mt.appendChild(j);
          }
          v.type === "radial" && v.pathType === "rect" || tt.setAttribute("fill", `url(#${vt})`);
        } else L === "transparent" ? tt.setAttribute("fill", "none") : L.includes("gradient") ? (e.style.background = L, tt.setAttribute("fill", "transparent")) : tt.setAttribute("fill", L);
      } else
        tt.setAttribute("fill", "none");
      if (Z) {
        if (!L || L === "none" || L === "transparent") {
          const rt = ["srgbClr", "schemeClr", "scrgbClr", "sysClr", "hslClr", "prstClr"];
          let $t = "";
          const vt = M.child("solidFill");
          if (vt.exists()) {
            for (const j of vt.allChildren())
              if (rt.includes(j.localName)) {
                $t = he(j, n);
                break;
              }
          }
          if (!$t && ((Pt = t.fill) != null && Pt.exists())) {
            for (const j of t.fill.allChildren())
              if (rt.includes(j.localName)) {
                $t = he(j, n);
                break;
              }
          }
          $t && tt.setAttribute("fill", $t);
        }
        tt.setAttribute("stroke", "none");
      }
      let ut = t.headEnd, zt = t.tailEnd;
      if ((!ut || !zt) && (I != null && I.exists())) {
        const rt = Qu(I);
        !ut && rt.headEnd && (ut = rt.headEnd), !zt && rt.tailEnd && (zt = rt.tailEnd);
      }
      const te = E ? Mr(E.stops, "start", "black") : k, Me = E ? Mr(E.stops, "end", te) : k;
      let yt = E ? E.width : A;
      l && (ut || zt) && yt <= 0 && (yt = 1);
      const ee = l && (ut || zt) ? "butt" : F;
      if (l && (ut || zt) && yt > 0 && (m = qu(
        m,
        yt,
        !!ut,
        !!zt
      ), tt.setAttribute("d", m)), l && ut && yt > 0) {
        const rt = Tu(ut, yt);
        rt > 0 && (m = Wu(m, rt), tt.setAttribute("d", m));
      }
      if (l && zt && yt > 0) {
        const rt = zu(zt, yt);
        rt > 0 && (m = Uu(m, rt), tt.setAttribute("d", m));
      }
      const ce = b && ((Rt = b[0]) == null ? void 0 : Rt.stroke) === !1;
      if (!Z && !ce && E && E.stops.length > 0) {
        const rt = `grad-stroke-${++Le}`, $t = document.createElementNS(H, "linearGradient");
        if ($t.setAttribute("id", rt), $t.setAttribute(
          "color-interpolation",
          E.colorInterpolation ?? "linearRGB"
        ), $t.setAttribute("gradientUnits", "userSpaceOnUse"), l || et <= 1 || nt <= 1) {
          const j = E.angle * Math.PI / 180, At = Math.cos(j), It = Math.sin(j), ct = et / 2, xt = nt / 2, St = Math.max(et, nt) / 2;
          $t.setAttribute("x1", String(ct - St * At)), $t.setAttribute("y1", String(xt - St * It)), $t.setAttribute("x2", String(ct + St * At)), $t.setAttribute("y2", String(xt + St * It));
        } else {
          const j = so(E.angle);
          $t.setAttribute("x1", String(parseFloat(j.x1) / 100 * et)), $t.setAttribute("y1", String(parseFloat(j.y1) / 100 * nt)), $t.setAttribute("x2", String(parseFloat(j.x2) / 100 * et)), $t.setAttribute("y2", String(parseFloat(j.y2) / 100 * nt));
        }
        for (const j of E.stops) {
          const At = document.createElementNS(H, "stop");
          At.setAttribute("offset", `${j.position}%`), At.setAttribute("stop-color", j.color), $t.appendChild(At);
        }
        Mt.appendChild($t);
        const vt = l || et <= 1 || nt <= 1 ? Math.max(E.width, 1) : E.width;
        tt.setAttribute("stroke", `url(#${rt})`), tt.setAttribute("stroke-width", String(vt)), ee && tt.setAttribute("stroke-linecap", ee), C && tt.setAttribute("stroke-linejoin", C);
      } else if (!Z && !ce && yt > 0 && k !== "transparent") {
        tt.setAttribute("stroke", k), tt.setAttribute("stroke-width", String(yt)), ee && tt.setAttribute("stroke-linecap", ee), C && tt.setAttribute("stroke-linejoin", C);
        const rt = yr(w, yt);
        rt ? tt.setAttribute("stroke-dasharray", rt) : S === "dashed" ? tt.setAttribute(
          "stroke-dasharray",
          `${yt * 4},${yt * 2}`
        ) : S === "dotted" && tt.setAttribute(
          "stroke-dasharray",
          `${yt},${yt * 2}`
        );
      } else
        tt.setAttribute("stroke", "none");
      if (yt > 0 && (ut || zt)) {
        if (ut) {
          const rt = Lr(
            H,
            ut,
            te,
            yt,
            !0
          );
          rt && (Mt.appendChild(rt), tt.setAttribute("marker-start", `url(#${rt._markerId})`));
        }
        if (zt) {
          const rt = Lr(
            H,
            zt,
            Me,
            yt,
            !1
          );
          rt && (Mt.appendChild(rt), tt.setAttribute("marker-end", `url(#${rt._markerId})`));
        }
      }
      if (tt.__rectBlendGroup && (N.appendChild(tt.__rectBlendGroup), delete tt.__rectBlendGroup), N.appendChild(tt), at.exists() && n.presentation.mediaResolver) {
        const rt = wu(at, n).then(($t) => {
          $t && pr(
            H,
            N,
            Mt,
            at,
            m,
            { w: et, h: nt },
            $t,
            tt
          );
        }).catch(() => {
        });
        (Wt = n.asyncTasks) == null || Wt.push(rt), n.asyncTasks;
      }
      if (b && b.length > 1) {
        const rt = tt.getAttribute("fill") ?? "", $t = ((Nt = t.presetGeometry) == null ? void 0 : Nt.toLowerCase()) ?? "", vt = rt && !rt.startsWith("url(") ? rt : y != null && y.exists() ? he(y, n) : ((ft = v == null ? void 0 : v.stops[0]) == null ? void 0 : ft.color) ?? L, j = gr(vt), At = (It, ct) => {
          if ((v == null ? void 0 : v.type) !== "linear" || v.stops.length === 0)
            return;
          const xt = `grad-fill-detail-${++Le}`, St = document.createElementNS(H, "linearGradient");
          St.setAttribute("id", xt), St.setAttribute("gradientUnits", "userSpaceOnUse"), St.setAttribute(
            "color-interpolation",
            v.colorInterpolation ?? "sRGB"
          );
          const dt = so(v.angle);
          St.setAttribute("x1", String(parseFloat(dt.x1) / 100 * et)), St.setAttribute("y1", String(parseFloat(dt.y1) / 100 * nt)), St.setAttribute("x2", String(parseFloat(dt.x2) / 100 * et)), St.setAttribute("y2", String(parseFloat(dt.y2) / 100 * nt));
          for (const Vt of v.stops) {
            const Ct = document.createElementNS(H, "stop");
            Ct.setAttribute("offset", `${Vt.position}%`);
            const Lt = gr(Vt.color);
            Ct.setAttribute(
              "stop-color",
              Lt ? un(Lt, ct, It) : Vt.color
            ), St.appendChild(Ct);
          }
          return Mt.appendChild(St), `url(#${xt})`;
        };
        for (let It = 1; It < b.length; It++) {
          const ct = b[It], xt = document.createElementNS(H, "path");
          if (xt.setAttribute("d", ct.d), ct.fill === "none")
            xt.setAttribute("fill", "none");
          else if (ct.fill === "darkenLess")
            xt.setAttribute(
              "fill",
              At(0.15, { r: 0, g: 0, b: 0 }) || (j ? un(j, { r: 0, g: 0, b: 0 }, 0.15) : "rgba(0,0,0,0.15)")
            );
          else if (ct.fill === "darken")
            xt.setAttribute(
              "fill",
              At(0.3, { r: 0, g: 0, b: 0 }) || (j ? un(j, { r: 0, g: 0, b: 0 }, 0.3) : "rgba(0,0,0,0.3)")
            );
          else if (ct.fill === "lightenLess")
            xt.setAttribute(
              "fill",
              At(0.18, { r: 255, g: 255, b: 255 }) || (j ? un(j, { r: 255, g: 255, b: 255 }, 0.18) : "rgba(255,255,255,0.15)")
            );
          else if (ct.fill === "lighten") {
            let St;
            if ($t === "can" && (v == null ? void 0 : v.type) === "linear" && v.stops.length > 0) {
              const Vt = `grad-fill-face-${++Le}`, Ct = document.createElementNS(H, "linearGradient");
              Ct.setAttribute("id", Vt), Ct.setAttribute("gradientUnits", "userSpaceOnUse"), Ct.setAttribute("color-interpolation", "sRGB");
              const Lt = so(v.angle);
              Ct.setAttribute("x1", String(parseFloat(Lt.x1) / 100 * et)), Ct.setAttribute("y1", String(parseFloat(Lt.y1) / 100 * nt)), Ct.setAttribute("x2", String(parseFloat(Lt.x2) / 100 * et)), Ct.setAttribute("y2", String(parseFloat(Lt.y2) / 100 * nt));
              for (const kt of v.stops) {
                const gt = document.createElementNS(H, "stop");
                gt.setAttribute("offset", `${kt.position}%`), gt.setAttribute("stop-color", fc(kt.color, 65e3)), Ct.appendChild(gt);
              }
              Mt.appendChild(Ct), St = `url(#${Vt})`;
            } else $t === "can" && rt.startsWith("url(") && (St = rt);
            const dt = $t === "can" ? void 0 : At(0.3, { r: 255, g: 255, b: 255 });
            xt.setAttribute(
              "fill",
              St || dt || (j ? un(j, { r: 255, g: 255, b: 255 }, 0.3) : "rgba(255,255,255,0.3)")
            );
          } else
            xt.setAttribute("fill", rt || "none");
          if (ct.stroke && yt > 0 && k !== "transparent") {
            xt.setAttribute("stroke", k);
            const St = ((Zt = t.presetGeometry) == null ? void 0 : Zt.toLowerCase()) === "bordercallout1" && ct.fill === "none", dt = ct.strokeWidthScale && Number.isFinite(ct.strokeWidthScale) && ct.strokeWidthScale > 0 ? yt * ct.strokeWidthScale : yt, Vt = St ? Math.max(dt, 2.4) : dt;
            if (xt.setAttribute("stroke-width", String(Vt)), St && xt.setAttribute("stroke-linecap", "round"), ct.maskToMainOutlineBandScale && ct.maskToMainOutlineBandScale > 0 && ct.maskToMainOutlineBandScale < 1) {
              const Ct = `shape-detail-band-mask-${++Le}`, Lt = document.createElementNS(H, "mask");
              Lt.setAttribute("id", Ct), Lt.setAttribute("maskUnits", "userSpaceOnUse"), Lt.setAttribute("maskContentUnits", "userSpaceOnUse");
              const kt = document.createElementNS(H, "rect");
              kt.setAttribute("x", "0"), kt.setAttribute("y", "0"), kt.setAttribute("width", String(et)), kt.setAttribute("height", String(nt)), kt.setAttribute("fill", "black"), Lt.appendChild(kt);
              const gt = document.createElementNS(H, "path");
              gt.setAttribute("d", m), gt.setAttribute("fill", "white"), gt.setAttribute("stroke", "none"), Lt.appendChild(gt);
              const Qt = ct.maskToMainOutlineBandScale, Yt = document.createElementNS(H, "path");
              Yt.setAttribute("d", m), Yt.setAttribute("fill", "black"), Yt.setAttribute("stroke", "none");
              const mt = et * (1 - Qt) / 2, _t = nt * (1 - Qt) / 2;
              Yt.setAttribute("transform", `translate(${mt} ${_t}) scale(${Qt})`), Lt.appendChild(Yt), Mt.appendChild(Lt), xt.setAttribute("mask", `url(#${Ct})`);
            } else if (ct.maskToMainOutline) {
              const Ct = `shape-detail-mask-${++Le}`, Lt = document.createElementNS(H, "mask");
              Lt.setAttribute("id", Ct), Lt.setAttribute("maskUnits", "userSpaceOnUse"), Lt.setAttribute("maskContentUnits", "userSpaceOnUse");
              const kt = document.createElementNS(H, "rect");
              kt.setAttribute("x", "0"), kt.setAttribute("y", "0"), kt.setAttribute("width", String(et)), kt.setAttribute("height", String(nt)), kt.setAttribute("fill", "black"), Lt.appendChild(kt);
              const gt = document.createElementNS(H, "path");
              gt.setAttribute("d", m), gt.setAttribute("fill", "none"), gt.setAttribute("stroke", "white");
              const Qt = Math.max(
                Vt * (ct.maskStrokeScale && ct.maskStrokeScale > 0 ? ct.maskStrokeScale : 3),
                Vt
              );
              gt.setAttribute("stroke-width", String(Qt)), gt.setAttribute("stroke-linecap", "round"), gt.setAttribute("stroke-linejoin", "round"), Lt.appendChild(gt), Mt.appendChild(Lt), xt.setAttribute("mask", `url(#${Ct})`);
            }
          } else if (ct.stroke && !P) {
            const St = j ? un(j, { r: 0, g: 0, b: 0 }, 0.55) : "#666666";
            xt.setAttribute("stroke", St), xt.setAttribute("stroke-width", "1");
          } else
            xt.setAttribute("stroke", "none");
          N.appendChild(xt);
        }
      }
      if (Mt.children.length > 0 && !Mt.parentNode && N.insertBefore(Mt, N.firstChild), Z && (tt.setAttribute("stroke", "none"), tt.removeAttribute("stroke-width"), tt.removeAttribute("marker-start"), tt.removeAttribute("marker-end")), t.presetGeometry && !b) {
        const rt = Jh(t.presetGeometry, p, $);
        if (rt) {
          const $t = document.createElementNS(H, "path");
          $t.setAttribute("d", rt);
          let vt = "#333333";
          if (L && L !== "transparent" && L !== "none") {
            const j = L.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
            if (j) {
              const At = parseInt(j[1], 16), It = parseInt(j[2], 16), ct = parseInt(j[3], 16);
              vt = qt(Math.round(At * 0.5), Math.round(It * 0.5), Math.round(ct * 0.5));
            }
          }
          $t.setAttribute("fill", vt), $t.setAttribute("stroke", "none"), N.appendChild($t);
        }
      }
      e.appendChild(N);
    }
  } else L && L !== "transparent" && (L.includes("gradient") ? e.style.background = L : e.style.backgroundColor = L);
  if (t.textBody && t.textBody.paragraphs.length > 0 && au(t.textBody)) {
    const H = Fu(t, n);
    if (H)
      e.appendChild(H);
    else {
      const N = document.createElement("div");
      N.style.position = "absolute", t.textBoxBounds ? (N.style.left = `${t.textBoxBounds.x}px`, N.style.top = `${t.textBoxBounds.y}px`, N.style.width = `${t.textBoxBounds.w}px`, N.style.height = `${t.textBoxBounds.h}px`) : (N.style.left = "0", N.style.top = "0", N.style.width = "100%", N.style.height = "100%"), N.style.display = "flex", N.style.flexDirection = "column", N.style.boxSizing = "border-box";
      const et = fo(t.textBody, "spAutoFit"), nt = et == null ? void 0 : et.exists(), at = fo(t.textBody, "normAutofit"), bt = at == null ? void 0 : at.exists(), Mt = fo(t.textBody, "noAutofit"), tt = Mt == null ? void 0 : Mt.exists(), ht = t.textBody.bodyProperties, ut = t.textBody.layoutBodyProperties, zt = (ht ? ht.attr("wrap") : void 0) ?? (ut ? ut.attr("wrap") : void 0), te = (ht ? ht.attr("horzOverflow") : void 0) ?? (ut ? ut.attr("horzOverflow") : void 0), Me = (ht ? ht.attr("vertOverflow") : void 0) ?? (ut ? ut.attr("vertOverflow") : void 0), yt = nt && !bt && te === "overflow", ee = nt && !bt && Me === "overflow", ce = !nt && !bt && !tt && is(t.textBody) && !pu(t.textBody) && (zt === "none" || zt === void 0 && hu(t.textBody)), rt = tt && xu(t.placeholder) && is(t.textBody);
      N.style.overflowX = "visible", N.style.overflowY = "visible";
      let $t = !1;
      if (bt && at) {
        N.style.overflowX = "hidden", N.style.overflowY = "hidden";
        const dt = at.numAttr("lnSpcReduction") ?? 0;
        if ($t = !0, dt > 0) {
          const Vt = 1 - dt / 1e5;
          N.style.lineHeight = `${Vt}`;
        }
      }
      if (nt && !bt) {
        if (yt === ee) {
          const dt = yt ? "visible" : "hidden";
          N.style.overflowX = dt, N.style.overflowY = dt;
        } else
          N.style.overflowX = yt ? "visible" : "clip", N.style.overflowY = ee ? "visible" : "clip";
        $t = !yt || !ee;
      }
      ce && (N.style.overflowX = "hidden", N.style.overflowY = "hidden", $t = !0), rt && ($t = !0);
      let vt = !1, j;
      const At = !!nt && !bt && is(t.textBody), It = du(t.textBody);
      {
        ht && zt === "none" && (N.style.whiteSpace = "nowrap");
        const dt = ht ? ht.attr("anchor") : void 0, Vt = ut ? ut.attr("anchor") : void 0, Ct = dt || Vt, Lt = dt !== void 0 || Vt !== void 0;
        j = Ct;
        const kt = (ht ? ht.attr("vert") : null) || (ut ? ut.attr("vert") : null);
        Ct === "t" ? N.style.justifyContent = "flex-start" : Ct === "ctr" ? N.style.justifyContent = "center" : Ct === "b" ? N.style.justifyContent = "flex-end" : N.style.justifyContent = "flex-start";
        const gt = (ht ? ht.numAttr("lIns") : void 0) ?? (ut ? ut.numAttr("lIns") : void 0), Qt = (ht ? ht.numAttr("tIns") : void 0) ?? (ut ? ut.numAttr("tIns") : void 0), Yt = (ht ? ht.numAttr("rIns") : void 0) ?? (ut ? ut.numAttr("rIns") : void 0), mt = (ht ? ht.numAttr("bIns") : void 0) ?? (ut ? ut.numAttr("bIns") : void 0), _t = X(gt !== void 0 ? gt : 91440), fe = X(Qt !== void 0 ? Qt : 45720), $e = X(Yt !== void 0 ? Yt : 91440), le = X(mt !== void 0 ? mt : 45720), Jt = ((Dt = t.textBoxBounds) == null ? void 0 : Dt.h) ?? t.size.h, Gt = ce && !kt && Ct === "ctr" && Jt > 0 && fe + le >= Jt, ae = Gt ? 0 : fe, cn = Gt ? 0 : le;
        N.style.paddingLeft = `${_t}px`, N.style.paddingTop = `${ae}px`, N.style.paddingRight = `${$e}px`, N.style.paddingBottom = `${cn}px`, kt === "eaVert" ? (no(N, j), vt = !0) : kt === "wordArtVert" ? (no(N, j, !0, "vertical-lr"), vt = !0) : kt === "vert" ? (no(N, j), vt = !0) : kt === "vert270" && (no(N, j), rs(N, "rotate(180deg)"), vt = !0), At && !Lt && !vt && It && (N.style.justifyContent = "center");
      }
      if ((Ot = t.textBoxBounds) != null && Ot.rotation && t.textBoxBounds.rotation !== 0 && (rs(N, `rotate(${t.textBoxBounds.rotation}deg)`), N.style.transformOrigin = "center center"), t.flipH || t.flipV) {
        const dt = N.style.transform || "";
        N.style.transform = `${dt} scaleX(-1)`.trim();
      }
      let ct;
      const xt = t.source.child("style");
      if (xt.exists()) {
        const dt = xt.child("fontRef");
        dt.exists() && dt.allChildren().length > 0 && (ct = he(dt, n));
      }
      const St = ct || vt || nt && !bt ? {
        ...ct ? { fontRefColor: ct } : {},
        ...vt ? { isVerticalText: vt } : {},
        ...nt && !bt ? (() => {
          const dt = uu(t.textBody), Ct = !fu(t.textBody) && zt !== "none" && (dt > 1 || Nc(t.textBody) > Oc);
          return {
            trimOuterParagraphSpacing: !0,
            ...At && !vt && (zt === "none" || It) ? {
              compactSingleLineSpacing: !0,
              defaultLineHeight: "1"
            } : Ct ? {
              defaultLineHeight: "1.1"
            } : {}
          };
        })() : {}
      } : void 0;
      if (Ec(t.textBody, t.placeholder, n, N, St), e.appendChild(N), $t) {
        const dt = N.style.transform, Vt = N.style.transformOrigin, Ct = N.style.width, Lt = N.style.height, kt = N.style.whiteSpace, gt = N.style.overflowY, Qt = () => {
          var Oo;
          N.style.transform = dt, N.style.transformOrigin = Vt, N.style.width = Ct, N.style.height = Lt, N.style.whiteSpace = kt, N.style.overflowY = gt;
          const mt = e.isConnected, _t = e.style.visibility, fe = (Oo = n.measurementRoot) != null && Oo.isConnected ? n.measurementRoot : document.body;
          mt || (e.style.visibility = "hidden", fe.appendChild(e));
          const $e = N.style.justifyContent, le = N.style.whiteSpace;
          N.style.justifyContent = "flex-start";
          const Jt = N.clientWidth, Gt = N.clientHeight, ae = N.scrollHeight, cn = N.scrollWidth;
          let xe = cn, Ue = ae;
          const qe = Jt > 0 && cn <= Jt + cs, Do = At ? bu : mu, Pe = Gt > 0 && (ae <= Gt || !ee && qe && ae <= Gt * Do), Xn = Jt > 0 && Gt > 0 && qe && Pe, ti = nt && !bt && !ee && qe && Pe && ae > Gt && Gt > 0, Yn = ce && qe && ae > Gt && Gt > 0, ei = !vt && !yt && !Xn && (!qe || !Pe || At || ce || rt);
          let Cn = !1;
          ei && (N.style.whiteSpace = "nowrap", xe = N.scrollWidth, Ue = N.scrollHeight, Cn = !0, N.style.whiteSpace = le), N.style.justifyContent = $e, mt || (e.parentNode === fe && fe.removeChild(e), e.style.visibility = _t);
          let ye = 1;
          const Fn = rt || ce, kn = nt && !bt && zt !== "none" && Cn && !Pe && xe <= Jt + cs && Ue <= Gt;
          if (kn && (N.style.whiteSpace = "nowrap"), !yt && xe > Jt + cs && Jt > 0) {
            const an = Jt / xe, qn = nt && !bt && !Pe && Ue <= Gt && an >= Lu;
            (!nt || bt || qn || nt && !bt && At && (zt === void 0 || zt === "none" || It) || ce || rt) && (!rt || an >= Mu) && (ye = Math.min(ye, an));
          }
          const ln = nt && !bt && ye < 1 && Ue <= Gt && !Pe;
          ln && (N.style.whiteSpace = "nowrap"), !Fn && !kn && !ln && !ee && !Pe && Ue > Gt && Gt > 0 && (ye = Math.min(ye, Gt / Ue)), !Fn && !kn && !ln && !ee && ye === 1 && !Pe && ae > Gt && Gt > 0 && (ye = Gt / ae), ye < 1 ? (N.style.transform || (N.style.transformOrigin = "top left"), rs(N, `scale(${ye})`), N.style.width = $r(Ct, ye), N.style.height = $r(Lt, ye)) : (ti || Yn) && (N.style.overflowY = "visible");
        }, Yt = () => {
          typeof requestAnimationFrame == "function" ? requestAnimationFrame(() => requestAnimationFrame(Qt)) : setTimeout(Qt, 0);
        };
        Qt(), Yt(), ((Ut = document.fonts) == null ? void 0 : Ut.status) === "loading" && document.fonts.ready && document.fonts.ready.then(() => Yt()).catch(() => {
        });
      }
    }
  }
  let T = M.child("effectLst");
  if (!T.exists()) {
    const N = t.source.child("style").child("effectRef").numAttr("idx") ?? 0;
    if (N > 0 && (((Y = n.theme.effectStyles) == null ? void 0 : Y.length) ?? 0) >= N) {
      const et = n.theme.effectStyles[N - 1];
      if (et.exists()) {
        const nt = et.child("effectLst");
        nt.exists() && (T = nt);
      }
    }
  }
  if (T.exists()) {
    const H = T.child("outerShdw");
    if (H.exists()) {
      const bt = H.numAttr("dir") ?? 0, Mt = H.numAttr("dist") ?? 0, tt = H.numAttr("blurRad") ?? 0, ht = H.numAttr("sx"), ut = H.numAttr("sy"), zt = H.attr("algn"), te = bt / 6e4, Me = X(Mt), yt = X(tt), ee = Me * Math.cos(te * Math.PI / 180), ce = Me * Math.sin(te * Math.PI / 180);
      let rt = "rgba(0,0,0,0.4)", $t = { r: 0, g: 0, b: 0 };
      const { color: vt, alpha: j } = Tt(H, n);
      if (vt) {
        const At = vt.startsWith("#") ? vt : `#${vt}`, { r: It, g: ct, b: xt } = Et(At);
        $t = { r: It, g: ct, b: xt }, rt = `rgba(${It},${ct},${xt},${j.toFixed(3)})`;
      }
      if (ht != null && ut != null && ht > 0 && ut > 0) {
        const At = ht / 1e5, It = ut / 1e5, ct = ((Bt = t.size) == null ? void 0 : Bt.w) ?? 100, xt = ((Ft = t.size) == null ? void 0 : Ft.h) ?? 100;
        let St = ct, dt = xt;
        if (l || ct <= 1 || xt <= 1) {
          const mt = ((Xt = t.line) == null ? void 0 : Xt.numAttr("w")) ?? 12700, _t = Math.max(1, X(mt));
          St = _t, dt = _t;
        }
        const Vt = St * (At - 1) / 2, Ct = dt * (It - 1) / 2, Lt = Math.max(0, (Vt + Ct) / 2);
        let kt = 0, gt = 0;
        if (zt) {
          const mt = zt.toLowerCase();
          (mt === "t" || mt === "tl" || mt === "tr") && (gt = dt * (It - 1) / 2), (mt === "b" || mt === "bl" || mt === "br") && (gt = -dt * (It - 1) / 2), (mt === "l" || mt === "tl" || mt === "bl") && (kt = St * (At - 1) / 2), (mt === "r" || mt === "tr" || mt === "br") && (kt = -St * (At - 1) / 2);
        }
        const Qt = Lt > 0 ? Math.min(yt, Lt * 3) : yt;
        let Yt = j;
        if (Lt > 0 && yt > 0 && Lt < yt && (Yt = j * (Lt / yt)), Yt >= 0.01) {
          const mt = ee + kt, _t = ce + gt;
          let fe = rt;
          if (vt) {
            const $e = vt.startsWith("#") ? vt : `#${vt}`, { r: le, g: Jt, b: Gt } = Et($e);
            $t = { r: le, g: Jt, b: Gt }, fe = `rgba(${le},${Jt},${Gt},${Yt.toFixed(4)})`;
          }
          !l && U && q && Q && G ? xr(U, q, Q, G, {
            dx: mt,
            dy: _t,
            blur: Qt,
            color: $t,
            opacity: Yt
          }) : e.style.boxShadow = `${mt.toFixed(1)}px ${_t.toFixed(1)}px ${Qt.toFixed(1)}px ${Lt.toFixed(1)}px ${fe}`;
        }
      } else
        !l && U && q && Q && G ? xr(U, q, Q, G, {
          dx: ee,
          dy: ce,
          blur: yt,
          color: $t,
          opacity: j
        }) : Zc(
          e,
          `drop-shadow(${ee.toFixed(1)}px ${ce.toFixed(1)}px ${yt.toFixed(1)}px ${rt})`
        );
    }
    const N = T.child("glow");
    N.exists() && gu(e, N, n);
    const et = T.child("softEdge");
    if (et.exists() && !l && U && q && Q && G) {
      const bt = X(et.numAttr("rad") ?? 0);
      bt > 0 && Ru(U, q, Q, G, bt);
    }
    const nt = T.child("innerShdw");
    if (nt.exists() && !l && U && q && Q && G) {
      const bt = nt.numAttr("dir") ?? 0, Mt = X(nt.numAttr("dist") ?? 0), tt = X(nt.numAttr("blurRad") ?? 0), ht = bt / 6e4, ut = Mt * Math.cos(ht * Math.PI / 180), zt = Mt * Math.sin(ht * Math.PI / 180), { color: te, alpha: Me } = Tt(nt, n);
      if (te && Me > 0) {
        const yt = te.startsWith("#") ? te : `#${te}`;
        Bu(U, q, Q, G, {
          dx: ut,
          dy: zt,
          blur: tt,
          color: Et(yt),
          opacity: Me
        });
      }
    }
    const at = T.child("reflection");
    if (at.exists()) {
      const bt = X(at.numAttr("dist") ?? 0), Mt = (at.numAttr("stA") ?? 5e4) / 1e5, tt = (at.numAttr("endA") ?? 0) / 1e5, ht = Math.max(0, Math.min(100, (at.numAttr("stPos") ?? 0) / 1e3)), ut = Math.max(0, Math.min(100, (at.numAttr("endPos") ?? 1e5) / 1e3)), zt = `linear-gradient(to bottom, rgba(255,255,255,${Mt.toFixed(3)}) ${ht.toFixed(1)}%, rgba(255,255,255,${tt.toFixed(3)}) ${ut.toFixed(1)}%)`, te = `below ${bt.toFixed(1)}px ${zt}`;
      e.style.setProperty("-webkit-box-reflect", te), e.style.webkitBoxReflect = te;
    }
  }
  if (t.hlinkClick && n.onNavigate) {
    const { action: H, rId: N } = t.hlinkClick, et = N ? n.slide.rels.get(N) : void 0, nt = Es(n, H, et);
    nt !== void 0 ? (e.style.cursor = "pointer", e.title = t.hlinkClick.tooltip || Ps(nt), e.addEventListener("click", (at) => {
      at.stopPropagation(), n.onNavigate({ slideIndex: nt });
    })) : N && et && Ie(et.targetMode) && Ro(et.target) && (e.style.cursor = "pointer", e.title = t.hlinkClick.tooltip || et.target, e.addEventListener("click", (at) => {
      at.stopPropagation(), n.onNavigate({ url: et.target });
    }));
  }
  return e;
}
const t0 = 14, e0 = 70, n0 = 81, o0 = 1128875079, s0 = 2, i0 = 1073741828, r0 = 1179469088, c0 = [37, 80, 68, 70], ls = [37, 37, 69, 79, 70], l0 = 0, a0 = 16777216;
function d0(t) {
  if (t.length < 44) return { type: "unsupported" };
  const n = new DataView(t.buffer, t.byteOffset, t.byteLength);
  if (n.getUint32(40, !0) !== r0)
    return { type: "unsupported" };
  let e = 0, o = 0;
  for (; e + 8 <= t.length; ) {
    const s = n.getUint32(e, !0), i = n.getUint32(e + 4, !0);
    if (i < 8 || e + i > t.length || (o++, s === t0)) break;
    if (s === e0 && i > 16) {
      const r = h0(t, n, e, i);
      if (r) return r;
    }
    if (s === n0 && i > 80) {
      const r = f0(t, n, e);
      if (r) return r;
    }
    e += i;
  }
  return o <= 2 ? { type: "empty" } : { type: "unsupported" };
}
function h0(t, n, e, o) {
  if (e + 16 > t.length) return null;
  if (n.getUint32(e + 12, !0) === o0 && e + 20 <= t.length) {
    const i = n.getUint32(e + 16, !0);
    if (i === s0) {
      const r = t.subarray(e + 8, e + o), c = ys(r);
      if (c) return { type: "pdf", data: c };
    }
    if (i === i0 && e + 24 <= t.length) {
      const r = u0(t, n, e);
      if (r) return r;
    }
  }
  if (o > 100) {
    const i = t.subarray(e + 8, e + o), r = ys(i);
    if (r) return { type: "pdf", data: r };
  }
  return null;
}
function u0(t, n, e, o) {
  if (e + 40 > t.length) return null;
  const s = n.getUint32(e + 36, !0), i = e + 40;
  for (let r = 0; r < s && r < 10; r++) {
    const c = i + r * 16;
    if (c + 16 > t.length) break;
    const l = n.getUint32(c + 8, !0), a = n.getUint32(c + 12, !0), d = e + a;
    if (d + l > t.length || l === 0) continue;
    const h = t.subarray(d, d + l), u = ys(h);
    if (u) return { type: "pdf", data: u };
  }
  return null;
}
function ys(t) {
  const n = $0(t, c0);
  if (n === -1) return null;
  let e = -1;
  for (let o = t.length - ls.length; o >= n; o--)
    if (_c(t, o, ls)) {
      e = o + ls.length;
      break;
    }
  return e === -1 && (e = t.length), t.slice(n, e);
}
function f0(t, n, e, o) {
  if (e + 80 > t.length) return null;
  const s = n.getUint32(e + 48, !0), i = n.getUint32(e + 52, !0), r = n.getUint32(e + 56, !0), c = n.getUint32(e + 60, !0);
  if (i === 0 || c === 0) return null;
  const l = e + s;
  if (l + 40 > t.length) return null;
  const a = n.getInt32(l + 4, !0), d = n.getInt32(l + 8, !0), h = n.getUint16(l + 14, !0);
  if (n.getUint32(l + 16, !0) !== l0 || h !== 24 && h !== 32) return null;
  const x = Math.abs(a), p = Math.abs(d);
  if (x === 0 || p === 0 || x > 8192 || p > 8192 || x * p > a0) return null;
  const $ = e + r;
  if ($ + c > t.length) return null;
  const g = h / 8, f = Math.ceil(x * g / 4) * 4, y = f * p;
  if (c < y) return null;
  const m = t.subarray($, $ + y), b = d < 0, M = new ImageData(x, p);
  for (let L = 0; L < p; L++) {
    const k = (b ? L : p - 1 - L) * f, A = L * x * 4;
    for (let S = 0; S < x; S++) {
      const w = k + S * g;
      if (w + g > m.length) break;
      M.data[A + S * 4 + 0] = m[w + 2], M.data[A + S * 4 + 1] = m[w + 1], M.data[A + S * 4 + 2] = m[w + 0], M.data[A + S * 4 + 3] = h === 32 ? m[w + 3] : 255;
    }
  }
  return { type: "bitmap", imageData: M };
}
function $0(t, n) {
  const e = t.length - n.length;
  for (let o = 0; o <= e; o++)
    if (_c(t, o, n)) return o;
  return -1;
}
function _c(t, n, e) {
  for (let o = 0; o < e.length; o++)
    if (t[n + o] !== e[o]) return !1;
  return !0;
}
const p0 = "pdfjs-dist/build/pdf.min.mjs", x0 = "pdfjs-dist/build/pdf.worker.min.mjs";
let ro = null, co = null;
function Xc(t) {
  try {
    const n = import.meta.resolve;
    if (typeof n == "function")
      return n(t);
  } catch {
  }
  return null;
}
function Yc(t, n) {
  if (!t || typeof t != "object") return null;
  const e = t[n];
  return typeof e != "string" ? null : e.trim() || null;
}
function y0() {
  return ro !== null ? ro : (ro = Xc(p0) ?? "", ro || null);
}
function g0() {
  return co !== null ? co : (co = Xc(x0) ?? "", co || null);
}
function m0(t) {
  return t === !1 ? null : Yc(t, "moduleUrl") ?? y0();
}
function b0(t) {
  return t === !1 ? null : Yc(t, "workerUrl") ?? g0();
}
const M0 = (
  /* js */
  `
let pdfjsLib = null;

// PDF.js resolves its nested worker through browser window APIs. Aliasing
// this isolated worker global keeps it on the real-worker path; otherwise its
// fake-worker fallback would bind to this worker's message port.
globalThis.window = globalThis;

self.onmessage = async (e) => {
  const { id, pdfData, width, height, pdfjsUrl, pdfWorkerUrl } = e.data;
  try {
    if (!pdfjsLib) {
      pdfjsLib = await import(pdfjsUrl);
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    }

    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    let doc = null;
    try {
      doc = await loadingTask.promise;
      if (doc.numPages < 1) {
        self.postMessage({ id, error: 'no pages' });
        return;
      }
      const page = await doc.getPage(1);
      const vp = page.getViewport({ scale: 1 });
      const scale = Math.max(width / vp.width, height / vp.height);
      const svp = page.getViewport({ scale });

      const canvas = new OffscreenCanvas(Math.ceil(svp.width), Math.ceil(svp.height));
      const ctx = canvas.getContext('2d', { alpha: true });
      await page.render({ canvasContext: ctx, viewport: svp, background: 'rgba(0,0,0,0)' }).promise;

      const blob = await canvas.convertToBlob({ type: 'image/png' });
      self.postMessage({ id, blob });
    } finally {
      if (typeof loadingTask.destroy === 'function') {
        await loadingTask.destroy();
      } else if (doc && typeof doc.destroy === 'function') {
        await doc.destroy();
      }
    }
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
`
), L0 = 15e3, v0 = 4;
let gs = 0;
const $o = [];
function Ar() {
  for (; gs < v0; ) {
    const t = $o.shift();
    if (!t) return;
    t.start();
  }
}
function A0(t, n) {
  return n != null && n.aborted ? Promise.resolve(null) : new Promise((e) => {
    let o = !1, s = !1;
    const i = (c) => {
      s || (s = !0, e(c));
    }, r = {
      start: () => {
        s || (o = !0, n == null || n.removeEventListener("abort", r.cancel), gs += 1, Promise.resolve().then(t).then(i, () => i(null)).finally(() => {
          gs -= 1, Ar();
        }));
      },
      cancel: () => {
        if (o || s) return;
        const c = $o.indexOf(r);
        c >= 0 && $o.splice(c, 1), n == null || n.removeEventListener("abort", r.cancel), i(null);
      }
    };
    n == null || n.addEventListener("abort", r.cancel, { once: !0 }), $o.push(r), Ar();
  });
}
function S0(t, n, e, o, s, i) {
  return i != null && i.aborted ? Promise.resolve(null) : new Promise((r) => {
    let c = null, l, a = !1;
    const d = (u) => {
      a || (a = !0, l !== void 0 && clearTimeout(l), i == null || i.removeEventListener("abort", h), c && (c.onmessage = null, c.onerror = null, c.terminate(), c = null), r(u));
    }, h = () => d(null);
    try {
      const u = new Blob([M0], { type: "text/javascript" }), x = URL.createObjectURL(u);
      try {
        c = new Worker(x, { type: "module" });
      } finally {
        URL.revokeObjectURL(x);
      }
      c.onmessage = ($) => {
        const { blob: g, error: f } = $.data;
        d(f ? null : g ?? null);
      }, c.onerror = () => d(null), i == null || i.addEventListener("abort", h, { once: !0 });
      const p = t.slice();
      c.postMessage({ id: 1, pdfData: p, width: n, height: e, pdfjsUrl: o, pdfWorkerUrl: s }, [
        p.buffer
      ]), l = setTimeout(() => d(null), L0);
    } catch {
      d(null);
    }
  });
}
async function C0(t, n, e, o, s) {
  if (s != null && s.aborted) return null;
  const i = m0(o), r = b0(o);
  if (!i || !r || typeof OffscreenCanvas > "u" || typeof Worker > "u")
    return null;
  try {
    const c = await A0(
      () => S0(t, n, e, i, r, s),
      s
    );
    if (c && !(s != null && s.aborted)) return URL.createObjectURL(c);
  } catch {
  }
  return null;
}
function qc(t) {
  var e;
  return (((e = t.split(".").pop()) == null ? void 0 : e.toLowerCase()) || "") === "wmf";
}
function F0(t) {
  var e;
  return (((e = t.split(".").pop()) == null ? void 0 : e.toLowerCase()) || "") === "emf";
}
let k0 = 0;
function Qc(t, n) {
  if (Ie(t.targetMode))
    return An(t.target) ? t.target : void 0;
  const e = Ln(t.target, n.presentation.media);
  if (!e) return;
  const { mediaPath: o, data: s } = e;
  if (!qc(o))
    return tn(o, s, n.mediaUrlCache);
}
function w0(t, n) {
  var c;
  const e = document.createElement("div");
  e.style.position = "absolute", e.style.left = `${t.position.x}px`, e.style.top = `${t.position.y}px`, e.style.width = `${t.size.w}px`, e.style.height = `${t.size.h}px`, e.style.overflow = "hidden";
  const o = Jc(t), s = [];
  if (t.rotation !== 0 && s.push(`rotate(${t.rotation}deg)`), t.flipH && !o && s.push("scaleX(-1)"), t.flipV && !o && s.push("scaleY(-1)"), s.length > 0 && (e.style.transform = s.join(" ")), I0(e, t, n), t.isVideo)
    return X0(t, n, e), e;
  if (t.isAudio)
    return Y0(t, n, e), e;
  const i = t.blipEmbed;
  let r;
  if (i) {
    const l = n.slide.rels.get(i);
    if (!l)
      return Oe(e, "Missing image reference"), e;
    if (Ie(l.targetMode)) {
      if (r = An(l.target) ? l.target : void 0, !r)
        return Oe(e, "Image not found"), e;
    } else {
      const a = oc(l.target);
      if (qc(a))
        return q0(e, a), e;
      const d = Ln(l.target, n.presentation.media);
      if (!d) {
        if (n.presentation.mediaResolver) {
          const h = As(
            l.target,
            n.presentation.media,
            n.presentation.mediaResolver
          ).then((u) => {
            if (!u) {
              Oe(e, "Image not found");
              return;
            }
            Sr(t, n, e, u.mediaPath, u.data);
          }).catch(() => {
            Oe(e, "Image not found");
          });
          return (c = n.asyncTasks) == null || c.push(h), n.asyncTasks, e;
        }
        return Oe(e, "Image not found"), e;
      }
      return Sr(t, n, e, d.mediaPath, d.data), e;
    }
  } else if (t.blipLink) {
    if (r = Os(t.blipLink, n), !r)
      return Oe(e, "Image not found"), e;
  } else
    return Oe(e, "No image data"), e;
  return Kc(t, n, e, r), e;
}
function Sr(t, n, e, o, s) {
  if (F0(o)) {
    const r = s instanceof Uint8Array ? s : new Uint8Array(s);
    Q0(r, t, n, e, o);
    return;
  }
  const i = tn(o, s, n.mediaUrlCache);
  Kc(t, n, e, i);
}
function Kc(t, n, e, o) {
  const s = t.source.child("blipFill"), i = s.child("blip"), r = _0(i);
  if (s.child("tile").exists()) {
    e.style.backgroundImage = `url("${o}")`, e.style.backgroundRepeat = "repeat", e.style.backgroundSize = "auto", r < 1 && (e.style.opacity = `${Number(r.toFixed(4))}`);
    return;
  }
  const l = document.createElement("img");
  l.src = o, l.style.width = "100%", l.style.height = "100%", l.style.objectFit = "fill", l.style.display = "block", l.draggable = !1;
  const a = t.source.child("blipFill").child("stretch").child("fillRect"), d = a.exists() ? E0(a) : void 0, h = Jc(t);
  if (h) {
    R0(t, e, o, h, d), r < 1 && (e.style.opacity = `${Number(r.toFixed(4))}`);
    return;
  }
  if (d && P0(l, d), t.crop) {
    const { top: g, right: f, bottom: y, left: m } = t.crop, b = 1 - m - f, M = 1 - g - y;
    if (b > 1e-3 && M > 1e-3) {
      const L = 1 / b, v = 1 / M, k = t.size.w * (((d == null ? void 0 : d.width) ?? 100) / 100), A = t.size.h * (((d == null ? void 0 : d.height) ?? 100) / 100);
      l.style.width = `${(L * k).toFixed(4)}px`, l.style.height = `${(v * A).toFixed(4)}px`, l.style.marginLeft = `${(-m * L * k).toFixed(4)}px`, l.style.marginTop = `${(-g * v * A).toFixed(4)}px`;
    }
  }
  r < 1 && (e.style.opacity = `${Number(r.toFixed(4))}`), i.child("grayscl").exists() && Ds(l, "grayscale(1)");
  const x = i.child("duotone");
  x.exists() && j0(x, n, l);
  const p = i.child("lum");
  p.exists() && tf(p, l);
  const $ = i.child("biLevel");
  $.exists() && ef($, l), e.appendChild(l);
}
function lo(t, n) {
  return (t.numAttr(n) ?? 0) / 1e3;
}
function E0(t) {
  const n = lo(t, "l"), e = lo(t, "t"), o = lo(t, "r"), s = lo(t, "b");
  return {
    left: n,
    top: e,
    width: 100 - n - o,
    height: 100 - e - s
  };
}
function P0(t, n) {
  t.style.position = "absolute", t.style.left = `${n.left}%`, t.style.top = `${n.top}%`, t.style.width = `${n.width}%`, t.style.height = `${n.height}%`;
}
function Jc(t) {
  const n = t.source.child("spPr").child("custGeom"), e = t.customGeometry ?? (n.exists() ? n : void 0);
  if (e != null && e.exists()) {
    const r = t.source.child("spPr").child("xfrm").child("ext"), c = {
      w: r.numAttr("cx") ?? 0,
      h: r.numAttr("cy") ?? 0
    };
    return Pc(e, t.size.w, t.size.h, c) || void 0;
  }
  const o = t.source.child("spPr").child("prstGeom").attr("prst"), s = t.presetGeometry ?? o;
  return !s || s === "rect" ? void 0 : Rs(s, t.size.w, t.size.h) || void 0;
}
function B0(t) {
  if (t.flipH && t.flipV) return `translate(${t.size.w} ${t.size.h}) scale(-1 -1)`;
  if (t.flipH) return `translate(${t.size.w} 0) scale(-1 1)`;
  if (t.flipV) return `translate(0 ${t.size.h}) scale(1 -1)`;
}
function R0(t, n, e, o, s) {
  const i = "http://www.w3.org/2000/svg", r = document.createElementNS(i, "svg");
  r.setAttribute("viewBox", `0 0 ${t.size.w} ${t.size.h}`), r.setAttribute("width", "100%"), r.setAttribute("height", "100%"), r.style.display = "block", r.style.overflow = "hidden";
  const c = `picture-clip-${k0++}`, l = document.createElementNS(i, "defs"), a = document.createElementNS(i, "clipPath");
  a.setAttribute("id", c), a.setAttribute("clipPathUnits", "userSpaceOnUse");
  const d = document.createElementNS(i, "path");
  d.setAttribute("d", o);
  const h = B0(t);
  h && d.setAttribute("transform", h), a.appendChild(d), l.appendChild(a), r.appendChild(l);
  const u = document.createElementNS(i, "image");
  u.setAttribute("href", e), u.setAttribute("preserveAspectRatio", "none"), h && u.setAttribute("transform", h);
  const x = document.createElementNS(i, "g");
  x.setAttribute("clip-path", `url(#${c})`);
  let p = ((s == null ? void 0 : s.left) ?? 0) / 100 * t.size.w, $ = ((s == null ? void 0 : s.top) ?? 0) / 100 * t.size.h, g = ((s == null ? void 0 : s.width) ?? 100) / 100 * t.size.w, f = ((s == null ? void 0 : s.height) ?? 100) / 100 * t.size.h;
  if (t.crop) {
    const { top: y, right: m, bottom: b, left: M } = t.crop, L = 1 - M - m, v = 1 - y - b;
    if (L > 1e-3 && v > 1e-3) {
      const k = 1 / L, A = 1 / v;
      g *= k, f *= A, p += -M * k * (((s == null ? void 0 : s.width) ?? 100) / 100) * t.size.w, $ += -y * A * (((s == null ? void 0 : s.height) ?? 100) / 100) * t.size.h;
    }
  }
  u.setAttribute("x", String(p)), u.setAttribute("y", String($)), u.setAttribute("width", String(g)), u.setAttribute("height", String(f)), n.appendChild(r), r.appendChild(x), x.appendChild(u);
}
function I0(t, n, e) {
  T0(t, n, e), O0(t, n, e), N0(t, n, e), V0(t, n, e);
}
function T0(t, n, e) {
  const o = n.source.child("spPr"), s = Ge(o, e);
  s && z0(t, s);
}
function z0(t, n) {
  if (D0(t), n.includes("gradient") && n.includes(" 0 0 / ")) {
    const e = ws(n);
    if (e) {
      t.style.backgroundImage = e.imageLayers, t.style.backgroundSize = "8px 8px", t.style.backgroundRepeat = "repeat", t.style.backgroundColor = e.color;
      return;
    }
  }
  n.includes("gradient") || n.startsWith("url(") || n.includes("repeating-") ? t.style.background = n : t.style.backgroundColor = n;
}
function D0(t) {
  t.style.background = "", t.style.backgroundColor = "", t.style.backgroundImage = "", t.style.backgroundRepeat = "", t.style.backgroundSize = "";
}
function O0(t, n, e) {
  var a, d, h;
  const o = n.source.child("style").child("lnRef");
  if (((a = n.line) == null ? void 0 : a.child("noFill").exists()) ?? !1) return;
  const i = ((d = n.line) == null ? void 0 : d.exists()) ?? !1, r = !i && o.exists() && (o.numAttr("idx") ?? 0) > 0 && (((h = e.theme.lineStyles) == null ? void 0 : h.length) ?? 0) >= (o.numAttr("idx") ?? 0) ? e.theme.lineStyles[(o.numAttr("idx") ?? 1) - 1] : void 0, c = i ? n.line : r;
  if (!(c != null && c.exists())) return;
  const l = Zn(c, e, o);
  l.width <= 0 || l.color === "transparent" || (t.style.boxSizing = "border-box", t.style.border = `${l.width}px ${l.dash} ${l.color}`);
}
function N0(t, n, e) {
  const o = n.source.child("spPr").child("effectLst");
  if (!o.exists()) return;
  const s = o.child("outerShdw");
  s.exists() && Z0(t, n, s, e);
  const i = o.child("glow");
  i.exists() && H0(t, i, e);
  const r = o.child("softEdge");
  r.exists() && W0(t, n, r);
  const c = o.child("reflection");
  c.exists() && U0(t, c);
}
function Z0(t, n, e, o) {
  const s = e.numAttr("dir") ?? 0, i = X(e.numAttr("dist") ?? 0), r = X(e.numAttr("blurRad") ?? 0), c = s / 6e4, l = i * Math.cos(c * Math.PI / 180), a = i * Math.sin(c * Math.PI / 180), d = G0(e, o, "rgba(0,0,0,0.4)"), h = e.numAttr("sx"), u = e.numAttr("sy");
  if (h != null && u != null && h > 0 && u > 0) {
    const x = h / 1e5, p = u / 1e5, $ = n.size.w * (x - 1) / 2, g = n.size.h * (p - 1) / 2, f = Math.max(0, ($ + g) / 2);
    t.style.boxShadow = `${l.toFixed(1)}px ${a.toFixed(1)}px ${r.toFixed(1)}px ${f.toFixed(1)}px ${d}`;
    return;
  }
  Ds(
    t,
    `drop-shadow(${l.toFixed(1)}px ${a.toFixed(1)}px ${r.toFixed(1)}px ${d})`
  );
}
function G0(t, n, e) {
  const { color: o, alpha: s } = Tt(t, n);
  if (!o) return e;
  const i = o.startsWith("#") ? o : `#${o}`, { r, g: c, b: l } = Et(i);
  return `rgba(${r},${c},${l},${s.toFixed(3)})`;
}
function Ds(t, n) {
  const e = t.style.filter.trim();
  t.style.filter = e ? `${e} ${n}` : n;
}
function H0(t, n, e) {
  const o = X(n.numAttr("rad") ?? 0);
  if (!(o > 0)) return;
  const { color: s, alpha: i } = Tt(n, e);
  if (!s || i <= 0) return;
  const r = s.startsWith("#") ? s : `#${s}`, { r: c, g: l, b: a } = Et(r);
  Ds(
    t,
    `drop-shadow(0px 0px ${o.toFixed(1)}px rgba(${c},${l},${a},${i.toFixed(3)}))`
  );
}
function W0(t, n, e) {
  const o = X(e.numAttr("rad") ?? 0);
  if (!(o > 0)) return;
  const s = Math.max(0, Math.min(n.size.w, n.size.h) / 2), i = s > 0 ? Math.min(o, s) : o, r = `${Number(i.toFixed(4))}px`, c = "var(--pptx-soft-edge-radius)", l = [
    `linear-gradient(to right, transparent 0, black ${c}, black calc(100% - ${c}), transparent 100%)`,
    `linear-gradient(to bottom, transparent 0, black ${c}, black calc(100% - ${c}), transparent 100%)`
  ].join(", ");
  t.style.setProperty("--pptx-soft-edge-radius", r), t.style.setProperty("-webkit-mask-image", l), t.style.setProperty("mask-image", l), t.style.setProperty("-webkit-mask-size", "100% 100%"), t.style.setProperty("mask-size", "100% 100%"), t.style.setProperty("-webkit-mask-repeat", "no-repeat"), t.style.setProperty("mask-repeat", "no-repeat"), t.style.setProperty("-webkit-mask-composite", "source-in"), t.style.setProperty("mask-composite", "intersect");
  const a = t.style;
  a.webkitMaskImage = l, a.maskImage = l, a.webkitMaskComposite = "source-in", a.maskComposite = "intersect";
}
function U0(t, n) {
  const e = X(n.numAttr("dist") ?? 0), o = (n.numAttr("stA") ?? 5e4) / 1e5, s = (n.numAttr("endA") ?? 0) / 1e5, i = Math.max(0, Math.min(100, (n.numAttr("stPos") ?? 0) / 1e3)), r = Math.max(0, Math.min(100, (n.numAttr("endPos") ?? 1e5) / 1e3)), c = `linear-gradient(to bottom, rgba(255,255,255,${o.toFixed(3)}) ${i.toFixed(1)}%, rgba(255,255,255,${s.toFixed(3)}) ${r.toFixed(1)}%)`, l = `below ${e.toFixed(1)}px ${c}`;
  t.style.setProperty("-webkit-box-reflect", l), t.style.webkitBoxReflect = l;
}
function V0(t, n, e) {
  if (!n.hlinkClick || !e.onNavigate) return;
  const { action: o, rId: s } = n.hlinkClick, i = s ? e.slide.rels.get(s) : void 0, r = Es(e, o, i);
  if (r !== void 0) {
    t.style.cursor = "pointer", t.title = n.hlinkClick.tooltip || Ps(r), t.addEventListener("click", (c) => {
      c.stopPropagation(), e.onNavigate({ slideIndex: r });
    });
    return;
  }
  s && (!i || !Ie(i.targetMode) || !Ro(i.target) || (t.style.cursor = "pointer", t.title = n.hlinkClick.tooltip || i.target, t.addEventListener("click", (c) => {
    c.stopPropagation(), e.onNavigate({ url: i.target });
  })));
}
function _0(t) {
  let n = 1;
  const e = t.child("alphaModFix");
  e.exists() && (n *= (e.numAttr("amt") ?? 1e5) / 1e5);
  const o = t.child("alphaMod");
  o.exists() && (n *= (o.numAttr("val") ?? 1e5) / 1e5);
  const s = t.child("alphaOff");
  return s.exists() && (n += (s.numAttr("val") ?? 0) / 1e5), Math.max(0, Math.min(1, n));
}
function X0(t, n, e) {
  const o = Os(t.mediaRId, n);
  let s;
  if (t.blipEmbed) {
    const i = n.slide.rels.get(t.blipEmbed);
    i && (s = Qc(i, n));
  }
  if (o) {
    const i = document.createElement("video");
    i.src = o, i.preload = "none", i.controls = !0, i.style.width = "100%", i.style.height = "100%", i.style.objectFit = "contain", i.style.backgroundColor = "#000", s && (i.poster = s), e.appendChild(i);
  } else if (s) {
    const i = document.createElement("img");
    i.src = s, i.style.width = "100%", i.style.height = "100%", i.style.objectFit = "fill", e.appendChild(i);
    const r = document.createElement("div");
    r.style.position = "absolute", r.style.inset = "0", r.style.display = "flex", r.style.alignItems = "center", r.style.justifyContent = "center", r.style.backgroundColor = "rgba(0,0,0,0.3)", r.style.color = "#fff", r.style.fontSize = "24px", r.textContent = "▶", e.appendChild(r);
  } else
    Oe(e, "Video");
}
function Y0(t, n, e) {
  const o = Os(t.mediaRId, n);
  if (o) {
    if (t.blipEmbed) {
      const i = n.slide.rels.get(t.blipEmbed);
      if (i) {
        const r = Qc(i, n);
        if (r) {
          const c = document.createElement("img");
          c.src = r, c.style.width = "100%", c.style.height = "calc(100% - 32px)", c.style.objectFit = "contain", e.appendChild(c);
        }
      }
    }
    const s = document.createElement("audio");
    s.src = o, s.preload = "none", s.controls = !0, s.style.width = "100%", s.style.position = "absolute", s.style.bottom = "0", s.style.left = "0", e.appendChild(s);
  } else
    Oe(e, "Audio");
}
function Os(t, n) {
  if (!t) return;
  const e = n.slide.rels.get(t);
  if (!e) return;
  if (Ie(e.targetMode))
    return An(e.target) ? e.target : void 0;
  const o = Ln(e.target, n.presentation.media);
  if (!o) return;
  const { mediaPath: s, data: i } = o;
  return tn(s, i, n.mediaUrlCache);
}
function Oe(t, n) {
  const e = document.createElement("div");
  e.style.width = "100%", e.style.height = "100%", e.style.display = "flex", e.style.alignItems = "center", e.style.justifyContent = "center", e.style.backgroundColor = "#f0f0f0", e.style.color = "#888", e.style.fontSize = "12px", e.style.border = "1px dashed #ccc", e.textContent = n, t.appendChild(e);
}
function q0(t, n) {
  var r;
  const e = ((r = n.split(".").pop()) == null ? void 0 : r.toUpperCase()) || "Unknown", o = document.createElement("div");
  o.style.width = "100%", o.style.height = "100%", o.style.display = "flex", o.style.flexDirection = "column", o.style.alignItems = "center", o.style.justifyContent = "center", o.style.backgroundColor = "#f5f5f5", o.style.color = "#999", o.style.fontSize = "11px", o.style.border = "1px dashed #ddd";
  const s = document.createElement("div");
  s.style.fontSize = "24px", s.style.marginBottom = "4px", s.textContent = "🖼";
  const i = document.createElement("div");
  i.textContent = `Unsupported format: ${e}`, o.appendChild(s), o.appendChild(i), t.appendChild(o);
}
function Q0(t, n, e, o, s) {
  const i = d0(t);
  switch (i.type) {
    case "pdf":
      K0(i.data, o, n, e, s);
      break;
    case "bitmap":
      J0(i.imageData, o, e, s);
      break;
  }
}
function K0(t, n, e, o, s) {
  var l;
  const i = `${s}:emf-pdf`, r = o.mediaUrlCache.get(i);
  if (r) {
    n.appendChild(Ao(r));
    return;
  }
  const c = C0(t, e.size.w, e.size.h, o.pdfjs, o.signal).then((a) => {
    var d;
    if (a) {
      if ((d = o.signal) != null && d.aborted) {
        URL.revokeObjectURL(a);
        return;
      }
      o.mediaUrlCache.set(i, a), n.appendChild(Ao(a));
    }
  }).catch(() => {
  });
  (l = o.asyncTasks) == null || l.push(c);
}
function J0(t, n, e, o) {
  var a;
  const s = `${o}:emf-bitmap`, i = e.mediaUrlCache.get(s);
  if (i) {
    n.appendChild(Ao(i));
    return;
  }
  const r = document.createElement("canvas");
  r.width = t.width, r.height = t.height;
  const c = r.getContext("2d");
  if (!c) return;
  c.putImageData(t, 0, 0);
  const l = new Promise((d) => {
    r.toBlob((h) => {
      if (h) {
        const u = URL.createObjectURL(h);
        e.mediaUrlCache.set(s, u), n.appendChild(Ao(u));
      }
      d();
    }, "image/png");
  });
  (a = e.asyncTasks) == null || a.push(l);
}
function Ao(t) {
  const n = document.createElement("img");
  return n.src = t, n.style.width = "100%", n.style.height = "100%", n.style.objectFit = "fill", n.style.display = "block", n.draggable = !1, n;
}
function j0(t, n, e, o) {
  const s = t.allChildren();
  if (s.length < 2) return;
  const { color: i } = Tt(s[0], n), { color: r } = Tt(s[1], n);
  if (!i || !r) return;
  const c = i.startsWith("#") ? i : `#${i}`, l = r.startsWith("#") ? r : `#${r}`, a = Et(c), d = Et(l), h = () => {
    const u = e.naturalWidth, x = e.naturalHeight;
    if (!u || !x) return;
    const p = document.createElement("canvas");
    p.width = u, p.height = x;
    const $ = p.getContext("2d");
    if (!$) return;
    $.drawImage(e, 0, 0);
    const g = $.getImageData(0, 0, u, x), f = g.data;
    for (let y = 0; y < f.length; y += 4) {
      const m = (0.2126 * f[y] + 0.7152 * f[y + 1] + 0.0722 * f[y + 2]) / 255;
      f[y] = Math.round(a.r + (d.r - a.r) * m), f[y + 1] = Math.round(a.g + (d.g - a.g) * m), f[y + 2] = Math.round(a.b + (d.b - a.b) * m);
    }
    $.putImageData(g, 0, 0), e.src = p.toDataURL();
  };
  e.complete && e.naturalWidth ? h() : e.addEventListener("load", h, { once: !0 });
}
function tf(t, n) {
  const e = (t.numAttr("bright") ?? 0) / 1e5, o = (t.numAttr("contrast") ?? 0) / 1e5;
  if (e === 0 && o === 0) return;
  const s = () => {
    const i = n.naturalWidth, r = n.naturalHeight;
    if (!i || !r) return;
    const c = document.createElement("canvas");
    c.width = i, c.height = r;
    const l = c.getContext("2d");
    if (!l) return;
    l.drawImage(n, 0, 0);
    const a = l.getImageData(0, 0, i, r), d = a.data;
    for (let h = 0; h < d.length; h += 4)
      for (let u = 0; u < 3; u++) {
        let x = d[h + u] / 255;
        o !== 0 && (x = 0.5 + (x - 0.5) * (1 + o)), x += e, d[h + u] = Math.round(Math.max(0, Math.min(255, x * 255)));
      }
    l.putImageData(a, 0, 0), n.src = c.toDataURL();
  };
  n.complete && n.naturalWidth ? s() : n.addEventListener("load", s, { once: !0 });
}
function ef(t, n) {
  const e = (t.numAttr("thresh") ?? 5e4) / 1e5, o = () => {
    const s = n.naturalWidth, i = n.naturalHeight;
    if (!s || !i) return;
    const r = document.createElement("canvas");
    r.width = s, r.height = i;
    const c = r.getContext("2d");
    if (!c) return;
    c.drawImage(n, 0, 0);
    const l = c.getImageData(0, 0, s, i), a = l.data;
    for (let d = 0; d < a.length; d += 4) {
      const u = (0.2126 * a[d] + 0.7152 * a[d + 1] + 0.0722 * a[d + 2]) / 255 >= e ? 255 : 0;
      a[d] = u, a[d + 1] = u, a[d + 2] = u;
    }
    c.putImageData(l, 0, 0), n.src = r.toDataURL();
  };
  n.complete && n.naturalWidth ? o() : n.addEventListener("load", o, { once: !0 });
}
const jc = /* @__PURE__ */ new Map([
  // Themed-Style-1
  ["{2D5ABB26-0587-4C30-8999-92F81FD0307C}", ["Themed-Style-1", ""]],
  ["{3C2FFA5D-87B4-456A-9821-1D502468CF0F}", ["Themed-Style-1", "accent1"]],
  ["{284E427A-3D55-4303-BF80-6455036E1DE7}", ["Themed-Style-1", "accent2"]],
  ["{69C7853C-536D-4A76-A0AE-DD22124D55A5}", ["Themed-Style-1", "accent3"]],
  ["{775DCB02-9BB8-47FD-8907-85C794F793BA}", ["Themed-Style-1", "accent4"]],
  ["{35758FB7-9AC5-4552-8A53-C91805E547FA}", ["Themed-Style-1", "accent5"]],
  ["{08FB837D-C827-4EFA-A057-4D05807E0F7C}", ["Themed-Style-1", "accent6"]],
  // Themed-Style-2
  ["{5940675A-B579-460E-94D1-54222C63F5DA}", ["Themed-Style-2", ""]],
  ["{D113A9D2-9D6B-4929-AA2D-F23B5EE8CBE7}", ["Themed-Style-2", "accent1"]],
  ["{18603FDC-E32A-4AB5-989C-0864C3EAD2B8}", ["Themed-Style-2", "accent2"]],
  ["{306799F8-075E-4A3A-A7F6-7FBC6576F1A4}", ["Themed-Style-2", "accent3"]],
  ["{E269D01E-BC32-4049-B463-5C60D7B0CCD2}", ["Themed-Style-2", "accent4"]],
  ["{327F97BB-C833-4FB7-BDE5-3F7075034690}", ["Themed-Style-2", "accent5"]],
  ["{638B1855-1B75-4FBE-930C-398BA8C253C6}", ["Themed-Style-2", "accent6"]],
  // Light-Style-1
  ["{9D7B26C5-4107-4FEC-AEDC-1716B250A1EF}", ["Light-Style-1", ""]],
  ["{3B4B98B0-60AC-42C2-AFA5-B58CD77FA1E5}", ["Light-Style-1", "accent1"]],
  ["{0E3FDE45-AF77-4B5C-9715-49D594BDF05E}", ["Light-Style-1", "accent2"]],
  ["{C083E6E3-FA7D-4D7B-A595-EF9225AFEA82}", ["Light-Style-1", "accent3"]],
  ["{D27102A9-8310-4765-A935-A1911B00CA55}", ["Light-Style-1", "accent4"]],
  ["{5FD0F851-EC5A-4D38-B0AD-8093EC10F338}", ["Light-Style-1", "accent5"]],
  ["{68D230F3-CF80-4859-8CE7-A43EE81993B5}", ["Light-Style-1", "accent6"]],
  // Light-Style-2
  ["{7E9639D4-E3E2-4D34-9284-5A2195B3D0D7}", ["Light-Style-2", ""]],
  ["{69012ECD-51FC-41F1-AA8D-1B2483CD663E}", ["Light-Style-2", "accent1"]],
  ["{72833802-FEF1-4C79-8D5D-14CF1EAF98D9}", ["Light-Style-2", "accent2"]],
  ["{F2DE63D5-997A-4646-A377-4702673A728D}", ["Light-Style-2", "accent3"]],
  ["{17292A2E-F333-43FB-9621-5CBBE7FDCDCB}", ["Light-Style-2", "accent4"]],
  ["{5A111915-BE36-4E01-A7E5-04B1672EAD32}", ["Light-Style-2", "accent5"]],
  ["{912C8C85-51F0-491E-9774-3900AFEF0FD7}", ["Light-Style-2", "accent6"]],
  // Light-Style-3
  ["{616DA210-FB5B-4158-B5E0-FEB733F419BA}", ["Light-Style-3", ""]],
  ["{BC89EF96-8CEA-46FF-86C4-4CE0E7609802}", ["Light-Style-3", "accent1"]],
  ["{5DA37D80-6434-44D0-A028-1B22A696006F}", ["Light-Style-3", "accent2"]],
  ["{8799B23B-EC83-4686-B30A-512413B5E67A}", ["Light-Style-3", "accent3"]],
  ["{ED083AE6-46FA-4A59-8FB0-9F97EB10719F}", ["Light-Style-3", "accent4"]],
  ["{BDBED569-4797-4DF1-A0F4-6AAB3CD982D8}", ["Light-Style-3", "accent5"]],
  ["{E8B1032C-EA38-4F05-BA0D-38AFFFC7BED3}", ["Light-Style-3", "accent6"]],
  // Medium-Style-1
  ["{793D81CF-94F2-401A-BA57-92F5A7B2D0C5}", ["Medium-Style-1", ""]],
  ["{B301B821-A1FF-4177-AEE7-76D212191A09}", ["Medium-Style-1", "accent1"]],
  ["{9DCAF9ED-07DC-4A11-8D7F-57B35C25682E}", ["Medium-Style-1", "accent2"]],
  ["{1FECB4D8-DB02-4DC6-A0A2-4F2EBAE1DC90}", ["Medium-Style-1", "accent3"]],
  ["{1E171933-4619-4E11-9A3F-F7608DF75F80}", ["Medium-Style-1", "accent4"]],
  ["{FABFCF23-3B69-468F-B69F-88F6DE6A72F2}", ["Medium-Style-1", "accent5"]],
  ["{10A1B5D5-9B99-4C35-A422-299274C87663}", ["Medium-Style-1", "accent6"]],
  // Medium-Style-2
  ["{073A0DAA-6AF3-43AB-8588-CEC1D06C72B9}", ["Medium-Style-2", ""]],
  ["{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}", ["Medium-Style-2", "accent1"]],
  ["{21E4AEA4-8DFA-4A89-87EB-49C32662AFE0}", ["Medium-Style-2", "accent2"]],
  ["{F5AB1C69-6EDB-4FF4-983F-18BD219EF322}", ["Medium-Style-2", "accent3"]],
  ["{00A15C55-8517-42AA-B614-E9B94910E393}", ["Medium-Style-2", "accent4"]],
  ["{7DF18680-E054-41AD-8BC1-D1AEF772440D}", ["Medium-Style-2", "accent5"]],
  ["{93296810-A885-4BE3-A3E7-6D5BEEA58F35}", ["Medium-Style-2", "accent6"]],
  // Medium-Style-3
  ["{8EC20E35-A176-4012-BC5E-935CFFF8708E}", ["Medium-Style-3", ""]],
  ["{6E25E649-3F16-4E02-A733-19D2CDBF48F0}", ["Medium-Style-3", "accent1"]],
  ["{85BE263C-DBD7-4A20-BB59-AAB30ACAA65A}", ["Medium-Style-3", "accent2"]],
  ["{EB344D84-9AFB-497E-A393-DC336BA19D2E}", ["Medium-Style-3", "accent3"]],
  ["{EB9631B5-78F2-41C9-869B-9F39066F8104}", ["Medium-Style-3", "accent4"]],
  ["{74C1A8A3-306A-4EB7-A6B1-4F7E0EB9C5D6}", ["Medium-Style-3", "accent5"]],
  ["{2A488322-F2BA-4B5B-9748-0D474271808F}", ["Medium-Style-3", "accent6"]],
  // Medium-Style-4
  ["{D7AC3CCA-C797-4891-BE02-D94E43425B78}", ["Medium-Style-4", ""]],
  ["{69CF1AB2-1976-4502-BF36-3FF5EA218861}", ["Medium-Style-4", "accent1"]],
  ["{8A107856-5554-42FB-B03E-39F5DBC370BA}", ["Medium-Style-4", "accent2"]],
  ["{0505E3EF-67EA-436B-97B2-0124C06EBD24}", ["Medium-Style-4", "accent3"]],
  ["{C4B1156A-380E-4F78-BDF5-A606A8083BF9}", ["Medium-Style-4", "accent4"]],
  ["{22838BEF-8BB2-4498-84A7-C5851F593DF1}", ["Medium-Style-4", "accent5"]],
  ["{16D9F66E-5EB9-4882-86FB-DCBF35E3C3E4}", ["Medium-Style-4", "accent6"]],
  // Dark-Style-1
  ["{E8034E78-7F5D-4C2E-B375-FC64B27BC917}", ["Dark-Style-1", ""]],
  ["{125E5076-3810-47DD-B79F-674D7AD40C01}", ["Dark-Style-1", "accent1"]],
  ["{37CE84F3-28C3-443E-9E96-99CF82512B78}", ["Dark-Style-1", "accent2"]],
  ["{D03447BB-5D67-496B-8E87-E561075AD55C}", ["Dark-Style-1", "accent3"]],
  ["{E929F9F4-4A8F-4326-A1B4-22849713DDAB}", ["Dark-Style-1", "accent4"]],
  ["{8FD4443E-F989-4FC4-A0C8-D5A2AF1F390B}", ["Dark-Style-1", "accent5"]],
  ["{AF606853-7671-496A-8E4F-DF71F8EC918B}", ["Dark-Style-1", "accent6"]],
  // Dark-Style-2 (only 4 variants)
  ["{5202B0CA-FC54-4496-8BCA-5EF66A818D29}", ["Dark-Style-2", ""]],
  ["{0660B408-B3CF-4A94-85FC-2B1E0A45F4A2}", ["Dark-Style-2", "accent1"]],
  ["{91EBBBCC-DAD2-459C-BE2E-F6DE35CF9A28}", ["Dark-Style-2", "accent3"]],
  ["{46F890A9-2807-4EBB-B81D-B2AA78EC7F39}", ["Dark-Style-2", "accent5"]]
]), nf = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
function wt(t, n) {
  const e = n ? `<a:${n}/>` : "";
  return `<a:fill><a:solidFill><a:schemeClr val="${t}">${e}</a:schemeClr></a:solidFill></a:fill>`;
}
function V(t, n) {
  const e = n ? `<a:${n}/>` : "";
  return `<a:ln w="12700"><a:solidFill><a:schemeClr val="${t}">${e}</a:schemeClr></a:solidFill></a:ln>`;
}
function of(t, n) {
  const e = n ? ' b="on"' : "", o = t ? `<a:schemeClr val="${t}"/>` : "";
  return `<a:tcTxStyle${e}>${o}</a:tcTxStyle>`;
}
function _(t, n) {
  if (!n.textColor && !n.bold && !n.fill && !n.borders) return "";
  const e = [`<a:${t}>`];
  if ((n.textColor || n.bold) && e.push(of(n.textColor ?? "", n.bold)), e.push("<a:tcStyle>"), n.fill && e.push(n.fill), n.borders) {
    e.push("<a:tcBdr>");
    for (const [o, s] of Object.entries(n.borders))
      e.push(`<a:${o}>${s}</a:${o}>`);
    e.push("</a:tcBdr>");
  }
  return e.push("</a:tcStyle>"), e.push(`</a:${t}>`), e.join("");
}
function sf(t, n) {
  const e = t !== "", o = e ? t : "tx1", s = [];
  if (e) {
    const i = {
      left: V(o),
      right: V(o),
      top: V(o),
      bottom: V(o),
      insideH: V(o),
      insideV: V(o)
    };
    s.push(_("wholeTbl", { textColor: "dk1", borders: i }));
    const r = wt(o, 'alpha val="40000"');
    s.push(_("band1H", { fill: r })), s.push(_("band1V", { fill: r })), s.push(
      _("firstRow", {
        textColor: "lt1",
        bold: !0,
        fill: wt(o),
        borders: {
          left: V(o),
          right: V(o),
          top: V(o),
          bottom: V("lt1")
        }
      })
    ), s.push(
      _("lastRow", {
        bold: !0,
        borders: {
          left: V(o),
          right: V(o),
          top: V(o),
          bottom: V(o)
        }
      })
    );
    const c = {
      left: V(o),
      right: V(o),
      top: V(o),
      bottom: V(o),
      insideH: V(o)
    };
    s.push(_("firstCol", { bold: !0, borders: c })), s.push(_("lastCol", { bold: !0, borders: c }));
  } else {
    s.push(_("wholeTbl", { textColor: "tx1" }));
    const i = wt("tx1", 'alpha val="40000"');
    s.push(_("band1H", { fill: i })), s.push(_("band1V", { fill: i }));
  }
  return Ce(n, "Themed-Style-1", s.join(""));
}
function rf(t, n) {
  const e = t !== "", o = [];
  if (e) {
    const s = t, i = `<a:tblBg><a:fillRef idx="1"><a:schemeClr val="${s}"/></a:fillRef></a:tblBg>`, r = {
      left: V(s, 'tint val="50000"'),
      right: V(s, 'tint val="50000"'),
      top: V(s, 'tint val="50000"'),
      bottom: V(s, 'tint val="50000"')
    };
    o.push(_("wholeTbl", { textColor: "lt1", borders: r }));
    const c = wt("lt1", 'alpha val="20000"');
    return o.push(_("band1H", { fill: c })), o.push(_("band1V", { fill: c })), o.push(
      _("firstRow", { textColor: "lt1", bold: !0, borders: { bottom: V("lt1") } })
    ), o.push(_("lastRow", { bold: !0, borders: { top: V("lt1") } })), o.push(_("firstCol", { bold: !0, borders: { right: V("lt1") } })), o.push(_("lastCol", { bold: !0, borders: { left: V("lt1") } })), Ce(n, "Themed-Style-2", i + o.join(""));
  } else {
    const s = {
      left: V("tx1", 'tint val="50000"'),
      right: V("tx1", 'tint val="50000"'),
      top: V("tx1", 'tint val="50000"'),
      bottom: V("tx1", 'tint val="50000"'),
      insideH: V("tx1"),
      insideV: V("tx1")
    };
    o.push(_("wholeTbl", { borders: s }));
    const i = wt("tx1", 'alpha val="20000"');
    return o.push(_("band1H", { fill: i })), o.push(_("band1V", { fill: i })), Ce(n, "Themed-Style-2", o.join(""));
  }
}
function cf(t, n) {
  const e = t || "tx1", o = [];
  o.push(
    _("wholeTbl", {
      textColor: "tx1",
      borders: {
        top: V(e),
        bottom: V(e)
      }
    })
  );
  const s = wt(e, 'alpha val="20000"');
  return o.push(_("band1H", { fill: s })), o.push(_("band1V", { fill: s })), o.push(
    _("firstRow", {
      textColor: "tx1",
      bold: !0,
      borders: { bottom: V(e) }
    })
  ), o.push(_("lastRow", { bold: !0, borders: { top: V(e) } })), o.push(_("firstCol", { textColor: "tx1", bold: !0 })), o.push(_("lastCol", { textColor: "tx1", bold: !0 })), Ce(n, "Light-Style-1", o.join(""));
}
function lf(t, n) {
  const e = t || "tx1", o = [];
  return o.push(
    _("wholeTbl", {
      textColor: "tx1",
      borders: {
        left: V(e),
        right: V(e),
        top: V(e),
        bottom: V(e)
      }
    })
  ), o.push(
    _("band1H", {
      borders: {
        top: V(e),
        bottom: V(e)
      }
    })
  ), o.push(
    _("band1V", {
      borders: { left: V(e), right: V(e) }
    })
  ), o.push(
    _("band2V", {
      borders: { left: V(e), right: V(e) }
    })
  ), o.push(_("firstRow", { textColor: "bg1", bold: !0, fill: wt(e) })), o.push(_("lastRow", { bold: !0, borders: { top: V(e) } })), o.push(_("firstCol", { bold: !0 })), o.push(_("lastCol", { bold: !0 })), Ce(n, "Light-Style-2", o.join(""));
}
function af(t, n) {
  const e = t || "tx1", o = [];
  o.push(
    _("wholeTbl", {
      textColor: "tx1",
      borders: {
        left: V(e),
        right: V(e),
        top: V(e),
        bottom: V(e),
        insideH: V(e),
        insideV: V(e)
      }
    })
  );
  const s = wt(e, 'alpha val="20000"');
  return o.push(_("band1H", { fill: s })), o.push(_("band1V", { fill: s })), o.push(
    _("firstRow", {
      textColor: e,
      bold: !0,
      borders: { bottom: V(e) }
    })
  ), o.push(_("lastRow", { bold: !0, borders: { top: V(e) } })), o.push(_("firstCol", { bold: !0 })), o.push(_("lastCol", { bold: !0 })), Ce(n, "Light-Style-3", o.join(""));
}
function df(t, n) {
  const e = t || "dk1", o = [];
  o.push(
    _("wholeTbl", {
      textColor: "dk1",
      fill: wt("lt1"),
      borders: {
        left: V(e),
        right: V(e),
        top: V(e),
        bottom: V(e),
        insideH: V(e)
      }
    })
  );
  const s = wt(e, 'tint val="20000"');
  return o.push(_("band1H", { fill: s })), o.push(_("band1V", { fill: s })), o.push(_("firstRow", { textColor: "lt1", bold: !0, fill: wt(e) })), o.push(
    _("lastRow", {
      bold: !0,
      fill: wt("lt1"),
      borders: { top: V(e) }
    })
  ), o.push(_("firstCol", { bold: !0 })), o.push(_("lastCol", { bold: !0 })), Ce(n, "Medium-Style-1", o.join(""));
}
function hf(t, n) {
  const e = t || "dk1", o = [];
  o.push(
    _("wholeTbl", {
      textColor: "dk1",
      fill: wt(e, 'tint val="20000"'),
      borders: {
        left: V("lt1"),
        right: V("lt1"),
        top: V("lt1"),
        bottom: V("lt1"),
        insideH: V("lt1"),
        insideV: V("lt1")
      }
    })
  );
  const s = wt(e, 'tint val="40000"');
  return o.push(_("band1H", { fill: s })), o.push(_("band1V", { fill: s })), o.push(
    _("firstRow", {
      textColor: "lt1",
      bold: !0,
      fill: wt(e),
      borders: { bottom: V("lt1") }
    })
  ), o.push(
    _("lastRow", {
      textColor: "lt1",
      bold: !0,
      fill: wt(e),
      borders: { top: V("lt1") }
    })
  ), o.push(_("firstCol", { textColor: "lt1", bold: !0, fill: wt(e) })), o.push(_("lastCol", { textColor: "lt1", bold: !0, fill: wt(e) })), Ce(n, "Medium-Style-2", o.join(""));
}
function uf(t, n) {
  const e = t || "dk1", o = [];
  o.push(
    _("wholeTbl", {
      textColor: "dk1",
      fill: wt("lt1"),
      borders: {
        top: V("dk1"),
        bottom: V("dk1")
      }
    })
  );
  const s = wt("dk1", 'tint val="20000"');
  return o.push(_("band1H", { fill: s })), o.push(_("band1V", { fill: s })), o.push(
    _("firstRow", {
      textColor: "lt1",
      bold: !0,
      fill: wt(e),
      borders: { bottom: V("dk1") }
    })
  ), o.push(
    _("lastRow", {
      bold: !0,
      fill: wt("lt1"),
      borders: { top: V("dk1") }
    })
  ), o.push(_("firstCol", { textColor: "lt1", bold: !0, fill: wt(e) })), o.push(_("lastCol", { textColor: "lt1", bold: !0, fill: wt(e) })), Ce(n, "Medium-Style-3", o.join(""));
}
function ff(t, n) {
  const e = t || "dk1", o = [];
  o.push(
    _("wholeTbl", {
      textColor: "dk1",
      fill: wt(e, 'tint val="20000"'),
      borders: {
        left: V(e),
        right: V(e),
        top: V(e),
        bottom: V(e),
        insideH: V(e),
        insideV: V(e)
      }
    })
  );
  const s = wt(e, 'tint val="40000"');
  return o.push(_("band1H", { fill: s })), o.push(_("band1V", { fill: s })), o.push(
    _("firstRow", {
      textColor: e,
      bold: !0,
      fill: wt(e, 'tint val="20000"')
    })
  ), o.push(
    _("lastRow", {
      bold: !0,
      fill: wt("dk1", 'tint val="20000"'),
      borders: { top: V("dk1") }
    })
  ), o.push(_("firstCol", { bold: !0 })), o.push(_("lastCol", { bold: !0 })), Ce(n, "Medium-Style-4", o.join(""));
}
function $f(t, n) {
  const e = t !== "", o = e ? t : "dk1", s = e ? "shade" : "tint", i = [];
  i.push(
    _("wholeTbl", {
      textColor: "dk1",
      fill: wt(o, `${s} val="20000"`)
    })
  );
  const r = wt(o, `${s} val="40000"`);
  return i.push(_("band1H", { fill: r })), i.push(_("band1V", { fill: r })), i.push(
    _("firstRow", {
      textColor: "lt1",
      bold: !0,
      fill: wt("dk1"),
      borders: { bottom: V("lt1") }
    })
  ), i.push(
    _("lastRow", {
      bold: !0,
      fill: wt(o),
      borders: { top: V("lt1") }
    })
  ), i.push(
    _("firstCol", {
      bold: !0,
      fill: wt(o, `${s} val="60000"`),
      borders: { right: V("lt1") }
    })
  ), i.push(
    _("lastCol", {
      bold: !0,
      fill: wt(o, `${s} val="60000"`),
      borders: { left: V("lt1") }
    })
  ), Ce(n, "Dark-Style-1", i.join(""));
}
function pf(t, n) {
  const e = t || "dk1", o = [];
  let s;
  t === "" ? s = "dk1" : t === "accent1" ? s = "accent2" : t === "accent3" ? s = "accent4" : t === "accent5" ? s = "accent6" : s = e, o.push(
    _("wholeTbl", {
      textColor: "dk1",
      fill: wt(e, 'tint val="20000"')
    })
  );
  const i = wt(e, 'tint val="40000"');
  return o.push(_("band1H", { fill: i })), o.push(_("band1V", { fill: i })), o.push(
    _("firstRow", {
      textColor: "lt1",
      bold: !0,
      fill: wt(s)
    })
  ), o.push(
    _("lastRow", {
      bold: !0,
      fill: wt(e, 'tint val="20000"'),
      borders: { top: V("dk1") }
    })
  ), o.push(_("firstCol", { bold: !0 })), o.push(_("lastCol", { bold: !0 })), Ce(n, "Dark-Style-2", o.join(""));
}
function Ce(t, n, e) {
  return `<a:tblStyle ${nf} styleId="${t}" styleName="${n}">${e}</a:tblStyle>`;
}
const xf = {
  "Themed-Style-1": sf,
  "Themed-Style-2": rf,
  "Light-Style-1": cf,
  "Light-Style-2": lf,
  "Light-Style-3": af,
  "Medium-Style-1": df,
  "Medium-Style-2": hf,
  "Medium-Style-3": uf,
  "Medium-Style-4": ff,
  "Dark-Style-1": $f,
  "Dark-Style-2": pf
}, Cr = /* @__PURE__ */ new Map();
function yf(t) {
  const n = Cr.get(t);
  if (n) return n;
  const e = jc.get(t);
  if (!e) return;
  const [o, s] = e, i = xf[o];
  if (!i) return;
  const r = i(s, t), c = ge(r);
  if (c.exists())
    return Cr.set(t, c), c;
}
jc.size;
function On(t, n) {
  if (bn(t), n.includes("gradient") && n.includes(" 0 0 / ")) {
    const e = ws(n);
    if (e) {
      t.style.backgroundImage = e.imageLayers, t.style.backgroundSize = "8px 8px", t.style.backgroundRepeat = "repeat", t.style.backgroundColor = e.color;
      return;
    }
  }
  n.includes("gradient") || n.startsWith("url(") || n.includes("repeating-") ? t.style.background = n : t.style.backgroundColor = n;
}
function bn(t) {
  t.style.background = "", t.style.backgroundColor = "", t.style.backgroundImage = "", t.style.backgroundRepeat = "", t.style.backgroundSize = "";
}
function gf(t, n) {
  if (!t || !n.presentation.tableStyles) return;
  const e = n.presentation.tableStyles;
  for (const o of e.children("tblStyle"))
    if (o.attr("styleId") === t)
      return o;
  for (const o of e.children())
    if (o.localName === "tblStyle" && o.attr("styleId") === t)
      return o;
  return yf(t);
}
function mf(t, n, e, o, s, i) {
  const r = [], c = ($, g) => {
    if (!i) return !1;
    const f = i.attr($);
    if (f !== void 0) return ue(f);
    const y = i.child(g);
    return y.exists() ? ue(y.attr("val"), !0) : !1;
  }, l = c("bandRow", "bandRow"), a = c("bandCol", "bandCol"), d = c("firstRow", "firstRow"), h = c("lastRow", "lastRow"), u = c("firstCol", "firstCol"), x = c("lastCol", "lastCol"), p = t.child("wholeTbl");
  if (p.exists() && r.push(p), l) {
    const $ = d ? n - 1 : n;
    if ($ >= 0 && $ % 2 === 1) {
      const g = t.child("band2H");
      g.exists() && r.push(g);
    } else if ($ >= 0 && $ % 2 === 0) {
      const g = t.child("band1H");
      g.exists() && r.push(g);
    }
  }
  if (a)
    if (e % 2 === 1) {
      const $ = t.child("band2V");
      $.exists() && r.push($);
    } else {
      const $ = t.child("band1V");
      $.exists() && r.push($);
    }
  if (d && n === 0) {
    const $ = t.child("firstRow");
    $.exists() && r.push($);
  }
  if (h && n === o - 1) {
    const $ = t.child("lastRow");
    $.exists() && r.push($);
  }
  if (u && e === 0) {
    const $ = t.child("firstCol");
    $.exists() && r.push($);
  }
  if (x && e === s - 1) {
    const $ = t.child("lastCol");
    $.exists() && r.push($);
  }
  return r;
}
function bf(t, n) {
  for (let e = t.length - 1; e >= 0; e--) {
    const o = t[e].child("tcTxStyle");
    if (!o.exists()) continue;
    const s = {}, i = o.attr("b");
    i !== void 0 && (s.bold = ue(i));
    const r = o.attr("i");
    r !== void 0 && (s.italic = ue(r));
    for (const l of o.allChildren()) {
      const a = l.localName;
      if (a === "schemeClr" || a === "solidFill" || a === "srgbClr" || a === "scrgbClr" || a === "prstClr" || a === "sysClr") {
        const { color: d, alpha: h } = Tt(l, n), u = d.startsWith("#") ? d : `#${d}`;
        if (h < 1) {
          const { r: x, g: p, b: $ } = Et(u);
          s.color = `rgba(${x},${p},${$},${h.toFixed(3)})`;
        } else
          s.color = u;
        break;
      }
    }
    const c = o.child("font");
    if (c.exists()) {
      const l = c.child("latin").attr("typeface"), a = c.child("ea").attr("typeface"), d = c.child("cs").attr("typeface"), h = gn([l, a, d], n);
      h.length > 0 && (s.fontFamily = h);
    }
    if (!s.fontFamily) {
      const l = o.child("fontRef");
      if (l.exists()) {
        const a = l.attr("idx");
        if (a === "major") {
          const d = gn(["+mj-lt", "+mj-ea", "+mj-cs"], n);
          d.length > 0 && (s.fontFamily = d);
        } else if (a === "minor") {
          const d = gn(["+mn-lt", "+mn-ea", "+mn-cs"], n);
          d.length > 0 && (s.fontFamily = d);
        }
      }
    }
    return s;
  }
}
function Mf(t, n, e) {
  const o = n.child("fill");
  if (!o.exists()) return !1;
  if (o.child("noFill").exists())
    return bn(t), t.style.background = "transparent", !0;
  const i = o.child("solidFill");
  if (i.exists()) {
    bn(t);
    const { color: l, alpha: a } = Tt(i, e), d = l.startsWith("#") ? l : `#${l}`;
    if (a < 1) {
      const { r: h, g: u, b: x } = Et(d);
      t.style.backgroundColor = `rgba(${h},${u},${x},${a.toFixed(3)})`;
    } else
      t.style.backgroundColor = d;
    return !0;
  }
  const r = Ge(o, e);
  if (r)
    return On(t, r), !0;
  const c = o.child("fillRef");
  if (c.exists()) {
    const { fillCss: l } = ks(c, e);
    return On(t, l), !0;
  }
  return !1;
}
function Lf(t, n, e, o, s, i, r) {
  const c = n.child("tcBdr");
  if (!c.exists()) return;
  const l = [
    ["top", "borderTop"],
    ["bottom", "borderBottom"],
    ["left", "borderLeft"],
    ["right", "borderRight"]
  ];
  c.child("insideH").exists() && o !== void 0 && i !== void 0 && (o < i - 1 && l.push(["insideH", "borderBottom"]), o > 0 && l.push(["insideH", "borderTop"])), c.child("insideV").exists() && s !== void 0 && r !== void 0 && (s < r - 1 && l.push(["insideV", "borderRight"]), s > 0 && l.push(["insideV", "borderLeft"]));
  for (const [h, u] of l) {
    const x = c.child(h);
    if (!x.exists()) continue;
    const p = x.child("ln");
    if (p.exists()) {
      if (p.child("noFill").exists()) continue;
      const f = Zn(p, e);
      f.width > 0 && f.color !== "transparent" && (t.style[u] = `${Math.max(f.width, 0.5)}px ${f.dash} ${f.color}`);
      continue;
    }
    const $ = x.child("lnRef");
    if ($.exists()) {
      const g = $.numAttr("idx") ?? 0;
      if (g === 0) continue;
      const { color: f, alpha: y } = Tt($, e), m = f.startsWith("#") ? f : `#${f}`;
      let b = 1;
      if (e.theme.lineStyles && e.theme.lineStyles.length >= g) {
        const v = e.theme.lineStyles[g - 1].numAttr("w") ?? 12700;
        b = X(v);
      }
      const M = y < 1 ? `rgba(${Et(m).r},${Et(m).g},${Et(m).b},${y.toFixed(3)})` : m;
      b > 0 && (t.style[u] = `${Math.max(b, 0.5)}px solid ${M}`);
    }
  }
}
function vf(t, n, e) {
  const o = n.child("tblBg");
  if (!o.exists()) return;
  const s = o.child("fillRef");
  if (s.exists()) {
    const { fillCss: c } = ks(s, e);
    On(t, c);
    return;
  }
  const i = o.child("solidFill");
  if (i.exists()) {
    bn(t);
    const { color: c, alpha: l } = Tt(i, e), a = c.startsWith("#") ? c : `#${c}`;
    if (l < 1) {
      const { r: d, g: h, b: u } = Et(a);
      t.style.backgroundColor = `rgba(${d},${h},${u},${l.toFixed(3)})`;
    } else
      t.style.backgroundColor = a;
    return;
  }
  const r = Ge(o, e);
  r && On(t, r);
}
function Fr(t) {
  const n = [];
  return t.flipH && n.push("scaleX(-1)"), t.flipV && n.push("scaleY(-1)"), n.join(" ");
}
function Af(t, n) {
  const e = document.createElement("div");
  e.style.position = "absolute", e.style.left = `${t.position.x}px`, e.style.top = `${t.position.y}px`, e.style.width = `${t.size.w}px`, e.style.height = `${t.size.h}px`, e.style.overflow = "hidden";
  const o = [];
  t.rotation !== 0 && o.push(`rotate(${t.rotation}deg)`), t.flipH && o.push("scaleX(-1)"), t.flipV && o.push("scaleY(-1)"), o.length > 0 && (e.style.transform = o.join(" "));
  const s = gf(t.tableStyleId, n), i = t.properties, r = t.rows.length, c = t.columns.length, l = document.createElement("table");
  l.style.borderCollapse = "collapse", l.style.width = "100%", l.style.height = "100%", l.style.tableLayout = "fixed", s && vf(l, s, n);
  const a = t.columns.reduce((x, p) => x + p, 0);
  if (a > 0 && t.columns.length > 0) {
    const x = document.createElement("colgroup");
    for (const p of t.columns) {
      const $ = document.createElement("col");
      $.style.width = `${p / a * 100}%`, x.appendChild($);
    }
    l.appendChild(x);
  }
  const d = t.rows.reduce((x, p) => x + p.height, 0), h = document.createElement("tbody");
  let u = 0;
  for (let x = 0; x < t.rows.length; x++) {
    const p = t.rows[x], $ = document.createElement("tr");
    p.height > 0 && d > 0 && ($.style.height = `${p.height / d * 100}%`), u = 0;
    for (const g of p.cells) {
      if (g.hMerge || g.vMerge) {
        g.vMerge && !g.hMerge && (u += g.gridSpan);
        continue;
      }
      const f = document.createElement("td");
      f.style.overflow = "hidden", g.gridSpan > 1 && (f.colSpan = g.gridSpan), g.rowSpan > 1 && (f.rowSpan = g.rowSpan);
      let y = [];
      if (s) {
        y = mf(s, x, u, r, c, i);
        for (const b of y) {
          const M = b.child("tcStyle");
          M.exists() && (Mf(f, M, n), Lf(f, M, n, x, u, r, c));
        }
      }
      Sf(f, g, n);
      const m = y.length > 0 ? bf(y, n) : void 0;
      if (g.textBody) {
        const b = Fr(t) ? document.createElement("div") : f, M = Fr(t);
        M && b !== f && (b.style.width = "100%", b.style.height = "100%", b.style.transform = M, b.style.transformOrigin = "center center");
        const L = {
          defaultLineHeight: "1",
          trimOuterParagraphSpacing: !0,
          ...m ? {
            cellTextColor: m.color,
            cellTextBold: m.bold,
            cellTextItalic: m.italic,
            cellTextFontFamily: m.fontFamily
          } : {}
        };
        Ec(g.textBody, void 0, n, b, L), b !== f && f.appendChild(b);
      }
      $.appendChild(f), u += g.gridSpan;
    }
    h.appendChild($);
  }
  return l.appendChild(h), e.appendChild(l), e;
}
function Sf(t, n, e) {
  const o = n.properties;
  if ((o == null ? void 0 : o.attr("horzOverflow")) === "overflow" && (t.style.overflow = "visible"), o) {
    if (o.child("noFill").exists())
      bn(t), t.style.background = "transparent";
    else if (o.child("solidFill").exists()) {
      const u = o.child("solidFill");
      bn(t);
      const { color: x, alpha: p } = Tt(u, e), $ = x.startsWith("#") ? x : `#${x}`;
      if (p < 1) {
        const { r: g, g: f, b: y } = Et($);
        t.style.backgroundColor = `rgba(${g},${f},${y},${p.toFixed(3)})`;
      } else
        t.style.backgroundColor = $;
    } else {
      const u = Ge(o, e);
      u && On(t, u);
    }
    ao(t, o, "lnT", "borderTop", e), ao(t, o, "lnB", "borderBottom", e), ao(t, o, "lnL", "borderLeft", e), ao(t, o, "lnR", "borderRight", e);
  }
  const s = o == null ? void 0 : o.numAttr("marL"), i = o == null ? void 0 : o.numAttr("marR"), r = o == null ? void 0 : o.numAttr("marT"), c = o == null ? void 0 : o.numAttr("marB"), l = 91440;
  t.style.paddingLeft = `${X(s ?? l)}px`, t.style.paddingRight = `${X(i ?? l)}px`, t.style.paddingTop = `${X(r ?? 45720)}px`, t.style.paddingBottom = `${X(c ?? 45720)}px`;
  const a = o == null ? void 0 : o.attr("anchor"), d = {
    t: "top",
    ctr: "middle",
    b: "bottom"
  };
  t.style.verticalAlign = d[a || "t"] || "top";
}
function ao(t, n, e, o, s) {
  const i = n.child(e);
  if (!i.exists()) return;
  if (i.child("noFill").exists()) {
    t.style[o] = "none";
    return;
  }
  const c = Zn(i, s);
  c.width > 0 && c.color !== "transparent" && (t.style[o] = `${Math.max(c.width, 0.5)}px ${c.dash} ${c.color}`);
}
function kr(t) {
  return t.nodeType !== "table" && t.nodeType !== "chart";
}
function Cf(t) {
  const n = (t % 360 + 360) % 360;
  return Math.abs(n - 90) < 1e-4 || Math.abs(n - 270) < 1e-4;
}
function Ff(t, n, e, o) {
  if (t.nodeType !== "shape") return;
  const s = t;
  if (!s.textBoxBounds) return;
  const i = o ? e : n, r = o ? n : e, c = s.textBoxBounds;
  s.textBoxBounds = {
    ...c,
    x: c.x * i,
    y: c.y * r,
    w: c.w * i,
    h: c.h * r
  };
}
function kf(t, n, e) {
  const { color: o, alpha: s } = Tt(t, n);
  if (!o) return e;
  const i = o.startsWith("#") ? o : `#${o}`, { r, g: c, b: l } = Et(i);
  return `rgba(${r},${c},${l},${s.toFixed(3)})`;
}
function wf(t, n, e, o) {
  const s = e.numAttr("dir") ?? 0, i = X(e.numAttr("dist") ?? 0), r = X(e.numAttr("blurRad") ?? 0), c = s / 6e4, l = i * Math.cos(c * Math.PI / 180), a = i * Math.sin(c * Math.PI / 180), d = kf(e, o, "rgba(0,0,0,0.4)"), h = e.numAttr("sx"), u = e.numAttr("sy");
  if (h != null && u != null && h > 0 && u > 0) {
    const x = h / 1e5, p = u / 1e5, $ = n.size.w * (x - 1) / 2, g = n.size.h * (p - 1) / 2, f = Math.max(0, ($ + g) / 2);
    t.style.boxShadow = `${l.toFixed(1)}px ${a.toFixed(1)}px ${r.toFixed(1)}px ${f.toFixed(1)}px ${d}`;
    return;
  }
  t.style.filter = `drop-shadow(${l.toFixed(1)}px ${a.toFixed(1)}px ${r.toFixed(1)}px ${d})`;
}
function Ef(t, n) {
  const e = X(n.numAttr("dist") ?? 0), o = (n.numAttr("stA") ?? 5e4) / 1e5, s = (n.numAttr("endA") ?? 0) / 1e5, i = Math.max(0, Math.min(100, (n.numAttr("stPos") ?? 0) / 1e3)), r = Math.max(0, Math.min(100, (n.numAttr("endPos") ?? 1e5) / 1e3)), c = `linear-gradient(to bottom, rgba(255,255,255,${o.toFixed(3)}) ${i.toFixed(1)}%, rgba(255,255,255,${s.toFixed(3)}) ${r.toFixed(1)}%)`, l = `below ${e.toFixed(1)}px ${c}`;
  t.style.setProperty("-webkit-box-reflect", l), t.style.webkitBoxReflect = l;
}
function Pf(t, n, e, o) {
  const s = o.child("effectLst");
  if (!s.exists()) return;
  const i = s.child("outerShdw");
  i.exists() && wf(t, n, i, e);
  const r = s.child("reflection");
  r.exists() && Ef(t, r);
}
function Bf(t, n, e) {
  const o = document.createElement("div");
  o.style.position = "absolute", o.style.left = `${t.position.x}px`, o.style.top = `${t.position.y}px`, o.style.width = `${t.size.w}px`, o.style.height = `${t.size.h}px`;
  const s = [];
  t.rotation !== 0 && s.push(`rotate(${t.rotation}deg)`), s.length > 0 && (o.style.transform = s.join(" "), o.style.transformOrigin = "center center");
  const i = t.childOffset, r = t.childExtent, c = t.size.w, l = t.size.h, a = t.source.child("grpSpPr"), d = { ...n };
  if (a.exists()) {
    Pf(o, t, n, a);
    const f = ["solidFill", "gradFill", "blipFill", "pattFill"];
    for (const y of f)
      if (a.child(y).exists()) {
        d.groupFillNode = a;
        break;
      }
    !d.groupFillNode && a.child("grpFill").exists() && n.groupFillNode && (d.groupFillNode = n.groupFillNode);
  }
  const h = /* @__PURE__ */ new Map(), u = (f) => (h.has(f) || h.set(f, Rf(t.children[f], n, t)), h.get(f));
  let x = null, p = null;
  if (t.children.length === 6 && r.w > 0 && r.h > 0) {
    const f = (b) => b.child("spPr").child("prstGeom").attr("prst"), y = t.children.slice(0, 3).every((b) => f(b) === "pie"), m = t.children.slice(3, 6).every((b) => f(b) === "circularArrow");
    if (y && m) {
      const b = [0, 1, 2].map((M) => u(M)).filter(Boolean);
      if (b.length === 3) {
        const M = Math.max(...b.map((E) => E.size.w)), L = Math.max(...b.map((E) => E.size.h)), v = Math.min(M, L, r.w, r.h), k = i.x + r.w / 2, A = i.y + r.h / 2, S = k - v / 2, w = A - v / 2;
        x = {
          x: (S - i.x) / r.w * c,
          y: (w - i.y) / r.h * l,
          w: v / r.w * c,
          h: v / r.h * l
        };
        const F = b[0].size;
        b.every(
          (E) => Math.abs(E.size.w - F.w) < 0.01 && Math.abs(E.size.h - F.h) < 0.01
        ) && (p = new Map(
          b.map((E, P) => [
            P,
            {
              x: (E.position.x + E.size.w / 2 - k) / r.w * c,
              y: (E.position.y + E.size.h / 2 - A) / r.h * l
            }
          ])
        ));
      }
    }
  }
  const g = (x ? [3, 4, 5, 0, 1, 2] : void 0) ?? t.children.map((f, y) => y);
  for (const f of g)
    try {
      const y = u(f);
      if (!y) continue;
      if (r.w > 0 && r.h > 0) {
        const b = c / r.w, M = l / r.h, L = Cf(y.rotation), v = y.position, k = y.size;
        if (L) {
          const A = v.x + (k.w - k.h) / 2, S = v.y + (k.h - k.w) / 2, w = {
            w: k.w * M,
            h: k.h * b
          };
          y.position = {
            x: (A - i.x) * b - (w.w - w.h) / 2,
            y: (S - i.y) * M - (w.h - w.w) / 2
          }, y.size = w;
        } else
          y.position = {
            x: (v.x - i.x) * b,
            y: (v.y - i.y) * M
          }, y.size = {
            w: k.w * b,
            h: k.h * M
          };
        Ff(y, b, M, L);
      }
      if (t.flipH && (y.position = {
        ...y.position,
        x: c - y.position.x - y.size.w
      }, kr(y) && (y.flipH = !y.flipH)), t.flipV && (y.position = {
        ...y.position,
        y: l - y.position.y - y.size.h
      }, kr(y) && (y.flipV = !y.flipV)), x && f < 3 && y.nodeType === "shape") {
        const b = y.size.w, M = y.size.h, L = (p == null ? void 0 : p.get(f)) ?? { x: 0, y: 0 };
        y.position = { x: x.x + L.x, y: x.y + L.y }, y.size = { w: x.w, h: x.h };
        const v = y;
        if (b > 0 && M > 0 && v.textBoxBounds) {
          const k = v.textBoxBounds;
          v.textBoxBounds = {
            x: k.x / b * x.w,
            y: k.y / M * x.h,
            w: k.w / b * x.w,
            h: k.h / M * x.h
          };
        }
      }
      const m = e(y, d);
      o.appendChild(m);
    } catch {
      const y = document.createElement("div");
      y.style.position = "absolute", y.style.border = "1px dashed #ff6b6b", y.style.backgroundColor = "rgba(255,107,107,0.1)", y.style.fontSize = "10px", y.style.color = "#cc0000", y.style.display = "flex", y.style.alignItems = "center", y.style.justifyContent = "center", y.style.padding = "2px", y.textContent = "Group child error", o.appendChild(y);
    }
  return o;
}
function Rf(t, n, e) {
  const o = Nn(t, {
    rels: n.slide.rels,
    partPath: n.partPath ?? n.slide.slidePath,
    diagramDrawings: n.presentation.diagramDrawings,
    skipPlaceholders: n.skipPlaceholderChildren
  });
  return o && Bo(o, n.layout, n.master, { parentGroup: e }), o;
}
const po = 1e4;
function Ns(t) {
  const n = t.child("ptCount").numAttr("val");
  let e = -1;
  for (const i of t.children("pt")) {
    const r = i.numAttr("idx");
    r !== void 0 && Number.isInteger(r) && r >= 0 && r < po && (e = Math.max(e, r));
  }
  const o = e + 1;
  if (n === void 0 || !Number.isFinite(n) || n < 0)
    return o;
  const s = Math.floor(n);
  return s > po ? o : Math.min(Math.max(s, o), po);
}
function Zs(t, n) {
  return t !== void 0 && Number.isInteger(t) && t >= 0 && t < n && t < po;
}
function wr(t) {
  const n = t.child("strRef").exists() ? t.child("strRef").child("strCache") : t.child("strCache");
  if (!n.exists()) {
    const s = t.child("numRef").exists() ? t.child("numRef").child("numCache") : t.child("numCache");
    return s.exists() ? Of(s) : [];
  }
  const e = Ns(n), o = new Array(e).fill("");
  for (const s of n.children("pt")) {
    const i = s.numAttr("idx");
    if (Zs(i, e)) {
      const r = s.child("v").text();
      o[i] = r;
    }
  }
  return o;
}
function If(t) {
  const n = t.child("numRef").exists() ? t.child("numRef").child("numCache") : t.child("numCache");
  if (!n.exists()) return;
  const e = n.child("formatCode");
  return e.exists() && e.text() || void 0;
}
function Tf(t) {
  const n = [];
  let e = "", o = !1;
  for (let s = 0; s < t.length; s++) {
    const i = t[s];
    if (i === '"') {
      o = !o, e += i;
      continue;
    }
    if (i === ";" && !o) {
      n.push(e), e = "";
      continue;
    }
    e += i;
  }
  return n.push(e), n;
}
function zf(t) {
  const n = t.replace(/\[[^\]]+\]/g, "");
  let e = "";
  for (let o = 0; o < n.length; o++) {
    const s = n[o];
    if (s === '"') {
      for (o++; o < n.length && n[o] !== '"'; ) o++;
      continue;
    }
    if (s === "\\") {
      o + 1 < n.length && (e += n[++o]);
      continue;
    }
    if (s === "_" || s === "*") {
      o++;
      continue;
    }
    e += s;
  }
  return e.trim();
}
function Df(t, n) {
  const e = Tf(n), o = t < 0 && e.length > 1, s = o ? e[1] : e[0], i = zf(s);
  if (!/[#0]/.test(i) || !i.includes(",") && e.length === 1)
    return;
  const r = i.match(/\.(0+|#+)/), c = r ? r[1].length : 0, l = i.includes(","), d = (o ? Math.abs(t) : t).toLocaleString("en-US", {
    useGrouping: l,
    minimumFractionDigits: r != null && r[1].includes("0") ? c : 0,
    maximumFractionDigits: c
  });
  return o ? i.includes("(") && i.includes(")") ? `(${d})` : i.includes("-") ? `-${d}` : d : d;
}
function me(t, n) {
  if (!n || n === "General")
    return Number.isInteger(t) ? String(t) : parseFloat(t.toFixed(2)).toString();
  if (n.includes("%")) {
    const s = n.match(/0\.(0+)%/), i = s ? s[1].length : 0;
    return `${(t * 100).toFixed(i)}%`;
  }
  const e = Df(t, n);
  if (e !== void 0) return e;
  const o = n.match(/\.(0+|#+)/);
  if (o) {
    const s = o[1].length;
    return parseFloat(t.toFixed(s)).toString();
  }
  return /^[#0,]+$/.test(n.replace(/[[\]"\\]/g, "")) ? Math.round(t).toString() : Number.isInteger(t) ? String(t) : parseFloat(t.toFixed(2)).toString();
}
function Er(t) {
  return ms(t).values;
}
function ms(t) {
  const n = t.child("numRef").exists() ? t.child("numRef").child("numCache") : t.child("numCache");
  if (!n.exists()) return { values: [], blankIndices: /* @__PURE__ */ new Set() };
  const e = Ns(n), o = new Array(e).fill(0), s = /* @__PURE__ */ new Set();
  for (let i = 0; i < e; i++) s.add(i);
  for (const i of n.children("pt")) {
    const r = i.numAttr("idx");
    if (Zs(r, e)) {
      const c = i.child("v").text().trim(), l = parseFloat(c);
      c !== "" && !isNaN(l) && (o[r] = l, s.delete(r));
    }
  }
  return { values: o, blankIndices: s };
}
function Of(t) {
  const n = Ns(t), e = new Array(n).fill(""), o = t.child("formatCode").text(), s = o && /[yYmMdD]/.test(o) && !/[#0]/.test(o);
  for (const i of t.children("pt")) {
    const r = i.numAttr("idx");
    if (Zs(r, n)) {
      const c = i.child("v").text();
      s && c ? e[r] = Nf(parseFloat(c)) : e[r] = c;
    }
  }
  return e;
}
function Nf(t) {
  if (!Number.isFinite(t) || t < 1) return String(t);
  const n = t > 59 ? t - 1 : t, e = Date.UTC(1899, 11, 31), o = new Date(e + n * 864e5);
  return `${o.getUTCFullYear()}/${o.getUTCMonth() + 1}/${o.getUTCDate()}`;
}
function we(t) {
  return t.exists() ? tl(t.attr("val"), !0) : !1;
}
function tl(t, n) {
  return ue(t, n);
}
wo.use([
  ca,
  la,
  aa,
  da,
  ha,
  ua,
  fa,
  $a,
  pa,
  xa,
  ya,
  ga,
  ma,
  ba,
  Ma,
  La
]);
function Fe(t, n) {
  try {
    const { color: e } = Tt(t, n);
    return e.startsWith("#") ? e : `#${e}`;
  } catch {
    return;
  }
}
function Zf(t, n) {
  const e = t.numAttr("pos");
  if (e !== void 0)
    for (const o of t.allChildren()) {
      const s = o.localName;
      if (s === "srgbClr" || s === "schemeClr" || s === "sysClr" || s === "prstClr")
        try {
          const i = Tt(t, n);
          return { color: i.color.startsWith("#") ? i.color : `#${i.color}`, alpha: i.alpha, pos: e / 1e5 };
        } catch {
          if (s === "sysClr") {
            const i = o.attr("lastClr");
            if (i) {
              const r = o.child("alpha"), c = r.exists() ? (r.numAttr("val") ?? 1e5) / 1e5 : 1;
              return { color: `#${i}`, alpha: c, pos: e / 1e5 };
            }
          }
          return;
        }
    }
}
function Gf(t, n) {
  const e = t.child("spPr");
  if (!e.exists()) return;
  const o = e.child("solidFill");
  if (o.exists()) {
    const r = Fe(o, n);
    if (r) return r;
  }
  const s = e.child("gradFill");
  if (s.exists()) {
    const r = Vf(s, n);
    if (r) return r;
  }
  const i = e.child("ln");
  if (i.exists()) {
    const r = i.child("solidFill");
    if (r.exists()) {
      const c = Fe(r, n);
      if (c) return c;
    }
  }
}
function Hf(t) {
  const n = t.child("spPr").child("ln").numAttr("w");
  if (!(n === void 0 || n <= 0))
    return Math.max(1, Number((n / 12700).toFixed(3)));
}
function el(t) {
  return Number(Ia(t).toFixed(3));
}
function Wf(t) {
  return t.child("spPr").child("ln").child("noFill").exists();
}
function Uf(t) {
  return t === "dotted" ? "dotted" : t === "dashed" ? "dashed" : "solid";
}
function Gs(t, n) {
  if (!t.exists() || t.child("noFill").exists()) return;
  const e = Zn(t, n);
  if (!(e.width <= 0 || e.color === "transparent"))
    return {
      color: e.color,
      width: Math.max(e.width, 0.5),
      type: Uf(e.dash)
    };
}
function Vf(t, n) {
  const e = t.child("gsLst");
  if (!e.exists()) return;
  const o = [];
  for (const u of e.children("gs")) {
    const x = Zf(u, n);
    if (x) {
      const p = x.color.replace("#", ""), $ = parseInt(p.substring(0, 2), 16), g = parseInt(p.substring(2, 4), 16), f = parseInt(p.substring(4, 6), 16);
      o.push({
        offset: x.pos,
        color: `rgba(${$},${g},${f},${x.alpha})`
      });
    }
  }
  if (o.length < 2) return;
  o.sort((u, x) => u.offset - x.offset);
  const s = t.child("lin"), c = (s.exists() ? s.numAttr("ang") ?? 54e5 : 54e5) / 6e4 * Math.PI / 180, l = 0.5 - 0.5 * Math.cos(c), a = 0.5 - 0.5 * Math.sin(c), d = 0.5 + 0.5 * Math.cos(c), h = 0.5 + 0.5 * Math.sin(c);
  return new wo.graphic.LinearGradient(l, a, d, h, o);
}
function _f(t, n) {
  const e = t.children("dPt");
  if (e.length === 0) return;
  const o = [];
  for (const s of e) {
    const i = s.child("idx").numAttr("val");
    if (i === void 0) continue;
    const r = s.child("spPr");
    if (!r.exists()) continue;
    const c = {}, l = r.child("solidFill");
    if (l.exists()) {
      const d = Fe(l, n);
      d && (c.color = d);
    }
    const a = Gs(r.child("ln"), n);
    if (a && (c.borderColor = a.color, c.borderWidth = a.width, c.borderType = a.type), Object.keys(c).length > 0) {
      for (; o.length <= i; ) o.push(void 0);
      o[i] = c;
    }
  }
  return o.length > 0 ? o : void 0;
}
const To = Symbol("pptxExplicitFontSize"), pn = "#000000", Xf = 10, bs = "#898989", nl = {
  color: bs,
  width: 1,
  type: "solid"
}, as = {
  color: "#868686",
  width: 1,
  type: "solid"
}, Yf = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"];
function Hs(t) {
  return t[To] = !0, t;
}
function Ms(t) {
  return !!(t && typeof t == "object" && t[To]);
}
const qf = [
  "barChart",
  "bar3DChart",
  "lineChart",
  "line3DChart",
  "areaChart",
  "area3DChart",
  "pieChart",
  "pie3DChart",
  "doughnutChart",
  "radarChart",
  "scatterChart",
  "bubbleChart",
  "stockChart",
  "surface3DChart"
];
function ol(t) {
  const n = t.child("tx");
  if (!n.exists()) return;
  const e = n.child("rich");
  if (e.exists()) {
    const s = [];
    for (const i of e.children("p")) {
      const r = [];
      for (const l of i.allChildren()) {
        if (l.localName === "br") {
          r.push(`
`);
          continue;
        }
        if (l.localName !== "r" && l.localName !== "fld")
          continue;
        const a = l.child("t").text();
        a && r.push(a);
      }
      const c = r.join("");
      c && s.push(c);
    }
    if (s.length > 0) return s.join(`
`);
  }
  const o = n.child("strRef");
  if (o.exists()) {
    const i = o.child("strCache").children("pt");
    if (i.length > 0) return i[0].child("v").text();
  }
}
function Pr(t) {
  return t.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\|/g, "\\|");
}
function sl(t) {
  if (!t) return;
  const n = {
    ...t.color ? { color: t.color } : {},
    ...t.fontSize !== void 0 ? { fontSize: t.fontSize } : {},
    ...t.fontFamily ? { fontFamily: t.fontFamily } : {},
    ...t.textShadowColor ? { textShadowColor: t.textShadowColor } : {},
    ...t.textShadowBlur !== void 0 ? { textShadowBlur: t.textShadowBlur } : {},
    ...t.textShadowOffsetX !== void 0 ? { textShadowOffsetX: t.textShadowOffsetX } : {},
    ...t.textShadowOffsetY !== void 0 ? { textShadowOffsetY: t.textShadowOffsetY } : {}
  };
  return t.bold !== void 0 && (n.fontWeight = t.bold ? "bold" : "normal"), Object.keys(n).length > 0 ? n : void 0;
}
function il(t, n) {
  const e = t.child("txPr");
  if (e.exists())
    for (const o of e.children("p")) {
      const s = o.child("pPr");
      if (!s.exists()) continue;
      const i = s.child("defRPr");
      if (!i.exists()) continue;
      const r = i.child("solidFill");
      if (r.exists())
        return Fe(r, n);
    }
}
function Qf(t) {
  const n = t.replace(/^#/, ""), e = n.length === 3 ? n[0] + n[0] + n[1] + n[1] + n[2] + n[2] : n, o = parseInt(e, 16);
  return { r: o >> 16 & 255, g: o >> 8 & 255, b: o & 255 };
}
function Kf(t, n) {
  const e = t.startsWith("#") ? t : `#${t}`;
  if (n >= 1) return e;
  const { r: o, g: s, b: i } = Qf(e);
  return `rgba(${o},${s},${i},${n.toFixed(3)})`;
}
function Jf(t, n) {
  const e = t.child("effectLst").child("outerShdw");
  if (e.exists())
    try {
      const { color: o, alpha: s } = Tt(e, n);
      if (!o || s <= 0) return;
      const i = X(e.numAttr("dist") ?? 0), r = X(e.numAttr("blurRad") ?? 0), c = (e.numAttr("dir") ?? 0) / 6e4, l = i * Math.cos(c * Math.PI / 180), a = i * Math.sin(c * Math.PI / 180);
      return {
        textShadowColor: Kf(o, s),
        textShadowBlur: r,
        textShadowOffsetX: l,
        textShadowOffsetY: a
      };
    } catch {
      return;
    }
}
function rl(t, n) {
  if (!t.exists()) return;
  const e = {}, o = t.child("solidFill");
  if (o.exists()) {
    const h = Fe(o, n);
    h && (e.color = h);
  }
  const s = t.numAttr("sz");
  s !== void 0 && s > 0 && (e.fontSize = Math.round(s / 100), e[To] = !0);
  const i = t.attr("b");
  i !== void 0 && (e.bold = ue(i));
  const r = t.child("latin").attr("typeface"), c = t.child("ea").attr("typeface"), l = t.child("cs").attr("typeface"), a = gn([r, c, l], n, [
    t.attr("lang"),
    t.attr("altLang")
  ]);
  a.length > 0 && (e.fontFamily = mn(a));
  const d = Jf(t, n);
  return d && Object.assign(e, d), e.color || e.fontSize !== void 0 || e.bold !== void 0 || e.fontFamily !== void 0 || e.textShadowColor !== void 0 ? e : void 0;
}
function cl(t, n) {
  for (const e of t.children("p")) {
    const o = e.child("pPr");
    if (!o.exists()) continue;
    const s = o.child("defRPr"), i = rl(s, n);
    if (i) return i;
  }
}
function Hn(t, n) {
  const e = t.child("txPr");
  if (e.exists())
    return cl(e, n);
}
function ll(t, n) {
  return Hn(t, n) ?? cl(t.child("tx").child("rich"), n);
}
function jf(t, n) {
  const e = t.child("tx").child("rich");
  if (!e.exists()) return;
  const o = [], s = {};
  let i = 0;
  for (const r of e.children("p")) {
    const c = [];
    for (const a of r.allChildren()) {
      if (a.localName === "br") {
        c.push(`
`);
        continue;
      }
      if (a.localName !== "r" && a.localName !== "fld")
        continue;
      const d = a.child("t").text();
      if (!d) continue;
      const h = sl(
        rl(a.child("rPr"), n)
      );
      if (!h) {
        c.push(Pr(d));
        continue;
      }
      const u = `r${i++}`;
      s[u] = h, c.push(`{${u}|${Pr(d)}}`);
    }
    const l = c.join("");
    l && o.push(l);
  }
  if (Object.keys(s).length !== 0)
    return { text: o.join(`
`), rich: s };
}
function t$(t) {
  const n = gn(["+mn-lt", "+mn-ea", "+mj-lt", "+mj-ea"], t);
  return n.length > 0 ? mn(n) : void 0;
}
const Ls = {
  deleted: !1,
  tickLblPos: "nextTo",
  hasMajorGridlines: !1,
  orientation: "minMax"
};
function Br(t, n) {
  const e = t.theme.colorScheme.get(n);
  return e == null ? void 0 : e.replace("#", "").toUpperCase();
}
function e$(t) {
  if (Br(t, "accent1") === "4F81BD" && Br(t, "accent2") === "C0504D")
    return "#000000";
}
function n$(t, n) {
  const e = t.child("txPr");
  if (e.exists())
    for (const o of e.children("p")) {
      const s = o.child("pPr");
      if (!s.exists()) continue;
      const i = s.child("defRPr");
      if (!i.exists()) continue;
      const r = i.child("solidFill");
      if (r.exists())
        return Fe(r, n);
    }
}
function o$(t, n) {
  const e = t.child("spPr").child("ln");
  if (!e.exists()) return;
  const o = e.child("solidFill");
  if (o.exists())
    return Fe(o, n);
}
function s$(t, n) {
  const e = t.child("majorGridlines").child("spPr").child("ln");
  return Gs(e, n);
}
function i$(t) {
  const e = (t.child("tx").child("rich").child("bodyPr").exists() ? t.child("tx").child("rich").child("bodyPr") : t.child("txPr").child("bodyPr")).numAttr("rot");
  if (e === void 0) return;
  const o = e / 6e4;
  return Number(o.toFixed(3));
}
function r$(t, n) {
  const e = t.child("title");
  if (!e.exists()) return {};
  const o = ol(e);
  return o ? {
    title: o,
    titleStyle: ll(e, n),
    titleRotation: i$(e)
  } : {};
}
function So(t, n) {
  if (!t.exists()) return { ...Ls };
  const e = we(t.child("delete")), o = t.child("tickLblPos").attr("val") || "nextTo", s = t.child("crosses").attr("val"), i = t.child("numFmt"), r = i.exists() && i.attr("formatCode") || void 0, c = t.child("scaling"), l = c.child("min"), a = c.child("max"), d = l.exists() ? parseFloat(l.attr("val") || "") : void 0, h = a.exists() ? parseFloat(a.attr("val") || "") : void 0, u = t.child("majorGridlines").exists(), x = t.child("majorTickMark").attr("val"), p = c.child("orientation").attr("val") || "minMax", $ = Hn(t, n), g = ($ == null ? void 0 : $.color) ?? n$(t, n), f = $ == null ? void 0 : $.fontSize, y = e$(n), m = o$(t, n) ?? y, b = u ? s$(t, n) ?? (y ? { ...nl, color: y } : void 0) : void 0, M = r$(t, n);
  return {
    deleted: e,
    tickLblPos: o,
    crosses: s,
    numFmt: r && r !== "General" ? r : void 0,
    min: d !== void 0 && !isNaN(d) ? d : void 0,
    max: h !== void 0 && !isNaN(h) ? h : void 0,
    hasMajorGridlines: u,
    majorTickMark: x,
    orientation: p,
    ...M,
    labelColor: g,
    labelFontSize: f,
    lineColor: m,
    majorGridlineStyle: b
  };
}
function al(t) {
  return t != null && t.exists() ? t.children("axId").map((n) => n.attr("val")).filter((n) => n !== void 0 && n !== "") : [];
}
function Rr(t, n, e) {
  var o;
  if (e) {
    for (const s of n) {
      const r = t.children(s).find((c) => c.child("axId").attr("val") === e);
      if (r) return r;
    }
    return new ve(null);
  }
  for (const s of n) {
    const i = t.children(s);
    if ((o = i[0]) != null && o.exists()) return i[0];
  }
  return new ve(null);
}
function zo(t, n, e) {
  const o = al(e), s = o[0], i = o[1], r = Rr(t, ["valAx"], i), c = Rr(t, ["catAx", "dateAx"], s);
  return {
    valueAxis: So(r, n),
    categoryAxis: So(c, n)
  };
}
function dl(t, n) {
  const e = t.children("valAx");
  let o = { ...Ls }, s = { ...Ls };
  for (const i of e) {
    const r = i.child("axPos").attr("val") ?? "", c = So(i, n);
    r === "b" || r === "t" ? o = c : (r === "l" || r === "r") && (s = c);
  }
  return e.length === 1 && (s = So(e[0], n)), { xAxis: o, yAxis: s };
}
function Re(t, n, e) {
  var o, s, i, r;
  if (n.deleted) {
    t.axisLabel = { ...t.axisLabel || {}, show: !1 }, t.axisLine = { show: !1 }, t.axisTick = { show: !1 }, e === "value" && (t.splitLine = { show: !1 });
    return;
  }
  if (n.orientation === "maxMin" && (t.inverse = !0), n.crosses === "autoZero") {
    const c = t.axisLine || {};
    t.axisLine = { ...c, onZero: !0 };
  }
  if (n.title) {
    t.name = n.title, t.nameLocation = "middle", t.nameGap = e === "value" ? 42 : 28, n.titleRotation !== void 0 && (t.nameRotate = n.titleRotation);
    const c = {};
    (o = n.titleStyle) != null && o.color && (c.color = n.titleStyle.color), ((s = n.titleStyle) == null ? void 0 : s.fontSize) !== void 0 && (c.fontSize = n.titleStyle.fontSize), (i = n.titleStyle) != null && i.fontFamily && (c.fontFamily = n.titleStyle.fontFamily), ((r = n.titleStyle) == null ? void 0 : r.bold) !== void 0 && (c.fontWeight = n.titleStyle.bold ? "bold" : "normal"), Object.keys(c).length > 0 && (t.nameTextStyle = c);
  }
  if (n.tickLblPos === "none" && (t.axisLabel = { ...t.axisLabel || {}, show: !1 }), n.majorTickMark === "none") {
    const c = t.axisTick || {};
    t.axisTick = { ...c, show: !1 };
  } else if (!n.deleted) {
    const c = t.axisTick || {}, l = c.lineStyle || {};
    l.color === void 0 && (t.axisTick = {
      ...c,
      lineStyle: { ...l, color: n.lineColor ?? bs }
    });
  }
  if (e === "value" && (n.min !== void 0 && (t.min = n.min), n.max !== void 0 && (t.max = n.max)), e === "value" && !n.deleted && n.tickLblPos !== "none") {
    const c = t.axisLabel || {};
    if (!c.formatter) {
      const l = n.numFmt;
      t.axisLabel = {
        ...c,
        formatter: (a) => me(a, l)
      };
    }
  }
  if (!n.deleted && n.tickLblPos !== "none") {
    const c = t.axisLabel || {};
    c.fontSize === void 0 && (t.axisLabel = {
      ...c,
      fontSize: Xf
    });
  }
  if (e === "value")
    if (!n.hasMajorGridlines)
      t.splitLine = { show: !1 };
    else if (n.majorGridlineStyle) {
      const c = t.splitLine || {}, l = c.lineStyle || {};
      t.splitLine = {
        ...c,
        show: !0,
        lineStyle: { ...l, ...n.majorGridlineStyle }
      };
    } else {
      const c = t.splitLine || {}, l = c.lineStyle || {};
      t.splitLine = {
        ...c,
        show: !0,
        lineStyle: { ...nl, ...l }
      };
    }
  if (n.labelColor || !n.deleted) {
    const c = t.axisLabel || {}, l = n.labelColor ?? (c.color === void 0 ? pn : void 0);
    l && (t.axisLabel = { ...c, color: l });
  }
  if (n.labelFontSize !== void 0) {
    const c = t.axisLabel || {};
    t.axisLabel = { ...c, fontSize: n.labelFontSize };
  }
  if (n.lineColor || !n.deleted) {
    const c = t.axisLine || {}, l = c.lineStyle || {}, a = n.lineColor ?? (l.color === void 0 ? bs : void 0);
    a && (t.axisLine = {
      ...c,
      show: c.show ?? !0,
      lineStyle: { ...l, color: a }
    });
  }
}
function Rn(t, n) {
  return we(t.child(n));
}
function hl(t) {
  const n = t.child("layout").child("manualLayout");
  if (!n.exists()) return;
  const e = {}, o = n.child("x").numAttr("val"), s = n.child("y").numAttr("val"), i = n.child("w").numAttr("val"), r = n.child("h").numAttr("val");
  return o !== void 0 && (e.x = o), s !== void 0 && (e.y = s), i !== void 0 && (e.width = i), r !== void 0 && (e.height = r), Object.keys(e).length > 0 ? e : void 0;
}
function Ye(t, n) {
  const e = t.child("dLbls");
  if (!e.exists()) return;
  const o = Rn(e, "showVal"), s = Rn(e, "showCatName"), i = Rn(e, "showSerName"), r = Rn(e, "showPercent"), c = Rn(e, "showLeaderLines"), l = e.child("dLblPos"), a = l.exists() && l.attr("val") || void 0, d = hl(e), h = Hn(e, n), u = (h == null ? void 0 : h.color) ?? il(e, n), x = h == null ? void 0 : h.fontSize, p = h == null ? void 0 : h.bold, $ = ul(e, n);
  if (!(!o && !s && !i && !r))
    return {
      showVal: o,
      showCatName: s,
      showSerName: i,
      showPercent: r,
      position: a,
      showLeaderLines: c,
      manualLayout: d,
      color: u,
      fontSize: x,
      bold: p,
      ...$
    };
}
function fn(t, n) {
  const e = t.child(n);
  if (e.exists())
    return we(e);
}
function ul(t, n) {
  const e = {}, o = t.child("spPr");
  if (o.exists()) {
    const i = o.child("solidFill");
    if (i.exists()) {
      const c = Fe(i, n);
      c && (e.backgroundColor = c);
    }
    const r = o.child("ln");
    if (r.exists() && !r.child("noFill").exists()) {
      const c = r.child("solidFill");
      if (c.exists()) {
        const a = Fe(c, n);
        a && (e.borderColor = a);
      }
      const l = r.numAttr("w");
      l !== void 0 && l > 0 ? e.borderWidth = Math.max(1, X(l)) : e.borderColor && (e.borderWidth = 1);
    }
  }
  const s = t.child("txPr").child("bodyPr");
  if (s.exists()) {
    const i = X(s.numAttr("tIns") ?? 0), r = X(s.numAttr("rIns") ?? 0), c = X(s.numAttr("bIns") ?? 0), l = X(s.numAttr("lIns") ?? 0);
    (i || r || c || l) && (e.padding = [i, r, c, l]);
  }
  return e;
}
function Ws(t, n) {
  const e = /* @__PURE__ */ new Map();
  if (!t.exists()) return e;
  for (const o of t.children("dLbl")) {
    const s = o.child("idx").numAttr("val");
    if (s === void 0) continue;
    const i = Hn(o, n), r = o.child("dLblPos"), c = {}, l = fn(o, "delete"), a = fn(o, "showVal"), d = fn(o, "showCatName"), h = fn(o, "showSerName"), u = fn(o, "showPercent"), x = fn(o, "showLeaderLines"), p = hl(o);
    if (a !== void 0 && (c.showVal = a), d !== void 0 && (c.showCatName = d), h !== void 0 && (c.showSerName = h), u !== void 0 && (c.showPercent = u), l === !0 && (c.deleted = !0, c.showVal = !1, c.showCatName = !1, c.showSerName = !1, c.showPercent = !1), x !== void 0 && (c.showLeaderLines = x), p && (c.manualLayout = p), r.exists() && (c.position = r.attr("val") || void 0), i != null && i.color) c.color = i.color;
    else {
      const $ = il(o, n);
      $ && (c.color = $);
    }
    (i == null ? void 0 : i.fontSize) !== void 0 && (c.fontSize = i.fontSize), (i == null ? void 0 : i.bold) !== void 0 && (c.bold = i.bold), Object.assign(c, ul(o, n)), Object.keys(c).length > 0 && e.set(s, c);
  }
  return e;
}
function c$(t) {
  const n = t.child("strRef");
  if (n.exists()) {
    const s = n.child("strCache").children("pt");
    if (s.length > 0)
      return s[0].child("v").text();
  }
  const e = t.child("v");
  return e.exists() ? e.text() : "";
}
function l$(t, n) {
  const e = new Array(n).fill(0);
  let o = !1;
  const s = t.child("explosion").numAttr("val") ?? 0;
  s > 0 && (e.fill(s), o = !0);
  const i = t.children("dPt");
  for (const r of i) {
    const c = r.child("idx").numAttr("val");
    if (c === void 0) continue;
    const l = r.child("explosion").numAttr("val");
    l !== void 0 && l > 0 && (e[c] = l, o = !0);
  }
  return o ? e : void 0;
}
function a$(t, n) {
  const e = [];
  for (const o of t.children("ser")) {
    const s = o.child("tx"), i = c$(s), r = o.child("order").numAttr("val") ?? e.length, c = o.child("cat"), l = wr(c), a = o.child("val"), d = ms(a), h = d.values;
    let u = d.blankIndices;
    const x = If(a), p = o.child("xVal"), $ = o.child("yVal");
    let g;
    if ($.exists()) {
      const B = ms($);
      B.values.length > 0 && (h.length = 0, h.push(...B.values), u = B.blankIndices);
    }
    if (p.exists() && (g = Er(p), l.length === 0)) {
      const B = wr(p);
      B.length > 0 && l.push(...B);
    }
    const f = o.child("bubbleSize"), y = f.exists() ? Er(f) : void 0, m = Gf(o, n), b = Hf(o), M = Wf(o), L = _f(o, n), v = L == null ? void 0 : L.map((B) => B == null ? void 0 : B.color), k = o.child("invertIfNegative"), A = k.exists() ? we(k) : void 0, S = o.child("marker"), w = S.child("symbol").attr("val"), F = S.child("size").numAttr("val"), C = F !== void 0 ? el(F) : void 0, E = o.child("smooth"), P = E.exists() ? we(E) : void 0;
    e.push({
      name: i,
      order: r,
      categories: l,
      values: h,
      xValues: g,
      bubbleSizes: y,
      colorHex: m,
      dataPointColors: v,
      dataPointStyles: L,
      formatCode: x,
      blankIndices: u,
      invertIfNegative: A,
      markerSymbol: w,
      markerSize: C,
      smooth: P,
      lineWidth: b,
      lineNoFill: M
    });
  }
  return e.sort((o, s) => o.order - s.order), e;
}
function d$(t) {
  const n = t.child("dTable");
  return n.exists() ? { showKeys: tl(n.child("showKeys").attr("val"), !0) } : void 0;
}
function h$(t, n) {
  var u, x;
  const e = document.createElement("table");
  e.style.width = "100%", e.style.borderCollapse = "collapse", e.style.fontSize = "10px", e.style.marginTop = "8px";
  const { seriesArr: o, showKeys: s, formatCode: i } = t, r = ((u = o.find((p) => p.categories.length > 0)) == null ? void 0 : u.categories) || [], c = i, l = document.createElement("thead"), a = document.createElement("tr"), d = document.createElement("th");
  d.style.border = "1px solid #ccc", d.style.padding = "2px 6px", d.style.textAlign = "left", d.style.fontWeight = "bold", a.appendChild(d);
  for (let p = 0; p < r.length; p++) {
    const $ = document.createElement("th");
    $.style.border = "1px solid #ccc", $.style.padding = "2px 6px", $.style.textAlign = "right", $.style.fontWeight = "bold", $.textContent = r[p] ?? "", a.appendChild($);
  }
  l.appendChild(a), e.appendChild(l);
  const h = document.createElement("tbody");
  for (let p = 0; p < o.length; p++) {
    const $ = o[p], g = document.createElement("tr"), f = document.createElement("td");
    if (f.style.border = "1px solid #ccc", f.style.padding = "2px 6px", f.style.textAlign = "left", f.style.fontWeight = "bold", s && n && n[p]) {
      const y = document.createElement("span");
      y.style.display = "inline-block", y.style.width = "8px", y.style.height = "8px", y.style.marginRight = "4px", y.style.verticalAlign = "middle", y.style.backgroundColor = n[p], f.appendChild(y);
    }
    f.appendChild(document.createTextNode($.name || "")), g.appendChild(f);
    for (let y = 0; y < r.length; y++) {
      const m = document.createElement("td");
      m.style.border = "1px solid #ccc", m.style.padding = "2px 6px", m.style.textAlign = "right";
      const b = $.values[y];
      m.textContent = b !== void 0 && !((x = $.blankIndices) != null && x.has(y)) ? me(b, c ?? $.formatCode) : "", g.appendChild(m);
    }
    h.appendChild(g);
  }
  return e.appendChild(h), e;
}
function u$(t) {
  const n = t.child("clrMapOvr");
  if (!n.exists()) return;
  let e = n.element;
  const o = n.child("overrideClrMapping");
  if (o.exists() && o.element)
    e = o.element;
  else if (n.child("masterClrMapping").exists()) return;
  if (!e) return;
  const s = e.attributes, i = /* @__PURE__ */ new Map();
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    i.set(c.localName, c.value);
  }
  return i.size > 0 ? i : void 0;
}
function f$(t, n) {
  const e = u$(t);
  return e ? {
    ...n,
    layout: { ...n.layout, colorMapOverride: e },
    colorCache: /* @__PURE__ */ new Map()
  } : n;
}
function $$(t) {
  const e = t.child("style").numAttr("val");
  if (e !== void 0) return e;
  const o = t.child("AlternateContent");
  if (o.exists())
    for (const s of o.allChildren()) {
      const r = s.child("style").numAttr("val");
      if (r !== void 0) return r;
    }
}
const p$ = /* @__PURE__ */ new Set([
  "srgbClr",
  "schemeClr",
  "sysClr",
  "prstClr",
  "hslClr",
  "scrgbClr"
]);
function x$(t, n) {
  if (!t.element || !p$.has(t.localName)) return;
  const o = t.element.ownerDocument.createElementNS(t.element.namespaceURI, "solidFill");
  return o.appendChild(t.element.cloneNode(!0)), Fe(new ve(o), n);
}
function y$(t, n) {
  if (!(t != null && t.exists())) return [];
  const e = [];
  for (const o of t.allChildren()) {
    const s = x$(o, n);
    s && e.push(s);
  }
  return e;
}
function fl(t) {
  return Yf.map((n) => t.theme.colorScheme.get(n)).filter((n) => !!n).map((n) => n.startsWith("#") ? n : `#${n}`);
}
function g$(t, n) {
  const e = t.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(e)) return t;
  const o = (s) => Math.max(0, Math.min(255, Math.round(parseInt(e.slice(s, s + 2), 16) * n)));
  return `#${[o(0), o(2), o(4)].map((s) => s.toString(16).padStart(2, "0")).join("")}`;
}
function m$(t, n = {}) {
  const e = fl(t);
  return n.darken === !1 ? e : e.map((o) => g$(o, 0.88));
}
function b$(t, n, e) {
  var i;
  if (e) {
    const r = y$(
      (i = n.presentation.chartColorStyles) == null ? void 0 : i.get(e),
      n
    );
    if (r.length > 0) return r;
  }
  const o = fl(n);
  return o.length === 0 ? void 0 : ($$(t) === void 0, o);
}
function re(t) {
  const n = Math.round(t * 1e4) / 100;
  return `${Number.isInteger(n) ? n.toFixed(0) : n}%`.replace(/\.0%$/, "%");
}
function nn(t, n) {
  const e = t.child("legend");
  if (!e.exists()) return;
  const o = e.child("legendPos"), s = o.exists() && o.attr("val") || "r", i = ["b", "t", "l", "r", "tr"].includes(s) ? s : "r", r = we(e.child("overlay")), c = { confine: !0 }, l = "14%";
  let a;
  switch (i) {
    case "b":
      a = { ...c, bottom: "5%", orient: "horizontal" };
      break;
    case "t":
      a = { ...c, top: l, orient: "horizontal" };
      break;
    case "l":
      a = { ...c, left: "2%", top: "middle", orient: "vertical" };
      break;
    case "r":
      a = { ...c, right: "2%", top: "middle", orient: "vertical" };
      break;
    case "tr":
      a = { ...c, top: l, right: "2%", orient: "vertical" };
      break;
    default:
      a = { ...c, right: "2%", top: "middle", orient: "vertical" };
      break;
  }
  return {
    option: a,
    position: i,
    overlay: r,
    textStyle: (() => {
      const d = Hn(e, n);
      if (!d) return;
      const h = {
        ...d.color ? { color: d.color } : {},
        ...d.fontSize !== void 0 ? { fontSize: d.fontSize } : {},
        ...d.bold === !0 ? { fontWeight: "bold" } : {},
        ...d.fontFamily ? { fontFamily: d.fontFamily } : {},
        ...d.textShadowColor ? { textShadowColor: d.textShadowColor } : {},
        ...d.textShadowBlur !== void 0 ? { textShadowBlur: d.textShadowBlur } : {},
        ...d.textShadowOffsetX !== void 0 ? { textShadowOffsetX: d.textShadowOffsetX } : {},
        ...d.textShadowOffsetY !== void 0 ? { textShadowOffsetY: d.textShadowOffsetY } : {}
      };
      return Ms(d) && (h[To] = !0), h;
    })(),
    manualLayout: M$(e)
  };
}
function M$(t) {
  const n = t.child("layout").child("manualLayout");
  if (!n.exists()) return {};
  const e = {}, o = n.child("x").numAttr("val"), s = n.child("y").numAttr("val"), i = n.child("w").numAttr("val"), r = n.child("h").numAttr("val");
  return o !== void 0 && (e.left = re(o)), s !== void 0 && (e.top = re(s)), i !== void 0 && (e.width = re(i)), r !== void 0 && (e.height = re(r)), e;
}
function Us(t) {
  return (t == null ? void 0 : t.position) === "t" || (t == null ? void 0 : t.position) === "tr";
}
function Wn(t, n) {
  const e = Us(n), o = (n == null ? void 0 : n.overlay) ?? !1;
  return t ? e && !o ? 52 : 68 : e && !o ? 32 : 20;
}
function on(t, n) {
  if (Us(n))
    return t ? 26 : 6;
}
function L$(t) {
  if (!t || t.overlay || !t.option || typeof t.option != "object")
    return "none";
  const n = t.option;
  return n.bottom !== void 0 ? "bottom" : n.top !== void 0 && n.left === void 0 && n.right === void 0 ? "top" : n.left !== void 0 ? "left" : n.right !== void 0 ? "right" : "none";
}
function Un(t) {
  if (t) {
    const n = t.option;
    if (n && n.bottom !== void 0)
      return 35;
  }
  return 20;
}
function sn(t, n, e, o, s) {
  if (!t) return { show: !1 };
  const i = (n == null ? void 0 : n.manualLayout) ?? {}, r = i.top !== void 0 ? i.top : e !== void 0 ? e : void 0, c = s.fontSize ?? 10, l = o.some((x) => typeof x == "object" && x.icon), a = l && o.every(
    (x) => typeof x == "object" && typeof x.icon == "string" && x.icon === o[0].icon
  ) ? o[0].icon : void 0, d = a !== void 0 && !a.startsWith("path://"), h = d ? o.map((x) => typeof x == "string" ? x : x.name) : o, u = o.some(
    (x) => typeof x == "object" && typeof x.icon == "string" && x.icon.startsWith("path://")
  );
  return {
    ...t,
    ...i,
    ...r !== void 0 ? { top: r } : {},
    ...d ? { icon: a } : l ? {} : { icon: "rect" },
    itemWidth: u ? Math.max(24, Math.round(c * 2.2)) : c,
    itemHeight: u ? Math.max(8, Math.round(c * 0.9)) : c,
    data: h,
    textStyle: s
  };
}
function Co(t) {
  return t ? Array.isArray(t) ? t[0] ?? null : t : null;
}
function $n(t, n) {
  return typeof t == "string" ? t : n;
}
function v$(t, n) {
  const e = (t == null ? void 0 : t.lineStyle) ?? {}, o = (t == null ? void 0 : t.itemStyle) ?? {};
  return (typeof e.color == "string" ? e.color : void 0) ?? (typeof o.color == "string" ? o.color : void 0) ?? n;
}
function Fo() {
  return "path://M2 4.5 L22 4.5";
}
function Vs(t) {
  const n = t;
  return (Array.isArray(n.radar) ? n.radar : n.radar ? [n.radar] : []).filter((o) => typeof o == "object" && o !== null).map((o) => {
    const s = o.name ?? (o.name = {});
    return s.textStyle ?? (s.textStyle = {});
  });
}
function _s(t) {
  const n = t;
  return (Array.isArray(n.radar) ? n.radar : n.radar ? [n.radar] : []).filter((o) => typeof o == "object" && o !== null).flatMap((o) => o.indicator ?? []).map((o) => o.axisLabel).filter((o) => !!o);
}
function A$(t, n) {
  var c, l, a, d;
  const e = t;
  (l = (c = e.title) == null ? void 0 : c.textStyle) != null && l.fontSize && e.title.textStyle.fontSize <= 14 && (e.title.textStyle.fontSize = n);
  for (const h of Vs(t)) {
    const u = h.fontSize;
    (typeof u != "number" || u <= 10) && (h.fontSize = n);
  }
  for (const h of _s(t)) {
    const u = h.fontSize;
    (typeof u != "number" || u <= 10) && (h.fontSize = n);
  }
  const o = Array.isArray(e.series) ? e.series : e.series ? [e.series] : [];
  for (const h of o)
    (a = h == null ? void 0 : h.label) != null && a.fontSize && h.label.fontSize <= 10 && !Ms(h.label) && (h.label.fontSize = n);
  const s = (h) => {
    if (!(h != null && h.axisLabel)) return;
    const u = h.axisLabel.fontSize;
    (u === void 0 || u <= 10) && (h.axisLabel.fontSize = n);
  }, i = Array.isArray(e.xAxis) ? e.xAxis : e.xAxis ? [e.xAxis] : [], r = Array.isArray(e.yAxis) ? e.yAxis : e.yAxis ? [e.yAxis] : [];
  for (const h of [...i, ...r]) s(h);
  if ((d = e.legend) != null && d.textStyle) {
    const h = e.legend.textStyle.fontSize;
    (h === void 0 || h <= 10) && !Ms(e.legend.textStyle) && (e.legend.textStyle.fontSize = n);
  }
}
function S$(t, n) {
  var r, c, l;
  const e = t;
  (r = e.title) != null && r.textStyle && !e.title.textStyle.fontFamily && (e.title.textStyle.fontFamily = n), (c = e.title) != null && c.textStyle && !e.title.textStyle.fontWeight && (e.title.textStyle.fontWeight = "bold");
  const o = (a) => {
    if (!a) return;
    const d = a.axisLabel ?? (a.axisLabel = {});
    d.fontFamily || (d.fontFamily = n);
  }, s = Array.isArray(e.xAxis) ? e.xAxis : e.xAxis ? [e.xAxis] : [], i = Array.isArray(e.yAxis) ? e.yAxis : e.yAxis ? [e.yAxis] : [];
  for (const a of [...s, ...i]) o(a);
  (l = e.legend) != null && l.textStyle && !e.legend.textStyle.fontFamily && (e.legend.textStyle.fontFamily = n);
  for (const a of Vs(t))
    a.fontFamily || (a.fontFamily = n);
  for (const a of _s(t))
    a.fontFamily || (a.fontFamily = n);
}
function C$(t) {
  var i;
  const n = t;
  (i = n.title) != null && i.textStyle && n.title.textStyle.color === void 0 && (n.title.textStyle.color = pn);
  const e = Array.isArray(n.legend) ? n.legend : n.legend ? [n.legend] : [];
  for (const r of e) {
    if (!r || r.show === !1) continue;
    const c = r.textStyle ?? (r.textStyle = {});
    c.color === void 0 && (c.color = pn);
  }
  const o = Array.isArray(n.xAxis) ? n.xAxis : n.xAxis ? [n.xAxis] : [], s = Array.isArray(n.yAxis) ? n.yAxis : n.yAxis ? [n.yAxis] : [];
  for (const r of [...o, ...s]) {
    if (!(r != null && r.name)) continue;
    const c = r.nameTextStyle ?? (r.nameTextStyle = {});
    c.color === void 0 && (c.color = pn);
  }
  for (const r of Vs(t))
    r.color === void 0 && (r.color = pn);
  for (const r of _s(t))
    r.color === void 0 && (r.color = pn);
}
function F$(t, n, e) {
  var c, l, a;
  const o = t;
  if (!o.grid || !o.legend || o.legend.show === !1) return;
  const s = n.child("legend");
  if (!s.exists() || we(s.child("overlay"))) return;
  const r = s.child("legendPos").attr("val") || "r";
  if (r === "r" || r === "l") {
    const d = o.legend.data;
    if (!d || d.length === 0) return;
    const h = d.map(
      (k) => typeof k == "string" ? k : k.name
    ), u = ((l = (c = o.legend) == null ? void 0 : c.textStyle) == null ? void 0 : l.fontSize) ?? e ?? 12, x = Number((a = o.legend) == null ? void 0 : a.itemWidth) || u;
    let p = 0;
    for (const k of h) {
      let A = 0;
      for (const S of k)
        A += S.charCodeAt(0) > 11904 ? u : u * 0.55;
      A > p && (p = A);
    }
    const $ = x + 8 + p + 14, f = n.child("plotArea").child("lineChart").exists(), y = Array.isArray(o.series) ? o.series.length : o.series ? 1 : 0, m = Array.isArray(o.xAxis) ? o.xAxis[0] : o.xAxis, b = Array.isArray(m == null ? void 0 : m.data) ? m.data.length : 0, M = r === "r" && f && y === 1 && b >= 20, v = Math.max(84, Math.round($ + (f ? M ? -10 : 0 : 18)));
    if (typeof o.grid.left == "string" && o.grid.left.includes("%") || typeof o.grid.right == "string" && o.grid.right.includes("%")) return;
    r === "r" ? o.grid.right = v : o.grid.left = v;
  }
}
function Ir(t, n, e) {
  if (typeof t == "number" && Number.isFinite(t)) return t;
  if (typeof t == "string") {
    const o = t.trim();
    if (o.endsWith("%")) return n * parseFloat(o) / 100;
    const s = parseFloat(o);
    if (Number.isFinite(s)) return s;
  }
  return e;
}
function k$(t, n, e) {
  if (!n) return;
  const o = e === "x" ? n.w : n.h, s = Array.isArray(t) ? t[0] : t;
  if (!s) return o;
  const i = e === "x" ? "left" : "top", r = e === "x" ? "right" : "bottom", c = Ir(s[i], o, 0), l = Ir(s[r], o, 0);
  return Math.max(0, o - c - l);
}
function w$(t, n, e, o, s, i = 2.6) {
  const r = k$(s, o, e);
  if (r === void 0 || r <= 0) return n;
  const c = t.axisLabel ?? {}, l = typeof c.fontSize == "number" ? c.fontSize : 12, a = Math.max(28, l * i), d = Math.max(2, Math.floor(r / a) + 1);
  return Math.max(1, Math.min(n, d - 1));
}
function E$(t, n) {
  var b, M;
  const e = t;
  if (!e.xAxis && !e.yAxis) return;
  const o = [], s = [], i = [], r = Array.isArray(e.series) ? e.series : e.series ? [e.series] : [], c = /* @__PURE__ */ new Map(), l = [], a = /* @__PURE__ */ new Map(), d = (L, v) => {
    a.has(L) || a.set(L, []), a.get(L).push(...v);
  };
  for (const L of r) {
    if (!L.data) continue;
    const v = [];
    for (const A of L.data)
      if (typeof A == "number")
        v.push(A);
      else if (A && typeof A == "object" && "value" in A && typeof A.value == "number")
        v.push(A.value);
      else if (Array.isArray(A)) {
        A.length >= 2 && typeof A[0] == "number" && typeof A[1] == "number" && (s.push(A[0]), i.push(A[1]));
        for (const S of A)
          typeof S == "number" && v.push(S);
      } else
        v.push(0);
    const k = typeof L.yAxisIndex == "number" && Number.isFinite(L.yAxisIndex) ? L.yAxisIndex : 0;
    if (L.stack) {
      const A = `${k}:${String(L.stack)}`;
      c.has(A) || c.set(A, { axisIndex: k, values: [] }), c.get(A).values.push(v);
    } else
      l.push(...v), d(k, v);
  }
  for (const L of c.values()) {
    const v = [], k = Math.max(...L.values.map((A) => A.length));
    for (let A = 0; A < k; A++) {
      let S = 0;
      for (const w of L.values)
        S += w[A] ?? 0;
      v.push(S), o.push(S);
    }
    d(L.axisIndex, v);
  }
  o.push(...l);
  const h = r.some((L) => L.type === "bar"), u = r.some((L) => L.type && L.type !== "bar"), x = h && !u, p = x ? 10 : 8, $ = x ? 2.6 : 2;
  if (o.length === 0) return;
  const g = s.length > 0 && i.length > 0 && ((b = Array.isArray(e.xAxis) ? e.xAxis[0] : e.xAxis) == null ? void 0 : b.type) === "value" && ((M = Array.isArray(e.yAxis) ? e.yAxis[0] : e.yAxis) == null ? void 0 : M.type) === "value", f = (L, v, k) => {
    if (!L || L.type !== "value" || v.length === 0 || L.min !== void 0 && L.max !== void 0) return;
    const A = Math.min(...v), S = Math.max(...v), w = We(S, A, k);
    if (L.max === void 0) {
      let F = ko(S, A, k);
      F > S && F - S < w * 0.25 && (F += w), L.max = F;
    }
    L.min === void 0 && A >= 0 && (L.min = 0), L.interval === void 0 && (L.interval = w);
  }, y = (L) => {
    if (L.length === 0) return 8;
    const v = Math.min(...L);
    return Math.max(...L) - Math.min(0, v) <= 3 ? 3 : 8;
  };
  if (g) {
    const L = Array.isArray(e.xAxis) ? e.xAxis : [e.xAxis], v = Array.isArray(e.yAxis) ? e.yAxis : [e.yAxis];
    L.forEach((k) => f(k, s, y(s))), v.forEach((k) => f(k, i, y(i)));
    return;
  }
  const m = (L, v, k) => {
    if (!L) return;
    (Array.isArray(L) ? L : [L]).forEach((S, w) => {
      if (!S || S.type !== "value" || S.min !== void 0 && S.max !== void 0) return;
      const F = (k == null ? void 0 : k.get(w)) ?? o;
      if (F.length === 0) return;
      const C = Math.min(...F), E = Math.max(...F), P = w$(
        S,
        p,
        v,
        n,
        e.grid,
        $
      ), B = We(E, C, P);
      if (S.max === void 0) {
        let R = ko(E, C, P);
        P > 1 && R > E && R - E < B * 0.25 && (R += B), S.max = R;
      }
      S.min === void 0 && C >= 0 ? S.min = 0 : S.min === void 0 && C < 0 && (S.min = P$(E, C, P)), S.interval === void 0 && (S.interval = B);
    });
  };
  m(e.xAxis, "x"), m(e.yAxis, "y", a);
}
function ko(t, n, e = 5) {
  const o = We(t, n, e), s = Math.ceil(t / o) * o;
  return s <= t ? s + o : s;
}
function P$(t, n, e = 5) {
  const o = We(t, n, e), s = Math.floor(n / o) * o;
  return s >= n ? s - o : s;
}
function We(t, n, e = 5) {
  if (t === 0 && n === 0) return 1;
  const o = t - Math.min(0, n);
  if (o === 0) return t > 0 ? t * 1.2 : 1;
  const s = o / e, i = Math.pow(10, Math.floor(Math.log10(s))), r = s / i;
  let c;
  return r <= 1 ? c = i : r <= 2 ? c = 2 * i : r <= 5 ? c = 5 * i : c = 10 * i, c;
}
function B$(t) {
  const n = t.child("txPr");
  if (n.exists())
    for (const e of n.children("p")) {
      const o = e.child("pPr");
      if (!o.exists()) continue;
      const s = o.child("defRPr");
      if (!s.exists()) continue;
      const i = s.numAttr("sz");
      if (i !== void 0 && i > 0)
        return Math.round(i / 100 * (96 / 72));
    }
}
function R$(t, n, e) {
  let o, s;
  const i = t.child("spPr");
  if (i.exists() && !i.child("noFill").exists()) {
    const l = i.child("solidFill");
    l.exists() ? o = Fe(l, e) : o = "#ffffff";
  }
  const r = n.child("plotArea");
  if (r.exists()) {
    const c = r.child("spPr");
    if (c.exists() && !c.child("noFill").exists()) {
      const a = c.child("solidFill");
      a.exists() && (s = Fe(a, e));
    }
  }
  return { chartBg: o, plotAreaBg: s };
}
function Tr(t, n) {
  const e = Gs(t.child("spPr").child("ln"), n);
  if (e)
    return {
      borderColor: e.color,
      borderWidth: e.width,
      borderStyle: e.type
    };
}
function I$(t, n, e, o, s = 2, i, r) {
  if (t === "none") return null;
  const c = "http://www.w3.org/2000/svg", l = document.createElementNS(c, "svg");
  l.setAttribute("width", String(e)), l.setAttribute("height", String(o)), l.setAttribute("viewBox", `0 0 ${e} ${o}`), l.style.display = "block";
  const a = t ?? "rect";
  if (a.startsWith("path://")) {
    const h = document.createElementNS(c, "path");
    if (h.setAttribute("d", a.slice(7)), h.setAttribute("fill", "none"), h.setAttribute("stroke", n), h.setAttribute("stroke-width", String(s)), h.setAttribute("stroke-linecap", "round"), l.appendChild(h), i && i !== "none") {
      const u = e / 2, x = o / 2, p = Math.min(
        e,
        o,
        r !== void 0 ? Math.max(3, r) : Math.max(3, o * 0.55)
      );
      if (i === "diamond") {
        const $ = document.createElementNS(c, "path");
        $.setAttribute(
          "d",
          `M${u} ${x - p / 2} L${u + p / 2} ${x} L${u} ${x + p / 2} L${u - p / 2} ${x} Z`
        ), $.setAttribute("fill", n), l.appendChild($);
      } else if (i === "rect") {
        const $ = document.createElementNS(c, "rect");
        $.setAttribute("x", String(u - p / 2)), $.setAttribute("y", String(x - p / 2)), $.setAttribute("width", String(p)), $.setAttribute("height", String(p)), $.setAttribute("fill", n), l.appendChild($);
      } else if (i === "triangle") {
        const $ = document.createElementNS(c, "path");
        $.setAttribute(
          "d",
          `M${u} ${x - p / 2} L${u + p / 2} ${x + p / 2} L${u - p / 2} ${x + p / 2} Z`
        ), $.setAttribute("fill", n), l.appendChild($);
      } else {
        const $ = document.createElementNS(c, "circle");
        $.setAttribute("cx", String(u)), $.setAttribute("cy", String(x)), $.setAttribute("r", String(p / 2)), $.setAttribute("fill", n), l.appendChild($);
      }
    }
    return l;
  }
  if (a === "diamond") {
    const h = document.createElementNS(c, "path");
    return h.setAttribute(
      "d",
      `M${e / 2} 1 L${e - 1} ${o / 2} L${e / 2} ${o - 1} L1 ${o / 2} Z`
    ), h.setAttribute("fill", n), l.appendChild(h), l;
  }
  if (a === "circle") {
    const h = document.createElementNS(c, "circle");
    return h.setAttribute("cx", String(e / 2)), h.setAttribute("cy", String(o / 2)), h.setAttribute("r", String(Math.max(2, Math.min(e, o) / 2 - 1))), h.setAttribute("fill", n), l.appendChild(h), l;
  }
  const d = document.createElementNS(c, "rect");
  return d.setAttribute("x", "1"), d.setAttribute("y", "1"), d.setAttribute("width", String(Math.max(2, e - 2))), d.setAttribute("height", String(Math.max(2, o - 2))), d.setAttribute("fill", n), l.appendChild(d), l;
}
function Je(t, n) {
  if (typeof t == "number") return `${t}px`;
  const e = t.trim();
  if (e.endsWith("%")) {
    const o = Number.parseFloat(e.slice(0, -1));
    if (!Number.isNaN(o)) return `${o / 100 * n}px`;
  }
  return e;
}
function T$(t, n) {
  var f, y, m, b, M;
  const e = Co(t.legend);
  if (!e || e.show === !1) return null;
  const o = e.orient === "vertical", s = e.orient === "horizontal" || e.orient === void 0, i = e.top !== void 0 || e.bottom !== void 0 || e.left !== void 0 || e.right !== void 0;
  if (o && e.left === void 0 && e.right === void 0 || s && !i) return null;
  const r = Array.isArray(t.color) ? t.color.filter((L) => typeof L == "string") : [], c = e.data ?? [], l = Array.isArray(t.series) ? t.series : t.series ? [t.series] : [], a = l.length === 1 && ((f = l[0]) == null ? void 0 : f.type) === "radar" ? l[0] : void 0, d = Array.isArray(a == null ? void 0 : a.data) ? a.data : void 0, h = c.map((L, v) => {
    const k = typeof L == "string" ? L : L.name, A = typeof L == "string" ? void 0 : L.icon, S = typeof L == "string" ? void 0 : L.marker, w = typeof L == "string" ? void 0 : L;
    if (!k) return null;
    const F = l.findIndex(
      (D) => (D == null ? void 0 : D.name) === k
    ), C = (d == null ? void 0 : d.findIndex((D) => D.name === k)) ?? -1, E = F >= 0 ? l[F] : l[v], P = d && C >= 0 ? d[C] : (d == null ? void 0 : d[v]) ?? void 0, B = d ? P ?? w ?? E : w ?? E, R = P ?? E, I = P ?? E ?? w, Z = {
      ...(R == null ? void 0 : R.lineStyle) ?? {},
      ...(w == null ? void 0 : w.lineStyle) ?? {}
    }, U = F >= 0 ? F : v, q = v$(B, r[U] ?? "#2f6f8f"), Q = typeof Z.width == "number" && Number.isFinite(Z.width) ? Math.max(1, Z.width) : 2, G = I == null ? void 0 : I.symbolSize, T = typeof G == "number" && Number.isFinite(G) ? Math.max(3, G) : void 0;
    return {
      name: k,
      icon: A ?? e.icon,
      marker: S,
      markerSize: T,
      color: q,
      lineWidth: Q
    };
  }).filter((L) => L !== null);
  if (h.length === 0) return null;
  const u = document.createElement("div");
  u.className = "pptx-chart-custom-legend", u.style.position = "absolute", u.style.display = "flex", u.style.flexDirection = o ? "column" : "row", u.style.gap = o ? "6px" : "12px", u.style.pointerEvents = "none", u.style.zIndex = "1", u.style.whiteSpace = "nowrap", e.left !== void 0 && (u.style.left = Je(e.left, n.w)), e.right !== void 0 && (u.style.right = Je(e.right, n.w)), e.width !== void 0 && (u.style.width = Je(e.width, n.w)), e.height !== void 0 && (u.style.height = Je(e.height, n.h)), (e.width !== void 0 || e.height !== void 0) && (u.style.boxSizing = "border-box", s ? (u.style.alignItems = "center", e.width !== void 0 && (u.style.justifyContent = "center")) : (e.width !== void 0 && (u.style.alignItems = "center"), e.height !== void 0 && (u.style.justifyContent = "center"))), e.orient === "vertical" && (e.left !== void 0 || e.right !== void 0) ? e.top === "middle" ? (u.style.top = `${n.h / 2}px`, u.style.transform = "translateY(-50%)") : e.top !== void 0 ? u.style.top = Je(e.top, n.h) : e.bottom === void 0 && (u.style.top = `${n.h / 2}px`, u.style.transform = "translateY(-50%)") : e.top !== void 0 && (u.style.top = Je(e.top, n.h)), e.bottom !== void 0 && (u.style.bottom = Je(e.bottom, n.h)), s && e.left === void 0 && e.right === void 0 && (u.style.left = "50%", u.style.transform = "translateX(-50%)");
  const p = ((y = e.textStyle) == null ? void 0 : y.fontSize) ?? 10, $ = e.itemWidth ?? p, g = e.itemHeight ?? p;
  for (const L of h) {
    const v = document.createElement("div");
    v.style.display = "flex", v.style.alignItems = "center", v.style.gap = "6px";
    const k = L.marker && L.marker !== "none" ? L.markerSize : void 0, A = k !== void 0 ? Math.max($, Math.ceil(k)) : $, S = k !== void 0 ? Math.max(g, Math.ceil(k)) : g, w = I$(
      L.icon,
      L.color,
      A,
      S,
      L.lineWidth,
      L.marker,
      k
    );
    w && v.appendChild(w);
    const F = document.createElement("span");
    F.textContent = L.name, F.style.color = ((m = e.textStyle) == null ? void 0 : m.color) ?? "#000000", F.style.fontSize = `${p}px`, (b = e.textStyle) != null && b.fontFamily && (F.style.fontFamily = e.textStyle.fontFamily), ((M = e.textStyle) == null ? void 0 : M.fontWeight) !== void 0 && (F.style.fontWeight = String(e.textStyle.fontWeight)), v.appendChild(F), u.appendChild(v);
  }
  return u;
}
function z$(t, n) {
  const e = t.child("autoTitleDeleted");
  if (we(e))
    return;
  const o = t.child("title");
  return o.exists() ? ol(o) : e.exists() && !we(e) && n && n.length === 1 && n[0].name ? n[0].name : void 0;
}
function rn(t, n, e, o) {
  const s = z$(t, n);
  if (!s) return;
  const i = t.child("title"), r = jf(i, e), c = ll(i, e), l = sl(c), a = D$(t);
  return {
    text: (r == null ? void 0 : r.text) ?? s,
    left: "center",
    ...a,
    textStyle: {
      fontSize: o,
      ...l ?? {},
      ...r ? { rich: r.rich } : {}
    }
  };
}
function D$(t) {
  const n = t.child("title").child("layout").child("manualLayout");
  if (!n.exists()) return {};
  const e = {}, o = n.child("x").numAttr("val"), s = n.child("y").numAttr("val");
  return o !== void 0 && (e.left = re(o)), s !== void 0 && (e.top = re(s)), e;
}
function O$(t, n, e, o = 50, s = !1) {
  const i = L$(t);
  let r = ["50%", "55%"], c = e ? 78 : 82;
  if (i === "right" ? n && s ? (r = ["45%", "55%"], c = 76) : n ? (r = ["39%", "54%"], c = 87) : (r = ["38%", "55%"], c = 82) : i === "left" ? (r = ["62%", "55%"], c = 82) : i === "top" ? r = ["50%", "60%"] : i === "bottom" && (r = ["50%", "45%"]), (i === "top" || i === "bottom") && (c -= 4), !n)
    return { center: r, radius: `${c}%` };
  const l = Math.round(c * (Math.min(Math.max(o, 10), 90) / 100));
  return { center: r, radius: [`${l}%`, `${c}%`] };
}
function zr(t, n = !1) {
  return n ? t : Math.round(t * 0.5);
}
function N$(t) {
  if (!(t === void 0 || !Number.isFinite(t)))
    return ((90 - t) % 360 + 360) % 360;
}
const Z$ = {
  circle: "circle",
  square: "rect",
  diamond: "diamond",
  triangle: "triangle",
  none: "none",
  // Less common symbols — fallback to circle
  star: "circle",
  dash: "circle",
  dot: "circle",
  plus: "circle",
  x: "circle"
};
function Mn(t) {
  if (t)
    return Z$[t] ?? "circle";
}
const Dr = ["diamond", "rect", "triangle", "circle"], Or = ["diamond", "square", "triangle", "circle"], $l = el(9), Nr = $l, G$ = 120;
function Zr(t, n) {
  return t === "lineMarker" || t === "smoothMarker" ? Dr[n % Dr.length] : "circle";
}
function Gr(t) {
  return Or[t % Or.length];
}
function H$(t, n = 24) {
  if (t.length < 3) return t;
  for (let l = 1; l < t.length; l++)
    if (t[l][0] <= t[l - 1][0]) return t;
  const e = 0.3, o = 1.2, s = t.length, i = new Array(s - 1);
  for (let l = 0; l < s - 1; l++)
    i[l] = (t[l + 1][1] - t[l][1]) / (t[l + 1][0] - t[l][0]);
  const r = new Array(s);
  r[0] = i[0], r[s - 1] = i[s - 2] * o;
  for (let l = 1; l < s - 1; l++)
    r[l] = (i[l - 1] + i[l]) / 2 * e;
  const c = [[t[0][0], t[0][1]]];
  for (let l = 0; l < s - 1; l++) {
    const [a, d] = t[l], [h, u] = t[l + 1], x = h - a, p = r[l], $ = r[l + 1];
    for (let g = 1; g <= n; g++) {
      const f = g / n, y = 2 * f ** 3 - 3 * f ** 2 + 1, m = f ** 3 - 2 * f ** 2 + f, b = -2 * f ** 3 + 3 * f ** 2, M = f ** 3 - f ** 2, L = a + x * f, v = y * d + m * x * p + b * u + M * x * $;
      c.push([Number(L.toFixed(4)), Number(v.toFixed(4))]);
    }
  }
  return c;
}
function Vn(t) {
  return t.left !== void 0 || t.top !== void 0 || t.width !== void 0 || t.height !== void 0;
}
function W$(t, n) {
  switch (t) {
    case "outEnd":
      return "top";
    case "inEnd":
      return "insideTop";
    case "ctr":
      return "inside";
    case "inBase":
      return "insideBottom";
    default:
      return n ? "inside" : "top";
  }
}
function U$(t) {
  switch (t) {
    case "l":
      return "left";
    case "r":
      return "right";
    case "b":
      return "bottom";
    case "ctr":
      return "top";
    case "t":
    case "bestFit":
    default:
      return "top";
  }
}
function Xs(t) {
  return {
    ...t.backgroundColor ? { backgroundColor: t.backgroundColor } : {},
    ...t.borderColor ? { borderColor: t.borderColor } : {},
    ...t.borderWidth !== void 0 ? { borderWidth: t.borderWidth } : {},
    ...t.padding ? { padding: t.padding } : {}
  };
}
function pl(t) {
  const n = t == null ? void 0 : t.fontSize;
  if (n === void 0) return;
  const e = Math.max(n + 5, Math.round(n * 1.45));
  return `font-size: ${n}px; line-height: ${e}px;`;
}
function xl(t, n = "clustered") {
  const e = t.child("grouping");
  return e.exists() && e.attr("val") || n;
}
function yl(t) {
  return t === "stacked" || t === "percentStacked";
}
function gl(t) {
  return t === "percentStacked";
}
function ml(t) {
  const n = Math.max(0, ...t.map((o) => o.values.length)), e = new Array(n).fill(0);
  for (const o of t)
    for (let s = 0; s < n; s++)
      e[s] += Math.max(o.values[s] ?? 0, 0);
  return t.map(
    (o) => o.values.map((s, i) => {
      const r = e[i] ?? 0;
      return r === 0 ? 0 : Number((Math.max(s, 0) / r).toFixed(6));
    })
  );
}
function bl(t) {
  t.min = 0, t.max = 1, t.interval = 0.1, t.axisLabel = {
    ...t.axisLabel || {},
    formatter: (n) => me(n, "0%")
  };
}
function Hr(t, n) {
  const { r: e, g: o, b: s } = Et(t), { h: i, s: r, l: c } = Ee(e, o, s), l = be(
    i + (n.hueOffset ?? 0),
    Math.min(1, r * n.saturationScale),
    Math.max(0, Math.min(1, c + n.lightnessOffset))
  );
  return qt(l.r, l.g, l.b);
}
function V$(t) {
  return new wo.graphic.LinearGradient(0, 0, 0, 1, [
    {
      offset: 0,
      color: Hr(t, { saturationScale: 1.95, lightnessOffset: 0.217 })
    },
    {
      offset: 1,
      color: Hr(t, {
        hueOffset: -5,
        saturationScale: 1.7,
        lightnessOffset: -0.128
      })
    }
  ]);
}
function _$(t, n) {
  var s;
  if (!n)
    return t.flatMap(
      (i) => i.values.filter((r, c) => {
        var l;
        return !((l = i.blankIndices) != null && l.has(c));
      })
    );
  const e = Math.max(0, ...t.map((i) => i.values.length)), o = [];
  for (let i = 0; i < e; i++) {
    let r = 0, c = !1;
    for (const l of t)
      (s = l.blankIndices) != null && s.has(i) || (r += l.values[i] ?? 0, c = !0);
    c && o.push(r);
  }
  return o;
}
function X$(t, n, e) {
  const o = _$(n, e).filter((c) => Number.isFinite(c));
  if (o.length === 0) return;
  const s = Math.min(...o), i = Math.max(...o), r = We(i, s, 8);
  if (t.min === void 0 && s >= 0 && (t.min = 0), t.interval === void 0 && (t.interval = r), t.max === void 0)
    if (e)
      t.max = Math.ceil(i / r) * r + r;
    else {
      let c = ko(i, s, 8);
      c > i && c - i < r * 0.25 && (c += r), t.max = c;
    }
}
function Y$(t) {
  switch (t) {
    case "ctr":
    case "inEnd":
    case "inBase":
      return "inside";
    case "outEnd":
    case "bestFit":
    default:
      return "outside";
  }
}
function xo(t, n) {
  if (!(!t && !n))
    return {
      showVal: (t == null ? void 0 : t.showVal) ?? !1,
      showCatName: (t == null ? void 0 : t.showCatName) ?? !1,
      showSerName: (t == null ? void 0 : t.showSerName) ?? !1,
      showPercent: (t == null ? void 0 : t.showPercent) ?? !1,
      position: t == null ? void 0 : t.position,
      showLeaderLines: t == null ? void 0 : t.showLeaderLines,
      manualLayout: t == null ? void 0 : t.manualLayout,
      color: t == null ? void 0 : t.color,
      fontSize: t == null ? void 0 : t.fontSize,
      bold: t == null ? void 0 : t.bold,
      backgroundColor: t == null ? void 0 : t.backgroundColor,
      borderColor: t == null ? void 0 : t.borderColor,
      borderWidth: t == null ? void 0 : t.borderWidth,
      padding: t == null ? void 0 : t.padding,
      ...n
    };
}
function Ys(t, n) {
  const e = t == null ? void 0 : t.child("dLbls");
  return e != null && e.exists() ? e : n.child("dLbls");
}
function yn(t) {
  return !!(t && !t.deleted && (t.showVal || t.showCatName || t.showSerName || t.showPercent));
}
function Ml(t) {
  const n = t.child("dispBlanksAs").attr("val");
  return n === "zero" || n === "span" ? n : "gap";
}
function Ll(t, n, e, o) {
  var s;
  return (s = t.blankIndices) != null && s.has(n) ? o === "zero" ? 0 : null : e;
}
function qs(t) {
  var e;
  const n = (e = t[0]) == null ? void 0 : e.formatCode;
  if (n)
    return t.every((o) => o.formatCode === n) ? n : void 0;
}
function Wr(t, n, e) {
  if (!t || !yn(t)) return;
  const o = t, s = {
    show: !0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formatter: (i) => {
      const r = [];
      return o.showSerName && e && r.push(e), o.showCatName && r.push(i.name), o.showVal && r.push(me(i.value, n)), o.showPercent && r.push(`${i.percent}%`), r.join(" ");
    },
    fontSize: o.fontSize ?? 10,
    ...o.bold === !0 ? { fontWeight: "bold" } : {},
    ...o.color ? { color: o.color } : {},
    position: Y$(o.position),
    ...Xs(o)
  };
  return o.fontSize !== void 0 ? Hs(s) : s;
}
function vl(t) {
  return t.size === 0 ? void 0 : (e) => {
    if (e.dataIndex === void 0) return;
    const o = t.get(e.dataIndex);
    if (!o) return;
    const s = e.rect, i = {};
    return o.x !== void 0 && (i.x = s ? s.x + s.width * o.x : re(o.x)), o.y !== void 0 && (i.y = s ? s.y + s.height * o.y : re(o.y)), o.width !== void 0 && (i.width = s ? s.width * o.width : re(o.width)), o.height !== void 0 && (i.height = s ? s.height * o.height : re(o.height)), i;
  };
}
function q$(t) {
  const n = /* @__PURE__ */ new Set(), e = [];
  for (const o of t)
    for (const s of o.categories)
      n.has(s) || (n.add(s), e.push(s));
  return e;
}
function Q$(t, n, e) {
  if (!Array.isArray(t) || e <= 1) return t;
  const o = Number.parseFloat(t[0]), s = Number.parseFloat(t[1]);
  if (!Number.isFinite(o) || !Number.isFinite(s) || s <= o) return t;
  const i = 1, r = (s - o - i * (e - 1)) / e, c = Math.round(o + n * (r + i)), l = Math.round(c + r);
  return [`${c}%`, `${l}%`];
}
function K$(t, n, e, o) {
  var D;
  const s = t.child("barDir").attr("val") || t.attr("barDir") || "col", i = xl(t), r = s === "bar", c = t.child("gapWidth").numAttr("val") ?? 150, l = t.child("overlap").numAttr("val"), a = ((D = e.find((O) => O.categories.length > 0)) == null ? void 0 : D.categories) || [], d = rn(n, e, o, 12), h = nn(n, o), u = h == null ? void 0 : h.option, x = { fontSize: 10, ...(h == null ? void 0 : h.textStyle) ?? {} }, p = yl(i), $ = gl(i), g = $ ? ml(e) : void 0, f = Ml(n), y = t.child("varyColors"), m = e.length === 1 && e[0].values.length > 1 && !p && !$ && !e[0].colorHex, b = y.exists() ? we(y) : m, M = m$(o, { darken: !r });
  let L = Ye(t, o);
  if (!L) {
    const O = t.children("ser")[0];
    O != null && O.exists() && (L = Ye(O, o));
  }
  const v = t.children("ser").map((O, ot) => ({ ser: O, order: O.child("order").numAttr("val") ?? ot })).sort((O, ot) => O.order - ot.order).map((O) => O.ser), k = e.map((O, ot) => {
    const J = O.formatCode, W = Ye(v[ot] ?? t, o) ?? L, it = (ft) => {
      if (!(ft != null && ft.showVal)) return;
      const Zt = {
        show: !0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        position: W$(ft.position, p),
        fontSize: ft.fontSize ?? 9,
        ...ft.color ? { color: ft.color } : {},
        ...ft.bold === !0 ? { fontWeight: "bold" } : {},
        ...Xs(ft),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (Dt) => {
          const Ot = Dt == null ? void 0 : Dt.value, Ut = Ot && typeof Ot == "object" && "value" in Ot ? Ot.value : Ot;
          return Ut === 0 || Ut === null ? "" : me(Ut, $ ? "0%" : J);
        }
      };
      return ft.fontSize !== void 0 ? Hs(Zt) : Zt;
    }, lt = it(W), Pt = Ys(v[ot], t), Rt = Ws(Pt, o), Nt = ((g == null ? void 0 : g[ot]) ?? O.values).map((ft, Zt) => {
      var Xt;
      const Dt = Rt.get(Zt), Ot = O.values[Zt] ?? ft, Ut = Ll(O, Zt, ft, f), Y = (Xt = O.dataPointStyles) == null ? void 0 : Xt[Zt];
      let Bt;
      Y ? Bt = {
        ...Y.color ? { color: Y.color } : {},
        ...Y.borderColor ? { borderColor: Y.borderColor } : {},
        ...Y.borderWidth !== void 0 ? { borderWidth: Y.borderWidth } : {},
        ...Y.borderType ? { borderType: Y.borderType } : {}
      } : O.invertIfNegative !== !1 && Ot < 0 ? Bt = { color: "#FFFFFF", borderColor: "#000000", borderWidth: 1 } : b && !O.colorHex && M.length > 0 && (Bt = { color: M[Zt % M.length] });
      let Ft;
      if (Dt != null && Dt.deleted)
        Ft = { show: !1 };
      else if (Dt) {
        const H = {
          showVal: (W == null ? void 0 : W.showVal) ?? !1,
          showCatName: (W == null ? void 0 : W.showCatName) ?? !1,
          showSerName: (W == null ? void 0 : W.showSerName) ?? !1,
          showPercent: (W == null ? void 0 : W.showPercent) ?? !1,
          position: W == null ? void 0 : W.position,
          showLeaderLines: W == null ? void 0 : W.showLeaderLines,
          manualLayout: W == null ? void 0 : W.manualLayout,
          color: W == null ? void 0 : W.color,
          fontSize: W == null ? void 0 : W.fontSize,
          bold: W == null ? void 0 : W.bold,
          backgroundColor: W == null ? void 0 : W.backgroundColor,
          borderColor: W == null ? void 0 : W.borderColor,
          borderWidth: W == null ? void 0 : W.borderWidth,
          padding: W == null ? void 0 : W.padding,
          ...Dt
        };
        Ft = it(H);
      }
      return !Bt && !Ft ? Ut : {
        value: Ut,
        ...Bt ? { itemStyle: Bt } : {},
        ...Ft ? { label: Ft } : {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      };
    });
    return {
      type: "bar",
      name: O.name,
      data: Nt,
      stack: p ? "total" : void 0,
      itemStyle: O.colorHex ? { color: O.colorHex } : void 0,
      label: lt,
      ...O.formatCode ? {
        tooltip: {
          valueFormatter: (ft) => me(ft, $ ? "0%" : O.formatCode)
        }
      } : {},
      barGap: l !== void 0 ? `${-l}%` : "0%",
      // OOXML gapWidth = gap-between-groups / single-bar-width × 100.
      // For N clustered bars: categoryBand = N × barWidth + gap, gap = gapWidth/100 × barWidth.
      // ECharts barCategoryGap = gap / categoryBand = gapWidth / (100×N + gapWidth).
      // For stacked bars N=1 since all series share one bar slot.
      barCategoryGap: c !== void 0 ? `${Math.round(c * 100 / (100 * (p ? 1 : e.length) + c))}%` : void 0
    };
  }), A = n.child("plotArea"), { valueAxis: S, categoryAxis: w } = zo(A, o, t), F = {
    type: "category",
    data: a,
    axisLabel: { interval: 0, rotate: 0, fontSize: 10 }
  };
  Re(F, w, "category");
  const C = qs(e), E = ($ ? "0%" : void 0) || S.numFmt || (C != null && C.includes("%") ? C : void 0), P = {
    type: "value",
    ...E ? {
      axisLabel: {
        formatter: (O) => me(O, E)
      }
    } : {}
  };
  $ && bl(P), Re(P, S, "value");
  const B = !!d, R = r && B ? 60 : Wn(B, h), I = on(B, h), Z = r ? 15 : S.deleted ? 4 : 18, U = r ? 28 : 10, q = E || C, Q = Un(h), G = _n(n), T = !Vn(G);
  return {
    title: d,
    tooltip: {
      trigger: "axis",
      textStyle: x,
      extraCssText: pl(x),
      ...q ? {
        valueFormatter: (O) => me(
          Array.isArray(O) ? O[0] : O,
          q
        )
      } : {}
    },
    legend: sn(
      u,
      h,
      I,
      e.map((O) => O.name),
      x
    ),
    grid: {
      containLabel: T,
      left: Z,
      right: U,
      top: R,
      bottom: Q,
      ...G
    },
    xAxis: r ? P : F,
    yAxis: r ? F : P,
    series: k
  };
}
function Ur(t, n, e, o, s, i) {
  var G;
  const r = ((G = e.find((T) => T.categories.length > 0)) == null ? void 0 : G.categories) || [], c = rn(n, e, o, 14), l = nn(n, o), a = l == null ? void 0 : l.option, d = { fontSize: 10, ...(l == null ? void 0 : l.textStyle) ?? {} }, h = xl(t, "standard"), u = yl(h), x = gl(h), p = x ? ml(e) : void 0, $ = Ml(n);
  let g = Ye(t, o);
  if (!g) {
    const T = t.children("ser")[0];
    T != null && T.exists() && (g = Ye(T, o));
  }
  const f = t.children("ser").map((T, D) => ({ ser: T, order: T.child("order").numAttr("val") ?? D })).sort((T, D) => T.order - D.order).map((T) => T.ser), y = t.child("marker"), m = y.exists() ? we(y) : void 0, b = (T, D) => T.colorHex ?? (i == null ? void 0 : i[D % i.length]), M = (T, D) => {
    const O = b(T, D);
    return typeof O == "string" ? O : void 0;
  }, L = e.map((T, D) => {
    const O = b(T, D), ot = T.markerSymbol ?? (m === !0 ? Gr(D) : m === !1 ? "none" : void 0), J = Mn(ot), W = J !== void 0 ? J !== "none" : void 0, it = T.lineWidth ?? 3, lt = {
      ...O ? { color: O } : {},
      width: it,
      cap: "round",
      join: "round",
      ...T.lineNoFill ? { opacity: 0 } : {}
    }, Pt = T.formatCode, Rt = Ye(f[D] ?? t, o) ?? g, Wt = (N) => {
      if (!N || !yn(N)) return;
      const et = N, nt = {
        show: !0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        position: U$(et.position),
        fontSize: et.fontSize ?? 9,
        ...et.color ? { color: et.color } : {},
        ...et.bold === !0 ? { fontWeight: "bold" } : {},
        ...Xs(et),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (at) => {
          const bt = at == null ? void 0 : at.value, Mt = bt && typeof bt == "object" && "value" in bt ? bt.value : bt, tt = [];
          return et.showSerName && (at != null && at.seriesName) && tt.push(at.seriesName), et.showCatName && (at != null && at.name) && tt.push(at.name), et.showVal && typeof Mt == "number" && tt.push(me(Mt, x ? "0%" : Pt)), et.showPercent && typeof (at == null ? void 0 : at.percent) == "number" && tt.push(`${at.percent}%`), tt.join(" ");
        }
      };
      return et.fontSize !== void 0 ? Hs(nt) : nt;
    }, Nt = Wt(Rt), ft = Ys(f[D], t), Zt = Ws(ft, o), Dt = /* @__PURE__ */ new Map(), Ut = ((p == null ? void 0 : p[D]) ?? T.values).map((N, et) => {
      const nt = Ll(T, et, N, $), at = Zt.get(et);
      if (!at) return nt;
      at.manualLayout && Dt.set(et, at.manualLayout);
      const bt = at.deleted ? { show: !1 } : Wt(xo(Rt, at));
      return bt ? { value: nt, label: bt } : nt;
    }), Y = !!(Nt != null && Nt.show && J === "none"), Bt = Y ? "circle" : J && J !== "none" ? J : void 0, Ft = Y ? 0 : T.markerSize ?? (T.markerSymbol === void 0 && m === !0 ? $l : void 0), Xt = Y ? !0 : s && J === void 0 ? !1 : W, H = Xt === !0 && Bt !== void 0 && Bt !== "none" && Ft !== 0;
    return {
      type: "line",
      name: T.name,
      data: Ut,
      stack: u ? "total" : void 0,
      areaStyle: s ? { ...O ? { color: O } : {}, opacity: 1 } : void 0,
      itemStyle: O ? { color: O } : void 0,
      lineStyle: lt,
      label: Nt,
      labelLayout: vl(
        Dt
      ),
      connectNulls: $ === "span",
      ...T.smooth ? { smooth: !0 } : {},
      ...T.formatCode ? {
        tooltip: {
          valueFormatter: (N) => me(N, x ? "0%" : T.formatCode)
        }
      } : {},
      endLabel: { show: !1 },
      ...Bt ? { symbol: Bt } : {},
      ...Ft !== void 0 ? { symbolSize: Ft } : {},
      ...Xt !== void 0 ? { showSymbol: Xt } : {},
      ...H ? { showAllSymbol: !0 } : {},
      z: 3
    };
  }), v = n.child("plotArea"), { valueAxis: k, categoryAxis: A } = zo(v, o, t), S = qs(e), w = (x ? "0%" : void 0) || k.numFmt || (S != null && S.includes("%") ? S : void 0), F = {
    type: "value",
    ...w ? {
      axisLabel: {
        formatter: (T) => me(T, w)
      }
    } : {}
  };
  x && bl(F), Re(F, k, "value"), !x && s && X$(F, e, u);
  const C = {
    type: "category",
    data: r,
    ...s ? { boundaryGap: !1 } : {},
    axisLabel: { interval: 0, rotate: 0 }
  };
  Re(C, A, "category");
  const E = Wn(!!c, l), P = on(!!c, l), B = k.deleted ? 4 : 18, R = w || S, I = Un(l), Z = _n(n), U = !Vn(Z), q = e.map((T, D) => ({ series: T, idx: D })), Q = u || x ? [...q].reverse() : q;
  return {
    title: c,
    tooltip: {
      trigger: "axis",
      textStyle: d,
      extraCssText: pl(d),
      ...R ? {
        valueFormatter: (T) => me(
          Array.isArray(T) ? T[0] : T,
          R
        )
      } : {}
    },
    legend: sn(
      a,
      l,
      P,
      s ? Q.map(({ series: T, idx: D }) => {
        const O = M(T, D);
        return O ? { name: T.name, itemStyle: { color: O } } : T.name;
      }) : Q.map(({ series: T, idx: D }) => {
        const O = T.markerSymbol ?? (m === !0 ? Gr(D) : m === !1 ? "none" : void 0), ot = Mn(O), J = M(T, D), W = J ? { lineStyle: { color: J }, itemStyle: { color: J } } : {};
        return ot && ot !== "none" ? { name: T.name, icon: Fo(), marker: ot, ...W } : { name: T.name, icon: Fo(), ...W };
      }),
      d
    ),
    grid: {
      containLabel: U,
      left: B,
      right: 10,
      top: E,
      bottom: I,
      ...Z
    },
    xAxis: C,
    yAxis: F,
    series: L
  };
}
function Vr(t, n, e, o, s) {
  const i = rn(n, e, s, 12), r = nn(n, s), c = r == null ? void 0 : r.option, l = { fontSize: 10, ...(r == null ? void 0 : r.textStyle) ?? {} }, a = o ? e : e.slice(0, 1);
  if (a.length === 0)
    return { title: i };
  const d = t.children("ser").map((M, L) => ({ ser: M, order: M.child("order").numAttr("val") ?? L })).sort((M, L) => M.order - L.order).map((M) => M.ser), h = a.map((M, L) => {
    const v = d[L], k = (v != null && v.exists() ? Ye(v, s) : void 0) ?? Ye(t, s), A = Ys(v, t), S = (v == null ? void 0 : v.exists()) && v.child("dLbls").exists() || t.child("dLbls").exists(), w = Ws(A, s), F = [...w.values()].some(
      (C) => yn(xo(k, C))
    );
    return {
      series: M,
      serNode: v,
      sharedLabels: k,
      pointOverrides: w,
      labelsExplicitlyOff: S && !k && !F,
      explosions: v ? l$(v, M.categories.length) : void 0
    };
  }), u = h.some(
    (M) => !M.labelsExplicitlyOff && (yn(M.sharedLabels) || [...M.pointOverrides.values()].some(
      (L) => yn(xo(M.sharedLabels, L))
    ))
  ), x = o ? t.child("holeSize").numAttr("val") ?? 50 : 50, p = h.some(
    (M) => {
      var L;
      return (L = M.explosions) == null ? void 0 : L.some((v) => v > 0);
    }
  ), $ = O$(r, o, u, x, p), g = N$(t.child("firstSliceAng").numAttr("val")), f = h.map((M, L) => {
    var F;
    const v = /* @__PURE__ */ new Map(), k = M.series.categories.map((C, E) => {
      var Z, U, q;
      const P = M.pointOverrides.get(E), B = xo(M.sharedLabels, P);
      B != null && B.manualLayout && v.set(E, B.manualLayout);
      const R = {
        name: C || `Item ${E + 1}`,
        value: M.series.values[E] ?? 0
      }, I = (Z = M.series.dataPointStyles) == null ? void 0 : Z[E];
      return I ? R.itemStyle = {
        ...I.color ? { color: I.color } : {},
        ...I.borderColor ? { borderColor: I.borderColor } : {},
        ...I.borderWidth !== void 0 ? { borderWidth: I.borderWidth } : {},
        ...I.borderType ? { borderType: I.borderType } : {}
      } : (U = M.series.dataPointColors) != null && U[E] && (R.itemStyle = { color: M.series.dataPointColors[E] }), (q = M.explosions) != null && q[E] && M.explosions[E] > 0 && (R.selected = !0, R.selectedOffset = zr(M.explosions[E], o)), P != null && P.deleted ? R.label = { show: !1 } : P && yn(B) && (R.label = Wr(B, M.series.formatCode, M.series.name)), R;
    }), A = Wr(M.sharedLabels, M.series.formatCode, M.series.name), S = !!((F = M.sharedLabels) != null && F.showLeaderLines) || [...M.pointOverrides.values()].some((C) => C.showLeaderLines === !0), w = M.explosions && Math.max(...M.explosions.map((C) => zr(C, o)));
    return {
      type: "pie",
      name: M.series.name,
      radius: o ? Q$($.radius, L, h.length) : $.radius,
      center: $.center,
      data: k,
      selectedMode: M.explosions ? "multiple" : !1,
      ...w ? { selectedOffset: w } : {},
      ...g !== void 0 ? { startAngle: g, clockwise: !0 } : {},
      label: A ?? { show: !1 },
      labelLine: { show: S },
      labelLayout: vl(v)
    };
  }), y = on(!!i, r), m = qs(a), b = o ? q$(a) : a[0].categories;
  return {
    title: i,
    tooltip: {
      trigger: "item",
      ...m ? {
        valueFormatter: (M) => me(
          Array.isArray(M) ? M[0] : M,
          m
        )
      } : {}
    },
    legend: sn(c, r, y, b, l),
    series: f
  };
}
function J$(t, n, e, o, s, i) {
  var R, I;
  const r = rn(n, e, o, 12), c = nn(n, o), l = c == null ? void 0 : c.option, a = { fontSize: 10, ...(c == null ? void 0 : c.textStyle) ?? {} }, d = ((R = e.find((Z) => Z.categories.length > 0)) == null ? void 0 : R.categories) || [], h = n.child("plotArea"), { valueAxis: u } = zo(h, o);
  let x;
  if (u.max !== void 0)
    x = u.max;
  else {
    let Z = 0, U = 0;
    for (const Q of e)
      for (const G of Q.values)
        G > Z && (Z = G), G < U && (U = G);
    const q = We(Z, U, 5);
    x = Math.ceil(Z / q) * q || 100;
  }
  const p = !u.deleted && u.tickLblPos !== "none", $ = t.child("radarStyle").attr("val"), g = p ? {
    show: !0,
    formatter: (Z) => me(Z, u.numFmt),
    color: u.labelColor ?? "#000000",
    ...u.labelFontSize !== void 0 ? { fontSize: u.labelFontSize } : {}
  } : void 0, f = $ === "filled" ? { radarZ: 4, seriesZ: 2 } : { radarZ: void 0, seriesZ: void 0 }, y = (I = t.children("axId")[1]) == null ? void 0 : I.attr("val"), m = h.children("valAx").find((Z) => Z.child("axId").attr("val") === y) ?? h.child("valAx"), b = m.child("majorGridlines").child("spPr").exists(), M = m.child("spPr").child("ln").exists(), v = u.hasMajorGridlines && ($ !== "filled" || b) ? {
    show: !0,
    lineStyle: {
      ...as,
      ...b ? u.majorGridlineStyle ?? {} : {}
    }
  } : { show: !1 }, k = u.deleted ? { show: !1 } : {
    show: !0,
    lineStyle: {
      color: M ? u.lineColor ?? as.color : as.color
    }
  }, S = (d.length > 1 ? [d[0], ...d.slice(1).reverse()] : d).map((Z, U) => ({
    name: Z,
    max: x,
    ...u.min !== void 0 ? { min: u.min } : {},
    ...U === 0 && g ? { axisLabel: g } : {}
  })), w = Us(c) && !(c != null && c.overlay), F = sp(n, i), C = (F == null ? void 0 : F.center) ?? (w ? ["50%", "66%"] : $ === "filled" ? ["50%", "55%"] : ["50%", "50%"]), E = (F == null ? void 0 : F.radius) ?? (w ? "58%" : $ === "filled" ? "76%" : "86%"), P = e.map((Z, U) => {
    const q = Z.values.length > 1 ? [Z.values[0], ...Z.values.slice(1).reverse()] : Z.values, Q = Mn(Z.markerSymbol), G = $ === "marker" || Q !== void 0 && Q !== "none", T = $ === "filled", D = Z.colorHex ?? (s == null ? void 0 : s[U % s.length]), O = typeof D == "string" ? V$(D) : D, ot = T ? { ...O ? { color: O } : {}, opacity: 0.75 } : void 0;
    return {
      name: Z.name,
      value: q,
      ...D ? {
        lineStyle: {
          color: D,
          width: Z.lineWidth ?? 3,
          cap: "round",
          join: "round",
          ...Z.lineNoFill ? { opacity: 0 } : {}
        },
        itemStyle: { color: D }
      } : {
        lineStyle: {
          width: Z.lineWidth ?? 3,
          cap: "round",
          join: "round",
          ...Z.lineNoFill ? { opacity: 0 } : {}
        }
      },
      ...ot ? { areaStyle: ot } : {},
      ...Q && Q !== "none" ? { symbol: Q } : {},
      ...G ? {} : { symbol: "none" },
      ...Z.markerSize ? { symbolSize: Z.markerSize } : {},
      ...G ? { symbolSize: Z.markerSize ?? 6 } : {}
    };
  }), B = on(!!r, c);
  return {
    title: r,
    tooltip: {},
    legend: sn(
      l,
      c,
      B,
      e.map((Z) => {
        const U = Mn(Z.markerSymbol);
        return Z.lineNoFill && U && U !== "none" ? { name: Z.name, icon: U } : {
          name: Z.name,
          icon: Fo(),
          ...U && U !== "none" ? { marker: U } : {}
        };
      }),
      a
    ),
    radar: {
      ...f.radarZ !== void 0 ? { z: f.radarZ } : {},
      indicator: S,
      radius: E,
      center: C,
      splitNumber: 5,
      splitLine: v,
      axisLine: k,
      splitArea: { show: !1 }
    },
    series: [
      {
        type: "radar",
        ...f.seriesZ !== void 0 ? { z: f.seriesZ } : {},
        data: P
      }
    ]
  };
}
function j$(t, n, e, o) {
  const s = rn(n, e, o, 14), i = nn(n, o), r = i == null ? void 0 : i.option, c = { fontSize: 10, ...(i == null ? void 0 : i.textStyle) ?? {} }, l = t.child("scatterStyle").attr("val") ?? "lineMarker", a = l === "lineMarker" || l === "line" || l === "smoothMarker" || l === "smooth", d = l === "smoothMarker" || l === "smooth", h = l === "line" || l === "smooth", u = e.map((S, w) => {
    const F = S.values.map((B, R) => [S.xValues && R < S.xValues.length ? S.xValues[R] : R, B]), C = Mn(S.markerSymbol) ?? Zr(l, w), E = !h && C !== "none";
    if ((a || S.smooth) && !S.lineNoFill) {
      const R = S.smooth ?? d ? H$(F) : F, I = S.lineWidth ?? 3;
      return {
        type: "line",
        name: S.name,
        data: R,
        smooth: !1,
        showSymbol: E,
        ...E ? { symbol: C, symbolSize: S.markerSize ?? Nr } : {},
        ...S.colorHex ? {
          lineStyle: {
            color: S.colorHex,
            width: I,
            cap: "round",
            join: "round"
          },
          itemStyle: { color: S.colorHex }
        } : { lineStyle: { width: I, cap: "round", join: "round" } }
      };
    }
    return {
      type: "scatter",
      name: S.name,
      data: F,
      symbol: E ? C : "none",
      symbolSize: E ? S.markerSize ?? Nr : 0,
      itemStyle: S.colorHex ? { color: S.colorHex } : void 0
    };
  }), x = e.map((S, w) => {
    const F = Mn(S.markerSymbol) ?? Zr(l, w), C = !h && F !== "none";
    return (a || S.smooth) && !S.lineNoFill ? C && F ? { name: S.name, icon: F } : { name: S.name, icon: Fo() } : F && F !== "none" ? { name: S.name, icon: F } : S.name;
  }), p = n.child("plotArea"), { xAxis: $, yAxis: g } = dl(p, o), f = Wn(!!s, i), y = on(!!s, i), m = _n(n), b = !Vn(m), M = g.deleted ? 4 : 18, L = f, v = Math.max(Un(i), 20), k = { type: "value" }, A = { type: "value" };
  return Re(k, $, "value"), Re(A, g, "value"), {
    title: s,
    tooltip: { trigger: "item" },
    legend: sn(r, i, y, x, c),
    grid: {
      containLabel: b,
      left: M,
      right: 10,
      top: L,
      bottom: v,
      ...m
    },
    xAxis: k,
    yAxis: A,
    series: u
  };
}
function _r(t, n, e) {
  if (t.max !== void 0 || n.length === 0) return;
  const o = n.map((u, x) => ({ value: u, bubbleSize: e[x] ?? 0 })).filter(({ value: u }) => Number.isFinite(u));
  if (o.length === 0) return;
  const s = Math.min(...o.map(({ value: u }) => u)), i = Math.max(...o.map(({ value: u }) => u)), c = i - Math.min(0, s) <= 3 ? 3 : 8, l = We(i, s, c);
  let a = ko(i, s, c);
  a > i && a - i < l * 0.25 && (a += l);
  const d = Math.max(...o.map(({ bubbleSize: u }) => u)), h = Math.max(
    ...o.filter(({ value: u }) => Math.abs(u - i) < 1e-9).map(({ bubbleSize: u }) => u),
    0
  );
  d > 0 && h / d >= 0.75 && (a += l), t.max = a, t.min === void 0 && s >= 0 && (t.min = 0), t.interval === void 0 && (t.interval = l);
}
function tp(t, n, e, o) {
  const s = rn(n, e, o, 14), i = nn(n, o), r = i == null ? void 0 : i.option, c = { fontSize: 10, ...(i == null ? void 0 : i.textStyle) ?? {} }, l = Math.max(t.child("bubbleScale").numAttr("val") ?? 100, 0), a = G$ * (l / 100);
  let d = -1 / 0;
  for (const S of e)
    if (S.bubbleSizes)
      for (const w of S.bubbleSizes)
        w > d && (d = w);
  const h = d > 0 ? d : 1, u = e.map((S) => {
    const w = S.values.map((F, C) => {
      const E = S.xValues && C < S.xValues.length ? S.xValues[C] : C, P = S.bubbleSizes && C < S.bubbleSizes.length ? S.bubbleSizes[C] : 0;
      return [E, F, P];
    });
    return {
      type: "scatter",
      name: S.name,
      data: w,
      symbolSize: (F) => {
        const C = Math.max(Number(F[2]) || 0, 0);
        return Math.sqrt(C / h) * a;
      },
      itemStyle: S.colorHex ? { color: S.colorHex } : void 0
    };
  }), x = n.child("plotArea"), { xAxis: p, yAxis: $ } = dl(x, o), g = Wn(!!s, i), f = on(!!s, i), y = _n(n), m = !Vn(y), b = $.deleted ? 4 : 18, M = g, L = Math.max(Un(i), 20), v = { type: "value" }, k = { type: "value" };
  Re(v, p, "value"), Re(k, $, "value");
  const A = e.flatMap(
    (S) => S.values.map((w, F) => ({
      x: S.xValues && F < S.xValues.length ? S.xValues[F] : F,
      y: w,
      bubbleSize: S.bubbleSizes && F < S.bubbleSizes.length ? S.bubbleSizes[F] : 0
    }))
  );
  return _r(
    v,
    A.map((S) => S.x),
    A.map((S) => S.bubbleSize)
  ), _r(
    k,
    A.map((S) => S.y),
    A.map((S) => S.bubbleSize)
  ), {
    title: s,
    tooltip: {
      trigger: "item",
      formatter: (S) => {
        const w = S;
        return `${w.seriesName}<br/>x: ${w.value[0]}, y: ${w.value[1]}, size: ${w.value[2]}`;
      }
    },
    legend: sn(
      r,
      i,
      f,
      e.map((S) => ({ name: S.name, icon: "circle" })),
      c
    ),
    grid: {
      containLabel: m,
      left: b,
      right: 10,
      top: M,
      bottom: L,
      ...y
    },
    xAxis: v,
    yAxis: k,
    series: u
  };
}
function ep(t) {
  return /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(t.trim());
}
function np(t) {
  switch (t) {
    case "dot":
    case "circle":
      return "circle";
    case "square":
      return "rect";
    case "diamond":
    case "triangle":
      return t;
    case "none":
    case void 0:
      return "none";
    default:
      return "circle";
  }
}
function op(t, n, e, o) {
  var S, w, F, C, E, P, B;
  const s = rn(n, e, o, 14), i = nn(n, o), r = ((S = e.find((R) => R.categories.length > 0)) == null ? void 0 : S.categories) || [], c = r.length || Math.max(...e.map((R) => R.values.length), 0), l = [];
  if (e.length >= 4)
    for (let R = 0; R < c; R++)
      l.push([
        e[0].values[R] ?? 0,
        // open
        e[3].values[R] ?? 0,
        // close
        e[2].values[R] ?? 0,
        // low
        e[1].values[R] ?? 0
        // high
      ]);
  else if (e.length >= 3)
    for (let R = 0; R < c; R++) {
      const I = e[2].values[R] ?? 0;
      l.push([
        I,
        // open = close
        I,
        // close
        e[1].values[R] ?? 0,
        // low
        e[0].values[R] ?? 0
        // high
      ]);
    }
  else
    for (let R = 0; R < c; R++) {
      const I = ((w = e[0]) == null ? void 0 : w.values[R]) ?? 0;
      l.push([0, I, 0, I]);
    }
  const a = n.child("plotArea"), { valueAxis: d, categoryAxis: h } = zo(a, o, t), u = Wn(!!s, i), x = _n(n), p = !Vn(x), $ = {
    type: "category",
    data: r,
    axisLabel: { interval: 0, rotate: 0, fontSize: 10 },
    splitLine: { show: !1 }
  };
  Re($, h, "category");
  const g = r.length >= 3 && r.every((R) => ep(R)) && !h.deleted && h.tickLblPos !== "none";
  if (g) {
    const R = $.axisLabel || {};
    $.axisLabel = {
      ...R,
      rotate: 45,
      margin: Math.max(Number(R.margin) || 0, 10)
    };
  }
  const f = { type: "value" };
  Re(f, d, "value");
  const y = l.flatMap((R) => [R[2], R[3]]).filter((R) => Number.isFinite(R));
  if (y.length > 0) {
    const R = Math.min(...y), I = Math.max(...y);
    if (f.min === void 0 && R >= 0 && (f.min = 0), f.interval === void 0 && (f.interval = We(I, R, 7)), f.max === void 0) {
      const Z = Number(f.interval) || We(I, R, 7);
      f.max = Math.ceil(I / Z) * Z + Z;
    }
  }
  const m = i == null ? void 0 : i.option, b = { fontSize: 10, ...(i == null ? void 0 : i.textStyle) ?? {} }, M = on(!!s, i), L = Math.max(Un(i), g ? 56 : 0), v = e.length >= 3 && e.length < 4, k = v ? e.slice(0, 3).map((R, I) => ({
    name: R.name,
    icon: I === 2 ? np(R.markerSymbol) : "none"
  })) : e.map((R) => R.name), A = v ? [
    {
      type: "custom",
      name: e[2].name,
      coordinateSystem: "cartesian2d",
      // data: [categoryIndex, high, low, close]
      data: Array.from({ length: c }, (R, I) => [
        I,
        e[0].values[I] ?? 0,
        e[1].values[I] ?? 0,
        e[2].values[I] ?? 0
      ]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      renderItem: (R, I) => {
        const Z = I.value(0), U = I.value(1), q = I.value(2), Q = I.value(3), G = I.coord([Z, U]), T = I.coord([Z, q]), D = I.coord([Z, Q]), O = Math.max(8, I.size([1, 0])[0] || 12), ot = Math.min(4, Math.max(2, Math.round(O * 0.04))), J = $n(e[0].colorHex, "#000000"), W = $n(e[2].colorHex, "#00B050");
        return {
          type: "group",
          children: [
            {
              type: "line",
              shape: {
                x1: G[0],
                y1: G[1],
                x2: T[0],
                y2: T[1]
              },
              style: {
                stroke: J,
                lineWidth: 1
              }
            },
            {
              type: "line",
              shape: {
                x1: D[0],
                y1: D[1],
                x2: D[0] + ot,
                y2: D[1]
              },
              style: {
                stroke: W,
                lineWidth: 1
              }
            }
          ]
        };
      },
      silent: !0
    }
  ] : [
    {
      type: "candlestick",
      name: e.length >= 3 ? e[2].name : (F = e[0]) == null ? void 0 : F.name,
      data: l,
      itemStyle: {
        // OOXML up/down colors from series spPr; fallback to standard financial convention
        color: $n(
          (C = e[e.length >= 4 ? 3 : 2]) == null ? void 0 : C.colorHex,
          "#ec0000"
        ),
        color0: $n((E = e[0]) == null ? void 0 : E.colorHex, "#00da3c"),
        borderColor: $n(
          (P = e[e.length >= 4 ? 3 : 2]) == null ? void 0 : P.colorHex,
          "#ec0000"
        ),
        borderColor0: $n((B = e[0]) == null ? void 0 : B.colorHex, "#00da3c")
      }
    }
  ];
  return {
    title: s,
    tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
    legend: sn(m, i, M, k, b),
    grid: {
      containLabel: p,
      // Stock charts with rotated date labels need extra left inset so the
      // first category label is not clipped by the plot boundary.
      left: 24,
      right: 10,
      top: u,
      bottom: L,
      ...x
    },
    xAxis: $,
    yAxis: f,
    series: A
  };
}
function Qs(t) {
  const n = t.child("plotArea").child("layout").child("manualLayout");
  return n.exists() ? {
    x: n.child("x").numAttr("val"),
    y: n.child("y").numAttr("val"),
    w: n.child("w").numAttr("val"),
    h: n.child("h").numAttr("val")
  } : {};
}
function _n(t) {
  const n = Qs(t), e = {};
  return n.x !== void 0 && (e.left = re(n.x)), n.y !== void 0 && (e.top = re(n.y)), n.w !== void 0 && (e.width = re(n.w)), n.h !== void 0 && (e.height = re(n.h)), e;
}
function sp(t, n) {
  const { x: e, y: o, w: s, h: i } = Qs(t);
  if (e === void 0 || o === void 0 || s === void 0 || i === void 0) return;
  const r = e + s / 2, c = o + i / 2;
  return n ? {
    center: [r * n.w, c * n.h],
    radius: Math.min(s * n.w, i * n.h) / 2
  } : {
    center: [re(r), re(c)],
    radius: re(Math.min(s, i) / 2)
  };
}
function ip(t, n, e) {
  if (!e) return;
  const { x: o = 0, y: s = 0, w: i = 1, h: r = 1 } = Qs(t);
  return {
    type: "rect",
    silent: !0,
    z: -10,
    left: o * e.w,
    top: s * e.h,
    shape: {
      width: i * e.w,
      height: r * e.h
    },
    style: {
      fill: n,
      stroke: "none"
    }
  };
}
function rp(t, n) {
  const e = t.graphic;
  if (!e) {
    t.graphic = n;
    return;
  }
  t.graphic = Array.isArray(e) ? [n, ...e] : [n, e];
}
function Xr(t, n, e, o, s, i, r) {
  switch (t) {
    case "barChart":
    case "bar3DChart":
      return K$(n, e, o, s);
    case "lineChart":
    case "line3DChart":
      return Ur(n, e, o, s, !1, i);
    case "areaChart":
    case "area3DChart":
    case "surface3DChart":
      return Ur(n, e, o, s, !0, i);
    case "pieChart":
    case "pie3DChart":
      return Vr(n, e, o, !1, s);
    case "doughnutChart":
      return Vr(n, e, o, !0, s);
    case "radarChart":
      return J$(
        n,
        e,
        o,
        s,
        i,
        r
      );
    case "scatterChart":
      return j$(n, e, o, s);
    case "bubbleChart":
      return tp(n, e, o, s);
    case "stockChart":
      return op(n, e, o, s);
    default:
      return;
  }
}
function ho(t) {
  return t === "barChart" || t === "bar3DChart" || t === "lineChart" || t === "line3DChart" || t === "areaChart" || t === "area3DChart" || t === "stockChart" || t === "surface3DChart";
}
function Yr(t, n) {
  const e = Co(t), o = Co(n);
  if (!e) return n;
  if (!o) return t;
  const s = [...e.data ?? [], ...o.data ?? []], i = /* @__PURE__ */ new Set(), r = s.filter((l) => {
    const a = typeof l == "string" ? l : l.name;
    return i.has(a) ? !1 : (i.add(a), !0);
  }), c = {
    ...e,
    data: r
  };
  return r.some((l) => typeof l == "object" && l.icon) && delete c.icon, c;
}
function Tn(t) {
  return t === void 0 ? [] : Array.isArray(t) ? t : [t];
}
function vs(t, n, e) {
  if (typeof t == "number" && Number.isFinite(t)) return t;
  if (typeof t == "string") {
    if (t.endsWith("%")) {
      const s = parseFloat(t);
      return Number.isFinite(s) ? n * s / 100 : e;
    }
    const o = parseFloat(t);
    return Number.isFinite(o) ? o : e;
  }
  return e;
}
function qr(t, n, e, o) {
  if (typeof (t == null ? void 0 : t.width) == "string" && e === "left" && t.width.endsWith("%"))
    return n * parseFloat(t.width) / 100;
  if (typeof (t == null ? void 0 : t.height) == "string" && e === "top" && t.height.endsWith("%"))
    return n * parseFloat(t.height) / 100;
  if (typeof (t == null ? void 0 : t.width) == "number" && e === "left") return t.width;
  if (typeof (t == null ? void 0 : t.height) == "number" && e === "top") return t.height;
  const s = vs(t == null ? void 0 : t[e], n, 0), i = vs(t == null ? void 0 : t[o], n, 0);
  return Math.max(0, n - s - i);
}
function cp(t) {
  return typeof t.min == "number" && typeof t.max == "number" && t.min < 0 && t.max > 0;
}
function Qr(t, n, e) {
  var r;
  if (!n || t.type !== "category" || n.type !== "value" || ((r = t.axisLine) == null ? void 0 : r.onZero) !== !0 || !cp(n) || e <= 0) return !1;
  const o = e * ((0 - n.min) / (n.max - n.min)), s = t.axisLabel ?? (t.axisLabel = {}), i = Math.max(6, Math.round(s.fontSize ?? 10));
  return s.margin = -Math.round(Math.max(0, o - i)), t.z = Math.max(t.z ?? 0, 20), !0;
}
function lp(t, n) {
  const e = Tn(
    t.grid
  )[0], o = Tn(
    t.xAxis
  ), s = Tn(
    t.yAxis
  ), i = qr(e, n.h, "top", "bottom"), r = qr(e, n.w, "left", "right");
  let c = !1;
  o.forEach((l, a) => {
    c = Qr(l, s[a] ?? s[0], i) || c;
  }), s.forEach((l, a) => {
    c = Qr(l, o[a] ?? o[0], r) || c;
  }), c && e && (e.containLabel = !1, e.left = Math.max(vs(e.left, n.w, 0), 48));
}
function Kr(t) {
  return al(t)[1];
}
function ap(t, n, e, o) {
  const s = Array.isArray(t.series) ? t.series : [], i = Array.isArray(n.series) ? n.series : [], r = Kr(e), c = Kr(o);
  if (r !== void 0 && c !== void 0 && r !== c) {
    const a = Tn(t.yAxis), d = Tn(n.yAxis), h = a.length;
    return {
      ...t,
      legend: Yr(t.legend, n.legend),
      yAxis: [...a, ...d],
      series: [
        ...s,
        ...i.map((u) => ({
          ...u,
          yAxisIndex: u.yAxisIndex !== void 0 ? u.yAxisIndex : h
        }))
      ]
    };
  }
  return {
    ...t,
    legend: Yr(t.legend, n.legend),
    series: [...s, ...i]
  };
}
function dp(t, n, e, o) {
  const s = f$(t, n), i = b$(t, s, e), r = t.child("chart"), c = r.child("plotArea");
  if (!c.exists())
    return {
      option: { title: { text: "Unsupported chart", left: "center" } },
      chartFrameStyle: Tr(t, s)
    };
  const { chartBg: l, plotAreaBg: a } = R$(t, r, s), d = Tr(t, s), h = qf.flatMap(
    (u) => c.children(u).map((x) => {
      const p = a$(x, s);
      return p.length === 0 ? null : { typeName: u, chartTypeNode: x, seriesArr: p };
    })
  ).filter(
    (u) => u !== null
  );
  for (const [u, x] of h.entries()) {
    let p = Xr(
      x.typeName,
      x.chartTypeNode,
      r,
      x.seriesArr,
      s,
      i,
      o
    );
    if (!p) continue;
    if (u === 0 && h.length > 1 && ho(x.typeName))
      for (const b of h.slice(1)) {
        if (!ho(b.typeName)) continue;
        const M = Xr(
          b.typeName,
          b.chartTypeNode,
          r,
          b.seriesArr,
          s,
          i,
          o
        );
        M && (p = ap(
          p,
          M,
          x.chartTypeNode,
          b.chartTypeNode
        ));
      }
    const $ = B$(t);
    $ && A$(p, $);
    const g = t$(s);
    if (g && S$(p, g), C$(p), F$(p, r, $), E$(p, o), l && (p.backgroundColor = l), i && i.length > 0 && (p.color = i), a)
      if (p.grid)
        p.grid.backgroundColor = a, p.grid.show = !0;
      else {
        const b = ip(r, a, o);
        b && rp(p, b);
      }
    const f = u === 0 && h.length > 1 && ho(x.typeName) ? h.filter((b) => ho(b.typeName)).flatMap((b) => b.seriesArr).sort((b, M) => b.order - M.order) : x.seriesArr, y = d$(c), m = y ? {
      seriesArr: f,
      showKeys: y.showKeys
    } : void 0;
    return { option: p, dataTable: m, chartFrameStyle: d };
  }
  return {
    option: {
      title: { text: "Unsupported chart type", left: "center", textStyle: { fontSize: 12 } }
    },
    chartFrameStyle: d
  };
}
function hp(t, n) {
  var p, $, g;
  const e = document.createElement("div");
  e.style.position = "absolute", e.style.left = `${t.position.x}px`, e.style.top = `${t.position.y}px`, e.style.width = `${t.size.w}px`, e.style.height = `${t.size.h}px`, e.style.overflow = "hidden", e.style.display = "flex", e.style.flexDirection = "column";
  const o = (p = n.presentation.charts) == null ? void 0 : p.get(t.chartPath);
  if (!o)
    return e.style.border = "1px dashed #ccc", e.style.display = "flex", e.style.alignItems = "center", e.style.justifyContent = "center", e.style.color = "#999", e.style.fontSize = "12px", e.textContent = "Chart not found", e;
  const s = document.createElement("div");
  s.style.width = "100%", s.style.flex = "1", s.style.minWidth = "0", s.style.minHeight = "0", s.style.overflow = "hidden", e.appendChild(s);
  const i = ($ = n.presentation.chartThemes) == null ? void 0 : $.get(t.chartPath), r = i ? { ...n, theme: i, colorCache: /* @__PURE__ */ new Map() } : n, { option: c, dataTable: l, chartFrameStyle: a } = dp(
    o,
    r,
    t.chartPath,
    t.size
  );
  lp(c, t.size), a && (e.style.boxSizing = "border-box", a.borderColor && a.borderWidth && a.borderStyle && (e.style.border = `${a.borderWidth}px ${a.borderStyle} ${a.borderColor}`));
  const d = T$(c, t.size), h = Co(c.legend);
  if (d && h && (h.show = !1, e.appendChild(d)), l) {
    const f = l.seriesArr.map((m) => m.colorHex).filter(Boolean), y = h$(
      l,
      f.length > 0 ? f : void 0
    );
    e.appendChild(y);
  }
  const u = n.chartInstances, x = new Promise((f) => {
    const y = () => {
      up(s, c, u), f();
    };
    requestAnimationFrame(() => {
      if (!s.isConnected) {
        f();
        return;
      }
      if (s.offsetWidth === 0 || s.offsetHeight === 0) {
        if (typeof ResizeObserver > "u") {
          y();
          return;
        }
        const m = new ResizeObserver((b) => {
          var v;
          if (!s.isConnected) {
            m.disconnect();
            return;
          }
          const { width: M, height: L } = ((v = b[0]) == null ? void 0 : v.contentRect) ?? { width: 0, height: 0 };
          M > 0 && L > 0 && (m.disconnect(), y());
        });
        m.observe(s), f();
        return;
      }
      y();
    });
  });
  return (g = n.asyncTasks) == null || g.push(x), e;
}
function up(t, n, e) {
  try {
    const o = wo.init(t);
    if (o.setOption(n), e == null || e.add(o), typeof ResizeObserver > "u")
      return;
    const s = new ResizeObserver(() => {
      t.isConnected ? o.resize() : (s.disconnect(), o.isDisposed() || o.dispose(), e == null || e.delete(o));
    });
    s.observe(t);
  } catch (o) {
    console.warn("Failed to initialize ECharts:", o), t.style.display = "flex", t.style.alignItems = "center", t.style.justifyContent = "center", t.style.color = "#999", t.style.fontSize = "12px", t.textContent = "Chart render error";
  }
}
function yo(t, n) {
  switch (t.nodeType) {
    case "shape":
      return ju(t, n);
    case "picture":
      return w0(t, n);
    case "table":
      return Af(t, n);
    case "group":
      return Bf(t, n, yo);
    case "chart":
      return hp(t, n);
    default: {
      const e = document.createElement("div");
      return e.style.position = "absolute", e.style.left = `${t.position.x}px`, e.style.top = `${t.position.y}px`, e.style.width = `${t.size.w}px`, e.style.height = `${t.size.h}px`, e;
    }
  }
}
function fp(t) {
  const n = document.createElement("div");
  return n.style.position = "absolute", n.style.left = `${t.position.x}px`, n.style.top = `${t.position.y}px`, n.style.width = `${t.size.w}px`, n.style.height = `${t.size.h}px`, n.style.border = "2px dashed #ff4444", n.style.backgroundColor = "rgba(255,68,68,0.08)", n.style.display = "flex", n.style.alignItems = "center", n.style.justifyContent = "center", n.style.color = "#cc0000", n.style.fontSize = "11px", n.style.fontFamily = "monospace", n.style.overflow = "hidden", n.style.boxSizing = "border-box", n.style.padding = "4px", n.textContent = "Render Error", n.title = `Failed to render node: ${t.id} (${t.name})`, n;
}
const Jr = /* @__PURE__ */ new WeakMap();
function $p(t, n, e, o) {
  const s = [];
  if (!t || !t.exists || !t.exists()) return s;
  const i = {
    rels: n ?? /* @__PURE__ */ new Map(),
    partPath: e,
    diagramDrawings: o
  };
  for (const r of t.allChildren())
    if (!Cs(r))
      try {
        const c = Nn(r, i);
        c && (c.size.w > 0 || c.size.h > 0) && s.push(c);
      } catch {
      }
  return s;
}
function jr(t, n, e, o) {
  const s = Jr.get(t);
  if (s && s.rels === n && s.partPath === e && s.diagramDrawings === o)
    return s.nodes;
  const i = $p(t, n, e, o);
  return Jr.set(t, {
    nodes: i,
    rels: n,
    partPath: e,
    diagramDrawings: o
  }), i;
}
function pp(t) {
  if (t.isConnected) return () => {
  };
  const n = {
    position: t.style.position,
    left: t.style.left,
    top: t.style.top,
    visibility: t.style.visibility,
    pointerEvents: t.style.pointerEvents,
    contain: t.style.contain
  };
  return t.style.position = "fixed", t.style.left = "-100000px", t.style.top = "0", t.style.visibility = "hidden", t.style.pointerEvents = "none", t.style.contain = "layout style paint", document.body.appendChild(t), () => {
    t.parentNode === document.body && document.body.removeChild(t), t.style.position = n.position, t.style.left = n.left, t.style.top = n.top, t.style.visibility = n.visibility, t.style.pointerEvents = n.pointerEvents, t.style.contain = n.contain;
  };
}
function ds(t, n, e) {
  var p, $;
  Po(t, n);
  const o = !!(e != null && e.mediaUrlCache), s = (e == null ? void 0 : e.chartInstances) ?? /* @__PURE__ */ new Set(), i = [], r = new AbortController(), c = Ed(
    t,
    n,
    e == null ? void 0 : e.mediaUrlCache,
    s,
    e == null ? void 0 : e.pdfjs,
    r.signal
  );
  c.asyncTasks = i, e != null && e.onNavigate && (c.onNavigate = e.onNavigate);
  const l = document.createElement("div");
  l.style.position = "relative", l.style.width = `${t.width}px`, l.style.height = `${t.height}px`, l.style.overflow = "hidden", l.style.backgroundColor = "#FFFFFF", c.measurementRoot = l;
  const a = pp(l);
  try {
    try {
      hh(c, l);
    } catch (g) {
      (p = e == null ? void 0 : e.onNodeError) == null || p.call(e, "__background__", g);
    }
    if (n.showMasterSp && c.layout.showMasterSp) {
      const g = {
        ...c,
        slide: { ...c.slide, rels: c.master.rels },
        partPath: c.masterPath,
        skipPlaceholderChildren: !0
      }, f = jr(
        c.master.spTree,
        c.master.rels,
        c.masterPath,
        t.diagramDrawings
      );
      for (const y of f)
        try {
          const m = yo(y, g);
          l.appendChild(m);
        } catch {
        }
    }
    if (n.showMasterSp) {
      const g = {
        ...c,
        slide: { ...c.slide, rels: c.layout.rels },
        partPath: c.layoutPath,
        skipPlaceholderChildren: !0
      }, f = jr(
        c.layout.spTree,
        c.layout.rels,
        c.layoutPath,
        t.diagramDrawings
      );
      for (const y of f)
        try {
          const m = yo(y, g);
          l.appendChild(m);
        } catch {
        }
    }
    for (const g of n.nodes)
      try {
        const f = yo(g, c);
        l.appendChild(f);
      } catch (f) {
        ($ = e == null ? void 0 : e.onNodeError) == null || $.call(e, g.id, f), l.appendChild(fp(g));
      }
  } finally {
    a();
  }
  let d = !1;
  const h = c.mediaUrlCache, u = Promise.allSettled(i).then(() => {
  }), x = () => {
    if (!d) {
      if (d = !0, r.abort(), s)
        for (const g of s)
          !g.isDisposed() && l.contains(g.getDom()) && (g.dispose(), s.delete(g));
      if (!o) {
        for (const g of h.values())
          URL.revokeObjectURL(g);
        h.clear();
      }
    }
  };
  return {
    element: l,
    ready: u,
    dispose: x,
    [Symbol.dispose]() {
      x();
    }
  };
}
const xp = {
  includeShapes: !0,
  includeTables: !0,
  includeGroups: !0
}, Ks = {
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1
}, yp = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), Al = (t) => t ? t.paragraphs.map((n) => n.runs.map((e) => e.text).join("")).join(`
`) : "", gp = (t) => Al(t.textBody), Sl = (t, n = Ks) => ({
  x: n.offsetX + t.position.x * n.scaleX,
  y: n.offsetY + t.position.y * n.scaleY,
  w: t.size.w * n.scaleX,
  h: t.size.h * n.scaleY
}), Cl = (t) => t.trim().length > 0, tc = (t) => t !== void 0 && /[A-Za-z0-9_]/.test(t), mp = (t, n, e) => !tc(t[n - 1]) && !tc(t[e]), bp = (t) => {
  const n = (t % 360 + 360) % 360;
  return Math.abs(n - 90) < 1e-4 || Math.abs(n - 270) < 1e-4;
}, Mp = (t, n, e, o) => {
  const s = Math.max(0, n - o), i = Math.min(t.length, e + o), r = s > 0 ? "..." : "", c = i < t.length ? "..." : "";
  return `${r}${t.slice(s, i)}${c}`;
}, Fl = (t, n, e = !1, o) => {
  const s = Nn(t, {
    ...n,
    skipPlaceholders: e
  });
  return s && Bo(s, n.layout, n.master, { parentGroup: o }), s;
}, Lp = (t, n, e) => {
  if (t.childExtent.w <= 0 || t.childExtent.h <= 0)
    return {
      offsetX: e.offsetX + t.position.x * e.scaleX,
      offsetY: e.offsetY + t.position.y * e.scaleY,
      scaleX: e.scaleX,
      scaleY: e.scaleY
    };
  const o = t.childExtent.w > 0 ? t.size.w / t.childExtent.w : 1, s = t.childExtent.h > 0 ? t.size.h / t.childExtent.h : 1;
  if (bp(n.rotation)) {
    const i = n.position.x + (n.size.w - n.size.h) / 2, r = n.position.y + (n.size.h - n.size.w) / 2, c = {
      w: n.size.w * s,
      h: n.size.h * o
    }, l = {
      x: (i - t.childOffset.x) * o - (c.w - c.h) / 2,
      y: (r - t.childOffset.y) * s - (c.h - c.w) / 2
    }, a = e.scaleX * s, d = e.scaleY * o;
    return {
      offsetX: e.offsetX + (t.position.x + l.x) * e.scaleX - n.position.x * a,
      offsetY: e.offsetY + (t.position.y + l.y) * e.scaleY - n.position.y * d,
      scaleX: a,
      scaleY: d
    };
  }
  return {
    offsetX: e.offsetX + (t.position.x - t.childOffset.x * o) * e.scaleX,
    offsetY: e.offsetY + (t.position.y - t.childOffset.y * s) * e.scaleY,
    scaleX: e.scaleX * o,
    scaleY: e.scaleY * s
  };
}, vp = (t, n, e, o, s) => {
  const i = Al(e.textBody);
  Cl(i) && t.push({
    slideIndex: n,
    nodeId: e.id,
    nodePath: o,
    nodeType: e.nodeType,
    textKind: "shape",
    text: i,
    bounds: Sl(e, s)
  });
}, Ap = (t, n, e, o, s) => {
  e.rows.forEach((i, r) => {
    i.cells.forEach((c, l) => {
      const a = gp(c);
      Cl(a) && t.push({
        slideIndex: n,
        nodeId: e.id,
        nodePath: `${o}/rows/${r}/cells/${l}`,
        nodeType: e.nodeType,
        textKind: "table-cell",
        text: a,
        bounds: Sl(e, s),
        rowIndex: r,
        cellIndex: l
      });
    });
  });
}, Js = (t, n, e, o, s, i, r = Ks, c = !1) => {
  if (!(c && e.placeholder))
    switch (e.nodeType) {
      case "shape":
        s.includeShapes && vp(t, n, e, o, r);
        break;
      case "table":
        s.includeTables && Ap(t, n, e, o, r);
        break;
      case "group":
        if (!s.includeGroups) break;
        {
          const l = e;
          e.children.forEach((a, d) => {
            try {
              const h = Fl(a, i, c, l);
              if (!h) return;
              const u = Lp(l, h, r), x = h.id || h.name || String(d);
              Js(
                t,
                n,
                h,
                `${o}/children/${d}/${x}`,
                s,
                i,
                u,
                c
              );
            } catch {
            }
          });
        }
        break;
    }
}, ec = (t, n, e, o, s, i) => {
  e != null && e.exists() && e.allChildren().forEach((r, c) => {
    if (!Cs(r))
      try {
        const l = Fl(r, i, !0);
        if (!l) return;
        const a = l.id || l.name || String(c);
        Js(
          t,
          n,
          l,
          `slides/${n}/${o}/nodes/${a}`,
          s,
          i,
          Ks,
          !0
        );
      } catch {
      }
  });
}, kl = (t, n) => {
  const e = { ...xp, ...n }, o = [];
  return t.slides.forEach((s, i) => {
    Po(t, s);
    const r = t.slideToLayout.get(s.index) || s.layoutIndex, c = t.layouts.get(r), l = r ? t.layoutToMaster.get(r) : "", a = l ? t.masters.get(l) : void 0;
    s.showMasterSp && (c != null && c.showMasterSp && a && ec(o, i, a.spTree, "master", e, {
      rels: a.rels,
      partPath: l,
      diagramDrawings: t.diagramDrawings,
      layout: c,
      master: a
    }), c && ec(o, i, c.spTree, "layout", e, {
      rels: c.rels,
      partPath: r,
      diagramDrawings: t.diagramDrawings,
      layout: c,
      master: a
    })), s.nodes.forEach((d, h) => {
      const u = d.id || d.name || String(h);
      Js(
        o,
        i,
        d,
        `slides/${i}/nodes/${u}`,
        e,
        {
          rels: s.rels,
          partPath: s.slidePath,
          diagramDrawings: t.diagramDrawings,
          layout: c,
          master: a
        }
      );
    });
  }), o;
}, Sp = (t, n) => {
  if (t instanceof RegExp) {
    const s = new Set(t.flags.split(""));
    return s.add("g"), new RegExp(t.source, [...s].join(""));
  }
  if (!t) return null;
  const e = n.useRegex ? t : yp(t), o = n.matchCase ? "g" : "gi";
  return new RegExp(e, o);
}, wl = (t, n, e = {}) => {
  const o = Sp(n, e);
  if (!o) return [];
  const s = e.snippetRadius ?? 32, i = [];
  for (const r of t) {
    o.lastIndex = 0;
    let c;
    for (; (c = o.exec(r.text)) !== null; ) {
      const l = c[0];
      if (l.length === 0) {
        o.lastIndex += 1;
        continue;
      }
      const a = c.index, d = a + l.length;
      e.wholeWord && !mp(r.text, a, d) || i.push({
        ...r,
        matchStart: a,
        matchEnd: d,
        snippet: Mp(r.text, a, d, s)
      });
    }
  }
  return i;
}, _p = (t, n, e) => {
  const o = kl(t, e);
  return wl(o, n, e);
};
class js extends EventTarget {
  constructor(n, e) {
    super(), this.presentation = null, this.mediaUrlCache = /* @__PURE__ */ new Map(), this.chartInstances = /* @__PURE__ */ new Set(), this.currentSlide = 0, this._isRendering = !1, this.zoomFactor = 1, this.renderChain = Promise.resolve(), this.renderGeneration = 0, this.suppressScrollChange = !1, this.resizeRafId = null, this.lastMeasuredContainerWidth = 0, this.mountedSlides = /* @__PURE__ */ new Set(), this.slideHandles = /* @__PURE__ */ new Map(), this.searchHighlightHandles = /* @__PURE__ */ new Set(), this.textIndexCache = null, this.activeRenderMode = null, this.listOptions = {
      windowed: !1,
      batchSize: 12,
      initialSlides: 4,
      overscanViewport: 1.5,
      showSlideLabels: !1
    }, this.container = n, this.viewerOptions = e ?? {};
    const o = this.normalizeZoomPercent((e == null ? void 0 : e.zoomPercent) ?? 100);
    if (this._fitMode = (e == null ? void 0 : e.fitMode) ?? "contain", this.zoomFactor = o / 100, e != null && e.onSlideChange) {
      const s = e.onSlideChange;
      this.addEventListener("slidechange", ((i) => s(i.detail.index)));
    }
    if (e != null && e.onSlideRendered) {
      const s = e.onSlideRendered;
      this.addEventListener("sliderendered", ((i) => s(i.detail.index, i.detail.element)));
    }
    if (e != null && e.onSlideError) {
      const s = e.onSlideError;
      this.addEventListener("slideerror", ((i) => s(i.detail.index, i.detail.error)));
    }
    if (e != null && e.onSlideUnmounted) {
      const s = e.onSlideUnmounted;
      this.addEventListener("slideunmounted", ((i) => s(i.detail.index)));
    }
    if (e != null && e.onNodeError) {
      const s = e.onNodeError;
      this.addEventListener("nodeerror", ((i) => s(i.detail.nodeId, i.detail.error)));
    }
    if (e != null && e.onRenderStart) {
      const s = e.onRenderStart;
      this.addEventListener("renderstart", () => s());
    }
    if (e != null && e.onRenderComplete) {
      const s = e.onRenderComplete;
      this.addEventListener("rendercomplete", () => s());
    }
  }
  // -----------------------------------------------------------------------
  // Event dispatch helpers
  // -----------------------------------------------------------------------
  emitRenderStart() {
    this._isRendering = !0, this.dispatchEvent(new Event("renderstart"));
  }
  emitRenderComplete() {
    this._isRendering = !1, this.dispatchEvent(new Event("rendercomplete"));
  }
  emitSlideChange(n) {
    this.dispatchEvent(new CustomEvent("slidechange", { detail: { index: n } }));
  }
  emitSlideRendered(n, e) {
    this.dispatchEvent(new CustomEvent("sliderendered", { detail: { index: n, element: e } }));
  }
  emitSlideError(n, e) {
    this.dispatchEvent(new CustomEvent("slideerror", { detail: { index: n, error: e } }));
  }
  emitSlideUnmounted(n) {
    this.dispatchEvent(new CustomEvent("slideunmounted", { detail: { index: n } }));
  }
  emitNodeError(n, e) {
    this.dispatchEvent(new CustomEvent("nodeerror", { detail: { nodeId: n, error: e } }));
  }
  // -----------------------------------------------------------------------
  // Public: load / render modes
  // -----------------------------------------------------------------------
  /**
   * Load a parsed presentation model. Does NOT render — call `renderList()` or
   * `renderSlide()` afterwards.
   */
  load(n) {
    this.renderGeneration++, this._isRendering = !1, this.unloadRenderedState(), this.presentation = n, this.currentSlide = 0, this.textIndexCache = null, this.setupAdaptiveResize();
  }
  /**
   * Render all slides in a scrollable list.
   */
  async renderList(n) {
    this.activeRenderMode = "list", this.listOptions = {
      windowed: (n == null ? void 0 : n.windowed) ?? !1,
      batchSize: this.normalizeBatchSize((n == null ? void 0 : n.batchSize) ?? 12),
      initialSlides: this.normalizePositiveInt((n == null ? void 0 : n.initialSlides) ?? 4, 4),
      overscanViewport: this.normalizePositiveFloat((n == null ? void 0 : n.overscanViewport) ?? 1.5, 1.5),
      showSlideLabels: (n == null ? void 0 : n.showSlideLabels) ?? !1
    }, await this.queueRender();
  }
  /**
   * Render a single slide (no built-in nav UI).
   */
  async renderSlide(n) {
    this.activeRenderMode = "slide", n !== void 0 && this.presentation && (this.currentSlide = Math.max(0, Math.min(n, this.presentation.slides.length - 1))), await this.queueRender();
  }
  // -----------------------------------------------------------------------
  // Instance open
  // -----------------------------------------------------------------------
  async open(n, e) {
    const o = e == null ? void 0 : e.signal, s = () => {
      if (o != null && o.aborted)
        throw new DOMException("Preview aborted", "AbortError");
    };
    s(), this.destroy();
    const i = await El(n);
    s();
    const c = (e == null ? void 0 : e.lazyMedia) ?? this.viewerOptions.lazyMedia ?? !1 ? await rc(i, this.viewerOptions.zipLimits) : await ic(i, this.viewerOptions.zipLimits);
    s();
    const a = (e == null ? void 0 : e.lazySlides) ?? this.viewerOptions.lazySlides ?? !1 ? go(c, { lazySlides: !0 }) : go(c);
    s(), this.load(a), ((e == null ? void 0 : e.renderMode) ?? "list") === "slide" ? await this.renderSlide(0) : await this.renderList(e == null ? void 0 : e.listOptions), s();
  }
  // -----------------------------------------------------------------------
  // Static factory
  // -----------------------------------------------------------------------
  static async open(n, e, o) {
    const s = new js(e, o);
    return await s.open(n, {
      renderMode: o == null ? void 0 : o.renderMode,
      listOptions: o == null ? void 0 : o.listOptions,
      signal: o == null ? void 0 : o.signal,
      lazyMedia: o == null ? void 0 : o.lazyMedia,
      lazySlides: o == null ? void 0 : o.lazySlides
    }), s;
  }
  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------
  async goToSlide(n, e) {
    var s;
    if (!this.presentation) return;
    const o = this.currentSlide;
    if (this.currentSlide = Math.max(0, Math.min(n, this.presentation.slides.length - 1)), this.currentSlide !== o && this.emitSlideChange(this.currentSlide), this.activeRenderMode === "slide") {
      const { scale: i, displayWidth: r, displayHeight: c } = this.getDisplayMetrics();
      this.renderSingleSlide(i, r, c);
    } else {
      this.suppressScrollChange = !0, await new Promise(
        (r) => requestAnimationFrame(() => {
          this.suppressScrollChange = !1, r();
        })
      ), (s = this.ensureListSlideMountedFn) == null || s.call(this, this.currentSlide);
      const i = this.container.querySelector(
        `[data-slide-index="${this.currentSlide}"]`
      );
      i && typeof i.scrollIntoView == "function" && i.scrollIntoView(e ?? { behavior: "smooth", block: "center" });
    }
  }
  async setZoom(n) {
    const o = this.normalizeZoomPercent(n) / 100;
    o !== this.zoomFactor && (this.zoomFactor = o, await this.queueRender());
  }
  async setFitMode(n) {
    this._fitMode !== n && (this._fitMode = n, n === "none" && (this.lastMeasuredContainerWidth = 0), await this.queueRender());
  }
  // -----------------------------------------------------------------------
  // Getters
  // -----------------------------------------------------------------------
  get presentationData() {
    return this.presentation;
  }
  get slideCount() {
    var n;
    return ((n = this.presentation) == null ? void 0 : n.slides.length) ?? 0;
  }
  get slideWidth() {
    var n;
    return ((n = this.presentation) == null ? void 0 : n.width) ?? 0;
  }
  get slideHeight() {
    var n;
    return ((n = this.presentation) == null ? void 0 : n.height) ?? 0;
  }
  get currentSlideIndex() {
    return this.currentSlide;
  }
  get isRendering() {
    return this._isRendering;
  }
  get zoomPercent() {
    return this.zoomFactor * 100;
  }
  get fitMode() {
    return this._fitMode;
  }
  // -----------------------------------------------------------------------
  // Typed event helpers
  // -----------------------------------------------------------------------
  on(n, e) {
    return this.addEventListener(n, e), this;
  }
  off(n, e) {
    return this.removeEventListener(n, e), this;
  }
  isSlideMounted(n) {
    return this.mountedSlides.has(n);
  }
  getMountedSlides() {
    return [...this.mountedSlides].sort((n, e) => n - e);
  }
  // -----------------------------------------------------------------------
  // External slide rendering
  // -----------------------------------------------------------------------
  /**
   * Render a single slide into an external container element.
   * Useful for React/Vue integration, thumbnail generation, etc.
   *
   * **Ownership:** The caller owns the returned {@link SlideHandle} and is
   * responsible for calling `handle.dispose()` when the slide is no longer
   * needed. `destroy()` does NOT automatically dispose externally-rendered
   * handles.
   */
  renderSlideToContainer(n, e, o) {
    if (!this.presentation) return null;
    const s = this.presentation.slides[n];
    if (!s) return null;
    const i = ds(this.presentation, s, {
      onNodeError: (r, c) => this.emitNodeError(r, c),
      onNavigate: (r) => this.handleNavigate(r),
      mediaUrlCache: this.mediaUrlCache,
      pdfjs: this.viewerOptions.pdfjs,
      chartInstances: this.chartInstances
    });
    return o !== void 0 && o !== 1 && (i.element.style.transform = `scale(${o})`, i.element.style.transformOrigin = "top left"), e.appendChild(i.element), this.emitSlideRendered(n, i.element), i;
  }
  /**
   * Search loaded presentation text without depending on rendered DOM.
   * Results point to slide/node locations that callers can use for navigation
   * or custom highlighting.
   */
  searchText(n, e) {
    if (!this.presentation) return [];
    const o = this.getTextIndex(e);
    return wl(o, n, e);
  }
  /**
   * Render a scaled preview of a slide into an external container.
   * The slide is still laid out at intrinsic size and then transformed, so this
   * avoids thumbnail-only reflow differences.
   */
  renderThumbnailToContainer(n, e, o) {
    if (!this.presentation || !this.presentation.slides[n]) return null;
    const i = this.getThumbnailScale(o), r = this.presentation.width * i, c = this.presentation.height * i, l = document.createElement("div");
    l.dataset.slideIndex = String(n), l.dataset.pptxThumbnail = "true", l.style.cssText = `
      width: ${r}px;
      height: ${c}px;
      overflow: hidden;
      position: relative;
      background: #fff;
      contain: layout paint style;
    `, e.appendChild(l);
    const a = this.renderSlideToContainer(n, l, i);
    if (!a)
      return l.remove(), null;
    let d = !1;
    const h = () => {
      d || (d = !0, a.dispose(), l.remove());
    };
    return {
      element: l,
      ready: a.ready,
      dispose: h,
      [Symbol.dispose]() {
        h();
      }
    };
  }
  /**
   * Draw a node-level overlay for a text search result.
   *
   * The overlay uses result bounds in intrinsic slide coordinates and is
   * transformed together with the rendered slide. It does not modify slide text.
   */
  async highlightSearchResult(n, e) {
    if (!this.presentation || !this.presentation.slides[n.slideIndex]) return null;
    await this.prepareSearchHighlightTarget(n.slideIndex, e);
    const o = this.findRenderedSlideElement(n.slideIndex);
    if (!o) return null;
    getComputedStyle(o).position === "static" && (o.style.position = "relative");
    const s = document.createElement("div");
    s.className = "pptx-search-highlight", e != null && e.className && s.classList.add(...e.className.split(/\s+/).filter(Boolean)), s.dataset.pptxSearchHighlight = "true", this.applySearchHighlightStyle(s, n, e), o.appendChild(s);
    let i = !1;
    const r = {
      element: s,
      result: n,
      dispose: () => {
        i || (i = !0, s.remove(), this.searchHighlightHandles.delete(r));
      },
      [Symbol.dispose]() {
        this.dispose();
      }
    };
    return this.searchHighlightHandles.add(r), r;
  }
  clearSearchHighlights() {
    for (const n of [...this.searchHighlightHandles])
      n.dispose();
    this.searchHighlightHandles.clear();
  }
  /**
   * Hook called after rendering a single slide. Override in subclasses to
   * append additional UI (e.g. navigation buttons).
   */
  afterSingleSlideRender() {
  }
  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  destroy() {
    this.renderGeneration++, this._isRendering = !1, this.teardownAdaptiveResize(), this.unloadRenderedState(), this.presentation = null;
  }
  unloadRenderedState() {
    var n, e;
    this.clearSearchHighlights(), (n = this.cleanupScrollObserver) == null || n.call(this), this.cleanupScrollObserver = void 0, (e = this.cleanupListMount) == null || e.call(this), this.cleanupListMount = void 0, this.ensureListSlideMountedFn = void 0, this.mountedSlides.clear();
    for (const o of this.slideHandles.values())
      o.dispose();
    this.slideHandles.clear(), this.textIndexCache = null, this.disposeAllCharts();
    for (const o of this.mediaUrlCache.values())
      URL.revokeObjectURL(o);
    this.mediaUrlCache.clear(), this.container.innerHTML = "", this.activeRenderMode = null;
  }
  [Symbol.dispose]() {
    this.destroy();
  }
  // -----------------------------------------------------------------------
  // Internal: rendering pipeline
  // -----------------------------------------------------------------------
  normalizeZoomPercent(n) {
    return Number.isFinite(n) ? Math.max(10, Math.min(400, n)) : 100;
  }
  normalizeBatchSize(n) {
    return Number.isInteger(n) && n > 0 ? n : 12;
  }
  normalizePositiveInt(n, e) {
    return Number.isInteger(n) && n > 0 ? n : e;
  }
  normalizePositiveFloat(n, e) {
    return Number.isFinite(n) && n > 0 ? n : e;
  }
  toCssLength(n, e) {
    return n === void 0 ? e : typeof n == "number" ? `${n}px` : n;
  }
  async prepareSearchHighlightTarget(n, e) {
    var s;
    const o = e == null ? void 0 : e.scrollIntoView;
    if (o !== !1) {
      await this.goToSlide(
        n,
        typeof o == "object" ? o : { behavior: "smooth", block: "center" }
      );
      return;
    }
    if (this.activeRenderMode === "slide" && this.currentSlide !== n) {
      await this.goToSlide(n);
      return;
    }
    this.activeRenderMode === "list" && ((s = this.ensureListSlideMountedFn) == null || s.call(this, n));
  }
  findRenderedSlideElement(n) {
    if (this.activeRenderMode === "list") {
      const s = this.container.querySelector(`[data-slide-index="${n}"]`), i = s == null ? void 0 : s.firstElementChild, r = i == null ? void 0 : i.firstElementChild;
      return r instanceof HTMLElement ? r : null;
    }
    const e = this.container.firstElementChild, o = e == null ? void 0 : e.firstElementChild;
    return o instanceof HTMLElement ? o : null;
  }
  applySearchHighlightStyle(n, e, o) {
    const s = Number.isFinite(o == null ? void 0 : o.padding) ? Math.max(0, o.padding) : 0;
    if (n.style.position = "absolute", n.style.pointerEvents = "none", n.style.boxSizing = "border-box", n.style.left = `${e.bounds.x - s}px`, n.style.top = `${e.bounds.y - s}px`, n.style.width = `${e.bounds.w + s * 2}px`, n.style.height = `${e.bounds.h + s * 2}px`, n.style.zIndex = String((o == null ? void 0 : o.zIndex) ?? 1e4), n.style.borderStyle = "solid", n.style.borderWidth = this.toCssLength(o == null ? void 0 : o.borderWidth, "3px"), n.style.borderColor = (o == null ? void 0 : o.borderColor) ?? "rgba(255, 214, 102, 0.95)", n.style.borderRadius = this.toCssLength(o == null ? void 0 : o.borderRadius, "6px"), n.style.background = (o == null ? void 0 : o.backgroundColor) ?? "rgba(255, 214, 102, 0.16)", n.style.boxShadow = (o == null ? void 0 : o.boxShadow) ?? "0 0 0 2px rgba(17, 17, 34, 0.45)", o != null && o.style)
      for (const [i, r] of Object.entries(o.style))
        r !== void 0 && n.style.setProperty(i, String(r));
  }
  getTextIndex(n) {
    var s;
    const e = JSON.stringify({
      includeShapes: (n == null ? void 0 : n.includeShapes) ?? !0,
      includeTables: (n == null ? void 0 : n.includeTables) ?? !0,
      includeGroups: (n == null ? void 0 : n.includeGroups) ?? !0
    });
    if (((s = this.textIndexCache) == null ? void 0 : s.key) === e)
      return this.textIndexCache.entries;
    const o = this.presentation ? kl(this.presentation, n) : [];
    return this.textIndexCache = { key: e, entries: o }, o;
  }
  getThumbnailScale(n) {
    if (!this.presentation) return 1;
    if ((n == null ? void 0 : n.scale) !== void 0 && Number.isFinite(n.scale) && n.scale > 0)
      return n.scale;
    const e = (n == null ? void 0 : n.width) !== void 0 && Number.isFinite(n.width) && n.width > 0 ? n.width / this.presentation.width : void 0, o = (n == null ? void 0 : n.height) !== void 0 && Number.isFinite(n.height) && n.height > 0 ? n.height / this.presentation.height : void 0;
    return e !== void 0 && o !== void 0 ? Math.min(e, o) : e !== void 0 ? e : o !== void 0 ? o : 180 / this.presentation.width;
  }
  getDisplayMetrics() {
    if (!this.presentation)
      return { scale: 1, displayWidth: 0, displayHeight: 0 };
    const n = this.viewerOptions.width ?? (this.container.clientWidth || 960);
    this._fitMode === "contain" && this.viewerOptions.width === void 0 && (this.lastMeasuredContainerWidth = n);
    const o = (this._fitMode === "contain" ? n / this.presentation.width : 1) * this.zoomFactor;
    return {
      scale: o,
      displayWidth: this.presentation.width * o,
      displayHeight: this.presentation.height * o
    };
  }
  async queueRender() {
    const n = ++this.renderGeneration;
    return this.renderChain = this.renderChain.catch(() => {
    }).then(async () => {
      var e, o;
      if (!this.isRenderStale(n)) {
        this.emitRenderStart();
        try {
          if (this.isRenderStale(n)) return;
          const { scale: s, displayWidth: i, displayHeight: r } = this.getDisplayMetrics();
          (e = this.cleanupScrollObserver) == null || e.call(this), this.cleanupScrollObserver = void 0, (o = this.cleanupListMount) == null || o.call(this), this.cleanupListMount = void 0, this.ensureListSlideMountedFn = void 0, this.clearSearchHighlights(), this.mountedSlides.clear();
          for (const c of this.slideHandles.values())
            c.dispose();
          if (this.slideHandles.clear(), this.disposeAllCharts(), this.container.innerHTML = "", this.container.style.position = "relative", this.activeRenderMode === "slide" ? this.renderSingleSlide(s, i, r) : this.listOptions.windowed ? await this.renderAllSlidesWindowed(
            s,
            i,
            r,
            n
          ) : await this.renderAllSlidesFull(s, i, r, n), this.isRenderStale(n)) return;
          this.activeRenderMode !== "slide" && this.correctListMetricsIfNeeded(), this.emitSlideChange(this.currentSlide);
        } finally {
          this.emitRenderComplete();
        }
      }
    }), this.renderChain;
  }
  isRenderStale(n) {
    return n !== this.renderGeneration || !this.presentation;
  }
  handleContainerResize() {
    if (!this.presentation || this._fitMode !== "contain" || this.viewerOptions.width !== void 0) return;
    const n = this.container.clientWidth || 0;
    !n || n === this.lastMeasuredContainerWidth || (this.lastMeasuredContainerWidth = n, this.resizeRafId !== null && cancelAnimationFrame(this.resizeRafId), this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = null, this.queueRender();
    }));
  }
  setupAdaptiveResize() {
    if (this.teardownAdaptiveResize(), typeof ResizeObserver < "u") {
      const n = new ResizeObserver(() => this.handleContainerResize());
      n.observe(this.container), this.resizeObserver = n;
      return;
    }
    this.windowResizeHandler = () => this.handleContainerResize(), window.addEventListener("resize", this.windowResizeHandler);
  }
  teardownAdaptiveResize() {
    var n;
    (n = this.resizeObserver) == null || n.disconnect(), this.resizeObserver = void 0, this.windowResizeHandler && (window.removeEventListener("resize", this.windowResizeHandler), this.windowResizeHandler = void 0), this.resizeRafId !== null && (cancelAnimationFrame(this.resizeRafId), this.resizeRafId = null);
  }
  disposeAllCharts() {
    for (const n of this.chartInstances)
      n.isDisposed() || n.dispose();
    this.chartInstances.clear();
  }
  createListSlideItem(n, e, o) {
    const s = document.createElement("div");
    s.dataset.slideIndex = String(n), s.style.cssText = "width: fit-content; margin: 0 auto 20px;";
    const i = document.createElement("div");
    if (i.style.cssText = `
      width: ${e}px;
      height: ${o}px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      overflow: hidden;
      position: relative;
      background: #fff;
    `, s.appendChild(i), this.listOptions.showSlideLabels) {
      const r = document.createElement("div");
      r.style.cssText = "text-align: center; padding: 4px; font-size: 12px; color: #666;", r.textContent = `Slide ${n + 1}`, s.appendChild(r);
    }
    return { item: s, wrapper: i };
  }
  mountListSlide(n, e, o, s, i) {
    if (!this.presentation || e.dataset.mounted === "1") return;
    e.dataset.mounted = "1", e.innerHTML = "", this.mountedSlides.add(n);
    const r = this.presentation.slides[n];
    try {
      const c = ds(this.presentation, r, {
        onNodeError: (l, a) => this.emitNodeError(l, a),
        onNavigate: (l) => this.handleNavigate(l),
        mediaUrlCache: this.mediaUrlCache,
        pdfjs: this.viewerOptions.pdfjs,
        chartInstances: this.chartInstances
      });
      this.slideHandles.set(n, c), c.element.style.transform = `scale(${o})`, c.element.style.transformOrigin = "top left", e.appendChild(c.element), this.emitSlideRendered(n, c.element);
    } catch (c) {
      this.emitSlideError(n, c), e.style.background = "#fff3f3", e.style.display = "flex", e.style.alignItems = "center", e.style.justifyContent = "center", e.style.border = "2px dashed #ff6b6b", e.style.color = "#cc0000", e.style.fontSize = "14px", e.textContent = `Slide ${n + 1}: Render Error - ${c instanceof Error ? c.message : String(c)}`;
    }
  }
  unmountListSlide(n, e, o) {
    if (e.dataset.mounted !== "1") return;
    e.dataset.mounted = "0", this.mountedSlides.delete(n);
    const s = this.slideHandles.get(n);
    s && (s.dispose(), this.slideHandles.delete(n)), e.innerHTML = "", e.style.background = "#fff", e.style.display = "", e.style.alignItems = "", e.style.justifyContent = "", e.style.border = "", e.style.color = "", e.style.fontSize = "", e.style.height = `${o}px`, this.emitSlideUnmounted(n);
  }
  async renderAllSlidesFull(n, e, o, s) {
    if (!this.presentation) return;
    const i = this.listOptions.batchSize;
    let r = document.createDocumentFragment();
    for (let c = 0; c < this.presentation.slides.length; c++) {
      if (this.isRenderStale(s)) return;
      const { item: l, wrapper: a } = this.createListSlideItem(c, e, o);
      if (this.mountListSlide(c, a, n, e, o), r.appendChild(l), (c + 1) % i === 0 && (this.container.appendChild(r), r = document.createDocumentFragment(), await new Promise((d) => requestAnimationFrame(() => d())), this.isRenderStale(s)))
        return;
    }
    this.isRenderStale(s) || (r.childNodes.length > 0 && this.container.appendChild(r), this.setupScrollSlideTracking());
  }
  async renderAllSlidesWindowed(n, e, o, s) {
    if (!this.presentation) return;
    const i = this.listOptions.batchSize;
    let r = document.createDocumentFragment();
    const c = [];
    for (let f = 0; f < this.presentation.slides.length; f++) {
      if (this.isRenderStale(s)) return;
      const { item: y, wrapper: m } = this.createListSlideItem(f, e, o);
      if (c.push(m), r.appendChild(y), (f + 1) % i === 0 && (this.container.appendChild(r), r = document.createDocumentFragment(), await new Promise((b) => requestAnimationFrame(() => b())), this.isRenderStale(s)))
        return;
    }
    if (this.isRenderStale(s)) return;
    r.childNodes.length > 0 && this.container.appendChild(r);
    const l = (f) => {
      f < 0 || f >= c.length || this.mountListSlide(f, c[f], n, e, o);
    }, a = (f) => {
      f < 0 || f >= c.length || this.unmountListSlide(f, c[f], o);
    }, d = this.listOptions.initialSlides;
    for (let f = 0; f < Math.min(d, c.length); f++) l(f);
    this.ensureListSlideMountedFn = l;
    const h = window.IntersectionObserver;
    if (!h) {
      for (let f = d; f < c.length; f++) l(f);
      this.setupScrollSlideTracking();
      return;
    }
    const u = this.viewerOptions.scrollContainer ?? null, x = this.listOptions.overscanViewport, p = u ? u.clientHeight : window.innerHeight, $ = `${Math.round(p * x)}px 0px`, g = new h(
      (f) => {
        for (const y of f) {
          const m = y.target.parentElement, b = Number((m == null ? void 0 : m.dataset.slideIndex) ?? "-1");
          Number.isNaN(b) || b < 0 || (y.isIntersecting ? l(b) : a(b));
        }
      },
      { root: u, rootMargin: $, threshold: 0 }
    );
    c.forEach((f) => {
      g.observe(f);
    }), this.cleanupListMount = () => {
      g.disconnect(), this.ensureListSlideMountedFn = void 0;
    }, this.setupScrollSlideTracking();
  }
  setupScrollSlideTracking() {
    if (this.activeRenderMode === "slide") return;
    const n = window.IntersectionObserver;
    if (!n) return;
    const e = this.container.querySelectorAll("[data-slide-index]");
    if (!e.length) return;
    const o = /* @__PURE__ */ new Map(), s = this.viewerOptions.scrollContainer ?? null, i = new n(
      (r) => {
        for (const a of r) {
          const d = Number(a.target.dataset.slideIndex ?? "-1");
          Number.isNaN(d) || d < 0 || o.set(d, a.intersectionRatio);
        }
        if (this.suppressScrollChange) return;
        let c = -1, l = -1;
        for (const [a, d] of o)
          d > l && (l = d, c = a);
        c >= 0 && c !== this.currentSlide && (this.currentSlide = c, this.emitSlideChange(c));
      },
      { root: s, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    e.forEach((r) => i.observe(r)), this.cleanupScrollObserver = () => {
      i.disconnect();
    };
  }
  renderSingleSlide(n, e, o) {
    if (!this.presentation) return;
    const s = this.presentation.slides[this.currentSlide];
    if (!s) return;
    for (const r of this.slideHandles.values())
      r.dispose();
    this.slideHandles.clear(), this.disposeAllCharts(), this.container.innerHTML = "", this.mountedSlides.clear(), this.mountedSlides.add(this.currentSlide);
    const i = document.createElement("div");
    i.style.cssText = `
      width: ${e}px; height: ${o}px;
      margin: 0 auto; overflow: hidden; position: relative;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    try {
      const r = ds(this.presentation, s, {
        onNodeError: (c, l) => this.emitNodeError(c, l),
        onNavigate: (c) => this.handleNavigate(c),
        mediaUrlCache: this.mediaUrlCache,
        pdfjs: this.viewerOptions.pdfjs,
        chartInstances: this.chartInstances
      });
      this.slideHandles.set(this.currentSlide, r), r.element.style.transform = `scale(${n})`, r.element.style.transformOrigin = "top left", i.appendChild(r.element), this.emitSlideRendered(this.currentSlide, r.element);
    } catch (r) {
      this.emitSlideError(this.currentSlide, r), i.style.background = "#fff3f3", i.style.display = "flex", i.style.alignItems = "center", i.style.justifyContent = "center", i.style.border = "2px dashed #ff6b6b", i.style.color = "#cc0000", i.style.fontSize = "14px", i.textContent = `Slide ${this.currentSlide + 1}: Render Error - ${r instanceof Error ? r.message : String(r)}`;
    }
    this.container.appendChild(i), this.afterSingleSlideRender();
  }
  /**
   * After list-mode rendering, a scrollbar may appear on the page body
   * (or a scroll ancestor), narrowing the container. If the container's
   * clientWidth now differs from the width used to compute the initial
   * scale, patch every wrapper's dimensions and each slide element's
   * transform in-place — no DOM rebuild required.
   */
  correctListMetricsIfNeeded() {
    if (!this.presentation || this._fitMode !== "contain" || this.viewerOptions.width !== void 0) return;
    const n = this.container.clientWidth || 0;
    if (!n || n === this.lastMeasuredContainerWidth) return;
    this.lastMeasuredContainerWidth = n;
    const o = n / this.presentation.width * this.zoomFactor, s = this.presentation.width * o, i = this.presentation.height * o, r = this.container.querySelectorAll("[data-slide-index]");
    for (const c of r) {
      const l = c.firstElementChild;
      if (!l) continue;
      l.style.width = `${s}px`, l.style.height = `${i}px`;
      const a = l.firstElementChild;
      a && (a.style.transform = `scale(${o})`);
    }
  }
  handleNavigate(n) {
    n.slideIndex !== void 0 ? this.goToSlide(n.slideIndex) : n.url && Ro(n.url) && window.open(n.url, "_blank", "noopener,noreferrer");
  }
}
async function El(t) {
  if (t instanceof ArrayBuffer) return t;
  if (t instanceof Uint8Array) {
    const e = new Uint8Array(t.byteLength);
    return e.set(t), e.buffer;
  }
  const n = t;
  if (typeof n.arrayBuffer == "function")
    return n.arrayBuffer();
  if (typeof FileReader < "u")
    return new Promise((e, o) => {
      const s = new FileReader();
      s.onload = () => e(s.result), s.onerror = () => o(s.error ?? new Error("Failed to read Blob input")), s.readAsArrayBuffer(n);
    });
  if (typeof Response < "u")
    return new Response(n).arrayBuffer();
  throw new Error("Blob preview input is not supported in this runtime");
}
class Xp extends js {
  constructor(n, e = {}) {
    super(n, {
      width: e.width,
      fitMode: e.fitMode,
      zoomPercent: e.zoomPercent,
      scrollContainer: e.scrollContainer,
      zipLimits: e.zipLimits,
      lazyMedia: e.lazyMedia,
      lazySlides: e.lazySlides,
      pdfjs: e.pdfjs,
      onSlideChange: e.onSlideChange,
      onSlideRendered: e.onSlideRendered,
      onSlideError: e.onSlideError,
      onSlideUnmounted: e.onSlideUnmounted,
      onNodeError: e.onNodeError
    }), this.previewAbortController = null, this.rendererMode = e.mode ?? "list", this.rendererZipLimits = e.zipLimits, this.rendererLazyMedia = e.lazyMedia === !0, this.rendererLazySlides = e.lazySlides === !0, this.rendererListOptions = {
      windowed: e.listMountStrategy === "windowed",
      batchSize: e.listRenderBatchSize,
      initialSlides: e.windowedInitialSlides,
      overscanViewport: e.windowedOverscanViewport
    };
  }
  /** @deprecated Use `PptxViewer.open()` or `viewer.load()` + `viewer.renderList()` */
  async preview(n, e) {
    var d;
    (d = this.previewAbortController) == null || d.abort();
    const o = new AbortController();
    this.previewAbortController = o, e != null && e.signal && (e.signal.aborted ? o.abort() : e.signal.addEventListener("abort", () => o.abort(), { once: !0 }));
    const s = () => {
      if (o.signal.aborted)
        throw new DOMException("Preview aborted", "AbortError");
    }, i = performance.now();
    s();
    const r = await El(n);
    s();
    const c = this.rendererLazyMedia ? await rc(r, this.rendererZipLimits) : await ic(r, this.rendererZipLimits);
    s();
    const l = this.rendererLazySlides ? go(c, { lazySlides: !0 }) : go(c);
    s(), this.load(l), this.rendererMode === "slide" ? await this.renderSlide(0) : await this.renderList(this.rendererListOptions), s();
    const a = performance.now() - i;
    return { slideCount: l.slides.length, elapsed: a };
  }
  /** Appends prev/next navigation buttons after rendering a single slide. */
  afterSingleSlideRender() {
    const n = document.createElement("div");
    n.style.cssText = "display: flex; justify-content: center; gap: 12px; margin-top: 12px;";
    const e = document.createElement("button");
    e.textContent = "← Prev", e.disabled = this.currentSlideIndex === 0, e.onclick = () => this.goToSlide(this.currentSlideIndex - 1);
    const o = document.createElement("span");
    o.style.cssText = "line-height: 32px; font-size: 14px;", o.textContent = `${this.currentSlideIndex + 1} / ${this.slideCount}`;
    const s = document.createElement("button");
    s.textContent = "Next →", s.disabled = this.currentSlideIndex >= this.slideCount - 1, s.onclick = () => this.goToSlide(this.currentSlideIndex + 1), n.appendChild(e), n.appendChild(o), n.appendChild(s), this.container.appendChild(n);
  }
  destroy() {
    var n;
    (n = this.previewAbortController) == null || n.abort(), this.previewAbortController = null, super.destroy();
  }
}
function Cp(t) {
  if (!t) return;
  const n = t.paragraphs.map((o) => ({
    level: o.level,
    text: o.runs.map((s) => s.text).join("")
  })), e = n.map((o) => o.text).join(`
`);
  if (e.trim())
    return { paragraphs: n, totalText: e };
}
function Fp(t) {
  return { text: t.textBody ? t.textBody.paragraphs.map((e) => e.runs.map((o) => o.text).join("")).join(`
`) : "", gridSpan: t.gridSpan, rowSpan: t.rowSpan };
}
function kp(t) {
  return {
    height: t.height,
    cells: t.cells.map(Fp)
  };
}
function wp(t, n, e, o, s, i, r) {
  const c = Nn(t, { rels: n, partPath: e, diagramDrawings: o });
  return c && Bo(c, s, i, { parentGroup: r }), c;
}
function Pl(t, n, e, o, s, i) {
  const r = {
    id: t.id,
    name: t.name,
    nodeType: t.nodeType,
    position: { x: t.position.x, y: t.position.y },
    size: { w: t.size.w, h: t.size.h },
    rotation: t.rotation,
    flipH: t.flipH,
    flipV: t.flipV
  };
  switch (t.nodeType) {
    case "shape": {
      const c = t;
      r.presetGeometry = c.presetGeometry, r.textBody = Cp(c.textBody);
      break;
    }
    case "picture": {
      const c = t;
      r.blipEmbed = c.blipEmbed;
      break;
    }
    case "table": {
      const c = t;
      r.columns = [...c.columns], r.rows = c.rows.map(kp), r.tableStyleId = c.tableStyleId;
      break;
    }
    case "chart": {
      const c = t;
      r.chartPath = c.chartPath;
      break;
    }
    case "group": {
      const c = t, l = [];
      for (const a of c.children)
        try {
          const d = wp(
            a,
            n,
            e,
            o,
            s,
            i,
            c
          );
          d && l.push(Pl(d, n, e, o, s, i));
        } catch {
        }
      r.children = l;
      break;
    }
  }
  return r;
}
function Yp(t) {
  return {
    width: t.width,
    height: t.height,
    slideCount: t.slides.length,
    slides: t.slides.map((n, e) => {
      Po(t, n);
      const o = t.slideToLayout.get(n.index) || n.layoutIndex, s = t.layouts.get(o), i = o ? t.layoutToMaster.get(o) : "", r = i ? t.masters.get(i) : void 0;
      return {
        index: e,
        hidden: n.hidden,
        nodes: n.nodes.map(
          (c) => Pl(c, n.rels, n.slidePath, t.diagramDrawings, s, r)
        )
      };
    })
  };
}
export {
  Xp as PptxRenderer,
  js as PptxViewer,
  Up as RECOMMENDED_ZIP_LIMITS,
  go as buildPresentation,
  kl as buildTextIndex,
  Vp as materializeAllSlideNodes,
  Po as materializeSlideNodes,
  ic as parseZip,
  rc as parseZipLazyMedia,
  ds as renderSlide,
  _p as searchPresentation,
  wl as searchText,
  Yp as serializePresentation
};
