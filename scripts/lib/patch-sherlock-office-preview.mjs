import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const PATCH_MARKER = '/* sherlock:office-preview-service:v1 */'

function replaceExact(source, before, after, label, expectedCount = 1) {
  const count = source.split(before).length - 1
  if (count !== expectedCount) {
    throw new Error(`Unable to patch Office preview ${label}: expected ${expectedCount}, found ${count}`)
  }
  return source.split(before).join(after)
}

function transformExactSection(source, startMarker, endMarker, label, transform) {
  const startCount = source.split(startMarker).length - 1
  const endCount = source.split(endMarker).length - 1
  if (startCount !== 1 || endCount !== 1) {
    throw new Error(`Unable to patch Office preview ${label}: section markers drifted`)
  }
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  if (start < 0 || end <= start) {
    throw new Error(`Unable to patch Office preview ${label}: invalid section order`)
  }
  const section = source.slice(start, end)
  const patched = transform(section)
  if (patched === section) {
    throw new Error(`Unable to patch Office preview ${label}: section was unchanged`)
  }
  return source.slice(0, start) + patched + source.slice(end)
}

/**
 * Publish the bundled Office engines as a capability-only Cordis service while
 * leaving their existing Better Sidebar viewers registered through the same
 * components. Exact transforms intentionally fail packaging when upstream
 * changes the lifecycle or registration points.
 */
