import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { Zip, ZipDeflate, strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { COMPOSITION_FILE, SETTINGS_NAMESPACE, scanRoot, writableRoot } from '@deepseek-ai/dsh-agent-presets'

/**
 * Preset package export and import for DSH Desktop.
 *
 * These two routes used to live in a patch on `@deepseek-ai/dsh-host-apiproxy`,
 * which 0.1.2-alpha.1 deleted. Upstream ships no preset transfer of its own —
 * `agentPresets` exposes copy, delete, list, read, and select, and nothing that
 * moves a preset between machines — so the capability still belongs to the
 * desktop. It is a plugin rather than a patch now: `dsh-client-connection`
 * offers a public registry for exact Fetch routes, which is the same seam
 * upstream's own `/api/session.export` uses, so nothing here has to be
 * re-derived against a rebuilt bundle on every Harness release.
 *
 * @module dsh-desktop-preset-transfer
 */

/** Stable Cordis plugin name. */
export const name = 'dsh-desktop-preset-transfer'

/** The preset registry and the API channel this plugin publishes onto. */
export const inject = ['connection']

const EXPORT_PATH = '/api/agent-preset.export'
const IMPORT_PATH = '/api/agent-preset.import'

/** Harness version stamped into an exported manifest. */
const PRESET_SOURCE_DSH_VERSION = '0.1.2-alpha.1'

const PRESET_ARCHIVE_FORMAT = "dsh-preset";
const PRESET_ARCHIVE_VERSION = 1;
const PRESET_ARCHIVE_MIME = "application/vnd.dsh.preset+zip";
const PRESET_ARCHIVE_MAX_COMPRESSED = 16 * 1024 * 1024;
const PRESET_ARCHIVE_MAX_UNCOMPRESSED = 32 * 1024 * 1024;
const PRESET_ARCHIVE_MAX_FILE = 12 * 1024 * 1024;
const PRESET_ARCHIVE_MAX_FILES = 512;
const PRESET_ARCHIVE_ID = /^[a-z0-9][a-z0-9-]*$/;
const PRESET_ARCHIVE_IGNORED_FILES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
const PRESET_TEXT_EXTENSIONS = new Set([".json", ".jsonc", ".md", ".txt", ".yaml", ".yml", ".toml", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".sh", ".ps1", ".html", ".css"]);
function presetArchiveFailure(message, status = 400) {
	return Response.json({
		ok: false,
		error: message
	}, { status });
}
function safePresetArchivePath(entry) {
	const normalized = entry.replace(/\\/g, "/").trim();
	if (normalized === "" || normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return null;
	const segments = normalized.split("/");
	const safe = [];
	for (const seg of segments) {
		if (seg === "" || seg === ".") continue;
		if (seg === "..") return null;
		safe.push(seg);
	}
	return safe.length === 0 ? null : safe.join("/");
}
function presetArchiveWarnings(files) {
	const warnings = [];
	let hasSecrets = false;
	let hasAbsolutePaths = false;
	for (const [rel, bytes] of Object.entries(files)) {
		const ext = extname(rel).toLowerCase();
		if (!PRESET_TEXT_EXTENSIONS.has(ext)) continue;
		let text;
		try {
			text = strFromU8(bytes);
		} catch {
			continue;
		}
		if (!hasSecrets && /(?:sk-[a-zA-Z0-9]{20,}|api[_-]?key\s*[:=]\s*["\x27]?[a-zA-Z0-9_-]{16,}|ghp_[a-zA-Z0-9]{30,}|bearer\s+[a-zA-Z0-9._-]{20,})/i.test(text)) {
			hasSecrets = true;
			warnings.push("possible-secrets");
		}
		if (!hasAbsolutePaths && /(?:\/(?:Users|home|root|var|etc)\/|[a-zA-Z]:\\(?:Users|Documents|Program))/i.test(text)) {
			hasAbsolutePaths = true;
			warnings.push("absolute-paths");
		}
	}
	return warnings;
}
async function collectPresetArchiveFiles(dir) {
	const files = {};
	let count = 0;
	let total = 0;
	async function visit(current, relPrefix) {
		const entries = await readdir(current, { withFileTypes: true });
		for (const entry of entries) {
			if (PRESET_ARCHIVE_IGNORED_FILES.has(entry.name)) continue;
			const full = join(current, entry.name);
			const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				await visit(full, rel);
				continue;
			}
			const info = await lstat(full);
			if (info.isSymbolicLink()) throw new Error(`Preset contains a symbolic link, which cannot be exported safely: ${rel}`);
			if (!info.isFile()) throw new Error(`Preset contains an unsupported filesystem entry: ${rel}`);
			if (++count > PRESET_ARCHIVE_MAX_FILES) throw new Error(`Preset contains more than ${PRESET_ARCHIVE_MAX_FILES} files`);
			if (info.size > PRESET_ARCHIVE_MAX_FILE) throw new Error(`Preset file is too large to export: ${rel}`);
			total += info.size;
			if (total > PRESET_ARCHIVE_MAX_UNCOMPRESSED) throw new Error("Preset is too large to export");
			files[`preset/${rel}`] = new Uint8Array(await readFile(full));
		}
	}
	await visit(dir, "");
	return files;
}

/**
 * The base URL a composition row's package name resolves against.
 * @param ctx - Host context, which carries it when composed under a Loader.
 * @returns the context's base URL, falling back to this plugin's own location.
 */
function harnessBaseOf(ctx) {
  const baseUrl = Reflect.get(ctx, 'baseUrl')
  return typeof baseUrl === 'string' || baseUrl instanceof URL ? baseUrl : import.meta.url
}

function createPresetArchive(ctx) {
	return {
		async exportArchive(agentPreset, signal) {
			const presets = ctx.get("agentPresets");
			if (presets === void 0) return presetArchiveFailure("This deployment has no agent presets.", 503);
			try {
				signal?.throwIfAborted();
				const preset = await presets.resolve(agentPreset);
				if (preset.trust !== "user") return presetArchiveFailure("Built-in presets cannot be exported. Duplicate this preset first, then export the custom copy.", 403);
				if (preset.broken !== void 0) return presetArchiveFailure(`This preset cannot be exported because it failed to load: ${preset.broken}`);
				const files = await collectPresetArchiveFiles(dirname(preset.path));
				const manifest = {
					format: PRESET_ARCHIVE_FORMAT,
					version: PRESET_ARCHIVE_VERSION,
					id: preset.id,
					name: preset.name,
					description: preset.description,
					icon: preset.icon,
					sourceDshVersion: PRESET_SOURCE_DSH_VERSION,
					exportedAt: (/* @__PURE__ */ new Date()).toISOString()
				};
				files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
				signal?.throwIfAborted();
				const data = zipSync(files, { level: 6 });
				if (data.length > PRESET_ARCHIVE_MAX_COMPRESSED) return presetArchiveFailure("The compressed preset package is larger than 16 MB.", 413);
				return new Response(data, {
					headers: {
						"content-type": PRESET_ARCHIVE_MIME,
						"content-disposition": `attachment; filename="${preset.id}.dshpreset"`,
						"cache-control": "no-store"
					}
				});
			} catch (error) {
				if (signal?.aborted) return presetArchiveFailure("Preset export was cancelled.", 499);
				return presetArchiveFailure(error instanceof Error ? error.message : "Failed to export preset package.");
			}
		},
		async importArchive(data, options, signal) {
			const presets = ctx.get("agentPresets");
			if (presets === void 0) return presetArchiveFailure("This deployment has no agent presets.", 503);
			const install = options.install === true;
			let requestedId = options.agentPreset?.trim().toLowerCase();
			if (requestedId === "") requestedId = void 0;
			if (requestedId !== void 0 && !PRESET_ARCHIVE_ID.test(requestedId)) return presetArchiveFailure("Use lowercase letters, digits, and hyphens, starting with a letter or digit.");
			let unzipped;
			try {
				signal?.throwIfAborted();
				unzipped = unzipSync(data);
			} catch {
				return presetArchiveFailure("The file is not a valid ZIP archive.");
			}
			const manifestBytes = unzipped["manifest.json"];
			if (!manifestBytes) return presetArchiveFailure("Missing manifest.json in preset package.");
			let manifest;
			try {
				manifest = JSON.parse(strFromU8(manifestBytes));
			} catch {
				return presetArchiveFailure("Invalid JSON in manifest.json.");
			}
			if (manifest.format !== PRESET_ARCHIVE_FORMAT) return presetArchiveFailure(`Unsupported package format "${manifest.format}". Expected "${PRESET_ARCHIVE_FORMAT}".`);
			if (manifest.version !== PRESET_ARCHIVE_VERSION) return presetArchiveFailure(`Unsupported package version ${manifest.version}. Maximum supported is ${PRESET_ARCHIVE_VERSION}.`);
			const originalId = typeof manifest.id === "string" ? manifest.id.trim().toLowerCase() : "";
			if (!PRESET_ARCHIVE_ID.test(originalId)) return presetArchiveFailure(`Invalid preset id "${manifest.id}" in manifest.`);
			const targetId = requestedId ?? originalId;
			const files = {};
			let fileCount = 0;
			let totalUncompressed = 0;
			for (const [entryName, bytes] of Object.entries(unzipped)) {
				if (entryName === "manifest.json") continue;
				const safe = safePresetArchivePath(entryName);
				if (safe === null || entryName.includes("\\")) return presetArchiveFailure(`Package contains an unsafe path "${entryName}".`);
				if (entryName.endsWith("/")) continue;
				const relPath = safe.startsWith("preset/") ? safe.slice("preset/".length) : safe;
				if (relPath === "") continue;
				const baseName = relPath.split("/").pop() ?? "";
				if (PRESET_ARCHIVE_IGNORED_FILES.has(baseName)) continue;
				if (++fileCount > PRESET_ARCHIVE_MAX_FILES) return presetArchiveFailure(`Package contains more than ${PRESET_ARCHIVE_MAX_FILES} files.`);
				if (bytes.length > PRESET_ARCHIVE_MAX_FILE) return presetArchiveFailure(`File "${relPath}" exceeds the 12 MB limit.`);
				totalUncompressed += bytes.length;
				if (totalUncompressed > PRESET_ARCHIVE_MAX_UNCOMPRESSED) return presetArchiveFailure("Uncompressed package exceeds the 32 MB limit.");
				if (files[relPath] !== void 0) return presetArchiveFailure(`Package contains conflicting file "${relPath}".`);
				files[relPath] = bytes;
			}
			if (!files[COMPOSITION_FILE]) return presetArchiveFailure(`Package is missing required composition file "${COMPOSITION_FILE}".`);
			let conflict = false;
			try {
				const existing = await presets.resolve(targetId);
				if (existing) conflict = true;
			} catch {}
			const sourceDshVersion = typeof manifest.sourceDshVersion === "string" ? manifest.sourceDshVersion : manifest.dshVersion;
			const exportedAt = typeof manifest.exportedAt === "string" ? manifest.exportedAt : manifest.createdAt;
			const warnings = presetArchiveWarnings(files);
			const preview = {
				ok: true,
				agentPreset: targetId,
				sourceAgentPreset: originalId,
				name: manifest.name ?? targetId,
				description: manifest.description ?? "",
				...sourceDshVersion === void 0 ? {} : { sourceDshVersion },
				fileCount,
				totalSize: totalUncompressed,
				conflict,
				warnings,
				installed: false,
				manifest: {
					id: targetId,
					originalId,
					name: manifest.name ?? targetId,
					description: manifest.description ?? "",
					icon: manifest.icon ?? "sparkle",
					...sourceDshVersion === void 0 ? {} : { sourceDshVersion },
					...exportedAt === void 0 ? {} : { exportedAt }
				}
			};
			if (!install) {
				return Response.json(preview, { headers: { "cache-control": "no-store" } });
			}
			if (conflict) return presetArchiveFailure(`A preset named "${targetId}" already exists. Choose a different name or remove the existing preset first.`, 409);
			let container;
			try {
				const root = writableRoot(presets.roots);
				await mkdir(root, { recursive: true });
				const target = resolve(root, targetId);
				try {
					await stat(target);
					return presetArchiveFailure(`A preset named "${targetId}" already exists. Choose a different name or remove the existing preset first.`, 409);
				} catch (error) {
					if (error?.code !== "ENOENT") throw error;
				}
				container = await mkdtemp(resolve(root, ".dshpreset-import-"));
				const imported = resolve(container, targetId);
				await mkdir(imported, { recursive: true });
				signal?.throwIfAborted();
				for (const [relPath, bytes] of Object.entries(files)) {
					signal?.throwIfAborted();
					const fullPath = resolve(imported, relPath);
					if (!fullPath.startsWith(imported + sep)) throw new Error(`Path traversal detected: ${relPath}`);
					await mkdir(dirname(fullPath), { recursive: true });
					await writeFile(fullPath, bytes);
				}
				// scanRoot gained a second parameter in 0.1.2-alpha.1: the base URL a
				// composition row's package name resolves against. Without it the
				// scan throws before it can report a broken preset, so the imported
				// tree would install unvalidated. The roster derives the same value
				// from `ctx.baseUrl`.
				const scanned = await scanRoot({
					path: container,
					trust: "user"
				}, harnessBaseOf(ctx));
				const parsed = scanned.find((candidate) => candidate.id === targetId);
				if (!parsed || parsed.broken !== void 0) {
					throw new Error(parsed?.broken ? `Invalid preset configuration: ${parsed.broken}` : "Failed to load imported preset configuration.");
				}
				signal?.throwIfAborted();
				await rename(imported, target);
				return Response.json({
					...preview,
					conflict: false,
					installed: true
				}, { headers: { "cache-control": "no-store" } });
			} catch (error) {
				if (signal?.aborted) return presetArchiveFailure("Preset import was cancelled.", 499);
				if (error?.code === "EEXIST" || error?.code === "ENOTEMPTY") return presetArchiveFailure(`A preset named "${targetId}" already exists. Choose a different name or remove the existing preset first.`, 409);
				return presetArchiveFailure(error instanceof Error ? error.message : "Failed to install preset files.");
			} finally {
				if (container !== void 0) await rm(container, { recursive: true, force: true }).catch(() => {});
			}
		}
	}
}

/**
 * Register both transfer routes on the shared API channel.
 *
 * The carrier applies its trust and authentication policy before a handler
 * runs, so these routes inherit the same browser-session requirement as every
 * other API call — a preset archive is user data and must not be reachable
 * without one.
 *
 * @param ctx - Host context carrying the composed preset roots.
 */
export function apply(ctx) {
  const archive = createPresetArchive(ctx)
  const connection = Reflect.get(ctx, 'connection')

  connection.fetch.register({
    path: EXPORT_PATH,
    methods: ['GET', 'HEAD'],
    fetch: async (request) => {
      const url = new URL(request.url)
      const agentPreset = url.searchParams.get('agentPreset')
      if (agentPreset === null || !PRESET_ARCHIVE_ID.test(agentPreset)) {
        return presetArchiveFailure('Missing or invalid agentPreset query parameter.')
      }
      const response = await archive.exportArchive(agentPreset, request.signal)
      if (request.method === 'GET') return response
      await response.body?.cancel()
      return new Response(null, { status: response.status, headers: response.headers })
    }
  })

  connection.fetch.register({
    path: IMPORT_PATH,
    methods: ['POST'],
    fetch: async (request) => {
      const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
      if (contentType !== PRESET_ARCHIVE_MIME
        && contentType !== 'application/zip'
        && contentType !== 'application/octet-stream') {
        return presetArchiveFailure('Content type must be a DSH preset package.', 415)
      }
      const contentLength = Number(request.headers.get('content-length'))
      if (Number.isFinite(contentLength) && contentLength > PRESET_ARCHIVE_MAX_COMPRESSED) {
        return presetArchiveFailure('Preset package is larger than 16 MB.', 413)
      }
      let data
      try {
        data = new Uint8Array(await request.arrayBuffer())
      } catch {
        return presetArchiveFailure('Could not read the preset package.')
      }
      if (data.length > PRESET_ARCHIVE_MAX_COMPRESSED) {
        return presetArchiveFailure('Preset package is larger than 16 MB.', 413)
      }
      const url = new URL(request.url)
      return archive.importArchive(data, {
        agentPreset: url.searchParams.get('agentPreset') ?? undefined,
        install: url.searchParams.get('install') === '1'
      }, request.signal)
    }
  })
}
