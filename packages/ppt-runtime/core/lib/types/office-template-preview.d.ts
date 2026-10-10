import type { PptdProject } from './pptd.js';
export declare function renderOfficeTemplatePreview(project: PptdProject, directory: string, longEdge: number, maxPages: number, onPage?: (page: {page: number; total: number; path: string}) => Promise<void>): Promise<{engine: string; missingFonts: readonly string[]; timings: {exportMs: number; officeMs: number; rasterMs: number; totalMs: number}}>;