export function patchSherlockOfficePreviewClient(source) {
  if (source.includes(PATCH_MARKER)) return source
  let next = source

  next = replaceExact(
    next,
    `\t\t/** Absolute URL of the media route for one path (raw bytes). */
\t\tfunction mediaUrl(scope, path) {
\t\t\treturn fileUrl(scope, path, false);
\t\t}
\t\t/** Absolute URL of the download route (Content-Disposition: attachment). */
\t\tfunction downloadUrl(scope, path) {
\t\t\treturn fileUrl(scope, path, true);
\t\t}`,
    `\t\t${PATCH_MARKER}
\t\tfunction validOfficeCapabilityUrl(value) {
\t\t\tif (typeof value !== "string" || value.length > 2048) return false;
\t\t\ttry {
\t\t\t\tconst parsed = new URL(value);
\t\t\t\treturn parsed.protocol === "sherlock-preview:" && parsed.username === "" && parsed.password === "" && parsed.port === "" && parsed.pathname === "/" && parsed.search === "" && parsed.hash === "" && /^[A-Za-z0-9_-]+$/.test(parsed.hostname);
\t\t\t} catch {
\t\t\t\treturn false;
\t\t\t}
\t\t}
\t\t/** Absolute URL of the media route for one path (raw bytes). */
\t\tfunction mediaUrl(scope, path) {
\t\t\treturn validOfficeCapabilityUrl(path) ? path : fileUrl(scope, path, false);
\t\t}
\t\t/** Absolute URL of the download route (Content-Disposition: attachment). */
\t\tfunction downloadUrl(scope, path) {
\t\t\treturn validOfficeCapabilityUrl(path) ? path : fileUrl(scope, path, true);
\t\t}`,
    'capability URL routing'
  )

  next = replaceExact(
    next,
    '\t\tfunction DocxView(props) {',
    `\t\tfunction disposeOfficePreviewResource(resource) {
\t\t\ttry {
\t\t\t\tif (typeof resource?.dispose === "function") resource.dispose();
\t\t\t\telse if (typeof resource?.destroy === "function") resource.destroy();
\t\t\t} catch {}
\t\t}
\t\tfunction createOfficePreviewLifecycle() {
\t\t\tconst controller = new AbortController();
\t\t\tlet resource = null;
\t\t\tlet disposed = false;
\t\t\treturn {
\t\t\t\tsignal: controller.signal,
\t\t\t\tattach(nextResource) {
\t\t\t\t\tif (disposed) {
\t\t\t\t\t\tdisposeOfficePreviewResource(nextResource);
\t\t\t\t\t\treturn false;
\t\t\t\t\t}
\t\t\t\t\tresource = nextResource;
\t\t\t\t\treturn true;
\t\t\t\t},
\t\t\t\tdispose() {
\t\t\t\t\tif (disposed) return;
\t\t\t\t\tdisposed = true;
\t\t\t\t\tcontroller.abort();
\t\t\t\t\tdisposeOfficePreviewResource(resource);
\t\t\t\t\tresource = null;
\t\t\t\t}
\t\t\t};
\t\t}
\t\tfunction DocxView(props) {`,
    'shared engine lifecycle'
  )

  next = replaceExact(next, '\t\t\t\tlet cancelled = false;\n\t\t\t\tconst container = viewportRef.current;',
    '\t\t\t\tconst lifecycle = createOfficePreviewLifecycle();\n\t\t\t\tconst container = viewportRef.current;',
    'DOCX lifecycle')
  next = replaceExact(next, 'const response = await fetch(mediaUrl(scope, path));',
    'const response = await fetch(mediaUrl(scope, path), { signal: lifecycle.signal });',
    'DOCX/XLSX fetch signals', 2)
  next = replaceExact(next, 'if (cancelled) return;', 'if (lifecycle.signal.aborted) return;',
    'DOCX/XLSX cancellation checks', 5)
  next = replaceExact(next,
    `\t\t\t\t\t\tawait renderAsync(buf, wrap, void 0, {
\t\t\t\t\t\t\tclassName: "docx",
\t\t\t\t\t\t\tinWrapper: true,
\t\t\t\t\t\t\tignoreWidth: false,
\t\t\t\t\t\t\tignoreHeight: false,
\t\t\t\t\t\t\tbreakPages: true,
\t\t\t\t\t\t\texperimental: false
\t\t\t\t\t\t});
\t\t\t\t\t\tif (!cancelled) setLoad({ status: "ready" });`,
    `\t\t\t\t\t\tawait renderAsync(buf, wrap, void 0, {
\t\t\t\t\t\t\tclassName: "docx",
\t\t\t\t\t\t\tinWrapper: true,
\t\t\t\t\t\t\tignoreWidth: false,
\t\t\t\t\t\t\tignoreHeight: false,
\t\t\t\t\t\t\tbreakPages: true,
\t\t\t\t\t\t\texperimental: false
\t\t\t\t\t\t});
\t\t\t\t\t\tif (!lifecycle.attach({ dispose: () => { wrap.innerHTML = ""; } })) return;
\t\t\t\t\t\tsetLoad({ status: "ready" });`,
    'DOCX late render cleanup')
  next = replaceExact(next,
    `\t\t\t\t\t} catch (error) {
\t\t\t\t\t\tif (!cancelled) setLoad({
\t\t\t\t\t\t\tstatus: "error",
\t\t\t\t\t\t\tmessage: error instanceof Error ? error.message : String(error)
\t\t\t\t\t\t});
\t\t\t\t\t}`,
    `\t\t\t\t\t} catch (error) {
\t\t\t\t\t\tif (!lifecycle.signal.aborted) {
\t\t\t\t\t\t\twrap.innerHTML = "";
\t\t\t\t\t\t\tsetLoad({
\t\t\t\t\t\t\t\tstatus: "error",
\t\t\t\t\t\t\t\tmessage: error instanceof Error ? error.message : String(error)
\t\t\t\t\t\t\t});
\t\t\t\t\t\t}
\t\t\t\t\t}`,
    'DOCX aborted error suppression'
  )
  next = replaceExact(next,
    `\t\t\t\treturn () => {
\t\t\t\t\tcancelled = true;
\t\t\t\t\tif (wrap !== null) wrap.innerHTML = "";
\t\t\t\t};`,
    `\t\t\t\treturn () => {
\t\t\t\t\tlifecycle.dispose();
\t\t\t\t\tif (wrap !== null) wrap.innerHTML = "";
\t\t\t\t};`,
    'DOCX teardown')

  next = replaceExact(next, '\t\t\t\tlet cancelled = false;\n\t\t\t\tconst host = hostRef.current;',
    '\t\t\t\tconst lifecycle = createOfficePreviewLifecycle();\n\t\t\t\tconst host = hostRef.current;',
    'XLSX lifecycle')
  next = replaceExact(next,
    `\t\t\t\t\t\tconst { univer, univerAPI } = createUniver({
\t\t\t\t\t\t\tlocale,
\t\t\t\t\t\t\tlocales: localePack !== null ? { [locale]: mergeLocales(localePack) } : {},
\t\t\t\t\t\t\tpresets: [UniverSheetsCorePreset({ container: host })]
\t\t\t\t\t\t});
\t\t\t\t\t\tuniverRef.current = univer;
\t\t\t\t\t\tuniverAPI.createWorkbook(workbookData);
\t\t\t\t\t\tif (!cancelled) setLoad({ status: "ready" });`,
    `\t\t\t\t\t\tconst { univer, univerAPI } = createUniver({
\t\t\t\t\t\t\tlocale,
\t\t\t\t\t\t\tlocales: localePack !== null ? { [locale]: mergeLocales(localePack) } : {},
\t\t\t\t\t\t\tpresets: [UniverSheetsCorePreset({ container: host })]
\t\t\t\t\t\t});
\t\t\t\t\t\tif (!lifecycle.attach(univer)) return;
\t\t\t\t\t\tuniverRef.current = univer;
\t\t\t\t\t\tuniverAPI.createWorkbook(workbookData);
\t\t\t\t\t\tif (!lifecycle.signal.aborted) setLoad({ status: "ready" });`,
    'XLSX engine ownership')
  next = replaceExact(next,
    `\t\t\t\t\t\tif (!cancelled) {
\t\t\t\t\t\t\ttry {
\t\t\t\t\t\t\t\tuniverRef.current?.dispose();
\t\t\t\t\t\t\t} catch {}
\t\t\t\t\t\t\tuniverRef.current = null;
\t\t\t\t\t\t\thost.innerHTML = "";`,
    `\t\t\t\t\t\tif (!lifecycle.signal.aborted) {
\t\t\t\t\t\t\tlifecycle.dispose();
\t\t\t\t\t\t\tuniverRef.current = null;
\t\t\t\t\t\t\thost.innerHTML = "";`,
    'XLSX failure ownership')
  next = replaceExact(next,
    `\t\t\t\treturn () => {
\t\t\t\t\tcancelled = true;
\t\t\t\t\ttry {
\t\t\t\t\t\tuniverRef.current?.dispose();
\t\t\t\t\t} catch {}
\t\t\t\t\tuniverRef.current = null;
\t\t\t\t\tif (host !== null) host.innerHTML = "";
\t\t\t\t};`,
    `\t\t\t\treturn () => {
\t\t\t\t\tlifecycle.dispose();
\t\t\t\t\tuniverRef.current = null;
\t\t\t\t\tif (host !== null) host.innerHTML = "";
\t\t\t\t};`,
    'XLSX teardown')

  next = replaceExact(next, '\t\t\t\tconst controller = new AbortController();\n\t\t\t\tconst host = hostRef.current;',
    '\t\t\t\tconst lifecycle = createOfficePreviewLifecycle();\n\t\t\t\tconst host = hostRef.current;',
    'PPTX lifecycle')
  next = transformExactSection(
    next,
    '\t\tfunction PptxView(props) {',
    '\t\t//#endregion\n\t\t//#region src/client/icons.tsx',
    'PPTX abort signal',
    (section) => replaceExact(
      section,
      'controller.signal',
      'lifecycle.signal',
      'PPTX abort signal',
      6
    )
  )
  next = replaceExact(next,
    `\t\t\t\t\t\tif (lifecycle.signal.aborted) {
\t\t\t\t\t\t\tviewer.destroy();
\t\t\t\t\t\t\treturn;
\t\t\t\t\t\t}
\t\t\t\t\t\tviewerRef.current = viewer;`,
    `\t\t\t\t\t\tif (!lifecycle.attach({ destroy: () => viewer.destroy() })) return;
\t\t\t\t\t\tviewerRef.current = viewer;`,
    'PPTX engine ownership')
  next = replaceExact(next,
    `\t\t\t\t\t} catch (error) {
\t\t\t\t\t\tif (lifecycle.signal.aborted) return;
\t\t\t\t\t\ttry {
\t\t\t\t\t\t\tviewerRef.current?.destroy();
\t\t\t\t\t\t} catch {}
\t\t\t\t\t\tviewerRef.current = null;`,
    `\t\t\t\t\t} catch (error) {
\t\t\t\t\t\tif (lifecycle.signal.aborted) return;
\t\t\t\t\t\tlifecycle.dispose();
\t\t\t\t\t\tviewerRef.current = null;`,
    'PPTX failure ownership')
  next = replaceExact(next,
    `\t\t\t\treturn () => {
\t\t\t\t\tcontroller.abort();
\t\t\t\t\ttry {
\t\t\t\t\t\tviewerRef.current?.destroy();
\t\t\t\t\t} catch {}
\t\t\t\t\tviewerRef.current = null;
\t\t\t\t\thost.innerHTML = "";
\t\t\t\t};`,
    `\t\t\t\treturn () => {
\t\t\t\t\tlifecycle.dispose();
\t\t\t\t\tviewerRef.current = null;
\t\t\t\t\thost.innerHTML = "";
\t\t\t\t};`,
    'PPTX teardown')

  next = replaceExact(
    next,
    `\t\t/** Services required before mounting: better-sidebar's client service. */
\t\tconst inject = ["betterSidebar"];`,
    `\t\t/** The adapter is useful without Better Sidebar; the sidebar is an optional child injection. */
\t\tconst inject = [];`,
    'optional sidebar injection'
  )
  next = replaceExact(
    next,
    `\t\t/**
\t\t* Client plugin body.
\t\t* @param ctx - the client cordis context (betterSidebar service).
\t\t*/
\t\tfunction apply(ctx) {
\t\t\tconst betterSidebar = ctx.betterSidebar;
\t\t\tif (betterSidebar === void 0) return;
\t\t\tfor (const viewer of officeViewers()) ctx.effect(() => betterSidebar.registerFileViewer(viewer), \`dsh-better-sidebar-plugin-office: viewer \${viewer.id}\`);
\t\t}
\t\t//#endregion
\t\texports.apply = apply;
\t\texports.inject = inject;
\t\texports.officeViewers = officeViewers;`,
    `\t\tconst officePreviewScope = Object.freeze({ sessionId: "sherlock-research", cwd: "" });
\t\tfunction officePreviewKind(value) {
\t\t\tconst kind = String(value ?? "").replace(/^\\./, "").toLowerCase();
\t\t\treturn kind === "docx" || kind === "xlsx" || kind === "pptx" ? kind : null;
\t\t}
\t\tfunction OfficePreviewComponent(props) {
\t\t\tconst kind = officePreviewKind(props?.kind);
\t\t\tif (kind === null || !validOfficeCapabilityUrl(props?.sourceUrl)) return (0, react$1.createElement)("div", { "data-sherlock-office-preview-unavailable": "" }, t("downloadToView"));
\t\t\tconst Component = kind === "docx" ? DocxView : kind === "xlsx" ? XlsxView : PptxView;
\t\t\treturn (0, react$1.createElement)(Component, {
\t\t\t\tscope: officePreviewScope,
\t\t\t\tpath: props.sourceUrl,
\t\t\t\ttitle: props.title,
\t\t\t\t...(kind === "pptx" ? { toolbar: "inline" } : {})
\t\t\t});
\t\t}
\t\tconst officePreviewService = Object.freeze({
\t\t\tComponent: OfficePreviewComponent,
\t\t\tsupports: (value) => officePreviewKind(value) !== null
\t\t});
\t\t/**
\t\t* Client plugin body. Publishes the Research adapter unconditionally and
\t\t* preserves the existing sidebar viewers when Better Sidebar is present.
\t\t*/
\t\tfunction apply(ctx) {
\t\t\tctx.provide("officePreview", officePreviewService);
\t\t\tctx.inject(["betterSidebar"], (sidebarCtx) => {
\t\t\t\tconst betterSidebar = sidebarCtx.betterSidebar;
\t\t\t\tif (betterSidebar === void 0) return;
\t\t\t\tfor (const viewer of officeViewers()) sidebarCtx.effect(() => betterSidebar.registerFileViewer(viewer), \`dsh-better-sidebar-plugin-office: viewer \${viewer.id}\`);
\t\t\t});
\t\t}
\t\t//#endregion
\t\texports.apply = apply;
\t\texports.createOfficePreviewLifecycle = createOfficePreviewLifecycle;
\t\texports.inject = inject;
\t\texports.officePreviewService = officePreviewService;
\t\texports.officeViewers = officeViewers;`,
    'Cordis service publication'
  )
  return next
}

export async function patchSherlockOfficePreviewPackage(packageDirectory) {
  const manifestPath = path.join(packageDirectory, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.name !== '@huanlin/dsh-plugin-better-sidebar-plugin-office' ||
      manifest.version !== '0.1.0') {
    throw new Error(`Unsupported bundled Office plugin ${String(manifest.name)}@${String(manifest.version)}`)
  }
  const clientPath = path.join(packageDirectory, 'lib', 'client.js')
  const source = await readFile(clientPath, 'utf8')
  const patched = patchSherlockOfficePreviewClient(source)
  if (patched !== source) await writeFile(clientPath, patched, 'utf8')
}
