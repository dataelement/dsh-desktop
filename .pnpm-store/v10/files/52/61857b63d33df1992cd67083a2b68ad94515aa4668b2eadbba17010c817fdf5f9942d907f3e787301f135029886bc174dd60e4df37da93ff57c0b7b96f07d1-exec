#!/usr/bin/env node
import { wrapTextLines } from "./text-wrap.js";
import { access, link, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { RECOMMENDED_ZIP_LIMITS, buildPresentation, parseZip, serializePresentation } from "@aiden0z/pptx-renderer";
import { JSDOM } from "jsdom";
import yaml from "js-yaml";
import sharp from "sharp";
import PptxGenJSImport from "pptxgenjs";
const MISPLACED_TEXT_STYLE_FIELDS = new Set(["fontFamily", "fontSize", "bold", "italic", "color", "lineHeight", "letterSpacing", "wrap", "align", "verticalAlign", "textDirection", "style"]);
//#region src/pptd-convert.ts
/** Bounded PPTX to PPTD v2 conversion used by the local CLI. */
const CSS_PIXEL_TO_POINT = 72 / 96;
function record$4(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
const PRESET_COLORS = {
	black: "000000",
	white: "FFFFFF",
	red: "FF0000",
	green: "008000",
	blue: "0000FF",
	yellow: "FFFF00",
	gray: "808080",
	grey: "808080",
	orange: "FFA500",
	purple: "800080"
};
function childElement(element, localName) {
	return element === void 0 ? void 0 : [...element.children].find((child) => child.localName === localName);
}
function descendantElement(element, localName) {
	return element === void 0 ? void 0 : [...element.getElementsByTagNameNS("*", localName)][0];
}
function safeElement(value) {
	return value?.element ?? void 0;
}
function themeForSlide(presentation, slideIndex) {
	const layout = presentation.slideToLayout.get(slideIndex);
	const master = layout === void 0 ? void 0 : presentation.layoutToMaster.get(layout);
	const theme = master === void 0 ? void 0 : presentation.masterToTheme.get(master);
	return theme === void 0 ? void 0 : presentation.themes.get(theme);
}
function resolvedTypeface(value, theme) {
	if (value === void 0 || value === "") return void 0;
	if (value.startsWith("+mj")) return theme?.majorFont.ea || theme?.majorFont.latin || "MiSans";
	if (value.startsWith("+mn")) return theme?.minorFont.ea || theme?.minorFont.latin || "MiSans";
	return value;
}
function applyLuminance(hex, colorNode) {
	const luminanceModifier = Number(descendantElement(colorNode, "lumMod")?.getAttribute("val") ?? 1e5) / 1e5;
	const luminanceOffset = Number(descendantElement(colorNode, "lumOff")?.getAttribute("val") ?? 0) / 1e5;
	return [
		0,
		2,
		4
	].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)).map((value) => Math.max(0, Math.min(255, Math.round(value * luminanceModifier + 255 * luminanceOffset))).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function ooxmlColor(element, theme) {
	if (element === void 0) return void 0;
	const colorNode = [
		"srgbClr",
		"schemeClr",
		"sysClr",
		"prstClr"
	].map((name) => descendantElement(element, name)).find((value) => value !== void 0);
	if (colorNode === void 0) return void 0;
	const name = colorNode.localName;
	const raw = colorNode.getAttribute("val") ?? "";
	const base = name === "srgbClr" ? raw : name === "schemeClr" ? theme?.colorScheme.get({
		tx1: "dk1",
		tx2: "dk2",
		bg1: "lt1",
		bg2: "lt2"
	}[raw] ?? raw) : name === "sysClr" ? colorNode.getAttribute("lastClr") ?? raw : PRESET_COLORS[raw.toLowerCase()];
	if (base === void 0 || !/^[0-9a-f]{6}$/iu.test(base)) return void 0;
	const alpha = Number(descendantElement(colorNode, "alpha")?.getAttribute("val") ?? 1e5) / 1e5;
	const opacity = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, "0").toUpperCase();
	return `#${applyLuminance(base.toUpperCase(), colorNode)}${opacity === "FF" ? "" : opacity}`;
}
function convertedFill(value, theme) {
	const fill = safeElement(value);
	if (fill === void 0 || fill.localName === "noFill") return void 0;
	if (fill.localName === "solidFill") {
		const resolved = ooxmlColor(fill, theme);
		return resolved === void 0 ? void 0 : {
			type: "solid",
			color: resolved
		};
	}
	if (fill.localName === "gradFill") {
		const stops = [...fill.getElementsByTagNameNS("*", "gs")].map((stop) => ({
			position: Number(stop.getAttribute("pos") ?? 0) / 1e5,
			color: ooxmlColor(stop, theme)
		})).filter((stop) => stop.color !== void 0);
		if (stops.length < 2) return void 0;
		const pathNode = childElement(fill, "path");
		const angle = Number(childElement(fill, "lin")?.getAttribute("ang") ?? 0) / 6e4;
		return {
			type: "gradient",
			gradientType: pathNode === void 0 ? "linear" : "radial",
			angle,
			stops
		};
	}
}
function convertedBorder(value, theme) {
	const line = safeElement(value);
	if (line === void 0 || childElement(line, "noFill") !== void 0) return void 0;
	const color = ooxmlColor(line, theme);
	if (color === void 0 || color.endsWith("00")) return void 0;
	const dashValue = childElement(line, "prstDash")?.getAttribute("val") ?? "solid";
	return {
		style: dashValue.includes("dot") ? "dot" : dashValue === "solid" ? "solid" : "dash",
		width: Math.max(.1, Number(line.getAttribute("w") ?? 12700) / 12700),
		color
	};
}
function points(value) {
	return Number((value * CSS_PIXEL_TO_POINT).toFixed(3));
}
function safeId(value, fallback) {
	return (value.normalize("NFKC").replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "") || fallback).slice(0, 96);
}
function htmlEscape(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}
function bounds(node, offsetX = 0, offsetY = 0) {
	return [
		points(node.position.x + offsetX),
		points(node.position.y + offsetY),
		points(node.size.w),
		points(node.size.h)
	];
}
function textRunStyle(properties, theme) {
	const color = ooxmlColor(properties, theme);
	const latin = descendantElement(properties, "latin")?.getAttribute("typeface") ?? void 0;
	const fontFamily = resolvedTypeface((descendantElement(properties, "ea")?.getAttribute("typeface") ?? void 0) || latin, theme);
	const fontSizeRaw = Number(properties?.getAttribute("sz"));
	return {
		...Number.isFinite(fontSizeRaw) && fontSizeRaw > 0 ? { fontSize: fontSizeRaw / 100 } : {},
		...fontFamily === void 0 ? {} : { fontFamily },
		...color === void 0 ? {} : { color },
		...properties?.getAttribute("b") === "1" ? { bold: true } : {},
		...properties?.getAttribute("i") === "1" ? { italic: true } : {}
	};
}
function runMarkup(text, style) {
	const declarations = [];
	if (typeof style.color === "string") declarations.push(`color:${style.color}`);
	if (typeof style.fontSize === "number") declarations.push(`font-size:${style.fontSize}px`);
	if (typeof style.fontFamily === "string") declarations.push(`font-family:${style.fontFamily}`);
	if (style.bold === true) declarations.push("font-weight:700");
	if (style.italic === true) declarations.push("font-style:italic");
	const escaped = htmlEscape(text).replaceAll("\n", "<br/>");
	return declarations.length === 0 ? escaped : `<span style="${declarations.join(";")}">${escaped}</span>`;
}
function convertedText(node, textBody, theme) {
	const body = safeElement(textBody?.bodyProperties);
	const paragraphs = textBody?.paragraphs ?? [];
	const firstParagraph = paragraphs[0];
	const base = textRunStyle(safeElement(paragraphs.flatMap((paragraph) => paragraph.runs).find((run) => run.text.trim() !== "")?.properties), theme);
	const paragraphAlignment = safeElement(firstParagraph?.properties)?.getAttribute("algn");
	const horizontal = paragraphAlignment === "ctr" ? "center" : paragraphAlignment === "r" ? "right" : paragraphAlignment === "just" || paragraphAlignment === "dist" ? "justify" : "left";
	const anchor = body?.getAttribute("anchor");
	const vertical = anchor === "ctr" ? "middle" : anchor === "b" ? "bottom" : "top";
	const markup = paragraphs.length === 0 ? (node.textBody?.paragraphs ?? []).map((paragraph) => `<p>${htmlEscape(paragraph.text).replaceAll("\n", "<br/>")}</p>`).join("") : paragraphs.map((paragraph) => {
		const properties = safeElement(paragraph.properties);
		const bullet = descendantElement(properties, "buChar")?.getAttribute("char") ?? (descendantElement(properties, "buAutoNum") === void 0 ? "" : "•");
		const content = paragraph.runs.map((run) => runMarkup(run.text, textRunStyle(safeElement(run.properties), theme))).join("");
		return `<p>${bullet === "" ? "" : `${htmlEscape(bullet)} `}${content}</p>`;
	}).join("");
	return {
		markup,
		content: {
			fontFamily: typeof base.fontFamily === "string" ? base.fontFamily : theme?.minorFont.ea || theme?.minorFont.latin || "MiSans",
			fontSize: typeof base.fontSize === "number" ? base.fontSize : 18,
			color: typeof base.color === "string" ? base.color : "#000000",
			align: [horizontal, vertical],
			wrap: body?.getAttribute("wrap") !== "none",
			text: markup
		}
	};
}
function lineElement(node, elementId, offsetX, offsetY, raw, theme) {
	const width = Math.max(.001, points(node.size.w));
	const height = Math.max(.001, points(node.size.h));
	const flipHorizontal = node.flipH;
	const flipVertical = node.flipV;
	return {
		elementId,
		elementType: "line",
		bounds: bounds(node, offsetX, offsetY),
		viewBox: [width, height],
		points: `${flipHorizontal ? width : 0},${flipVertical ? height : 0} ${flipHorizontal ? 0 : width},${flipVertical ? 0 : height}`,
		border: convertedBorder(raw?.line, theme) ?? {
			style: "solid",
			width: 1,
			color: "#000000"
		},
		...node.rotation === 0 ? {} : { rotation: node.rotation }
	};
}
function shapeElements(node, elementId, offsetX, offsetY, raw, theme) {
	if (node.presetGeometry === "line") return [lineElement(node, elementId, offsetX, offsetY, raw, theme)];
	const fill = convertedFill(raw?.fill, theme);
	const border = convertedBorder(raw?.line, theme);
	const text = convertedText(node, raw?.textBody, theme);
	const items = [];
	if (fill !== void 0 || border !== void 0 || text.markup === "") items.push({
		elementId: text.markup === "" ? elementId : `${elementId}-shape`,
		elementType: "shape",
		bounds: bounds(node, offsetX, offsetY),
		shapeName: node.presetGeometry ?? "rect",
		...fill === void 0 ? {} : { fill },
		...border === void 0 ? {} : { border },
		...node.rotation === 0 ? {} : { rotation: node.rotation },
		...!node.flipH && !node.flipV ? {} : { flip: [node.flipH, node.flipV] }
	});
	if (text.markup !== "") items.push({
		elementId: items.length === 0 ? elementId : `${elementId}-text`,
		elementType: "text",
		bounds: bounds(node, offsetX, offsetY),
		...node.rotation === 0 ? {} : { rotation: node.rotation },
		...!node.flipH && !node.flipV ? {} : { flip: [node.flipH, node.flipV] },
		content: text.content
	});
	return items;
}
function mediaType$1(file, bytes) {
	const extension = path.extname(file).toLowerCase();
	if (extension === ".png" && bytes[0] === 137 && bytes[1] === 80) return "image/png";
	if ((extension === ".jpg" || extension === ".jpeg") && bytes[0] === 255 && bytes[1] === 216) return "image/jpeg";
	if (extension === ".gif" && Buffer.from(bytes.subarray(0, 3)).toString("ascii") === "GIF") return "image/gif";
	if (extension === ".webp" && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP") return "image/webp";
	if (extension === ".svg" && Buffer.from(bytes.subarray(0, 512)).toString("utf8").includes("<svg")) return "image/svg+xml";
}
function normalizedRelationshipTarget(slidePath, target) {
	if (target.startsWith("/")) return target.slice(1);
	return path.posix.normalize(path.posix.join(path.posix.dirname(slidePath), target));
}
function chartValues(root, containerName) {
	const container = root.getElementsByTagName(containerName)[0];
	if (container === void 0) return [];
	return [...container.getElementsByTagName("c:v")].map((node) => node.textContent ?? "");
}
function chartSeriesType(element) {
	let current = element.parentElement;
	while (current !== null) {
		const name = current.localName;
		if (name.endsWith("Chart")) {
			if (name === "barChart") return "bar";
			if (name === "lineChart") return "line";
			if (name === "areaChart") return "area";
			if (name === "pieChart" || name === "doughnutChart") return "pie";
			if (name === "radarChart") return "radar";
			if (name === "scatterChart") return "scatter";
			if (name === "bubbleChart") return "bubble";
		}
		current = current.parentElement;
	}
}
function chartContainer(element) {
	let current = element.parentElement;
	while (current !== null) {
		if (current.localName.endsWith("Chart")) return current;
		current = current.parentElement;
	}
}
function convertedChart(node, xml, elementId, offsetX, offsetY, theme) {
	const document = new DOMParser().parseFromString(xml, "application/xml");
	if (document.querySelector("parsererror") !== null) return void 0;
	const seriesNodes = [...document.getElementsByTagName("c:ser")];
	if (seriesNodes.length === 0) return void 0;
	const valueAxes = [...document.getElementsByTagName("c:valAx")];
	const categoryAxis = [...document.getElementsByTagName("c:catAx")][0];
	const categoryAxisReversed = descendantElement(categoryAxis, "orientation")?.getAttribute("val") === "maxMin";
	const valueAxisIds = valueAxes.map((axis) => childElement(axis, "axId")?.getAttribute("val") ?? "");
	const axisConfig = (axis) => {
		const scaling = childElement(axis, "scaling");
		const minimum = Number(childElement(scaling, "min")?.getAttribute("val"));
		const maximum = Number(childElement(scaling, "max")?.getAttribute("val"));
		const title = descendantElement(childElement(axis, "title"), "t")?.textContent?.trim();
		return {
			...Number.isFinite(minimum) ? { min: minimum } : {},
			...Number.isFinite(maximum) ? { max: maximum } : {},
			...title === void 0 || title === "" ? {} : { title }
		};
	};
	const convertedAxes = valueAxes.map(axisConfig);
	const outputSeries = [];
	const valuesBySeries = [];
	let categories = [];
	for (const [index, seriesNode] of seriesNodes.entries()) {
		const type = chartSeriesType(seriesNode);
		if (type === void 0) return void 0;
		const container = chartContainer(seriesNode);
		const horizontal = type === "bar" && childElement(container, "barDir")?.getAttribute("val") === "bar";
		const sourceCategoryValues = type === "scatter" || type === "bubble" ? chartValues(seriesNode, "c:xVal") : chartValues(seriesNode, "c:cat");
		const categoryValues = horizontal && !categoryAxisReversed ? [...sourceCategoryValues].reverse() : sourceCategoryValues;
		if (categoryValues.length > categories.length) categories = categoryValues;
		const sourceValues = type === "scatter" || type === "bubble" ? chartValues(seriesNode, "c:yVal") : chartValues(seriesNode, "c:val");
		const values = horizontal && !categoryAxisReversed ? [...sourceValues].reverse() : sourceValues;
		valuesBySeries.push(values);
		const name = chartValues(seriesNode, "c:tx")[0] ?? `Series ${index + 1}`;
		const valueColumn = `series_${index + 1}`;
		const seriesColor = ooxmlColor(childElement(seriesNode, "spPr") ?? seriesNode, theme);
		const pointColors = [...seriesNode.getElementsByTagName("c:dPt")].map((point) => ({
			index: Number(childElement(point, "idx")?.getAttribute("val") ?? 0),
			color: ooxmlColor(point, theme)
		})).filter((point) => point.color !== void 0).sort((left, right) => left.index - right.index).map((point) => point.color);
		const dataLabels = descendantElement(container, "dLbls");
		const showValue = descendantElement(dataLabels, "showVal")?.getAttribute("val") === "1";
		const showPercent = descendantElement(dataLabels, "showPercent")?.getAttribute("val") === "1";
		const grouping = childElement(container, "grouping")?.getAttribute("val");
		const containerAxisIds = container === void 0 ? [] : [...container.children].filter((child) => child.localName === "axId").map((child) => child.getAttribute("val") ?? "");
		const valueAxisIndex = valueAxisIds.findIndex((axisId) => containerAxisIds.includes(axisId));
		outputSeries.push({
			type,
			encode: type === "pie" ? {
				category: "category",
				value: valueColumn
			} : type === "radar" ? {
				category: "category",
				y: valueColumn
			} : horizontal ? {
				x: valueColumn,
				y: "category"
			} : {
				x: "category",
				y: valueColumn
			},
			name,
			...pointColors.length > 0 && type === "pie" ? { fill: pointColors } : seriesColor === void 0 ? {} : type === "line" || type === "area" || type === "radar" ? { lineColor: seriesColor } : { fill: seriesColor },
			...showValue || showPercent ? { dataLabels: {
				show: true,
				...showPercent ? { content: "percentage" } : {}
			} } : {},
			...valueAxisIndex > 0 && !horizontal ? { yAxisIndex: valueAxisIndex } : {},
			...grouping === "stacked" ? { stack: "value" } : grouping === "percentStacked" ? { stack: "percent" } : {},
			...type === "pie" && seriesNode.parentElement?.localName === "doughnutChart" ? { innerRadius: .5 } : {}
		});
	}
	const length = Math.max(categories.length, ...valuesBySeries.map((values) => values.length));
	const rows = Array.from({ length }, (_value, row) => [categories[row] ?? String(row + 1), ...valuesBySeries.map((values) => values[row] === void 0 || values[row] === "" ? null : Number(values[row]))]);
	return {
		elementId,
		elementType: "chart",
		bounds: bounds(node, offsetX, offsetY),
		data: {
			cols: ["category", ...valuesBySeries.map((_values, index) => `series_${index + 1}`)],
			rows
		},
		series: outputSeries,
		legend: outputSeries.length > 1,
		fontFamily: "MiSans",
		...outputSeries.some((item) => record$4(item.encode)?.y === "category") ? convertedAxes[0] === void 0 || Object.keys(convertedAxes[0]).length === 0 ? {} : { xAxis: convertedAxes[0] } : convertedAxes.length === 0 ? {} : { yAxis: convertedAxes.length === 1 ? convertedAxes[0] : convertedAxes }
	};
}
function convertedTable(node, elementId, offsetX, offsetY, raw, theme) {
	const columns = node.columns ?? [];
	const rows = node.rows ?? [];
	const totalWidth = columns.reduce((sum, value) => sum + value, 0) || 1;
	const totalHeight = rows.reduce((sum, row) => sum + row.height, 0) || 1;
	return {
		elementId,
		elementType: "table",
		bounds: bounds(node, offsetX, offsetY),
		columnWidths: columns.map((value) => Number((value / totalWidth).toFixed(6))),
		rowHeights: rows.map((row) => Number((row.height / totalHeight).toFixed(6))),
		rows: rows.map((row, rowIndex) => row.cells.map((cell, columnIndex) => {
			const rawCell = raw?.rows[rowIndex]?.cells[columnIndex];
			const properties = safeElement(rawCell?.properties);
			const fillElement = [
				"solidFill",
				"gradFill",
				"noFill"
			].map((name) => childElement(properties, name)).find((value) => value !== void 0);
			const lineElement = [
				"ln",
				"lnL",
				"lnR",
				"lnT",
				"lnB"
			].map((name) => childElement(properties, name)).find((value) => value !== void 0);
			const text = convertedText({
				...node,
				textBody: {
					paragraphs: [{
						level: 0,
						text: cell.text
					}],
					totalText: cell.text
				}
			}, rawCell?.textBody, theme);
			const align = Array.isArray(text.content.align) ? text.content.align : void 0;
			return {
				text: cell.text,
				...cell.gridSpan > 1 ? { colSpan: cell.gridSpan } : {},
				...cell.rowSpan > 1 ? { rowSpan: cell.rowSpan } : {},
				...fillElement === void 0 ? {} : { fill: convertedFill({ element: fillElement }, theme) },
				...lineElement === void 0 ? {} : { border: convertedBorder({ element: lineElement }, theme) },
				...typeof text.content.fontFamily === "string" ? { fontFamily: text.content.fontFamily } : {},
				...typeof text.content.fontSize === "number" ? { fontSize: text.content.fontSize } : {},
				...typeof text.content.color === "string" ? { color: text.content.color } : {},
				...text.content.bold === true ? { bold: true } : {},
				...text.content.italic === true ? { italic: true } : {},
				...align === void 0 ? {} : { align }
			};
		}))
	};
}
function yamlText(value) {
	return yaml.dump(value, {
		schema: yaml.JSON_SCHEMA,
		noRefs: true,
		lineWidth: -1,
		sortKeys: false
	});
}
function installDomParser() {
	const previous = globalThis.DOMParser;
	const window = new JSDOM("").window;
	Object.defineProperty(globalThis, "DOMParser", {
		configurable: true,
		writable: true,
		value: window.DOMParser
	});
	return () => {
		window.close();
		if (previous === void 0) Reflect.deleteProperty(globalThis, "DOMParser");
		else Object.defineProperty(globalThis, "DOMParser", {
			configurable: true,
			writable: true,
			value: previous
		});
	};
}
/** Convert one bounded PPTX package into an editable, self-contained PPTD v2 project. */
async function convertPptxToPptd(bytes, fileName) {
	const restoreDomParser = installDomParser();
	try {
		const files = await parseZip(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), RECOMMENDED_ZIP_LIMITS);
		const presentation = buildPresentation(files);
		const serialized = serializePresentation(presentation);
		const diagnostics = [];
		const pages = /* @__PURE__ */ new Map();
		const assets = /* @__PURE__ */ new Map();
		let sourceNodeCount = 0;
		let outputElementCount = 0;
		for (const slide of serialized.slides) {
			const sourceSlide = presentation.slides[slide.index];
			if (sourceSlide === void 0) continue;
			const theme = themeForSlide(presentation, slide.index);
			const output = [];
			const convertNode = (node, offsetX = 0, offsetY = 0, rawNode) => {
				sourceNodeCount += 1;
				const elementId = safeId(node.name, `slide-${slide.index + 1}-node-${node.id}`);
				if (node.nodeType === "group") {
					diagnostics.push({
						level: "normalized",
						slide: slide.index + 1,
						nodeId: node.id,
						feature: "group",
						message: "组合对象已展开为顺序 PPTD 元素。"
					});
					for (const child of node.children ?? []) convertNode(child, offsetX + node.position.x, offsetY + node.position.y);
					return;
				}
				if (node.nodeType === "shape") {
					const rawShape = rawNode?.nodeType === "shape" ? rawNode : void 0;
					const elements = shapeElements(node, elementId, offsetX, offsetY, rawShape, theme);
					output.push(...elements);
					outputElementCount += elements.length;
					if (rawShape?.customGeometry !== void 0 || descendantElement(safeElement(rawShape?.source), "effectLst") !== void 0) diagnostics.push({
						level: "normalized",
						slide: slide.index + 1,
						nodeId: node.id,
						feature: "shape-style",
						message: "PPTX 形状保留几何、显式填充、边框和富文本；自定义几何或效果进入标准 PPTD 样式。"
					});
					return;
				}
				if (node.nodeType === "table") {
					output.push(convertedTable(node, elementId, offsetX, offsetY, rawNode?.nodeType === "table" ? rawNode : void 0, theme));
					outputElementCount += 1;
					return;
				}
				if (node.nodeType === "chart" && node.chartPath !== void 0) {
					const chartXml = files.charts.get(node.chartPath) ?? files.charts.get(node.chartPath.replace(/^\//u, ""));
					const chart = chartXml === void 0 ? void 0 : convertedChart(node, chartXml, elementId, offsetX, offsetY, theme);
					if (chart === void 0) diagnostics.push({
						level: "unsupported",
						slide: slide.index + 1,
						nodeId: node.id,
						feature: "chart",
						message: "该 PPTX 图表没有可转换的缓存数据。"
					});
					else {
						output.push(chart);
						outputElementCount += 1;
						diagnostics.push({
							level: "normalized",
							slide: slide.index + 1,
							nodeId: node.id,
							feature: "chart-style",
							message: "PPTX 图表数据和类型已保留，复杂 OOXML 样式进入标准 PPTD 图表主题。"
						});
					}
					return;
				}
				if (node.nodeType === "picture" && node.blipEmbed !== void 0) {
					const rawPicture = rawNode?.nodeType === "picture" ? rawNode : void 0;
					const relationship = sourceSlide.rels.get(node.blipEmbed);
					const mediaPath = relationship === void 0 ? void 0 : normalizedRelationshipTarget(sourceSlide.slidePath, relationship.target);
					const media = mediaPath === void 0 ? void 0 : files.media.get(mediaPath);
					const type = mediaPath === void 0 || media === void 0 ? void 0 : mediaType$1(mediaPath, media);
					if (mediaPath === void 0 || media === void 0 || type === void 0) {
						diagnostics.push({
							level: "unsupported",
							slide: slide.index + 1,
							nodeId: node.id,
							feature: "picture",
							message: "图片资源格式或关系无法转换。"
						});
						return;
					}
					const digest = createHash("sha256").update(media).digest("hex");
					const extension = type === "image/jpeg" ? ".jpg" : type === "image/svg+xml" ? ".svg" : `.${type.slice(6)}`;
					const assetPath = `media/${digest.slice(0, 24)}${extension}`;
					assets.set(assetPath, {
						path: assetPath,
						mediaType: type,
						bytes: media,
						sha256: digest
					});
					output.push({
						elementId,
						elementType: "image",
						bounds: bounds(node, offsetX, offsetY),
						src: assetPath,
						fit: { mode: "fill" },
						...!node.flipH && !node.flipV ? {} : { flip: [node.flipH, node.flipV] },
						...node.rotation === 0 ? {} : { rotation: node.rotation },
						...rawPicture?.presetGeometry === void 0 || rawPicture.presetGeometry === "rect" ? {} : { cropShape: { shapeName: rawPicture.presetGeometry } },
						...convertedBorder(rawPicture?.line, theme) === void 0 ? {} : { border: convertedBorder(rawPicture?.line, theme) }
					});
					outputElementCount += 1;
					if (rawPicture?.crop !== void 0) diagnostics.push({
						level: "normalized",
						slide: slide.index + 1,
						nodeId: node.id,
						feature: "picture-crop",
						message: "图片资源和边界已保留，OOXML 百分比裁剪进入 PPTD 填充模式。"
					});
					return;
				}
				diagnostics.push({
					level: "unsupported",
					slide: slide.index + 1,
					nodeId: node.id,
					feature: node.nodeType,
					message: "该 PPTX 节点类型尚未映射到 PPTD。"
				});
			};
			for (const node of slide.nodes) convertNode(node, 0, 0, sourceSlide.nodes.find((candidate) => candidate.id === node.id && candidate.nodeType === node.nodeType));
			const pagePath = `pages/page-${slide.index + 1}.page`;
			const backgroundContainer = safeElement(sourceSlide.background);
			const backgroundFillElement = backgroundContainer === void 0 ? void 0 : [
				"solidFill",
				"gradFill",
				"noFill"
			].map((name) => descendantElement(backgroundContainer, name)).find((value) => value !== void 0);
			const background = backgroundFillElement === void 0 ? void 0 : convertedFill({ element: backgroundFillElement }, theme);
			pages.set(pagePath, yamlText({
				pageType: slide.index === 0 ? "cover" : "content",
				background: background ?? {
					type: "solid",
					color: "#FFFFFF"
				},
				elements: output
			}));
		}
		return {
			source: {
				entryName: "deck.pptd",
				manifest: yamlText({
					version: "v2",
					title: (serialized.slides[0]?.nodes.find((node) => node.textBody?.totalText.trim() !== "")?.textBody?.totalText.trim())?.split(/\r?\n/u)[0]?.slice(0, 160) || path.basename(fileName, path.extname(fileName)),
					size: [points(serialized.width), points(serialized.height)],
					theme: {
						colors: {
							primary: "#1F2937",
							accent: "#2563EB",
							text: "#111827",
							muted: "#6B7280",
							background: "#FFFFFF"
						},
						textStyles: {
							title: {
								fontFamily: "MiSans",
								fontSize: 36,
								bold: true,
								color: "$text"
							},
							body: {
								fontFamily: "MiSans",
								fontSize: 18,
								color: "$text"
							}
						}
					},
					pages: [...pages.keys()]
				}),
				pages,
				assets
			},
			slideCount: serialized.slideCount,
			sourceNodeCount,
			outputElementCount,
			extractedAssetCount: assets.size,
			diagnostics
		};
	} finally {
		restoreDomParser();
	}
}
//#endregion
//#region src/pptd-colors.ts
/** Deterministic series palette used when a chart series omits an explicit color. */
const PPTD_CHART_SERIES_PALETTE = [
	"#2563EB",
	"#F59E0B",
	"#10B981",
	"#EF4444",
	"#8B5CF6",
	"#06B6D4"
];
function record$3(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function themeColors(project) {
	return record$3(project.theme.colors) ?? {};
}
/** Resolve a literal or theme-referenced PPTD color without applying a silent fallback. */
function resolvePptdColor(project, value) {
	let current = value;
	const colors = themeColors(project);
	for (let depth = 0; depth < 8 && typeof current === "string" && current.startsWith("$"); depth += 1) current = colors[current.slice(1)];
	return typeof current === "string" && /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/iu.test(current) ? current : void 0;
}
/**
* Normalize chart-series colors from either color scalars or solid paint objects.
* Pie series may supply an array; unsupported paints and invalid colors return undefined.
*/
function resolvePptdChartSeriesColors(project, value) {
	if (value === void 0) return void 0;
	const values = Array.isArray(value) ? value : [value];
	if (values.length === 0) return void 0;
	const resolved = values.map((item) => {
		const paint = record$3(item);
		return resolvePptdColor(project, paint === void 0 ? item : paint.type === "solid" ? paint.color : void 0);
	});
	return resolved.every((item) => item !== void 0) ? resolved : void 0;
}
//#endregion
//#region src/pptd-preview.ts
/** Deterministic local SVG/PNG preview renderer for PPTD CLI screenshot workflows. */
function record$2(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function number$1(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function string$1(value) {
	return typeof value === "string" ? value : void 0;
}
function tuple$1(value, size) {
	if (!Array.isArray(value) || value.length !== size) return void 0;
	const values = value.map(number$1);
	return values.every((item) => item !== void 0) ? values : void 0;
}
function escapeXml(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}
function themeMap$1(project, key) {
	return record$2(project.theme[key]) ?? {};
}
function color(project, value, fallback = "#000000") {
	return resolvePptdColor(project, value) ?? fallback;
}
function chartSeriesColor(project, value, fallback) {
	return resolvePptdChartSeriesColors(project, value)?.[0] ?? fallback;
}
function chartSeriesPaint(series) {
	const type = string$1(series.type) ?? "bar";
	return type === "line" || type === "area" || type === "radar" ? series.lineColor ?? series.areaColor : series.fill;
}
function plainText$1(value) {
	return value.replace(/<br\s*\/?\s*>/giu, "\n").replace(/<\/p\s*>/giu, "\n").replace(/<li(?:\s[^>]*)?>/giu, "• ").replace(/<\/li\s*>/giu, "\n").replace(/<[^>]+>/gu, "").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&").replace(/&quot;/gu, "\"").replace(/\n{3,}/gu, "\n\n").trim();
}
function frame$1(element) {
	const values = tuple$1(element.bounds, 4) ?? [
		0,
		0,
		0,
		0
	];
	return [
		values[0] ?? 0,
		values[1] ?? 0,
		values[2] ?? 0,
		values[3] ?? 0
	];
}
function transform(element, x, y, width, height) {
	const operations = [];
	const rotation = number$1(element.rotation) ?? 0;
	if (rotation !== 0) operations.push(`rotate(${rotation} ${x + width / 2} ${y + height / 2})`);
	const flip = Array.isArray(element.flip) ? element.flip : [];
	if (flip[0] === true) operations.push(`translate(${2 * x + width} 0) scale(-1 1)`);
	if (flip[1] === true) operations.push(`translate(0 ${2 * y + height}) scale(1 -1)`);
	return operations.length === 0 ? "" : ` transform="${operations.join(" ")}"`;
}
function fillPaint(project, fillValue, definitions) {
	const fill = record$2(fillValue);
	if (fill?.type === "gradient" && Array.isArray(fill.stops) && fill.stops.length >= 2) {
		const id = definitions.next("gradient");
		const stops = fill.stops.map((rawStop) => {
			const stop = record$2(rawStop) ?? {};
			const value = color(project, stop.color);
			const alpha = value.length === 9 ? Number.parseInt(value.slice(7, 9), 16) / 255 : 1;
			return `<stop offset="${Math.round(Math.max(0, Math.min(1, number$1(stop.position) ?? 0)) * 100)}%" stop-color="${value.slice(0, 7)}" stop-opacity="${alpha}"/>`;
		}).join("");
		if (fill.gradientType === "radial") definitions.definitions.push(`<radialGradient id="${id}">${stops}</radialGradient>`);
		else definitions.definitions.push(`<linearGradient id="${id}" x1="0" y1="0.5" x2="1" y2="0.5" gradientTransform="rotate(${number$1(fill.angle) ?? 0} 0.5 0.5)">${stops}</linearGradient>`);
		return `url(#${id})`;
	}
	if (fill?.type === "solid") return color(project, fill.color);
	return "none";
}
function strokePaint(project, value) {
	const border = record$2(value);
	if (border === void 0) return "stroke=\"none\"";
	const dash = border.style === "dot" ? " stroke-dasharray=\"1 2\"" : border.style === "dash" ? " stroke-dasharray=\"5 4\"" : "";
	return `stroke="${color(project, border.color)}" stroke-width="${number$1(border.width) ?? 1}"${dash}`;
}
function renderShape$1(project, element, definitions) {
	const [x, y, width, height] = frame$1(element);
	const common = `fill="${fillPaint(project, element.fill, definitions)}" ${strokePaint(project, element.border)}${transform(element, x, y, width, height)}`;
	const shape = string$1(element.shapeName) ?? "rect";
	if (shape === "custom") {
		const viewBox = tuple$1(element.viewBox, 2) ?? [width, height];
		return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 ${viewBox[0] ?? width} ${viewBox[1] ?? height}" overflow="visible"><path d="${escapeXml(string$1(element.path) ?? "")}" fill-rule="evenodd" ${common}/></svg>`;
	}
	if (shape === "ellipse" || shape === "donut") return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" ${common}/>`;
	if (shape === "triangle") return `<path d="M ${x + width / 2} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z" ${common}/>`;
	if (shape === "diamond") return `<path d="M ${x + width / 2} ${y} L ${x + width} ${y + height / 2} L ${x + width / 2} ${y + height} L ${x} ${y + height / 2} Z" ${common}/>`;
	if (shape.includes("Arrow")) return `<path d="M ${x} ${y + height * .3} H ${x + width * .65} V ${y} L ${x + width} ${y + height / 2} L ${x + width * .65} ${y + height} V ${y + height * .7} H ${x} Z" ${common}/>`;
	return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${shape === "roundRect" || shape.startsWith("round") ? Math.min(width, height) * .12 : 0}" ${common}/>`;
}
function renderLine$1(project, element, definitions) {
	const [x, y, width, height] = frame$1(element);
	const viewBox = tuple$1(element.viewBox, 2) ?? [width || 1, height || 1];
	const [first = [0, 0], ...rest] = (string$1(element.points) ?? "").trim().split(/\s+/u).map((value) => value.split(",").map(Number));
	const scaleX = width / (viewBox[0] || 1);
	const scaleY = height / (viewBox[1] || 1);
	const projected = (point) => `${x + (point[0] ?? 0) * scaleX} ${y + (point[1] ?? 0) * scaleY}`;
	const pathData = rest.length === 3 ? `M ${projected(first)} C ${rest.map(projected).join(" ")}` : `M ${projected(first)} ${rest.map((point) => `L ${projected(point)}`).join(" ")}`;
	const arrow = Array.isArray(element.arrow) ? element.arrow : [];
	const marker = (kind) => {
		const id = definitions.next("arrow");
		if (kind === null || kind === void 0) return "";
		definitions.definitions.push(`<marker id="${id}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="context-stroke"/></marker>`);
		return id;
	};
	const start = marker(arrow[0]);
	const end = marker(arrow[1]);
	return `<path d="${pathData}" fill="none" ${strokePaint(project, element.border)}${start === "" ? "" : ` marker-start="url(#${start})"`}${end === "" ? "" : ` marker-end="url(#${end})"`}${transform(element, x, y, width, height)}/>`;
}
function glyphWidth$1(character, fontSize) {
	if (/\s/u.test(character)) return fontSize * .33;
	if (/^[\u0000-\u00ff]$/u.test(character)) {
		if (/[A-Z@#%&]/u.test(character)) return fontSize * .7;
		if (/[a-z0-9]/u.test(character)) return fontSize * .55;
		return fontSize * .45;
	}
	return fontSize;
}
function wrappedLines(text, width, fontSize, wrap) {
 return wrapTextLines(text, width * .95, text => Array.from(text).reduce((sum, ch) => sum + glyphWidth$1(ch, fontSize), 0), wrap);
}

function renderText$1(project, element, definitions) {
	const [x, y, width, height] = frame$1(element);
	const content = record$2(element.content) ?? {};
	const style = {
		...typeof content.style === "string" && content.style.startsWith("$") ? record$2(themeMap$1(project, "textStyles")[content.style.slice(1)]) ?? {} : {},
		...content
	};
	const fontSize = number$1(style.fontSize) ?? 18;
	const lineHeight = number$1(style.lineHeightPx) ?? fontSize * (number$1(style.lineHeight) ?? 1.15);
	const align = Array.isArray(style.align) ? style.align : [];
	const anchor = align[0] === "center" ? "middle" : align[0] === "right" ? "end" : "start";
	const startX = anchor === "middle" ? x + width / 2 : anchor === "end" ? x + width : x;
	const lines = wrappedLines(plainText$1(string$1(content.text) ?? ""), width, fontSize, style.wrap !== false);
	const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
	const startY = align[1] === "middle" ? y + (height - totalHeight) / 2 + fontSize : align[1] === "bottom" ? y + height - totalHeight + fontSize : y + fontSize;
	const pair = record$2(style.fontFamily);
 const eastAsian = /[\u2e80-\u9fff\uf900-\ufaff]/u.test(string$1(content.text) ?? "");
 const ea = process.platform === "darwin" ? pair?.mac ?? pair?.ea : process.platform === "win32" ? pair?.win ?? pair?.ea : pair?.ea;
 const family = typeof style.fontFamily === "string" ? style.fontFamily : eastAsian ? string$1(ea) ?? "sans-serif" : string$1(pair?.latin) ?? "Arial";
	const opacity = number$1(element.opacity) ?? 1;
	const clipId = definitions.next("text-clip");
	definitions.definitions.push(`<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${Math.max(0, width)}" height="${Math.max(0, height)}"/></clipPath>`);
	return `<g clip-path="url(#${clipId})"><text x="${startX}" y="${startY}" text-anchor="${anchor}" font-family="${escapeXml(family)}" font-size="${fontSize}" font-weight="${style.bold === true ? 700 : 400}" font-style="${style.italic === true ? "italic" : "normal"}" fill="${color(project, style.color)}" opacity="${opacity}"${transform(element, x, y, width, height)}>${lines.map((line, index) => `<tspan x="${startX}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("")}</text></g>`;
}
function renderImage$1(project, element, definitions) {
	const [x, y, width, height] = frame$1(element);
	const asset = typeof element.src === "string" ? project.source.assets.get(element.src.replace(/^\.\//u, "")) : void 0;
	if (asset === void 0) return "";
	const fit = string$1(record$2(element.fit)?.mode) ?? "cover";
	const preserve = fit === "contain" ? "xMidYMid meet" : fit === "fill" ? "none" : "xMidYMid slice";
	const clipId = definitions.next("image-clip");
	const cropShape = record$2(element.cropShape);
	const clip = cropShape?.shapeName === "ellipse" ? `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}"/>` : `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${cropShape?.shapeName === "roundRect" ? Math.min(width, height) * .12 : 0}"/>`;
	definitions.definitions.push(`<clipPath id="${clipId}">${clip}</clipPath>`);
	return `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${`data:${asset.mediaType};base64,${Buffer.from(asset.bytes).toString("base64")}`}" preserveAspectRatio="${preserve}" clip-path="url(#${clipId})" opacity="${number$1(element.opacity) ?? 1}"${transform(element, x, y, width, height)}/>`;
}
function renderTable$1(project, element) {
	const [x, y, width, height] = frame$1(element);
	const columns = Array.isArray(element.columnWidths) ? element.columnWidths.map((value) => number$1(value) ?? 0) : [];
	const rowHeights = Array.isArray(element.rowHeights) ? element.rowHeights.map((value) => number$1(value) ?? 0) : [];
	const rows = Array.isArray(element.rows) ? element.rows : [];
	const occupied = Array.from({ length: rows.length }, () => Array.from({ length: columns.length }, () => false));
	const parts = [];
	for (const [rowIndex, rawRow] of rows.entries()) {
		if (!Array.isArray(rawRow)) continue;
		let columnIndex = 0;
		for (const rawCell of rawRow) {
			while (occupied[rowIndex]?.[columnIndex] === true) columnIndex += 1;
			const cell = record$2(rawCell) ?? { text: String(rawCell ?? "") };
			const colSpan = number$1(cell.colSpan) ?? 1;
			const rowSpan = number$1(cell.rowSpan) ?? 1;
			const cellX = x + columns.slice(0, columnIndex).reduce((sum, value) => sum + value, 0) * width;
			const cellY = y + rowHeights.slice(0, rowIndex).reduce((sum, value) => sum + value, 0) * height;
			const cellWidth = columns.slice(columnIndex, columnIndex + colSpan).reduce((sum, value) => sum + value, 0) * width;
			const cellHeight = rowHeights.slice(rowIndex, rowIndex + rowSpan).reduce((sum, value) => sum + value, 0) * height;
			for (let row = rowIndex; row < rowIndex + rowSpan; row += 1) {
				const occupiedRow = occupied[row];
				if (occupiedRow === void 0) continue;
				for (let column = columnIndex; column < columnIndex + colSpan; column += 1) occupiedRow[column] = true;
			}
			const fill = fillPaint(project, cell.fill, {
				definitions: [],
				next: () => ""
			});
			parts.push(`<rect x="${cellX}" y="${cellY}" width="${cellWidth}" height="${cellHeight}" fill="${fill === "none" ? "#FFFFFF" : fill}" ${strokePaint(project, cell.border ?? {
				color: "#D1D5DB",
				width: 1
			})}/>`);
			parts.push(`<text x="${cellX + cellWidth / 2}" y="${cellY + cellHeight / 2}" text-anchor="middle" dominant-baseline="middle" font-family="MiSans" font-size="${number$1(cell.fontSize) ?? 11}" fill="${color(project, cell.color)}">${escapeXml(plainText$1(string$1(cell.text) ?? ""))}</text>`);
			columnIndex += colSpan;
		}
	}
	return parts.join("");
}
function renderChart$1(project, element) {
	const [x, y, width, height] = frame$1(element);
	const data = record$2(element.data) ?? {};
	const columns = Array.isArray(data.cols) ? data.cols.map(String) : [];
	const rows = Array.isArray(data.rows) ? data.rows : [];
	const seriesDefaults = record$2(element.seriesDefaults) ?? {};
	const series = (Array.isArray(element.series) ? element.series.map(record$2).filter((item) => item !== void 0) : []).map((item) => ({
		...record$2(seriesDefaults[string$1(item.type) ?? ""]) ?? {},
		...item
	}));
	const colors = PPTD_CHART_SERIES_PALETTE;
	const firstEncode = record$2(series[0]?.encode) ?? {};
	const firstXIndex = columns.indexOf(string$1(firstEncode.x) ?? "");
	const firstYIndex = columns.indexOf(string$1(firstEncode.y) ?? "");
	const firstXValues = rows.map((row) => row[firstXIndex]);
	const firstYValues = rows.map((row) => row[firstYIndex]);
	const firstXNumeric = firstXIndex >= 0 && firstXValues.every((value) => Number.isFinite(Number(value)));
	const firstYNumeric = firstYIndex >= 0 && firstYValues.every((value) => Number.isFinite(Number(value)));
	const horizontalBars = string$1(series[0]?.type) === "bar" && firstXNumeric && !firstYNumeric;
	const padding = {
		left: horizontalBars ? 68 : 42,
		right: 24,
		top: 16,
		bottom: 36
	};
	const plotX = x + padding.left;
	const plotY = y + padding.top;
	const plotW = Math.max(1, width - padding.left - padding.right);
	const plotH = Math.max(1, height - padding.top - padding.bottom);
	const parts = [`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="#D1D5DB"/>`];
	if ((string$1(series[0]?.type) ?? "bar") === "pie") {
		const encode = record$2(series[0]?.encode) ?? {};
		const valueIndex = columns.indexOf(string$1(encode.value) ?? columns[1] ?? "");
		const categoryIndex = columns.indexOf(string$1(encode.category) ?? columns[0] ?? "");
		const values = rows.map((row) => Math.max(0, Number(row[valueIndex] ?? 0)));
		const total = values.reduce((sum, value) => sum + value, 0) || 1;
		const cx = plotX + plotW / 2;
		const cy = plotY + plotH / 2;
		const radius = Math.min(plotW, plotH) * .38;
		let angle = -Math.PI / 2;
		const configuredColors = resolvePptdChartSeriesColors(project, series[0]?.fill) ?? [];
		values.forEach((value, index) => {
			const next = angle + value / total * Math.PI * 2;
			const large = next - angle > Math.PI ? 1 : 0;
			const x1 = cx + Math.cos(angle) * radius;
			const y1 = cy + Math.sin(angle) * radius;
			const x2 = cx + Math.cos(next) * radius;
			const y2 = cy + Math.sin(next) * radius;
			const sliceColor = (configuredColors.length === 0 ? void 0 : configuredColors[index % configuredColors.length]) ?? colors[index % colors.length] ?? "#2563EB";
			parts.push(`<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z" fill="${sliceColor}"/>`);
			const labelAngle = (angle + next) / 2;
			parts.push(`<text x="${cx + Math.cos(labelAngle) * radius * .65}" y="${cy + Math.sin(labelAngle) * radius * .65}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#FFFFFF">${escapeXml(String(rows[index]?.[categoryIndex] ?? ""))}</text>`);
			angle = next;
		});
		const innerRadius = number$1(series[0]?.innerRadius) ?? 0;
		if (innerRadius > 0) parts.push(`<circle cx="${cx}" cy="${cy}" r="${radius * Math.min(.95, innerRadius)}" fill="#FFFFFF"/>`);
		return parts.join("");
	}
	if (horizontalBars) {
		const prepared = series.map((item, index) => {
			const encode = record$2(item.encode) ?? {};
			const valueIndex = columns.indexOf(string$1(encode.x) ?? "");
			const categoryIndex = columns.indexOf(string$1(encode.y) ?? "");
			return {
				item,
				values: rows.map((row) => Number(row[valueIndex] ?? 0)),
				categories: rows.map((row) => String(row[categoryIndex] ?? "")),
				color: chartSeriesColor(project, chartSeriesPaint(item), colors[index % colors.length] ?? "#2563EB")
			};
		});
		const allValues = prepared.flatMap((item) => item.values);
		const minimum = Math.min(0, ...allValues);
		const maximum = Math.max(1, ...allValues);
		const scaleX = (value) => plotX + (value - minimum) / (maximum - minimum || 1) * plotW;
		const zeroX = scaleX(0);
		const slot = plotH / Math.max(1, rows.length);
		parts.push(`<line x1="${zeroX}" y1="${plotY}" x2="${zeroX}" y2="${plotY + plotH}" stroke="#9CA3AF"/>`);
		rows.forEach((_, rowIndex) => {
			const label = prepared[0]?.categories[rowIndex] ?? "";
			parts.push(`<text x="${plotX - 6}" y="${plotY + slot * (rowIndex + .5)}" text-anchor="end" dominant-baseline="middle" font-size="9" fill="#4B5563">${escapeXml(label)}</text>`);
		});
		for (const [seriesIndex, preparedSeries] of prepared.entries()) preparedSeries.values.forEach((value, rowIndex) => {
			const barHeight = slot * .68 / Math.max(1, prepared.length);
			const barY = plotY + slot * rowIndex + slot * .16 + seriesIndex * barHeight;
			const valueX = scaleX(value);
			parts.push(`<rect x="${Math.min(valueX, zeroX)}" y="${barY}" width="${Math.max(1, Math.abs(valueX - zeroX))}" height="${barHeight}" fill="${preparedSeries.color}"/>`);
			if (record$2(preparedSeries.item.dataLabels)?.show === true) parts.push(`<text x="${valueX + (value >= 0 ? 4 : -4)}" y="${barY + barHeight / 2}" text-anchor="${value >= 0 ? "start" : "end"}" dominant-baseline="middle" font-size="${number$1(record$2(preparedSeries.item.dataLabels)?.fontSize) ?? 9}" fill="#374151">${escapeXml(String(value))}</text>`);
		});
		if (record$2(element.legend)?.show === true && prepared.length > 1) prepared.forEach((item, index) => parts.push(`<rect x="${plotX + index * 120}" y="${y + height - 14}" width="8" height="8" fill="${item.color}"/><text x="${plotX + index * 120 + 12}" y="${y + height - 7}" font-size="8" fill="#4B5563">${escapeXml(string$1(item.item.name) ?? `Series ${index + 1}`)}</text>`));
		return parts.join("");
	}
	const allValues = [];
	const prepared = series.map((item, index) => {
		const encode = record$2(item.encode) ?? {};
		const valueColumn = string$1(encode.y) ?? string$1(encode.value) ?? columns[1] ?? "";
		const valueIndex = columns.indexOf(valueColumn);
		const values = rows.map((row) => Number(row[valueIndex] ?? 0));
		const xIndex = columns.indexOf(string$1(encode.x) ?? columns[0] ?? "");
		const xValues = rows.map((row) => row[xIndex]);
		allValues.push(...values);
		const fallbackColor = colors[index % colors.length] ?? "#2563EB";
		return {
			item,
			values,
			xValues,
			color: chartSeriesColor(project, chartSeriesPaint(item), fallbackColor)
		};
	});
	const minimum = Math.min(0, ...allValues);
	const maximum = Math.max(1, ...allValues);
	const scaleY = (value) => plotY + plotH - (value - minimum) / (maximum - minimum || 1) * plotH;
	parts.push(`<line x1="${plotX}" y1="${plotY + plotH}" x2="${plotX + plotW}" y2="${plotY + plotH}" stroke="#9CA3AF"/>`);
	for (const [seriesIndex, preparedSeries] of prepared.entries()) {
		const type = string$1(preparedSeries.item.type) ?? "bar";
		const slot = plotW / Math.max(1, rows.length);
		if (type === "line" || type === "area" || type === "scatter") {
			const numericX = preparedSeries.xValues.every((value) => Number.isFinite(Number(value)));
			const xNumbers = preparedSeries.xValues.map(Number);
			const minX = numericX ? Math.min(...xNumbers) : 0;
			const maxX = numericX ? Math.max(...xNumbers) : Math.max(1, rows.length - 1);
			const pointX = (index) => {
				if (!numericX) return plotX + slot * (index + .5);
				return plotX + ((xNumbers[index] ?? minX) - minX) / (maxX - minX || 1) * plotW;
			};
			const path = preparedSeries.values.map((value, index) => `${index === 0 ? "M" : "L"} ${pointX(index)} ${scaleY(value)}`).join(" ");
			if (type === "area") parts.push(`<path d="${path} L ${plotX + slot * (preparedSeries.values.length - .5)} ${scaleY(0)} L ${plotX + slot * .5} ${scaleY(0)} Z" fill="${preparedSeries.color}" opacity="0.3"/>`);
			if (type === "scatter") preparedSeries.values.forEach((value, index) => parts.push(`<circle cx="${pointX(index)}" cy="${scaleY(value)}" r="3" fill="${preparedSeries.color}"/>`));
			else parts.push(`<path d="${path}" fill="none" stroke="${preparedSeries.color}" stroke-width="2"/>`);
			continue;
		}
		preparedSeries.values.forEach((value, index) => {
			const barWidth = slot * .72 / Math.max(1, prepared.length);
			const barX = plotX + slot * index + slot * .14 + seriesIndex * barWidth;
			const barY = scaleY(Math.max(value, 0));
			const zeroY = scaleY(0);
			parts.push(`<rect x="${barX}" y="${Math.min(barY, zeroY)}" width="${barWidth}" height="${Math.max(1, Math.abs(zeroY - barY))}" fill="${preparedSeries.color}"/>`);
			if (record$2(preparedSeries.item.dataLabels)?.show === true) parts.push(`<text x="${barX + barWidth / 2}" y="${barY - 3}" text-anchor="middle" font-size="${number$1(record$2(preparedSeries.item.dataLabels)?.fontSize) ?? 9}" fill="#374151">${escapeXml(String(value))}</text>`);
		});
	}
	const categoryLabels = prepared[0]?.xValues ?? [];
	if (categoryLabels.some((value) => !Number.isFinite(Number(value)))) categoryLabels.forEach((value, index) => parts.push(`<text x="${plotX + plotW / Math.max(1, rows.length) * (index + .5)}" y="${plotY + plotH + 13}" text-anchor="middle" font-size="8" fill="#4B5563">${escapeXml(String(value))}</text>`));
	return parts.join("");
}
function renderElement$1(project, element, definitions) {
	if (element.elementType === "shape") return renderShape$1(project, element, definitions);
	if (element.elementType === "line") return renderLine$1(project, element, definitions);
	if (element.elementType === "text") return renderText$1(project, element, definitions);
	if (element.elementType === "image") return renderImage$1(project, element, definitions);
	if (element.elementType === "table") return renderTable$1(project, element);
	if (element.elementType === "chart") return renderChart$1(project, element);
	if (element.elementType === "icon") {
		const [x, y, width, height] = frame$1(element);
		return `<circle cx="${x + width / 2}" cy="${y + height / 2}" r="${Math.min(width, height) / 2}" fill="${color(project, record$2(element.fill)?.color)}"/><text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.min(width, height) * .35}" fill="#FFFFFF">${escapeXml(string$1(element.iconName) ?? "icon")}</text>`;
	}
	return "";
}
/** Render one PPTD page to a standalone SVG string without network access. */
function renderPptdPageSvg(project, pageIndex) {
	const page = project.pages[pageIndex];
	if (page === void 0) throw new Error(`PPTD page ${pageIndex + 1} does not exist`);
	let counter = 0;
	const definitions = {
		definitions: [],
		next(prefix) {
			counter += 1;
			return `${prefix}-${pageIndex + 1}-${counter}`;
		}
	};
	const background = fillPaint(project, page.background ?? {
		type: "solid",
		color: "#FFFFFF"
	}, definitions);
	const content = page.elements.map((element) => renderElement$1(project, element, definitions)).join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${project.width}" height="${project.height}" viewBox="0 0 ${project.width} ${project.height}"><defs>${definitions.definitions.join("")}</defs><rect width="${project.width}" height="${project.height}" fill="${background === "none" ? "#FFFFFF" : background}"/>${content}</svg>`;
}
/** Render one PPTD page to PNG bytes through the bundled local SVG rasterizer. */
async function renderPptdPagePng(project, pageIndex, scale = 2) {
	if (!Number.isFinite(scale) || scale <= 0 || scale > 8) throw new Error("screenshot scale must be greater than 0 and at most 8");
	const svg = renderPptdPageSvg(project, pageIndex);
	const bytes = await sharp(Buffer.from(svg)).resize({ width: Math.round(project.width * scale) }).png().toBuffer();
	return new Uint8Array(bytes);
}
//#endregion
//#region src/pptd-publish.ts
/** Atomic, non-overwriting publication primitives shared by PPTD CLI and model tools. */
async function pathExists(target) {
	try {
		await access(target);
		return true;
	} catch {
		return false;
	}
}
function validateDirectoryTarget(target) {
	const resolved = path.resolve(target);
	if (resolved === path.parse(resolved).root) throw new Error("Output directory cannot be a filesystem root");
	return resolved;
}
/** Atomically publish one file, preserving an existing target unless replacement was explicitly requested. */
async function publishPptdFile(target, bytes, replace) {
	const resolved = path.resolve(target);
	await mkdir(path.dirname(resolved), { recursive: true });
	const temporary = path.join(path.dirname(resolved), `.${path.basename(resolved)}.${randomUUID()}.tmp`);
	const handle = await open(temporary, "wx", 384);
	try {
		await handle.writeFile(bytes);
		await handle.sync();
	} finally {
		await handle.close();
	}
	try {
		if (replace) await rename(temporary, resolved);
		else {
			await link(temporary, resolved);
			await unlink(temporary);
		}
	} catch (error) {
		await rm(temporary, { force: true });
		if (!replace && error.code === "EEXIST") throw new Error(`Output already exists: ${resolved}`);
		throw error;
	}
}
/** Atomically publish one directory, preserving an existing target unless replacement was explicitly requested. */
async function publishPptdDirectory(target, replace, writer) {
	const resolved = validateDirectoryTarget(target);
	await mkdir(path.dirname(resolved), { recursive: true });
	const stage = path.join(path.dirname(resolved), `.${path.basename(resolved)}.${randomUUID()}.stage`);
	const backup = path.join(path.dirname(resolved), `.${path.basename(resolved)}.${randomUUID()}.backup`);
	await mkdir(stage, {
		recursive: false,
		mode: 448
	});
	try {
		await writer(stage);
		if (!replace) {
			try {
				await rename(stage, resolved);
			} catch (error) {
				if (error.code === "EEXIST" || error.code === "ENOTEMPTY") throw new Error(`Output directory already exists: ${resolved}`);
				throw error;
			}
			return;
		}
		const exists = await pathExists(resolved);
		if (exists) await rename(resolved, backup);
		try {
			await rename(stage, resolved);
			if (exists) await rm(backup, {
				recursive: true,
				force: true
			});
		} catch (error) {
			if (exists && await pathExists(backup) && !await pathExists(resolved)) await rename(backup, resolved);
			throw error;
		}
	} finally {
		await rm(stage, {
			recursive: true,
			force: true
		});
		await rm(backup, {
			recursive: true,
			force: true
		});
	}
}
function safeOutputRelative(value) {
	if (value === "" || path.isAbsolute(value) || value.includes("\\")) throw new Error(`Unsafe generated path: ${value}`);
	const normalized = path.posix.normalize(value);
	if (normalized === ".." || normalized.startsWith("../") || normalized.startsWith("/")) throw new Error(`Unsafe generated path: ${value}`);
	return normalized;
}
/** Materialize a confined, self-contained PPTD source plane inside an empty staging directory. */
async function writePptdProjectSource(directory, source) {
	const manifest = safeOutputRelative(source.entryName);
	await writeFile(path.join(directory, ...manifest.split("/")), source.manifest, {
		encoding: "utf8",
		mode: 384
	});
	for (const [relative, content] of source.pages) {
		const safe = safeOutputRelative(relative);
		const target = path.join(directory, ...safe.split("/"));
		await mkdir(path.dirname(target), {
			recursive: true,
			mode: 448
		});
		await writeFile(target, content, {
			encoding: "utf8",
			mode: 384
		});
	}
	for (const asset of source.assets.values()) {
		const safe = safeOutputRelative(asset.path);
		const target = path.join(directory, ...safe.split("/"));
		await mkdir(path.dirname(target), {
			recursive: true,
			mode: 448
		});
		await writeFile(target, asset.bytes, { mode: 384 });
	}
}
//#endregion
//#region src/text-layout.ts
/** Deterministic text-box capacity estimates shared by template references and PPT renderers. */
const WIDTH_RESERVE = .95;
const DEFAULT_LINE_HEIGHT = 1.15;
function positive(value, fallback) {
	return value !== void 0 && Number.isFinite(value) && value > 0 ? value : fallback;
}
function glyphWidth(character) {
	if (/\p{Mark}/u.test(character)) return 0;
	if (/\s/u.test(character)) return .33;
	if (/^[ilI1|.,'`:;!]$/u.test(character)) return .3;
	if (/^[mwMW@%&]$/u.test(character)) return .82;
	if (/^[A-Z]$/u.test(character)) return .68;
	if (/^[\u0000-\u00ff]$/u.test(character)) return .56;
	if (/\p{Extended_Pictographic}/u.test(character)) return 1;
	return 1;
}
function lineWidth(text, fontSize, letterSpacing, bold) {
	const characters = Array.from(text);
	const glyphs = characters.reduce((sum, character) => sum + glyphWidth(character), 0);
	const spacing = Math.max(0, characters.length - 1) * letterSpacing;
	return glyphs * fontSize * (bold ? 1.04 : 1) + spacing;
}
/**
* Estimate native text wrapping while retaining the authored font size.
* @param input - Text, box geometry, and effective text style in PowerPoint points.
* @returns Estimated line use and overflow state.
*/
function measureTextLayout(input) {
	const fontSize = positive(input.fontSize, 18);
	const lineHeight = positive(input.lineHeight, DEFAULT_LINE_HEIGHT);
	const letterSpacing = typeof input.letterSpacing === "number" && Number.isFinite(input.letterSpacing) ? input.letterSpacing : 0;
	const availableLineWidth = Math.max(0, input.width) * WIDTH_RESERVE;
	const paragraphWidths = input.text.length === 0 ? [] : input.text.split("\n").map((line) => lineWidth(line, fontSize, letterSpacing, input.bold === true));
	const widestLine = Math.max(0, ...paragraphWidths);
	const wrap = input.wrap !== false;
	const lineCount = paragraphWidths.reduce((sum, width) => {
		if (!wrap || availableLineWidth === 0) return sum + 1;
		return sum + Math.max(1, Math.ceil(width / availableLineWidth));
	}, 0);
	const requiredHeight = lineCount * fontSize * lineHeight;
	const maxLineCount = Math.max(0, Math.floor(Math.max(0, input.height) / (fontSize * lineHeight)));
	const horizontalOverflow = !wrap && widestLine > availableLineWidth;
	return {
		lineCount,
		maxLineCount,
		requiredHeight,
		availableLineWidth,
		widestLine,
		horizontalOverflow,
		overflow: horizontalOverflow || lineCount > maxLineCount
	};
}
//#endregion
//#region src/pptd.ts
/** Local PPTD v2 parser, checker, loader, and native editable PPTX renderer. */
const PptxGenJS = typeof PptxGenJSImport === "function" ? PptxGenJSImport : PptxGenJSImport.default;
const POINTS_PER_INCH = 72;
const MAX_MANIFEST_BYTES = 512 * 1024;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const MAX_ASSET_BYTES = 32 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES = 256 * 1024 * 1024;
const MAX_PAGES = 200;
const MAX_ELEMENTS_PER_PAGE = 2e3;
function record$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function string(value) {
	return typeof value === "string" ? value : void 0;
}
function number(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function boolean(value) {
	return typeof value === "boolean" ? value : void 0;
}
const NATIVE_CHART_TYPES = new Set([
	"bar",
	"line",
	"area",
	"scatter",
	"bubble",
	"pie",
	"radar"
]);
const UNSUPPORTED_CHART_TYPES = new Set([
	"candlestick",
	"waterfall",
	"heatmap",
	"treemap",
	"sunburst",
	"sankey"
]);
const NATIVE_SHAPE_NAMES = new Set(Object.values(new PptxGenJS().ShapeType));
const MANIFEST_FIELDS$1 = new Set([
	"version",
	"title",
	"size",
	"template",
	"theme",
	"pages"
]);
const TEMPLATE_FIELDS = new Set([
	"id",
	"name",
	"sourceFile",
	"sourceSha256"
]);
const PAGE_FIELDS$1 = new Set([
	"pageType",
	"templateReference",
	"background",
	"notes",
	"elements"
]);
const TEMPLATE_REFERENCE_FIELDS = new Set([
	"sourceSlideNumber",
	"rationale",
	"contentRelationship"
]);
const TEMPLATE_RELATIONSHIPS = new Set([
	"statement",
	"independent",
	"comparison",
	"process",
	"timeline",
	"overlap",
	"data",
	"generic"
]);
const ELEMENT_BASE_FIELDS = [
	"elementId",
	"elementType",
	"bounds"
];
const ELEMENT_FIELDS$1 = {
	text: new Set([
		...ELEMENT_BASE_FIELDS,
		"rotation",
		"opacity",
		"flip",
		"content"
	]),
	shape: new Set([
		...ELEMENT_BASE_FIELDS,
		"rotation",
		"opacity",
		"flip",
		"shapeName",
		"adjustments",
		"viewBox",
		"path",
		"fill",
		"border",
		"shadow"
	]),
	line: new Set([
		...ELEMENT_BASE_FIELDS,
		"rotation",
		"opacity",
		"flip",
		"viewBox",
		"points",
		"curve",
		"arrow",
		"border",
		"shadow"
	]),
	image: new Set([
		...ELEMENT_BASE_FIELDS,
		"rotation",
		"opacity",
		"flip",
		"src",
		"cropShape",
		"fit",
		"crop",
		"border",
		"shadow"
	]),
	icon: new Set([
		...ELEMENT_BASE_FIELDS,
		"rotation",
		"opacity",
		"flip",
		"iconName",
		"color",
		"fill",
		"border",
		"shadow"
	]),
	table: new Set([
		...ELEMENT_BASE_FIELDS,
		"columnWidths",
		"rowHeights",
		"rows",
		"style",
		"fill",
		"shadow"
	]),
	chart: new Set([
		...ELEMENT_BASE_FIELDS,
		"data",
		"series",
		"seriesDefaults",
		"xAxis",
		"yAxis",
		"barWidth",
		"barGap",
		"categoryGap",
		"spokeAxis",
		"title",
		"legend",
		"dataLabels",
		"fontFamily",
		"fill",
		"border",
		"shadow"
	])
};
function unknownFields(value, allowed) {
	return Object.keys(value).filter((key) => !allowed.has(key));
}
function compatibilitySummary(project) {
	const summary = {
		native: 0,
		normalized: 0,
		vectorFallback: 0,
		rasterFallback: 0,
		unsupported: 0
	};
	const recordLevel = (level) => {
		if (level === "native") summary.native += 1;
		else if (level === "normalized") summary.normalized += 1;
		else if (level === "vector-fallback") summary.vectorFallback += 1;
		else if (level === "raster-fallback") summary.rasterFallback += 1;
		else summary.unsupported += 1;
	};
	for (const page of project.pages) for (const element of page.elements) {
		const type = string(element.elementType);
		if (type === "icon") {
			recordLevel("normalized");
			continue;
		}
		if (type === "shape" && element.shapeName === "custom") {
			recordLevel("vector-fallback");
			continue;
		}
		if (type === "line" && (string(element.curve) === "smooth" || (string(element.points)?.trim().split(/\s+/u).length ?? 0) > 2)) {
			recordLevel("vector-fallback");
			continue;
		}
		if (type === "image" && record$1(element.cropShape)?.shapeName === "custom") {
			recordLevel("raster-fallback");
			continue;
		}
		if (type === "chart") {
			const chartTypes = (Array.isArray(element.series) ? element.series.map(record$1).filter((item) => item !== void 0) : []).map((item) => string(item.type)).filter((item) => item !== void 0);
			if (chartTypes.some((item) => UNSUPPORTED_CHART_TYPES.has(item))) {
				recordLevel("unsupported");
				continue;
			}
			if (chartTypes.some((item) => !NATIVE_CHART_TYPES.has(item))) {
				recordLevel("unsupported");
				continue;
			}
		}
		const fill = record$1(element.fill);
		const content = record$1(element.content);
		recordLevel(fill?.type === "gradient" || fill?.type === "image" || content?.gradient !== void 0 || content?.shadow !== void 0 || element.shadow !== void 0 || element.adjustments !== void 0 || element.crop !== void 0 || element.cropShape !== void 0 ? "normalized" : "native");
	}
	return summary;
}
function tuple(value, size) {
	if (!Array.isArray(value) || value.length !== size) return void 0;
	const values = value.map(number);
	return values.every((item) => item !== void 0) ? values : void 0;
}
function safeProjectPath(value) {
	if (value === "" || path.isAbsolute(value) || value.includes("\\")) return void 0;
	const normalized = path.posix.normalize(value);
	return normalized === ".." || normalized.startsWith("../") || normalized.startsWith("/") ? void 0 : normalized;
}
function parseYaml(content, file, issues) {
	try {
		const value = record$1(yaml.load(content, {
			schema: yaml.JSON_SCHEMA,
			json: true
		}));
		if (value !== void 0) return value;
		issues.push({
			code: "yaml-root",
			severity: "error",
			file,
			message: `${file} 的 YAML 根节点必须是对象。`
		});
	} catch (error) {
		issues.push({
			code: "yaml-syntax",
			severity: "error",
			file,
			message: `${file} 无法解析：${error instanceof Error ? error.message : String(error)}`
		});
	}
}
/** Parse a bounded in-memory PPTD v2 project into a renderer-independent AST. */
function parsePptdProject(source) {
	const issues = [...source.issues ?? []];
	const manifest = parseYaml(source.manifest, source.entryName, issues) ?? {};
	for (const field of unknownFields(manifest, MANIFEST_FIELDS$1)) issues.push({
		code: "unknown-field",
		severity: "error",
		file: source.entryName,
		message: `PPTD 包含未知字段 ${field}。`
	});
	if (manifest.version !== "v2") issues.push({
		code: "version",
		severity: "error",
		file: source.entryName,
		message: "PPTD version 必须为 v2。"
	});
	const size = tuple(manifest.size, 2);
	const pageWidth = size?.[0];
	const pageHeight = size?.[1];
	if (pageWidth === void 0 || pageHeight === void 0 || pageWidth <= 0 || pageHeight <= 0) issues.push({
		code: "page-size",
		severity: "error",
		file: source.entryName,
		message: "PPTD size 必须是两个正数。"
	});
	const template = manifest.template === void 0 ? void 0 : record$1(manifest.template);
	if (manifest.template !== void 0 && template === void 0) issues.push({
		code: "template",
		severity: "error",
		file: source.entryName,
		message: "PPTD template 必须是对象。"
	});
	if (template !== void 0) {
		for (const field of unknownFields(template, TEMPLATE_FIELDS)) issues.push({
			code: "unknown-field",
			severity: "error",
			file: source.entryName,
			message: `PPTD template 包含未知字段 ${field}。`
		});
		if (typeof template.id !== "string" || typeof template.name !== "string") issues.push({
			code: "template",
			severity: "error",
			file: source.entryName,
			message: "PPTD template.id 和 template.name 必须是字符串。"
		});
		if (template.sourceFile !== void 0 && typeof template.sourceFile !== "string") issues.push({
			code: "template",
			severity: "error",
			file: source.entryName,
			message: "PPTD template.sourceFile 必须是字符串。"
		});
		if (template.sourceSha256 !== void 0 && (typeof template.sourceSha256 !== "string" || !/^[0-9a-f]{64}$/iu.test(template.sourceSha256))) issues.push({
			code: "template",
			severity: "error",
			file: source.entryName,
			message: "PPTD template.sourceSha256 必须是 SHA-256。"
		});
	}
	const pageRefs = Array.isArray(manifest.pages) ? manifest.pages : [];
	if (!Array.isArray(manifest.pages) || pageRefs.length === 0 || pageRefs.length > MAX_PAGES) issues.push({
		code: "pages",
		severity: "error",
		file: source.entryName,
		message: `PPTD pages 必须包含 1 到 ${MAX_PAGES} 个页面路径。`
	});
	const pages = [];
	const seen = /* @__PURE__ */ new Set();
	for (const [index, rawRef] of pageRefs.slice(0, MAX_PAGES).entries()) {
		const ref = typeof rawRef === "string" ? safeProjectPath(rawRef) : void 0;
		if (ref === void 0 || !ref.endsWith(".page")) {
			issues.push({
				code: "page-path",
				severity: "error",
				page: index + 1,
				message: `第 ${index + 1} 个页面路径无效。`
			});
			continue;
		}
		if (seen.has(ref)) {
			issues.push({
				code: "duplicate-page",
				severity: "error",
				file: ref,
				page: index + 1,
				message: `页面 ${ref} 被重复引用。`
			});
			continue;
		}
		seen.add(ref);
		const content = source.pages.get(ref);
		if (content === void 0) {
			issues.push({
				code: "missing-page",
				severity: "error",
				file: ref,
				page: index + 1,
				message: `找不到页面文件 ${ref}。`
			});
			continue;
		}
		const parsed = parseYaml(content, ref, issues);
		if (parsed === void 0) continue;
		for (const field of unknownFields(parsed, PAGE_FIELDS$1)) issues.push({
			code: "unknown-field",
			severity: "error",
			file: ref,
			page: index + 1,
			message: `页面包含未知字段 ${field}。`
		});
		const elements = Array.isArray(parsed.elements) ? parsed.elements.map(record$1).filter((item) => item !== void 0) : [];
		if (!Array.isArray(parsed.elements) || elements.length > MAX_ELEMENTS_PER_PAGE) issues.push({
			code: "elements",
			severity: "error",
			file: ref,
			page: index + 1,
			message: `页面 elements 必须是数组且不超过 ${MAX_ELEMENTS_PER_PAGE} 个元素。`
		});
		const background = record$1(parsed.background);
		const templateReference = parsed.templateReference === void 0 ? void 0 : record$1(parsed.templateReference);
		if (parsed.templateReference !== void 0 && templateReference === void 0) issues.push({
			code: "template-reference",
			severity: "error",
			file: ref,
			page: index + 1,
			message: "页面 templateReference 必须是对象。"
		});
		if (templateReference !== void 0) {
			for (const field of unknownFields(templateReference, TEMPLATE_REFERENCE_FIELDS)) issues.push({
				code: "unknown-field",
				severity: "error",
				file: ref,
				page: index + 1,
				message: `页面 templateReference 包含未知字段 ${field}。`
			});
			if (!Number.isInteger(templateReference.sourceSlideNumber) || Number(templateReference.sourceSlideNumber) <= 0) issues.push({
				code: "template-reference",
				severity: "error",
				file: ref,
				page: index + 1,
				message: "页面 templateReference.sourceSlideNumber 必须是正整数。"
			});
			if (typeof templateReference.rationale !== "string" || templateReference.rationale.trim() === "") issues.push({
				code: "template-reference",
				severity: "error",
				file: ref,
				page: index + 1,
				message: "页面 templateReference.rationale 必须说明源页选择理由。"
			});
			if (templateReference.contentRelationship !== void 0 && (typeof templateReference.contentRelationship !== "string" || !TEMPLATE_RELATIONSHIPS.has(templateReference.contentRelationship))) issues.push({
				code: "template-reference",
				severity: "error",
				file: ref,
				page: index + 1,
				message: "页面 templateReference.contentRelationship 必须是受支持的内容关系。"
			});
		}
		for (const element of elements) {
			const type = string(element.elementType);
			const allowed = type === void 0 ? void 0 : ELEMENT_FIELDS$1[type];
			if (allowed === void 0) continue;
			for (const field of unknownFields(element, allowed)) issues.push({
				code: type === "text" && MISPLACED_TEXT_STYLE_FIELDS.has(field) ? "misplaced-text-style" : "unknown-field",
				severity: "error",
				file: ref,
				page: index + 1,
				...typeof element.elementId === "string" ? { elementId: element.elementId } : {},
				message: type === "text" && MISPLACED_TEXT_STYLE_FIELDS.has(field) ? `文本属性 ${field} 应放在 content 内，请修正 YAML 缩进。` : `元素包含未知字段 ${field}。`
			});
		}
		pages.push({
			file: ref,
			...typeof parsed.pageType === "string" ? { pageType: parsed.pageType } : {},
			...templateReference === void 0 || !Number.isInteger(templateReference.sourceSlideNumber) || typeof templateReference.rationale !== "string" ? {} : { templateReference: {
				sourceSlideNumber: Number(templateReference.sourceSlideNumber),
				rationale: templateReference.rationale,
				...typeof templateReference.contentRelationship === "string" && TEMPLATE_RELATIONSHIPS.has(templateReference.contentRelationship) ? { contentRelationship: templateReference.contentRelationship } : {}
			} },
			...background === void 0 ? {} : { background },
			notes: typeof parsed.notes === "string" ? parsed.notes : "",
			elements: elements.slice(0, MAX_ELEMENTS_PER_PAGE)
		});
	}
	return {
		source,
		title: typeof manifest.title === "string" ? manifest.title : path.basename(source.entryName, ".pptd"),
		width: pageWidth ?? 960,
		height: pageHeight ?? 540,
		...template === void 0 ? {} : { template },
		theme: record$1(manifest.theme) ?? {},
		pages,
		parseIssues: issues
	};
}
function projectDigest(project) {
	const hash = createHash("sha256").update(project.source.manifest);
	for (const page of project.pages) hash.update(page.file).update(project.source.pages.get(page.file) ?? "");
	for (const asset of [...project.source.assets.values()].sort((left, right) => left.path.localeCompare(right.path))) hash.update(asset.path).update(asset.sha256);
	return hash.digest("hex");
}
function themeMap(project, key) {
	return record$1(project.theme[key]) ?? {};
}
function themeReferenceIssue(project, value, mapName, file, page, elementId) {
	if (typeof value !== "string" || !value.startsWith("$")) return void 0;
	const key = value.slice(1);
	if (key !== "" && key in themeMap(project, mapName)) return void 0;
	return {
		code: "invalid-theme",
		severity: "error",
		file,
		...page === void 0 ? {} : { page },
		...elementId === void 0 ? {} : { elementId },
		message: `主题引用 ${value} 不存在于 theme.${mapName}。`
	};
}
function colorThemeIssues(project, value, file, page, elementId) {
	const issues = [];
	const visited = /* @__PURE__ */ new WeakSet();
	const visit = (current, field) => {
		if (typeof current === "string") {
			if (field === "color" || field === "backgroundColor" || field === "lineColor" || field === "areaColor" || field === "fill") {
				const issue = themeReferenceIssue(project, current, "colors", file, page, elementId);
				if (issue !== void 0) issues.push(issue);
			}
			return;
		}
		if (Array.isArray(current)) {
			if (visited.has(current)) return;
			visited.add(current);
			for (const item of current) visit(item, field);
			return;
		}
		const object = record$1(current);
		if (object === void 0) return;
		if (visited.has(object)) return;
		visited.add(object);
		for (const [key, child] of Object.entries(object)) visit(child, key === "fill" ? "fill" : key);
	};
	visit(value);
	return issues;
}
function themeColorChainIssues(project) {
	const colors = themeMap(project, "colors");
	const issues = [];
	const reportedCycles = /* @__PURE__ */ new Set();
	const reportedInvalidTerminals = /* @__PURE__ */ new Set();
	for (const start of Object.keys(colors)) {
		const path = [];
		let key = start;
		while (true) {
			const cycleIndex = path.indexOf(key);
			if (cycleIndex >= 0) {
				const cycle = path.slice(cycleIndex);
				const signature = [...cycle].sort().join("\0");
				if (!reportedCycles.has(signature)) {
					reportedCycles.add(signature);
					issues.push({
						code: "invalid-theme",
						severity: "error",
						file: project.source.entryName,
						message: `theme.colors 存在循环引用：${[...cycle, key].map((item) => `$${item}`).join(" -> ")}。`
					});
				}
				break;
			}
			path.push(key);
			const value = colors[key];
			if (typeof value !== "string" || !value.startsWith("$")) {
				if (key !== start && (typeof value !== "string" || !/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/iu.test(value))) {
					if (!reportedInvalidTerminals.has(key)) {
						reportedInvalidTerminals.add(key);
						issues.push({
							code: "invalid-theme",
							severity: "error",
							file: project.source.entryName,
							message: `theme.colors.${start} 最终指向无效颜色 theme.colors.${key}。`
						});
					}
				}
				break;
			}
			const next = value.slice(1);
			if (!(next in colors)) break;
			key = next;
		}
	}
	return issues;
}
function resolveThemeReference(value, map) {
	if (typeof value !== "string" || !value.startsWith("$")) return value;
	return map[value.slice(1)];
}
function resolveColorValue(project, value, fallback = "#000000") {
	return resolvePptdColor(project, value) ?? fallback;
}
function colorOptions(project, value, opacity = 1) {
	const resolved = resolveColorValue(project, value);
	const alpha = resolved.length === 9 ? Number.parseInt(resolved.slice(7, 9), 16) / 255 : 1;
	const transparency = Math.round((1 - Math.max(0, Math.min(1, alpha * opacity))) * 100);
	return {
		color: resolved.slice(1, 7).toUpperCase(),
		...transparency === 0 ? {} : { transparency }
	};
}
function readableForeground(background) {
	const red = Number.parseInt(background.slice(0, 2), 16) / 255;
	const green = Number.parseInt(background.slice(2, 4), 16) / 255;
	const blue = Number.parseInt(background.slice(4, 6), 16) / 255;
	return red * .2126 + green * .7152 + blue * .0722 < .5 ? "E2E8F0" : "1F2937";
}
function textStyle(project, content) {
	return {
		...record$1(resolveThemeReference(content.style, themeMap(project, "textStyles"))) ?? {},
		...content
	};
}
function plainText(value) {
	return value.replace(/<br\s*\/?\s*>/giu, "\n").replace(/<\/p\s*>/giu, "\n").replace(/<li(?:\s[^>]*)?>/giu, "• ").replace(/<\/li\s*>/giu, "\n").replace(/<[^>]+>/gu, "").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&").replace(/&quot;/gu, "\"").replace(/\n{3,}/gu, "\n\n").trimEnd();
}
function textLayout(project, element) {
	// Fix structural errors before estimating layout with fallback styles.
	if (unknownFields(element, ELEMENT_FIELDS.text).length > 0) return void 0;
	const bounds = tuple(element.bounds, 4);
	const content = record$1(element.content);
	if (bounds === void 0 || content === void 0 || typeof content.text !== "string" || plainText(content.text).trim() === "") return void 0;
	const style = textStyle(project, content);
	const fontSize = number(style.fontSize) ?? 18;
	const inlineSizes = Array.from(content.text.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/giu), (match) => Number(match[1]));
	const vertical = style.textDirection === "vertical";
	const lineHeight = number(style.lineHeight);
	const letterSpacing = number(style.letterSpacing);
	const wrap = boolean(style.wrap);
	return measureTextLayout({
		text: plainText(content.text),
		width: bounds[vertical ? 3 : 2] ?? 0,
		height: bounds[vertical ? 2 : 3] ?? 0,
		fontSize: Math.max(fontSize, ...inlineSizes),
		bold: boolean(style.bold) === true || /<(?:b|strong)(?:\s|>)/iu.test(content.text),
		...lineHeight === void 0 ? {} : { lineHeight },
		...letterSpacing === void 0 ? {} : { letterSpacing },
		...wrap === void 0 ? {} : { wrap }
	});
}
function localAssetPath(value) {
	if (typeof value !== "string" || /^https?:\/\//iu.test(value)) return void 0;
	return safeProjectPath(value);
}
function elementContext(page, element) {
	return {
		page,
		...typeof element.elementId === "string" ? { elementId: element.elementId } : {}
	};
}
function compatibilityIssue(page, context, level, feature) {
	const severity = level === "unsupported" ? "error" : "warning";
	return {
		code: `compatibility-${level}`,
		severity,
		file: page.file,
		...context,
		message: `${feature} 的渲染兼容级别为 ${level}。`
	};
}
function validTableGrid(element) {
	const rows = Array.isArray(element.rows) ? element.rows : [];
	const columnWidths = Array.isArray(element.columnWidths) ? element.columnWidths.map(number) : [];
	const rowHeights = Array.isArray(element.rowHeights) ? element.rowHeights.map(number) : [];
	const columnCount = columnWidths.length;
	const rowCount = rowHeights.length;
	if (rowCount === 0 || columnCount === 0 || rows.length !== rowCount) return false;
	if (columnWidths.some((value) => value === void 0 || value < 0 || value > 1) || rowHeights.some((value) => value === void 0 || value < 0 || value > 1)) return false;
	const nearOne = (values) => {
		const total = values.reduce((sum, value) => sum + (value ?? 0), 0);
		return Math.abs(total - 1) < .001;
	};
	if (!nearOne(columnWidths) || !nearOne(rowHeights)) return false;
	const occupied = Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => false));
	for (const [rowIndex, rawRow] of rows.entries()) {
		if (!Array.isArray(rawRow)) return false;
		let columnIndex = 0;
		for (const rawCell of rawRow) {
			while (columnIndex < columnCount && occupied[rowIndex]?.[columnIndex] === true) columnIndex += 1;
			const cell = record$1(rawCell) ?? {};
			const rowSpan = number(cell.rowSpan) ?? 1;
			const colSpan = number(cell.colSpan) ?? 1;
			if (!Number.isInteger(rowSpan) || !Number.isInteger(colSpan) || rowSpan < 1 || colSpan < 1 || rowIndex + rowSpan > rowCount || columnIndex + colSpan > columnCount) return false;
			for (let row = rowIndex; row < rowIndex + rowSpan; row += 1) {
				const occupiedRow = occupied[row];
				if (occupiedRow === void 0) return false;
				for (let column = columnIndex; column < columnIndex + colSpan; column += 1) {
					if (occupiedRow[column] === true) return false;
					occupiedRow[column] = true;
				}
			}
			columnIndex += colSpan;
		}
		if (occupied[rowIndex]?.some((value) => !value) === true) return false;
	}
	return true;
}
function checkElement(project, page, pageNumber, element, ids) {
	const issues = [];
	const context = elementContext(pageNumber, element);
	const id = string(element.elementId);
	issues.push(...colorThemeIssues(project, element, page.file, pageNumber, id));
	if (id === void 0 || id.trim() === "") issues.push({
		code: "element-id",
		severity: "error",
		file: page.file,
		...context,
		message: "元素缺少 elementId。"
	});
	else if (ids.has(id)) issues.push({
		code: "duplicate-id",
		severity: "error",
		file: page.file,
		...context,
		message: `元素 ID ${id} 重复。`
	});
	else ids.add(id);
	const bounds = tuple(element.bounds, 4);
	const [x = 0, y = 0, width = -1, height = -1] = bounds ?? [];
	if (bounds === void 0 || width < 0 || height < 0) issues.push({
		code: "bounds",
		severity: "error",
		file: page.file,
		...context,
		message: "元素 bounds 必须是 [x, y, width, height]。"
	});
	else if (x < 0 || y < 0 || x + width > project.width + .01 || y + height > project.height + .01) issues.push({
		code: "out-of-bounds",
		severity: "error",
		file: page.file,
		...context,
		message: "元素超出 PPTD 页面边界。"
	});
	const type = string(element.elementType);
	if (![
		"text",
		"shape",
		"line",
		"image",
		"icon",
		"table",
		"chart"
	].includes(type ?? "")) {
		issues.push({
			code: "element-type",
			severity: "error",
			file: page.file,
			...context,
			message: `不支持的 elementType：${type ?? "missing"}。`
		});
		return issues;
	}
	if (type === "text") {
		const content = record$1(element.content);
		const styleIssue = themeReferenceIssue(project, content?.style, "textStyles", page.file, pageNumber, id);
		if (styleIssue !== void 0) issues.push(styleIssue);
		if (content === void 0 || typeof content.text !== "string") issues.push({
			code: "text-content",
			severity: "error",
			file: page.file,
			...context,
			message: "文本元素需要 content.text。"
		});
		else {
			const layout = textLayout(project, element);
			if (layout?.overflow === true) {
				const message = layout.horizontalOverflow ? `文本设置为不换行，但预计宽度 ${Math.ceil(layout.widestLine)}pt 超过文本框可用宽度 ${Math.floor(layout.availableLineWidth)}pt；请缩短文案或增大文本框。` : `文本预计需要 ${layout.lineCount} 行，当前文本框可容纳 ${layout.maxLineCount} 行；请缩短文案、增大文本框或拆分页面。`;
				issues.push({
					code: "text-overflow",
					severity: "error",
					file: page.file,
					...context,
					message
				});
			}
		}
		if (content !== void 0 && (content.gradient !== void 0 || content.shadow !== void 0)) issues.push(compatibilityIssue(page, context, "normalized", "文本渐变或阴影"));
		if (typeof content?.text === "string" && /<(?:u|s|sup|sub|a|ol)(?:\s|>)/iu.test(content.text)) issues.push(compatibilityIssue(page, context, "normalized", "高级富文本标签"));
	}
	if (type === "shape") {
		const name = string(element.shapeName);
		if (name === void 0) issues.push({
			code: "shape-name",
			severity: "error",
			file: page.file,
			...context,
			message: "形状元素需要 shapeName。"
		});
		else if (name === "custom") if (tuple(element.viewBox, 2) === void 0 || typeof element.path !== "string") issues.push({
			code: "custom-shape",
			severity: "error",
			file: page.file,
			...context,
			message: "自定义形状需要 viewBox 和 SVG path。"
		});
		else issues.push(compatibilityIssue(page, context, "vector-fallback", "自定义 SVG 形状"));
		else if (!NATIVE_SHAPE_NAMES.has(name)) issues.push({
			code: "shape-name",
			severity: "error",
			file: page.file,
			...context,
			message: `未知的内置形状：${name}。`
		});
		if (element.adjustments !== void 0) issues.push(compatibilityIssue(page, context, "normalized", "形状 adjustments"));
		const fill = record$1(element.fill);
		if (fill?.type === "gradient" || fill?.type === "image") issues.push(compatibilityIssue(page, context, "normalized", "形状渐变或图片填充"));
		if (element.shadow !== void 0) issues.push(compatibilityIssue(page, context, "normalized", "形状阴影"));
	}
	if (type === "line") {
		const points = typeof element.points === "string" ? element.points.trim().split(/\s+/u) : [];
		const invalidPoint = points.some((point) => !/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/u.test(point));
		if (tuple(element.viewBox, 2) === void 0 || points.length < 2 || invalidPoint) issues.push({
			code: "line-path",
			severity: "error",
			file: page.file,
			...context,
			message: "线条元素需要有效的 viewBox 和至少两个 points。"
		});
		else if (points.length > 2 || element.curve === "smooth") issues.push(compatibilityIssue(page, context, "vector-fallback", "贝塞尔曲线"));
		if (element.shadow !== void 0) issues.push(compatibilityIssue(page, context, "normalized", "线条阴影"));
	}
	if (type === "image") {
		if (typeof element.src !== "string") issues.push({
			code: "image-src",
			severity: "error",
			file: page.file,
			...context,
			message: "图片元素需要 src。"
		});
		else if (/^https?:\/\//iu.test(element.src)) issues.push({
			code: "remote-image",
			severity: "error",
			file: page.file,
			...context,
			message: "本地 PPTD 渲染器不访问网络图片，请先将图片放入项目目录。"
		});
		else {
			const assetPath = localAssetPath(element.src);
			if (assetPath === void 0 || !project.source.assets.has(assetPath)) issues.push({
				code: "missing-asset",
				severity: "error",
				file: page.file,
				...context,
				message: `找不到图片资源 ${element.src}。`
			});
		}
		const fit = record$1(element.fit);
		if (fit !== void 0 && ![
			"fill",
			"contain",
			"cover"
		].includes(string(fit.mode) ?? "")) issues.push({
			code: "image-fit",
			severity: "error",
			file: page.file,
			...context,
			message: "图片 fit.mode 必须是 fill、contain 或 cover。"
		});
		if (element.crop !== void 0 || element.cropShape !== void 0 || element.shadow !== void 0 || element.border !== void 0) {
			const cropShape = record$1(element.cropShape);
			issues.push(compatibilityIssue(page, context, cropShape?.shapeName === "custom" ? "raster-fallback" : "normalized", "图片裁剪、边框或阴影"));
		}
	}
	if (type === "table") {
		if (typeof element.style === "string") {
			const styleIssue = themeReferenceIssue(project, element.style, "tableStyles", page.file, pageNumber, id);
			if (styleIssue !== void 0) issues.push(styleIssue);
		}
		const rows = Array.isArray(element.rows) ? element.rows : [];
		for (const rawRow of rows) for (const rawCell of Array.isArray(rawRow) ? rawRow : []) {
			const styleIssue = themeReferenceIssue(project, record$1(rawCell)?.textStyle, "textStyles", page.file, pageNumber, id);
			if (styleIssue !== void 0) issues.push(styleIssue);
		}
		if (!validTableGrid(element)) issues.push({
			code: "table-data",
			severity: "error",
			file: page.file,
			...context,
			message: "表格网格、宽高比例或合并区域无效。"
		});
	}
	if (type === "chart") {
		const data = record$1(element.data);
		const cols = Array.isArray(data?.cols) ? data.cols : [];
		const rows = Array.isArray(data?.rows) ? data.rows : [];
		const series = Array.isArray(element.series) ? element.series.map(record$1).filter((item) => item !== void 0) : [];
		const validRows = rows.every((row) => Array.isArray(row) && row.length === cols.length);
		const validSeries = series.length > 0 && series.every((item) => {
			const encode = record$1(item.encode);
			const refs = encode === void 0 ? [] : Object.values(encode).filter((value) => typeof value === "string");
			return typeof item.type === "string" && refs.length >= 2 && refs.every((ref) => cols.includes(ref));
		});
		if (cols.length < 2 || rows.length === 0 || !validRows || !validSeries) issues.push({
			code: "chart-data",
			severity: "error",
			file: page.file,
			...context,
			message: "图表 data/series/encode 结构不完整。"
		});
		const chartTypes = series.map((item) => string(item.type)).filter((item) => item !== void 0);
		const unknownTypes = chartTypes.filter((item) => !NATIVE_CHART_TYPES.has(item) && !UNSUPPORTED_CHART_TYPES.has(item));
		if (unknownTypes.length > 0) issues.push({
			code: "chart-type",
			severity: "error",
			file: page.file,
			...context,
			message: `未知的图表类型：${[...new Set(unknownTypes)].join("、")}。`
		});
		const unsupportedTypes = chartTypes.filter((item) => UNSUPPORTED_CHART_TYPES.has(item));
		if (unsupportedTypes.length > 0) issues.push(compatibilityIssue(page, context, "unsupported", `图表类型 ${[...new Set(unsupportedTypes)].join("、")}`));
		const seriesDefaults = record$1(element.seriesDefaults) ?? {};
		for (const [seriesIndex, item] of series.entries()) {
			const chartType = string(item.type) ?? "bar";
			const effective = {
				...record$1(seriesDefaults[chartType]) ?? {},
				...item
			};
			const paint = chartType === "line" || chartType === "area" || chartType === "radar" ? effective.lineColor ?? effective.areaColor : effective.fill;
			if (paint === void 0) continue;
			const multipleColors = Array.isArray(paint);
			const validColors = resolvePptdChartSeriesColors(project, paint) !== void 0;
			if (multipleColors && chartType !== "pie" || !validColors) issues.push({
				code: "chart-series-color",
				severity: "error",
				file: page.file,
				...context,
				message: `图表序列 ${seriesIndex + 1} 的颜色需要使用 #RRGGBB、#RRGGBBAA、主题颜色引用或 solid 填充；饼图同时接受颜色数组。`
			});
		}
	}
	if (type === "icon") if (typeof element.iconName !== "string") issues.push({
		code: "icon-name",
		severity: "error",
		file: page.file,
		...context,
		message: "图标元素需要 iconName。"
	});
	else issues.push(compatibilityIssue(page, context, "normalized", "Font Awesome 图标"));
	return issues;
}
function textLayerIssues(project, page, pageNumber) {
	const issues = [];
	const overlap = (left, right) => {
		const rightEdge = Math.min((left[0] ?? 0) + (left[2] ?? 0), (right[0] ?? 0) + (right[2] ?? 0));
		const leftEdge = Math.max(left[0] ?? 0, right[0] ?? 0);
		const bottomEdge = Math.min((left[1] ?? 0) + (left[3] ?? 0), (right[1] ?? 0) + (right[3] ?? 0));
		const topEdge = Math.max(left[1] ?? 0, right[1] ?? 0);
		const width = Math.max(0, rightEdge - leftEdge);
		return {
			area: width * Math.max(0, bottomEdge - topEdge),
			width
		};
	};
	for (const [index, element] of page.elements.entries()) {
		if (element.elementType !== "text") continue;
		const textBounds = tuple(element.bounds, 4);
		if (textBounds === void 0 || (textBounds[2] ?? 0) <= 0 || (textBounds[3] ?? 0) <= 0) continue;
		const textArea = (textBounds[2] ?? 0) * (textBounds[3] ?? 0);
		const estimatedBottom = (textBounds[1] ?? 0) + (textLayout(project, element)?.requiredHeight ?? 0);
		for (const earlier of page.elements.slice(0, index)) {
			if (earlier.elementType !== "table" && earlier.elementType !== "chart") continue;
			const earlierBounds = tuple(earlier.bounds, 4);
			if (earlierBounds === void 0) continue;
			if (overlap(textBounds, earlierBounds).area / textArea >= .15) {
				issues.push({
					code: "text-occlusion",
					severity: "warning",
					file: page.file,
					page: pageNumber,
					...typeof element.elementId === "string" ? { elementId: element.elementId } : {},
					message: `文本与 ${string(earlier.elementId) ?? earlier.elementType} 的内容区域重叠。`
				});
				break;
			}
		}
		for (const later of page.elements.slice(index + 1)) {
			if (later.elementType === "line" || number(later.opacity) === 0) continue;
			const laterBounds = tuple(later.bounds, 4);
			if (laterBounds === void 0) continue;
			const intersection = overlap(textBounds, laterBounds);
			if (intersection.area / textArea >= .15) {
				issues.push({
					code: "text-occlusion",
					severity: "warning",
					file: page.file,
					page: pageNumber,
					...typeof element.elementId === "string" ? { elementId: element.elementId } : {},
					message: `文本可能被后绘制元素 ${string(later.elementId) ?? later.elementType ?? "unknown"} 遮挡。`
				});
				break;
			}
			const laterTop = laterBounds[1] ?? 0;
			if (laterTop > (textBounds[1] ?? 0) && laterTop < (textBounds[1] ?? 0) + (textBounds[3] ?? 0) && estimatedBottom > laterTop && intersection.width / (textBounds[2] ?? 1) >= .3) {
				issues.push({
					code: "text-drift",
					severity: "warning",
					file: page.file,
					page: pageNumber,
					...typeof element.elementId === "string" ? { elementId: element.elementId } : {},
					message: `文本可能跨入下方元素 ${string(later.elementId) ?? later.elementType ?? "unknown"} 的边界。`
				});
				break;
			}
		}
	}
	return issues;
}
function isCompositionBookend(page) {
	return /^(?:cover|title|opening|section|closing|final)$/iu.test(page.pageType?.trim() ?? "");
}
function visibleTextSizes(project, page) {
	return page.elements.flatMap((element) => {
		if (element.elementType !== "text") return [];
		const content = record$1(element.content);
		if (content === void 0 || typeof content.text !== "string" || plainText(content.text).trim() === "") return [];
		return [number(textStyle(project, content).fontSize) ?? 18];
	});
}
function coverFocusIssues(project) {
	const canvasArea = project.width * project.height;
	return project.pages.flatMap((page, index) => {
		if (!/^(?:cover|title|opening)$/iu.test(page.pageType?.trim() ?? "")) return [];
		if (page.elements.reduce((largest, element) => {
			if (![
				"image",
				"chart",
				"table"
			].includes(string(element.elementType) ?? "")) return largest;
			const bounds = tuple(element.bounds, 4);
			if (bounds === void 0 || canvasArea <= 0) return largest;
			return Math.max(largest, (bounds[2] ?? 0) * (bounds[3] ?? 0) / canvasArea);
		}, 0) >= .25) return [];
		const sizes = visibleTextSizes(project, page).sort((left, right) => left - right);
		if (sizes.length < 3) return [];
		const middle = Math.floor(sizes.length / 2);
		const median = sizes.length % 2 === 1 ? sizes[middle] ?? 0 : ((sizes[middle - 1] ?? 0) + (sizes[middle] ?? 0)) / 2;
		const largest = sizes.at(-1) ?? 0;
		if (median > 0 && largest / median >= 3) return [];
		return [{
			code: "cover-focus",
			severity: "warning",
			file: page.file,
			page: index + 1,
			message: "封面需要更明确的首读焦点：让一张图片、图表或表格占据至少 25% 画布，或让最大标题达到可见文字中位字号的 3 倍。"
		}];
	});
}
function compositionFamily(element) {
	const type = string(element.elementType);
	if (type === "text" || type === "icon") return "text";
	if (type === "image" || type === "chart" || type === "table") return "visual";
	if (type === "shape") return "shape";
}
function layoutSignature(project, page) {
	const canvasArea = project.width * project.height;
	const landmarks = /* @__PURE__ */ new Set();
	for (const element of page.elements) {
		const family = compositionFamily(element);
		const bounds = tuple(element.bounds, 4);
		if (family === void 0 || bounds === void 0 || canvasArea <= 0) continue;
		const [x = 0, y = 0, width = 0, height = 0] = bounds;
		if (width <= 0 || height <= 0) continue;
		const areaShare = width * height / canvasArea;
		if (family === "shape" && (areaShare < .01 || areaShare > .85)) continue;
		const column = Math.max(0, Math.min(3, Math.floor((x + width / 2) / project.width * 4)));
		const row = Math.max(0, Math.min(3, Math.floor((y + height / 2) / project.height * 4)));
		const scale = areaShare >= .25 ? "large" : areaShare >= .08 ? "medium" : "small";
		landmarks.add(`${family}:${column}:${row}:${scale}`);
	}
	return [...landmarks].sort().join("|");
}
function layoutRepetitionIssues(project) {
	const issues = [];
	let runStart = 0;
	let runSignature;
	const finishRun = (end) => {
		if (runSignature === void 0 || end - runStart < 3) return;
		const first = project.pages[runStart];
		if (first === void 0) return;
		issues.push({
			code: "layout-repetition",
			severity: "warning",
			file: first.file,
			page: runStart + 1,
			message: `第 ${runStart + 1}–${end} 页连续使用相同构图轮廓。调整主视觉位置、尺度或内容分组，并重新预览这组页面；固定指标序列可以保留重复。`
		});
	};
	for (const [index, page] of project.pages.entries()) {
		const signature = isCompositionBookend(page) ? "" : layoutSignature(project, page);
		if (signature === "") {
			finishRun(index);
			runStart = index + 1;
			runSignature = void 0;
			continue;
		}
		if (signature === runSignature) continue;
		finishRun(index);
		runStart = index;
		runSignature = signature;
	}
	finishRun(project.pages.length);
	return issues;
}
function compositionIssues(project) {
	return [...coverFocusIssues(project), ...layoutRepetitionIssues(project)];
}
/** Check structure, renderability, and measurable composition signals without external effects. */
function checkPptdProject(project) {
	const issues = [...project.parseIssues];
	issues.push(...colorThemeIssues(project, project.theme, project.source.entryName));
	for (const [key, value] of Object.entries(themeMap(project, "colors"))) {
		const referenceIssue = themeReferenceIssue(project, value, "colors", project.source.entryName);
		if (referenceIssue !== void 0) issues.push(referenceIssue);
		if (typeof value !== "string" || !value.startsWith("$") && !/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/iu.test(value)) issues.push({
			code: "invalid-theme",
			severity: "error",
			file: project.source.entryName,
			message: `theme.colors.${key} 必须是颜色或颜色主题引用。`
		});
	}
	issues.push(...themeColorChainIssues(project));
	for (const [index, page] of project.pages.entries()) {
		const ids = /* @__PURE__ */ new Set();
		issues.push(...colorThemeIssues(project, page.background, page.file, index + 1));
		for (const element of page.elements) issues.push(...checkElement(project, page, index + 1, element, ids));
		issues.push(...textLayerIssues(project, page, index + 1));
	}
	issues.push(...compositionIssues(project));
	const errorCount = issues.filter((item) => item.severity === "error").length;
	const warningCount = issues.filter((item) => item.severity === "warning").length;
	return {
		status: errorCount > 0 ? "fail" : warningCount > 0 ? "warning" : "pass",
		digest: projectDigest(project),
		pageCount: project.pages.length,
		nativeObjectCount: project.pages.reduce((sum, page) => sum + page.elements.length, 0),
		warningCount,
		errorCount,
		issues,
		compatibility: compatibilitySummary(project)
	};
}
function inches(value) {
	return value / POINTS_PER_INCH;
}
function frame(element) {
	const [x = 0, y = 0, width = 0, height = 0] = tuple(element.bounds, 4) ?? [
		0,
		0,
		0,
		0
	];
	return {
		x: inches(x),
		y: inches(y),
		w: inches(width),
		h: inches(height)
	};
}
function fontFace(value, fallback = "Arial") {
	if (typeof value === "string") return value;
	const font = record$1(value);
	return string(font?.ea) ?? string(font?.latin) ?? fallback;
}
function inlineStyle(project, raw) {
	const options = {};
	for (const declaration of raw?.split(";") ?? []) {
		const [name, ...rest] = declaration.split(":");
		const value = rest.join(":").trim();
		if (name?.trim() === "color") options.color = colorOptions(project, value).color;
		if (name?.trim() === "font-size" && /^\d+(?:\.\d+)?px$/u.test(value)) options.fontSize = Number.parseFloat(value);
		if (name?.trim() === "font-family" && value !== "") {
			const face = value.replace(/^['"]|['"]$/gu, "").split(",")[0]?.trim();
			if (face !== void 0) options.fontFace = face;
		}
		if (name?.trim() === "background-color") options.highlight = colorOptions(project, value).color;
		if (name?.trim() === "font-weight" && (value === "bold" || Number(value) >= 600)) options.bold = true;
		if (name?.trim() === "font-style" && value === "italic") options.italic = true;
	}
	return options;
}
function richRuns(project, value) {
	const runs = [];
	const stack = [{
		tag: "root",
		options: {}
	}];
	const currentOptions = () => stack.at(-1)?.options ?? {};
	for (const token of value.split(/(<[^>]+>)/gu)) {
		if (token === "") continue;
		if (!token.startsWith("<")) {
			const decoded = plainText(token);
			if (decoded !== "") runs.push({
				text: decoded,
				options: { ...currentOptions() }
			});
			continue;
		}
		const closing = /^<\/([a-z0-9]+)/iu.exec(token);
		if (closing !== null) {
			const tag = closing[1]?.toLowerCase();
			if (tag === void 0) continue;
			if (tag === "p" || tag === "li") runs.push({
				text: "\n",
				options: { ...currentOptions() }
			});
			while (stack.length > 1) if (stack.pop()?.tag === tag) break;
			continue;
		}
		const opening = /^<([a-z0-9]+)/iu.exec(token);
		if (opening === null) continue;
		const tag = opening[1]?.toLowerCase();
		if (tag === void 0) continue;
		if (tag === "br") {
			runs.push({
				text: "\n",
				options: { ...currentOptions() }
			});
			continue;
		}
		if (tag === "li") runs.push({
			text: "• ",
			options: { ...currentOptions() }
		});
		const style = /\sstyle=(?:"([^"]*)"|'([^']*)')/iu.exec(token);
		const options = {
			...currentOptions(),
			...inlineStyle(project, style?.[1] ?? style?.[2])
		};
		if (tag === "strong") options.bold = true;
		if (tag === "em") options.italic = true;
		if (tag === "u") options.underline = { style: "sng" };
		if (tag === "s") options.strike = "sngStrike";
		if (tag === "sup") options.superscript = true;
		if (tag === "sub") options.subscript = true;
		if (tag === "a") {
			const href = /\shref=(?:"([^"]*)"|'([^']*)')/iu.exec(token)?.slice(1).find((item) => item !== void 0);
			if (href !== void 0 && /^(?:https?:|mailto:)/iu.test(href)) options.hyperlink = { url: href };
		}
		stack.push({
			tag,
			options
		});
	}
	while (runs.at(-1)?.text === "\n") runs.pop();
	return runs;
}
function flipOptions(element) {
	const flip = Array.isArray(element.flip) ? element.flip : [];
	return {
		...typeof flip[0] === "boolean" ? { flipH: flip[0] } : {},
		...typeof flip[1] === "boolean" ? { flipV: flip[1] } : {}
	};
}
function shadowOptions(project, value) {
	const shadow = record$1(value);
	if (shadow === void 0 || number(shadow.blur) === void 0 || typeof shadow.color !== "string") return void 0;
	const resolved = resolveColorValue(project, shadow.color);
	const alpha = resolved.length === 9 ? Number.parseInt(resolved.slice(7, 9), 16) / 255 : 1;
	const [offsetX = 0, offsetY = 0] = tuple(shadow.offset, 2) ?? [0, 0];
	const angle = (Math.atan2(-offsetY, offsetX) * 180 / Math.PI + 360) % 360;
	return {
		type: "outer",
		color: resolved.slice(1, 7).toUpperCase(),
		opacity: alpha,
		blur: number(shadow.blur) ?? 0,
		offset: Math.hypot(offsetX, offsetY),
		angle
	};
}
function dash(value) {
	return value === "dash" || value === "dot" ? value : "solid";
}
function border(project, value) {
	const config = record$1(value);
	if (config === void 0) return void 0;
	const style = dash(config.style);
	return {
		color: colorOptions(project, config.color).color,
		width: number(config.width) ?? 1,
		...style === "solid" ? {} : { dash: style }
	};
}
function horizontalAlign(value, fallback) {
	return value === "center" || value === "right" || value === "justify" ? value : fallback;
}
function verticalAlign(value, fallback) {
	return value === "middle" || value === "bottom" ? value : fallback;
}
function renderText(project, slide, element) {
	const content = record$1(element.content) ?? {};
	const style = textStyle(project, content);
	const align = Array.isArray(style.align) ? style.align : [];
	const raw = string(content.text) ?? "";
	const runs = /<[^>]+>/u.test(raw) ? richRuns(project, raw) : raw;
	const textColor = colorOptions(project, style.color).color;
	const objectName = string(element.elementId);
	const charSpacing = number(style.letterSpacing);
	const horizontal = horizontalAlign(align[0], "left");
	const vertical = verticalAlign(align[1], "top");
	const textShadow = shadowOptions(project, style.shadow);
	slide.addText(runs, {
		...frame(element),
		...objectName === void 0 ? {} : { objectName },
		fontFace: fontFace(style.fontFamily, "MiSans"),
		fontSize: number(style.fontSize) ?? 18,
		color: textColor,
		bold: boolean(style.bold) ?? false,
		italic: boolean(style.italic) ?? false,
		align: horizontal,
		valign: vertical,
		margin: 0,
		breakLine: false,
		wrap: boolean(style.wrap) ?? true,
		textDirection: style.textDirection === "vertical" ? "vert" : "horz",
		rotate: number(element.rotation) ?? 0,
		...flipOptions(element),
		transparency: Math.round((1 - (number(element.opacity) ?? 1)) * 100),
		...textShadow === void 0 ? {} : { shadow: textShadow },
		...charSpacing === void 0 ? {} : { charSpacing }
	});
}
function solidFill(project, value, opacity = 1) {
	const fill = record$1(value);
	if (fill === void 0) return void 0;
	if (fill.type === "solid") return colorOptions(project, fill.color, opacity);
	if (fill.type === "gradient" && Array.isArray(fill.stops)) {
		const first = record$1(fill.stops[0]);
		return first === void 0 ? void 0 : colorOptions(project, first.color, opacity);
	}
}
function shapeType(pptx, value) {
	const name = typeof value === "string" ? value : "rect";
	const shape = pptx.ShapeType[name];
	if (shape === void 0) throw new Error(`Unsupported PPTD preset shape: ${name}`);
	return shape;
}
function xmlEscape(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}
function svgPaint(project, fillValue, opacity) {
	const fill = record$1(fillValue);
	if (fill?.type === "gradient" && Array.isArray(fill.stops) && fill.stops.length >= 2) {
		const id = "pptd-gradient";
		const stops = fill.stops.map((rawStop) => {
			const stop = record$1(rawStop) ?? {};
			const color = colorOptions(project, stop.color, opacity);
			return `<stop offset="${Math.round(Math.max(0, Math.min(1, number(stop.position) ?? 0)) * 100)}%" stop-color="#${color.color}"${color.transparency === void 0 ? "" : ` stop-opacity="${1 - color.transparency / 100}"`}/>`;
		}).join("");
		if (fill.gradientType === "radial") return {
			paint: `url(#${id})`,
			definition: `<radialGradient id="${id}">${stops}</radialGradient>`
		};
		const angle = number(fill.angle) ?? 0;
		return {
			paint: `url(#${id})`,
			definition: `<linearGradient id="${id}" x1="0" y1="0.5" x2="1" y2="0.5" gradientTransform="rotate(${angle} 0.5 0.5)">${stops}</linearGradient>`
		};
	}
	return {
		paint: `#${colorOptions(project, fill?.type === "solid" ? fill.color : "#000000", opacity).color}`,
		definition: ""
	};
}
function svgData(svg) {
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
function renderCustomShape(project, slide, element) {
	const viewBox = tuple(element.viewBox, 2) ?? [1, 1];
	const pathData = string(element.path) ?? "";
	const opacity = number(element.opacity) ?? 1;
	const fill = svgPaint(project, element.fill, opacity);
	const line = border(project, element.border);
	const shadow = shadowOptions(project, element.shadow);
	const shadowAngle = shadow?.angle ?? 0;
	const shadowOffset = shadow?.offset ?? 0;
	const shadowBlur = shadow?.blur ?? 0;
	const objectName = string(element.elementId);
	const [width = 1, height = 1] = viewBox;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><defs>${[fill.definition, shadow === void 0 ? "" : [
		"<filter id=\"pptd-shadow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\">",
		`<feDropShadow dx="${Math.cos(shadowAngle * Math.PI / 180) * shadowOffset}" dy="${-Math.sin(shadowAngle * Math.PI / 180) * shadowOffset}" stdDeviation="${shadowBlur / 2}" flood-color="#${shadow?.color ?? "000000"}" flood-opacity="${shadow?.opacity ?? 1}"/>`,
		"</filter>"
	].join("")].join("")}</defs><path d="${xmlEscape(pathData)}" fill="${fill.paint}" fill-rule="evenodd"${line === void 0 ? " stroke=\"none\"" : ` stroke="#${line.color}" stroke-width="${line.width}"${line.dash === void 0 ? "" : ` stroke-dasharray="${line.dash === "dot" ? "1 2" : "4 3"}"`}`}${shadow === void 0 ? "" : " filter=\"url(#pptd-shadow)\""}/></svg>`;
	slide.addImage({
		...frame(element),
		data: svgData(svg),
		...objectName === void 0 ? {} : { objectName },
		rotate: number(element.rotation) ?? 0,
		...flipOptions(element)
	});
}
function renderShape(project, pptx, slide, element) {
	if (element.shapeName === "custom") {
		renderCustomShape(project, slide, element);
		return;
	}
	const opacity = number(element.opacity) ?? 1;
	const fill = solidFill(project, element.fill, opacity);
	const line = border(project, element.border);
	const objectName = string(element.elementId);
	const shapeShadow = shadowOptions(project, element.shadow);
	slide.addShape(shapeType(pptx, element.shapeName), {
		...frame(element),
		...objectName === void 0 ? {} : { objectName },
		rotate: number(element.rotation) ?? 0,
		...flipOptions(element),
		...fill === void 0 ? { fill: {
			color: "FFFFFF",
			transparency: 100
		} } : { fill },
		line: line === void 0 ? {
			color: "FFFFFF",
			transparency: 100
		} : line,
		...shapeShadow === void 0 ? {} : { shadow: shapeShadow }
	});
}
function renderCurvedLine(project, slide, element, points) {
	const [width = 1, height = 1] = tuple(element.viewBox, 2) ?? [1, 1];
	const [first = [0, 0], ...rest] = points;
	const [startX = 0, startY = 0] = first;
	const pathData = rest.length === 3 ? `M ${startX} ${startY} C ${rest.map((point) => point.join(" ")).join(" ")}` : `M ${startX} ${startY} ${rest.map((point) => `L ${point[0] ?? 0} ${point[1] ?? 0}`).join(" ")}`;
	const line = border(project, element.border) ?? {
		color: "000000",
		width: 1
	};
	const arrow = Array.isArray(element.arrow) ? element.arrow : [];
	const marker = (id, kind) => kind === null || kind === void 0 ? "" : [
		`<marker id="${id}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">`,
		kind === "oval" ? "<circle cx=\"4\" cy=\"4\" r=\"3\" fill=\"context-stroke\"/>" : kind === "diamond" ? "<path d=\"M0,4 L4,0 L8,4 L4,8 Z\" fill=\"context-stroke\"/>" : "<path d=\"M0,0 L8,4 L0,8 Z\" fill=\"context-stroke\"/>",
		"</marker>"
	].join("");
	const dash = line.dash === void 0 ? "" : ` stroke-dasharray="${line.dash === "dot" ? "1 2" : "4 3"}"`;
	const markerStart = arrow[0] === void 0 || arrow[0] === null ? "" : " marker-start=\"url(#start)\"";
	const markerEnd = arrow[1] === void 0 || arrow[1] === null ? "" : " marker-end=\"url(#end)\"";
	const svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
		`<defs>${marker("start", arrow[0])}${marker("end", arrow[1])}</defs>`,
		`<path d="${pathData}" fill="none" stroke="#${line.color}" stroke-width="${line.width}"`,
		`${dash}${markerStart}${markerEnd}/></svg>`
	].join("");
	const objectName = string(element.elementId);
	slide.addImage({
		...frame(element),
		data: svgData(svg),
		...objectName === void 0 ? {} : { objectName },
		rotate: number(element.rotation) ?? 0,
		...flipOptions(element)
	});
}
function renderLine(project, pptx, slide, element) {
	const points = (string(element.points) ?? "").trim().split(/\s+/u).map((value) => value.split(",").map(Number));
	if (points.length > 2 || element.curve === "smooth") {
		renderCurvedLine(project, slide, element, points);
		return;
	}
	const viewBox = tuple(element.viewBox, 2) ?? [1, 1];
	const bounds = frame(element);
	const first = points[0] ?? [0, 0];
	const last = points.at(-1) ?? [viewBox[0] ?? 1, viewBox[1] ?? 1];
	const x1 = bounds.x + (first[0] ?? 0) / (viewBox[0] ?? 1) * bounds.w;
	const y1 = bounds.y + (first[1] ?? 0) / (viewBox[1] ?? 1) * bounds.h;
	const x2 = bounds.x + (last[0] ?? 0) / (viewBox[0] ?? 1) * bounds.w;
	const y2 = bounds.y + (last[1] ?? 0) / (viewBox[1] ?? 1) * bounds.h;
	const line = border(project, element.border) ?? {
		color: "000000",
		width: 1
	};
	const arrow = Array.isArray(element.arrow) ? element.arrow : [];
	const objectName = string(element.elementId);
	const lineShadow = shadowOptions(project, element.shadow);
	slide.addShape(pptx.ShapeType.line, {
		x: Math.min(x1, x2),
		y: Math.min(y1, y2),
		w: Math.abs(x2 - x1),
		h: Math.abs(y2 - y1),
		...objectName === void 0 ? {} : { objectName },
		flipH: x2 < x1,
		flipV: y2 < y1,
		rotate: number(element.rotation) ?? 0,
		line: {
			...line,
			...arrow[0] === void 0 || arrow[0] === null ? {} : { beginArrowType: arrow[0] },
			...arrow[1] === void 0 || arrow[1] === null ? {} : { endArrowType: arrow[1] }
		},
		...lineShadow === void 0 ? {} : { shadow: lineShadow }
	});
}
function renderImage(project, slide, element) {
	const assetPath = localAssetPath(element.src);
	const asset = assetPath === void 0 ? void 0 : project.source.assets.get(assetPath);
	if (asset === void 0) throw new Error(`PPTD image ${String(element.src)} is unavailable`);
	const objectName = string(element.elementId);
	const mode = string(record$1(element.fit)?.mode) ?? "cover";
	const bounds = frame(element);
	const cropShape = record$1(element.cropShape);
	const imageShadow = shadowOptions(project, element.shadow);
	slide.addImage({
		...bounds,
		...objectName === void 0 ? {} : { objectName },
		data: `data:${asset.mediaType};base64,${Buffer.from(asset.bytes).toString("base64")}`,
		rotate: number(element.rotation) ?? 0,
		...flipOptions(element),
		transparency: Math.round((1 - (number(element.opacity) ?? 1)) * 100),
		...mode === "fill" ? {} : { sizing: {
			type: mode,
			w: bounds.w,
			h: bounds.h
		} },
		...cropShape?.shapeName === "ellipse" ? { rounding: true } : {},
		...imageShadow === void 0 ? {} : { shadow: imageShadow }
	});
	const imageBorder = border(project, element.border);
	if (imageBorder !== void 0) slide.addShape(cropShape?.shapeName === "ellipse" ? "ellipse" : "rect", {
		...bounds,
		objectName: `${objectName ?? "image"}-border`,
		fill: {
			color: "FFFFFF",
			transparency: 100
		},
		line: imageBorder,
		rotate: number(element.rotation) ?? 0,
		...flipOptions(element)
	});
}
function mergeCellStyle(project, table, row, column, rowCount, columnCount, cell) {
	const tableTheme = record$1(resolveThemeReference(table.style, themeMap(project, "tableStyles"))) ?? {};
	const baseline = record$1(tableTheme.cellStyle) ?? {};
	const bodyStyles = Array.isArray(tableTheme.bodyStyles) ? tableTheme.bodyStyles.map(record$1).filter((item) => item !== void 0) : [];
	const body = row > 0 && row < rowCount - 1 && bodyStyles.length > 0 ? bodyStyles[(row - 1) % bodyStyles.length] ?? {} : {};
	const rowStyle = row === 0 ? record$1(tableTheme.firstRowStyle) ?? {} : row === rowCount - 1 ? record$1(tableTheme.lastRowStyle) ?? {} : body;
	const columnStyle = column === 0 ? record$1(tableTheme.firstColumnStyle) ?? {} : column === columnCount - 1 ? record$1(tableTheme.lastColumnStyle) ?? {} : {};
	return boolean(tableTheme.rowOverColumn) === false ? {
		...baseline,
		...rowStyle,
		...columnStyle,
		...cell
	} : {
		...baseline,
		...columnStyle,
		...rowStyle,
		...cell
	};
}
function tableBorder(project, value) {
	const none = {
		color: "FFFFFF",
		pt: 0
	};
	const one = (item) => {
		const parsed = border(project, item);
		return parsed === void 0 ? none : {
			color: parsed.color,
			pt: parsed.width,
			...parsed.dash === void 0 ? {} : { dash: parsed.dash }
		};
	};
	if (value === null) return [
		none,
		none,
		none,
		none
	];
	if (Array.isArray(value)) {
		if (value.length === 2) return [
			one(value[0]),
			one(value[1]),
			one(value[0]),
			one(value[1])
		];
		if (value.length === 4) return [
			one(value[0]),
			one(value[1]),
			one(value[2]),
			one(value[3])
		];
	}
	return record$1(value) === void 0 ? void 0 : one(value);
}
function renderTable(project, slide, element) {
	const rows = element.rows;
	const rowCount = rows.length;
	const columnCount = Array.isArray(element.columnWidths) ? element.columnWidths.length : rows[0]?.length ?? 0;
	const tableRows = rows.map((row, rowIndex) => row.map((rawCell, columnIndex) => {
		const cell = record$1(rawCell) ?? { text: typeof rawCell === "string" || typeof rawCell === "number" ? String(rawCell) : "" };
		const style = {
			...record$1(resolveThemeReference(cell.textStyle, themeMap(project, "textStyles"))) ?? {},
			...mergeCellStyle(project, element, rowIndex, columnIndex, rowCount, columnCount, cell)
		};
		const align = Array.isArray(style.align) ? style.align : [];
		const horizontal = horizontalAlign(align[0], "center");
		const vertical = verticalAlign(align[1], "middle");
		const fill = solidFill(project, style.fill);
		const cellBorder = tableBorder(project, style.border);
		const rowSpan = number(cell.rowSpan);
		const colSpan = number(cell.colSpan);
		const options = {
			fontFace: fontFace(style.fontFamily, "MiSans"),
			fontSize: number(style.fontSize) ?? 10,
			color: colorOptions(project, style.color).color,
			bold: boolean(style.bold) ?? false,
			italic: boolean(style.italic) ?? false,
			align: horizontal,
			valign: vertical,
			margin: .03,
			...rowSpan === void 0 ? {} : { rowspan: rowSpan },
			...colSpan === void 0 ? {} : { colspan: colSpan },
			...fill === void 0 ? {} : { fill },
			...cellBorder === void 0 ? {} : { border: cellBorder }
		};
		return {
			text: plainText(string(cell.text) ?? ""),
			options
		};
	}));
	const bounds = frame(element);
	const colRatios = Array.isArray(element.columnWidths) ? element.columnWidths.map(number).filter((item) => item !== void 0) : [];
	const rowRatios = Array.isArray(element.rowHeights) ? element.rowHeights.map(number).filter((item) => item !== void 0) : [];
	const colW = colRatios.length === columnCount ? colRatios.map((value) => value * bounds.w) : void 0;
	const rowH = rowRatios.length === rowCount ? rowRatios.map((value) => value * bounds.h) : void 0;
	const objectName = string(element.elementId);
	slide.addTable(tableRows, {
		...bounds,
		...objectName === void 0 ? {} : { objectName },
		autoPage: false,
		...colW === void 0 ? {} : { colW },
		...rowH === void 0 ? {} : { rowH },
		border: {
			color: "FFFFFF",
			pt: 0
		},
		margin: 0
	});
}
function legendPosition(value) {
	return {
		bottom: "b",
		left: "l",
		right: "r",
		top: "t",
		topRight: "tr"
	}[string(value) ?? ""] ?? "r";
}
function valueAxisOptions(project, axis) {
	const label = record$1(axis.label) ?? {};
	const grid = record$1(axis.gridLine);
	const minimum = number(axis.min);
	const maximum = number(axis.max);
	const fontSize = number(label.fontSize);
	const title = string(axis.title);
	return {
		...minimum === void 0 ? {} : { valAxisMinVal: minimum },
		...maximum === void 0 ? {} : { valAxisMaxVal: maximum },
		...fontSize === void 0 ? {} : { valAxisLabelFontSize: fontSize },
		...title === void 0 ? {} : {
			showValAxisTitle: true,
			valAxisTitle: title
		},
		...axis.gridLine === false ? { valGridLine: { style: "none" } } : grid === void 0 ? {} : { valGridLine: {
			color: colorOptions(project, grid.color, 1).color,
			style: dash(grid.style)
		} }
	};
}
function chartAxisOptions(project, element, horizontal = false) {
	const xAxis = Array.isArray(element.xAxis) ? record$1(element.xAxis[0]) ?? {} : record$1(element.xAxis) ?? {};
	const yAxis = (Array.isArray(element.yAxis) ? element.yAxis.map(record$1).filter((item) => item !== void 0) : [record$1(element.yAxis) ?? {}])[0] ?? {};
	const valueAxis = horizontal ? xAxis : yAxis;
	const categoryAxis = horizontal ? yAxis : xAxis;
	const categoryLabel = record$1(categoryAxis.label) ?? {};
	return {
		...valueAxisOptions(project, valueAxis),
		...number(categoryLabel.fontSize) === void 0 ? {} : { catAxisLabelFontSize: number(categoryLabel.fontSize) },
		...number(categoryLabel.rotate) === void 0 ? {} : { catAxisLabelRotate: number(categoryLabel.rotate) },
		...categoryAxis.gridLine === false ? { catGridLine: { style: "none" } } : {}
	};
}
function renderChart(project, pptx, slide, element, foregroundColor) {
	const data = record$1(element.data) ?? {};
	const columns = (Array.isArray(data.cols) ? data.cols : []).map((value) => String(value));
	const rows = Array.isArray(data.rows) ? data.rows : [];
	const columnIsNumeric = (column) => {
		if (column === void 0) return false;
		const columnIndex = columns.indexOf(column);
		if (columnIndex < 0) return false;
		const values = rows.map((row) => row[columnIndex]).filter((value) => value !== void 0 && value !== null && value !== "");
		return values.length > 0 && values.every((value) => {
			if (typeof value === "number") return Number.isFinite(value);
			return typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value));
		});
	};
	const seriesDefaults = record$1(element.seriesDefaults) ?? {};
	const xAxis = Array.isArray(element.xAxis) ? record$1(element.xAxis[0]) ?? {} : record$1(element.xAxis) ?? {};
	const yAxes = Array.isArray(element.yAxis) ? element.yAxis.map(record$1).filter((item) => item !== void 0) : [record$1(element.yAxis) ?? {}];
	const mergeSeries = (raw) => {
		const defaults = record$1(seriesDefaults[string(raw.type) ?? ""]) ?? {};
		const merged = {
			...defaults,
			...raw
		};
		for (const key of [
			"marker",
			"dataLabels",
			"border",
			"upBars",
			"downBars",
			"totalBars",
			"increaseBars",
			"decreaseBars"
		]) {
			const base = record$1(defaults[key]);
			const specific = record$1(raw[key]);
			if (base !== void 0 || specific !== void 0) merged[key] = {
				...base ?? {},
				...specific ?? {}
			};
		}
		return merged;
	};
	const series = (Array.isArray(element.series) ? element.series : []).map(record$1).filter((item) => item !== void 0).map(mergeSeries);
	const types = [];
	const mergeableGroups = /* @__PURE__ */ new Map();
	for (const [index, item] of series.entries()) {
		const encode = record$1(item.encode) ?? {};
		const chartTypeName = string(item.type) ?? "bar";
		const xColumn = string(encode.x);
		const yColumn = string(encode.y);
		const horizontal = chartTypeName === "bar" && columnIsNumeric(xColumn) && !columnIsNumeric(yColumn);
		const categoryColumn = string(chartTypeName === "pie" || chartTypeName === "radar" ? encode.category : horizontal ? encode.y : encode.x) ?? columns[0] ?? "category";
		const valueColumn = string(chartTypeName === "pie" ? encode.value : horizontal ? encode.x : encode.y) ?? columns[1] ?? "value";
		const categoryIndex = columns.indexOf(categoryColumn);
		const valueIndex = columns.indexOf(valueColumn);
		const selectedRows = (() => {
			const filter = record$1(item.dataFilter);
			const filterColumn = string(filter?.col);
			if (filterColumn === void 0) return rows;
			const filterIndex = columns.indexOf(filterColumn);
			return rows.filter((row) => row[filterIndex] === filter?.value);
		})();
		const filteredRows = horizontal ? [...selectedRows].reverse() : selectedRows;
		const filteredLabels = filteredRows.map((row) => {
			const value = row[categoryIndex];
			return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
		});
		const values = filteredRows.map((row) => Number(row[valueIndex] ?? 0));
		const type = chartTypeName === "line" ? pptx.ChartType.line : chartTypeName === "area" ? pptx.ChartType.area : chartTypeName === "scatter" ? pptx.ChartType.scatter : chartTypeName === "bubble" ? pptx.ChartType.bubble : chartTypeName === "radar" ? pptx.ChartType.radar : chartTypeName === "pie" && (number(item.innerRadius) ?? 0) > 0 ? pptx.ChartType.doughnut : chartTypeName === "pie" ? pptx.ChartType.pie : pptx.ChartType.bar;
		const chartColors = (resolvePptdChartSeriesColors(project, chartTypeName === "line" || chartTypeName === "area" || chartTypeName === "radar" ? item.lineColor ?? item.areaColor : item.fill) ?? [PPTD_CHART_SERIES_PALETTE[index % PPTD_CHART_SERIES_PALETTE.length] ?? "#2563EB"]).map((value) => colorOptions(project, value, 1).color);
		const labelsConfig = record$1(item.dataLabels);
		const showLabels = boolean(labelsConfig?.show) === true;
		const showPercent = labelsConfig?.content === "percentage";
		const dataLabelFontSize = number(labelsConfig?.fontSize);
		const dataLabelColor = labelsConfig?.color === void 0 ? foregroundColor : colorOptions(project, labelsConfig.color).color;
		const axisIndex = Math.max(0, Math.trunc(number(item.yAxisIndex) ?? 0));
		const valueAxis = horizontal ? xAxis : yAxes[axisIndex] ?? yAxes[0] ?? {};
		const valueAxisLabel = record$1(valueAxis.label) ?? {};
		const valueAxisGrid = record$1(valueAxis.gridLine);
		const valueAxisMin = number(valueAxis.min);
		const valueAxisMax = number(valueAxis.max);
		const valueAxisLabelFontSize = number(valueAxisLabel.fontSize);
		const valueAxisTitle = string(valueAxis.title);
		const groupOptions = {
			...horizontal ? { barDir: "bar" } : chartTypeName === "bar" ? { barDir: "col" } : {},
			...axisIndex === 1 ? { secondaryValAxis: true } : {},
			...valueAxisMin === void 0 ? {} : { valAxisMinVal: valueAxisMin },
			...valueAxisMax === void 0 ? {} : { valAxisMaxVal: valueAxisMax },
			...valueAxisLabelFontSize === void 0 ? {} : { valAxisLabelFontSize: valueAxisLabelFontSize },
			...valueAxisTitle === void 0 ? {} : {
				showValAxisTitle: true,
				valAxisTitle: valueAxisTitle
			},
			...valueAxis.gridLine === false ? { valGridLine: { style: "none" } } : valueAxisGrid === void 0 ? {} : { valGridLine: {
				color: colorOptions(project, valueAxisGrid.color, 1).color,
				style: dash(valueAxisGrid.style)
			} },
			...showLabels && !showPercent ? { showValue: true } : {},
			...showLabels && showPercent ? { showPercent: true } : {},
			dataLabelColor,
			...dataLabelFontSize === void 0 ? {} : {
				dataLabelFontSize,
				dataLabelPosition: "outEnd"
			},
			...chartTypeName === "line" ? {
				lineSize: number(item.width) ?? 2,
				lineDataSymbol: "circle"
			} : {},
			...chartTypeName === "area" ? { lineSize: number(item.width) ?? 2 } : {},
			...chartTypeName === "radar" ? { radarStyle: item.areaColor === void 0 ? "marker" : "filled" } : {},
			...(chartTypeName === "line" || chartTypeName === "area") && item.marker === false ? { lineDataSymbol: "none" } : {},
			...(chartTypeName === "line" || chartTypeName === "area") && record$1(item.marker) !== void 0 ? {
				lineDataSymbol: record$1(item.marker)?.shape === "rect" ? "square" : string(record$1(item.marker)?.shape) ?? "circle",
				lineDataSymbolSize: number(record$1(item.marker)?.size) ?? 6
			} : {},
			...item.stack === "percent" ? { barGrouping: "percentStacked" } : item.stack === "value" || item.stack === "stream" ? { barGrouping: "stacked" } : chartTypeName === "bar" ? { barGrouping: "clustered" } : {},
			...item.nullHandling === "gap" ? { displayBlanksAs: "gap" } : { displayBlanksAs: "span" },
			...type === pptx.ChartType.doughnut ? { holeSize: Math.round((number(item.innerRadius) ?? .5) * 100) } : {}
		};
		const dataSeries = {
			name: string(item.name) ?? valueColumn ?? `Series ${index + 1}`,
			labels: filteredLabels,
			values,
			...chartTypeName === "bubble" ? { sizes: filteredRows.map((row) => Number(row[columns.indexOf(string(encode.size) ?? "")] ?? 0)) } : {}
		};
		const mergeable = type !== pptx.ChartType.pie && type !== pptx.ChartType.doughnut;
		const groupKey = chartTypeName === "bar" ? `${type}:${horizontal ? "horizontal" : "vertical"}:${axisIndex}:${String(groupOptions.barGrouping)}` : `${type}:${JSON.stringify(groupOptions)}`;
		const existing = mergeable ? mergeableGroups.get(groupKey) : void 0;
		if (existing === void 0) {
			const chartGroup = {
				type,
				data: [dataSeries],
				options: {
					...groupOptions,
					chartColors
				}
			};
			types.push(chartGroup);
			if (mergeable) mergeableGroups.set(groupKey, chartGroup);
			continue;
		}
		existing.data.push(dataSeries);
		existing.options.chartColors = [...existing.options.chartColors ?? [], ...chartColors];
		if (groupOptions.showValue === true) existing.options.showValue = true;
		if (groupOptions.showPercent === true) existing.options.showPercent = true;
		if (existing.options.dataLabelFontSize === void 0 && groupOptions.dataLabelFontSize !== void 0) existing.options.dataLabelFontSize = groupOptions.dataLabelFontSize;
	}
	const legend = typeof element.legend === "boolean" ? { show: element.legend } : record$1(element.legend) ?? {};
	const font = fontFace(element.fontFamily, "MiSans");
	const objectName = string(element.elementId);
	const title = typeof element.title === "string" ? { text: element.title } : record$1(element.title) ?? {};
	const chartFill = solidFill(project, element.fill);
	const chartBorder = border(project, element.border);
	const legendFontSize = number(legend.fontSize);
	const titleFontSize = number(title.fontSize);
	const titleText = string(title.text);
	const barGap = number(element.barGap);
	const valAxes = series.some((item) => Math.trunc(number(item.yAxisIndex) ?? 0) === 1) ? [valueAxisOptions(project, yAxes[0] ?? {}), valueAxisOptions(project, yAxes[1] ?? {})] : void 0;
	const common = {
		...frame(element),
		...objectName === void 0 ? {} : { objectName },
		showLegend: boolean(legend.show) ?? series.some((item) => ![
			"waterfall",
			"heatmap",
			"treemap",
			"sunburst",
			"sankey"
		].includes(string(item.type) ?? "")),
		legendPos: legendPosition(legend.position),
		legendFontFace: fontFace(legend.fontFamily, font),
		legendColor: colorOptions(project, legend.color ?? `#${foregroundColor}`).color,
		...legendFontSize === void 0 ? {} : { legendFontSize },
		catAxisLabelFontFace: font,
		catAxisLabelColor: foregroundColor,
		catAxisLineColor: foregroundColor,
		valAxisLabelFontFace: font,
		valAxisLabelColor: foregroundColor,
		valAxisLineColor: foregroundColor,
		showTitle: titleText !== void 0,
		...titleText === void 0 ? {} : { title: titleText },
		titleFontFace: fontFace(title.fontFamily, font),
		titleColor: colorOptions(project, title.color ?? `#${foregroundColor}`).color,
		...titleFontSize === void 0 ? {} : { titleFontSize },
		showValue: false,
		chartArea: {
			border: chartBorder === void 0 ? {
				color: "FFFFFF",
				pt: 0
			} : {
				color: chartBorder.color,
				pt: chartBorder.width
			},
			fill: chartFill ?? {
				color: "FFFFFF",
				transparency: 100
			}
		},
		plotArea: {
			border: {
				color: "FFFFFF",
				pt: 0
			},
			fill: {
				color: "FFFFFF",
				transparency: 100
			}
		},
		...barGap === void 0 ? {} : { barGapWidthPct: Math.round(barGap * 100) },
		...valAxes === void 0 ? {} : { valAxes },
		...chartAxisOptions(project, element, series.some((item) => {
			const encode = record$1(item.encode) ?? {};
			return string(item.type) === "bar" && columnIsNumeric(string(encode.x)) && !columnIsNumeric(string(encode.y));
		}))
	};
	slide.addChart(types, common);
}
function renderIcon(project, slide, element) {
	const color = colorOptions(project, element.color).color;
	const objectName = string(element.elementId);
	slide.addText(string(element.iconName) ?? "●", {
		...frame(element),
		...objectName === void 0 ? {} : { objectName },
		fontFace: "Arial",
		fontSize: 18,
		color,
		margin: 0,
		align: "center",
		valign: "middle",
		fit: "shrink"
	});
}
function renderElement(project, pptx, slide, element, foregroundColor) {
	if (element.elementType === "text") {
		renderText(project, slide, element);
		return;
	}
	if (element.elementType === "shape") {
		renderShape(project, pptx, slide, element);
		return;
	}
	if (element.elementType === "line") {
		renderLine(project, pptx, slide, element);
		return;
	}
	if (element.elementType === "image") {
		renderImage(project, slide, element);
		return;
	}
	if (element.elementType === "table") {
		renderTable(project, slide, element);
		return;
	}
	if (element.elementType === "chart") {
		renderChart(project, pptx, slide, element, foregroundColor);
		return;
	}
	if (element.elementType === "icon") {
		renderIcon(project, slide, element);
		return;
	}
}
/** Render one checked PPTD AST to editable native PowerPoint objects. */
async function renderPptdProject(project) {
	const check = checkPptdProject(project);
	if (check.status === "fail") {
		const details = check.issues.filter((issue) => issue.severity === "error").slice(0, 3).map((issue) => `${issue.code}${issue.elementId === void 0 ? "" : `(${issue.elementId})`}: ${issue.message}`).join("; ");
		throw new Error(`PPTD rendering requires a passing check; received ${check.errorCount} errors${details === "" ? "" : `: ${details}`}`);
	}
	const pptx = new PptxGenJS();
	const layoutName = `DSH_PPTD_${project.width}x${project.height}`;
	pptx.defineLayout({
		name: layoutName,
		width: inches(project.width),
		height: inches(project.height)
	});
	pptx.layout = layoutName;
	pptx.author = "DSH PPTD";
	pptx.company = "DeepSeek Harness";
	pptx.subject = "Local PPTD v2 editable rendering";
	pptx.title = project.title;
	const textStyles = themeMap(project, "textStyles");
	const titleStyle = record$1(textStyles.title) ?? {};
	const bodyStyle = record$1(textStyles.body) ?? {};
	pptx.theme = {
		headFontFace: fontFace(titleStyle.fontFamily, "MiSans"),
		bodyFontFace: fontFace(bodyStyle.fontFamily, "MiSans")
	};
	for (const page of project.pages) {
		const slide = pptx.addSlide();
		const background = solidFill(project, page.background);
		slide.background = background ?? { color: "FFFFFF" };
		const foregroundColor = readableForeground(background?.color ?? "FFFFFF");
		for (const element of page.elements) renderElement(project, pptx, slide, element, foregroundColor);
		if (page.notes.trim() !== "") slide.addNotes(page.notes);
	}
	const output = await pptx.write({
		outputType: "nodebuffer",
		compression: true
	});
	return {
		bytes: new Uint8Array(output),
		nativeObjectCount: check.nativeObjectCount,
		check
	};
}
function mediaType(file, bytes) {
	const extension = path.extname(file).toLowerCase();
	if (extension === ".png" && bytes[0] === 137 && bytes[1] === 80) return "image/png";
	if ((extension === ".jpg" || extension === ".jpeg") && bytes[0] === 255 && bytes[1] === 216) return "image/jpeg";
	if (extension === ".gif" && Buffer.from(bytes.subarray(0, 3)).toString("ascii") === "GIF") return "image/gif";
	if (extension === ".webp" && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP") return "image/webp";
	if (extension === ".svg" && Buffer.from(bytes.subarray(0, 512)).toString("utf8").includes("<svg")) return "image/svg+xml";
}
async function confinedFile(root, relative, maximumBytes) {
	const safe = safeProjectPath(relative);
	if (safe === void 0) throw new Error(`PPTD path is not project-relative: ${relative}`);
	const target = await realpath(path.join(root, ...safe.split("/")));
	if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error(`PPTD path escapes the project root: ${relative}`);
	const metadata = await lstat(target);
	if (!metadata.isFile() || metadata.size > maximumBytes) throw new Error(`PPTD file is invalid or too large: ${relative}`);
	return {
		real: target,
		bytes: await readFile(target)
	};
}
/** Resolve a PPTD entry file from either the entry itself or its project directory. */
async function resolvePptdEntry(inputPath) {
	const input = await realpath(path.resolve(inputPath));
	const metadata = await lstat(input);
	if (metadata.isFile()) {
		if (!input.endsWith(".pptd")) throw new Error("PPTD entry must use the .pptd extension");
		return input;
	}
	if (!metadata.isDirectory()) throw new Error("PPTD input must be an entry file or project directory");
	const entries = (await readdir(input, { withFileTypes: true })).filter((entry) => entry.isFile() && entry.name.endsWith(".pptd")).map((entry) => entry.name).sort();
	if (entries.length !== 1) throw new Error(`PPTD project directory must contain exactly one .pptd entry; found ${entries.length}`);
	const entry = entries.at(0);
	if (entry === void 0) throw new Error("PPTD project directory must contain one .pptd entry");
	return path.join(input, entry);
}
/** Load a confined local PPTD project. Network resources stay disabled. */
async function loadPptdProject(entryPath) {
	const entry = await resolvePptdEntry(entryPath);
	const metadata = await lstat(entry);
	if (!metadata.isFile() || metadata.size > MAX_MANIFEST_BYTES) throw new Error("PPTD entry is invalid or too large");
	const root = path.dirname(entry);
	const manifest = await readFile(entry, "utf8");
	const raw = parseYaml(manifest, path.basename(entry), []);
	if (raw === void 0) return parsePptdProject({
		entryName: path.basename(entry),
		manifest,
		pages: /* @__PURE__ */ new Map(),
		assets: /* @__PURE__ */ new Map()
	});
	const refs = Array.isArray(raw.pages) ? raw.pages.slice(0, MAX_PAGES) : [];
	const pages = /* @__PURE__ */ new Map();
	const loadIssues = [];
	for (const rawRef of refs) {
		const ref = typeof rawRef === "string" ? safeProjectPath(rawRef) : void 0;
		if (ref === void 0) continue;
		try {
			const file = await confinedFile(root, ref, MAX_PAGE_BYTES);
			pages.set(ref, Buffer.from(file.bytes).toString("utf8"));
		} catch (error) {
			loadIssues.push({
				code: "file-read",
				severity: "error",
				file: ref,
				message: `无法读取页面文件 ${ref}：${error instanceof Error ? error.message : String(error)}`
			});
		}
	}
	const partial = parsePptdProject({
		entryName: path.basename(entry),
		manifest,
		pages,
		assets: /* @__PURE__ */ new Map(),
		issues: loadIssues
	});
	const refsToLoad = /* @__PURE__ */ new Set();
	for (const page of partial.pages) for (const element of page.elements) if (element.elementType === "image") {
		const ref = localAssetPath(element.src);
		if (ref !== void 0) refsToLoad.add(ref);
	}
	const assets = /* @__PURE__ */ new Map();
	let totalBytes = 0;
	for (const ref of refsToLoad) {
		let file;
		try {
			file = await confinedFile(root, ref, MAX_ASSET_BYTES);
		} catch (error) {
			loadIssues.push({
				code: "file-read",
				severity: "error",
				file: ref,
				message: `无法读取资源 ${ref}：${error instanceof Error ? error.message : String(error)}`
			});
			continue;
		}
		totalBytes += file.bytes.byteLength;
		if (totalBytes > MAX_TOTAL_ASSET_BYTES) throw new Error("PPTD image resources exceed the aggregate byte limit");
		const type = mediaType(ref, file.bytes);
		if (type === void 0) {
			loadIssues.push({
				code: "invalid-resource",
				severity: "error",
				file: ref,
				message: `图片资源格式或内容无效：${ref}`
			});
			continue;
		}
		assets.set(ref, {
			path: ref,
			mediaType: type,
			bytes: file.bytes,
			sha256: createHash("sha256").update(file.bytes).digest("hex")
		});
	}
	return parsePptdProject({
		entryName: path.basename(entry),
		manifest,
		pages,
		assets,
		issues: loadIssues
	});
}
//#endregion
//#region src/pptd-repair.ts
/** Deterministic, explicitly requested PPTD source repairs for `check --level auto`. */
const ELEMENT_TYPES = new Set([
	"text",
	"shape",
	"line",
	"image",
	"icon",
	"table",
	"chart"
]);
const MANIFEST_FIELDS = new Set([
	"version",
	"title",
	"size",
	"theme",
	"pages"
]);
const PAGE_FIELDS = new Set([
	"pageType",
	"background",
	"notes",
	"elements"
]);
const BASE_FIELDS = [
	"elementId",
	"elementType",
	"bounds"
];
const ELEMENT_FIELDS = {
	text: new Set([
		...BASE_FIELDS,
		"rotation",
		"opacity",
		"flip",
		"content"
	]),
	shape: new Set([
		...BASE_FIELDS,
		"rotation",
		"opacity",
		"flip",
		"shapeName",
		"adjustments",
		"viewBox",
		"path",
		"fill",
		"border",
		"shadow"
	]),
	line: new Set([
		...BASE_FIELDS,
		"rotation",
		"opacity",
		"flip",
		"viewBox",
		"points",
		"curve",
		"arrow",
		"border",
		"shadow"
	]),
	image: new Set([
		...BASE_FIELDS,
		"rotation",
		"opacity",
		"flip",
		"src",
		"cropShape",
		"fit",
		"crop",
		"border",
		"shadow"
	]),
	icon: new Set([
		...BASE_FIELDS,
		"rotation",
		"opacity",
		"flip",
		"iconName",
		"fill",
		"border",
		"shadow"
	]),
	table: new Set([
		...BASE_FIELDS,
		"columnWidths",
		"rowHeights",
		"rows",
		"style",
		"fill",
		"shadow"
	]),
	chart: new Set([
		...BASE_FIELDS,
		"data",
		"series",
		"seriesDefaults",
		"xAxis",
		"yAxis",
		"barWidth",
		"barGap",
		"categoryGap",
		"spokeAxis",
		"title",
		"legend",
		"dataLabels",
		"fontFamily",
		"fill",
		"border",
		"shadow"
	])
};
function record(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function action(actions, file, element, kind, field, message) {
	const elementId = typeof element?.elementId === "string" ? element.elementId : void 0;
	actions.push({
		file,
		...elementId === void 0 ? {} : { elementId },
		kind,
		field,
		message
	});
}
function finiteNumber(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
}
function booleanValue(value) {
	if (typeof value === "boolean") return value;
	if (value === "true") return true;
	if (value === "false") return false;
}
function normalizeNumber(owner, field, actions, file, element, range) {
	if (!(field in owner)) return;
	const before = owner[field];
	const converted = finiteNumber(before);
	if (converted !== void 0 && (range === void 0 || range(converted))) {
		if (before !== converted) {
			owner[field] = converted;
			action(actions, file, element, "convert-type", field, `${field} 已转换为数字。`);
		}
		return;
	}
	Reflect.deleteProperty(owner, field);
	action(actions, file, element, "delete-optional-field", field, `${field} 不是有效的可选数字，已删除。`);
}
function normalizeBoolean(owner, field, actions, file, element) {
	if (!(field in owner)) return;
	const before = owner[field];
	const converted = booleanValue(before);
	if (converted !== void 0) {
		if (before !== converted) {
			owner[field] = converted;
			action(actions, file, element, "convert-type", field, `${field} 已转换为布尔值。`);
		}
		return;
	}
	Reflect.deleteProperty(owner, field);
	action(actions, file, element, "delete-optional-field", field, `${field} 不是有效的可选布尔值，已删除。`);
}
function normalizeTuple(owner, field, size, actions, file, element, required) {
	const before = owner[field];
	if (!Array.isArray(before) || before.length !== size) {
		if (!required && field in owner) {
			Reflect.deleteProperty(owner, field);
			action(actions, file, element, "delete-optional-field", field, `${field} 不是长度为 ${size} 的数字数组，已删除。`);
		}
		return false;
	}
	const converted = before.map(finiteNumber);
	if (converted.some((value) => value === void 0)) {
		if (!required) {
			Reflect.deleteProperty(owner, field);
			action(actions, file, element, "delete-optional-field", field, `${field} 包含无效数字，已删除。`);
		}
		return false;
	}
	if (before.some((value, index) => value !== converted[index])) {
		owner[field] = converted;
		action(actions, file, element, "convert-type", field, `${field} 中的数字字符串已转换。`);
	}
	return true;
}
function normalizeBooleanTuple(owner, field, size, actions, file, element) {
	const before = owner[field];
	if (!(field in owner)) return;
	if (!Array.isArray(before) || before.length !== size) {
		Reflect.deleteProperty(owner, field);
		action(actions, file, element, "delete-optional-field", field, `${field} 不是长度为 ${size} 的布尔数组，已删除。`);
		return;
	}
	const converted = before.map(booleanValue);
	if (converted.some((value) => value === void 0)) {
		Reflect.deleteProperty(owner, field);
		action(actions, file, element, "delete-optional-field", field, `${field} 包含无效布尔值，已删除。`);
		return;
	}
	if (before.some((value, index) => value !== converted[index])) {
		owner[field] = converted;
		action(actions, file, element, "convert-type", field, `${field} 中的布尔字符串已转换。`);
	}
}
function normalizeCrop(owner, actions, file, element) {
	if (!("crop" in owner)) return;
	const crop = record(owner.crop);
	if (crop === void 0) {
		Reflect.deleteProperty(owner, "crop");
		action(actions, file, element, "delete-optional-field", "crop", "crop 不是裁剪对象，已删除。");
		return;
	}
	for (const field of [
		"left",
		"top",
		"right",
		"bottom"
	]) normalizeNumber(crop, field, actions, file, element);
}
function normalizeString(owner, field, actions, file, element) {
	const before = owner[field];
	if (typeof before === "string") return true;
	if (typeof before === "number" || typeof before === "boolean") {
		owner[field] = String(before);
		action(actions, file, element, "convert-type", field, `${field} 已转换为字符串。`);
		return true;
	}
	return false;
}
function normalizeStyle(style, actions, file, element) {
	for (const field of [
		"fontSize",
		"lineHeight",
		"letterSpacing",
		"paragraphSpacing",
		"opacity"
	]) normalizeNumber(style, field, actions, file, element, field === "opacity" ? (value) => value >= 0 && value <= 1 : (value) => value >= 0);
	for (const field of [
		"bold",
		"italic",
		"wrap",
		"strike"
	]) normalizeBoolean(style, field, actions, file, element);
}
function normalizeElement(element, actions, file) {
	if (!normalizeString(element, "elementId", actions, file, element) || String(element.elementId).trim() === "") return false;
	if (typeof element.elementType !== "string" || !ELEMENT_TYPES.has(element.elementType)) return false;
	const allowed = ELEMENT_FIELDS[element.elementType];
	if (allowed !== void 0) for (const field of Object.keys(element)) {
		if (allowed.has(field)) continue;
		Reflect.deleteProperty(element, field);
		action(actions, file, element, "delete-optional-field", field, `未知字段 ${field} 已删除。`);
	}
	if (!normalizeTuple(element, "bounds", 4, actions, file, element, true)) return false;
	const bounds = element.bounds;
	if ((bounds[2] ?? -1) < 0 || (bounds[3] ?? -1) < 0) return false;
	for (const field of ["rotation", "opacity"]) normalizeNumber(element, field, actions, file, element, field === "opacity" ? (value) => value >= 0 && value <= 1 : void 0);
	normalizeBooleanTuple(element, "flip", 2, actions, file, element);
	normalizeCrop(element, actions, file, element);
	const type = element.elementType;
	if (type === "text") {
		const content = record(element.content);
		if (content === void 0 || !normalizeString(content, "text", actions, file, element)) return false;
		normalizeStyle(content, actions, file, element);
	}
	if (type === "shape") {
		if (typeof element.shapeName !== "string") return false;
		if (element.shapeName === "custom" && (!normalizeTuple(element, "viewBox", 2, actions, file, element, true) || typeof element.path !== "string")) return false;
	}
	if (type === "line") {
		if (!normalizeTuple(element, "viewBox", 2, actions, file, element, true) || typeof element.points !== "string") return false;
	}
	if (type === "image" && typeof element.src !== "string") return false;
	if (type === "icon" && typeof element.iconName !== "string") return false;
	if (type === "table") {
		if (!Array.isArray(element.rows) || !Array.isArray(element.columnWidths) || !Array.isArray(element.rowHeights)) return false;
		const normalizeRatios = (field) => {
			const values = element[field].map(finiteNumber);
			if (values.length === 0 || values.some((value) => value === void 0 || value < 0 || value > 1)) return false;
			const numeric = values;
			const sum = numeric.reduce((total, value) => total + value, 0);
			if (sum <= 0) return false;
			const normalized = Math.abs(sum - 1) < 1e-9 ? numeric : numeric.map((value) => value / sum);
			const output = Math.abs(sum - 1) < 1e-9 ? normalized : normalized.map((value, index) => index === normalized.length - 1 ? 1 - normalized.slice(0, -1).reduce((total, item) => total + item, 0) : value);
			if (element[field].some((value, index) => value !== output[index])) {
				element[field] = output;
				action(actions, file, element, "convert-type", field, `${field} 已转换为总和为 1 的数字比例。`);
			}
			return true;
		};
		if (!normalizeRatios("columnWidths") || !normalizeRatios("rowHeights")) return false;
	}
	if (type === "chart") {
		const data = record(element.data);
		if (data === void 0 || !Array.isArray(data.cols) || !Array.isArray(data.rows) || !Array.isArray(element.series)) return false;
	}
	return true;
}
function parseYamlObject(content, file) {
	const object = record(yaml.load(content, {
		schema: yaml.JSON_SCHEMA,
		json: true
	}));
	if (object === void 0) throw new Error(`${file} YAML root must be an object before auto repair`);
	return object;
}
function dumpYaml(value) {
	return yaml.dump(value, {
		schema: yaml.JSON_SCHEMA,
		noRefs: true,
		lineWidth: -1,
		sortKeys: false
	});
}
async function writeTextAtomic(target, content) {
	await mkdir(path.dirname(target), { recursive: true });
	const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`);
	const handle = await open(temporary, "wx", 384);
	try {
		await handle.writeFile(content, "utf8");
		await handle.sync();
	} finally {
		await handle.close();
	}
	try {
		await rename(temporary, target);
	} finally {
		await rm(temporary, { force: true });
	}
}
/** Apply bounded deterministic repairs to the selected source pages and recheck the project. */
async function repairPptdProject(inputPath, selectedPages) {
	const entry = await resolvePptdEntry(inputPath);
	const root = path.dirname(entry);
	const entryName = path.basename(entry);
	const actions = [];
	const changed = /* @__PURE__ */ new Map();
	const manifestContent = await readFile(entry, "utf8");
	const manifest = parseYamlObject(manifestContent, entryName);
	const manifestActionStart = actions.length;
	for (const field of Object.keys(manifest)) {
		if (MANIFEST_FIELDS.has(field)) continue;
		Reflect.deleteProperty(manifest, field);
		action(actions, entryName, void 0, "delete-optional-field", field, `未知字段 ${field} 已删除。`);
	}
	normalizeString(manifest, "title", actions, entryName);
	normalizeTuple(manifest, "size", 2, actions, entryName, void 0, false);
	const textStyles = record(record(manifest.theme)?.textStyles);
	if (textStyles !== void 0) {
		const styles = Object.values(textStyles).map(record).filter((value) => value !== void 0);
		for (const style of styles) normalizeStyle(style, actions, entryName);
	}
	const repairedManifest = dumpYaml(manifest);
	if (actions.length > manifestActionStart && repairedManifest !== manifestContent) changed.set(entry, repairedManifest);
	const pageRefs = Array.isArray(manifest.pages) ? manifest.pages : [];
	for (const [index, rawRef] of pageRefs.entries()) {
		if (selectedPages !== void 0 && !selectedPages.has(index + 1)) continue;
		if (typeof rawRef !== "string" || path.isAbsolute(rawRef) || rawRef.includes("\\") || rawRef.startsWith("../")) continue;
		const target = path.join(root, ...path.posix.normalize(rawRef).split("/"));
		let content;
		try {
			content = await readFile(target, "utf8");
		} catch {
			continue;
		}
		const page = parseYamlObject(content, rawRef);
		const pageActionStart = actions.length;
		for (const field of Object.keys(page)) {
			if (PAGE_FIELDS.has(field)) continue;
			Reflect.deleteProperty(page, field);
			action(actions, rawRef, void 0, "delete-optional-field", field, `未知字段 ${field} 已删除。`);
		}
		if (normalizeString(page, "notes", actions, rawRef) === false && page.notes !== void 0) {
			Reflect.deleteProperty(page, "notes");
			action(actions, rawRef, void 0, "delete-optional-field", "notes", "notes 不是可转换的字符串，已删除。");
		}
		const elements = Array.isArray(page.elements) ? page.elements : [];
		const repairedElements = [];
		for (const [elementIndex, rawElement] of elements.entries()) {
			const element = record(rawElement);
			if (element !== void 0 && normalizeElement(element, actions, rawRef)) repairedElements.push(element);
			else action(actions, rawRef, element, "delete-invalid-element", `elements[${elementIndex}]`, "元素缺少无法安全修复的必填结构，已删除。");
		}
		page.elements = repairedElements;
		const repaired = dumpYaml(page);
		if (actions.length > pageActionStart && repaired !== content) changed.set(target, repaired);
	}
	for (const [target, content] of changed) await writeTextAtomic(target, content);
	const project = await loadPptdProject(entry);
	return {
		changedFiles: [...changed.keys()].map((target) => path.relative(root, target) || entryName),
		actions,
		check: checkPptdProject(project)
	};
}
//#endregion
//#region src/bin.ts
/** Local, bounded command line interface for the local PPTD v2 toolchain. */
const MAX_PPTX_BYTES = 512 * 1024 * 1024;
function usage() {
	return [
		"Usage:",
		"  dsh-pptd convert <deck.pptx> [-o <project-directory>] [--strict] [--force] [--json]",
		"  dsh-pptd check <project-directory|deck.pptd> [-p <pages>] [-s <severity>] [--level keep|auto] [--json]",
		"  dsh-pptd inspect <project-directory|deck.pptd> [-p <pages>] [--json]",
		"  dsh-pptd screenshot <project-directory|deck.pptd> [-p <pages>] [-o <directory>] [--scale <number>] [--force] [--json]",
		"  dsh-pptd render <project-directory|deck.pptd> [-p <pages>] [-o <deck.pptx>] [--strict] [--force] [--json]",
		"  dsh-pptd package <project-directory|deck.pptd> [...render options]",
		"  dsh-pptd export <project-directory|deck.pptd> [...render options]",
		"",
		"Page specs are 1-based and support 3, 1,3,5, and 2-10.",
		"Severity specs support all, error, warning, one issue code, or comma-separated issue codes.",
		"Strict conversion refuses to publish a PPTD project when any source feature is normalized or unsupported.",
		"PPTD and local resources stay confined to the project directory. Network resources are disabled."
	].join("\n");
}
function optionValue(argv, index, name) {
	const value = argv[index + 1];
	if (value === void 0 || value.startsWith("-")) throw new Error(`${name} requires a value`);
	return value;
}
function parseArgs(argv) {
	const positional = [];
	let output;
	let page;
	let severity = "all";
	let level = "keep";
	let scale = 2;
	let json = false;
	let force = false;
	let strict = false;
	let help = false;
	let version = false;
	for (let index = 0; index < argv.length; index += 1) {
		const value = argv[index];
		if (value === void 0) continue;
		if (value === "--json") {
			json = true;
			continue;
		}
		if (value === "--force") {
			force = true;
			continue;
		}
		if (value === "--strict") {
			strict = true;
			continue;
		}
		if (value === "--help" || value === "-h") {
			help = true;
			continue;
		}
		if (value === "--version" || value === "-v") {
			version = true;
			continue;
		}
		if (value === "--output" || value === "-o") {
			output = optionValue(argv, index, value);
			index += 1;
			continue;
		}
		if (value === "--page" || value === "-p") {
			page = optionValue(argv, index, value);
			index += 1;
			continue;
		}
		if (value === "--severity" || value === "-s") {
			const selectors = optionValue(argv, index, value).split(",").map((item) => item.trim());
			if (selectors.some((item) => item === "" || !/^[a-z][a-z0-9_-]*$/iu.test(item))) throw new Error("--severity must contain all, error, warning, or comma-separated issue codes");
			severity = selectors.join(",");
			index += 1;
			continue;
		}
		if (value === "--level") {
			const raw = optionValue(argv, index, value);
			if (raw !== "keep" && raw !== "auto") throw new Error("--level must be keep or auto");
			level = raw;
			index += 1;
			continue;
		}
		if (value === "--scale") {
			const raw = optionValue(argv, index, value);
			scale = Number(raw);
			if (!Number.isFinite(scale) || scale <= 0 || scale > 8) throw new Error("--scale must be greater than 0 and at most 8");
			index += 1;
			continue;
		}
		if (value.startsWith("-")) throw new Error(`Unknown option: ${value}`);
		positional.push(value);
	}
	if (positional.length > 2) throw new Error(`Unexpected argument: ${positional[2]}`);
	return {
		...positional[0] === void 0 ? {} : { command: positional[0] },
		...positional[1] === void 0 ? {} : { input: positional[1] },
		...output === void 0 ? {} : { output },
		...page === void 0 ? {} : { page },
		severity,
		level,
		scale,
		json,
		force,
		strict,
		help,
		version
	};
}
async function packageVersion() {
	const content = await readFile(new URL("../package.json", import.meta.url), "utf8");
	const parsed = JSON.parse(content);
	if (typeof parsed.version !== "string") throw new Error("package.json does not declare a version");
	return parsed.version;
}
function writeLine(stream, value) {
	stream.write(`${value}\n`);
}
function printValue(io, value, _json) {
	if (typeof value === "string") writeLine(io.stdout, value);
	else writeLine(io.stdout, JSON.stringify(value, null, 2));
}
function pageNumbers(spec, count) {
	if (count < 1) return [];
	if (spec === void 0) return Array.from({ length: count }, (_value, index) => index + 1);
	const selected = /* @__PURE__ */ new Set();
	for (const rawPart of spec.split(",")) {
		const part = rawPart.trim();
		if (/^\d+$/u.test(part)) {
			selected.add(Number(part));
			continue;
		}
		const range = /^(\d+)-(\d+)$/u.exec(part);
		if (range === null) throw new Error(`Invalid page spec: ${part}`);
		const start = Number(range[1]);
		const end = Number(range[2]);
		if (start > end) throw new Error(`Invalid descending page range: ${part}`);
		for (let value = start; value <= end; value += 1) selected.add(value);
	}
	const values = [...selected].sort((left, right) => left - right);
	const invalid = values.find((value) => !Number.isInteger(value) || value < 1 || value > count);
	if (invalid !== void 0) throw new Error(`Page ${invalid} is outside the available range 1-${count}`);
	if (values.length === 0) throw new Error("Page spec selects no pages");
	return values;
}
function selectedProject(project, pages) {
	if (pages.length === project.pages.length && pages.every((page, index) => page === index + 1)) return project;
	const selected = new Set(pages);
	return {
		...project,
		pages: pages.flatMap((page) => {
			const selectedPage = project.pages[page - 1];
			return selectedPage === void 0 ? [] : [selectedPage];
		}),
		parseIssues: project.parseIssues.filter((issue) => issue.page === void 0 || selected.has(issue.page))
	};
}
function issueMatchesSeverity(issue, severity) {
	const selectors = severity.split(",").map((value) => value.trim().toLowerCase());
	if (selectors.includes("all")) return true;
	return selectors.some((selector) => selector === issue.severity || selector === issue.code.toLowerCase());
}
function checkedForPages(project, pages, severity) {
	const subset = selectedProject(project, pages);
	const raw = checkPptdProject(subset);
	const issues = raw.issues.map((issue) => {
		if (issue.page === void 0 || subset === project) return issue;
		const originalPage = pages[issue.page - 1];
		return originalPage === void 0 ? issue : {
			...issue,
			page: originalPage
		};
	});
	const displayedIssues = issues.filter((issue) => issueMatchesSeverity(issue, severity));
	return {
		...raw,
		issues,
		displayedIssues
	};
}
function humanCheck(checked) {
	const lines = (checked.displayedIssues ?? checked.issues).map((issue) => [
		"[fixed: false]",
		`[${issue.severity === "error" ? "Needs revision" : "Suggestion"}:${issue.code}]`,
		issue.file ?? "",
		issue.page === void 0 ? "" : `page=${issue.page}`,
		issue.elementId === void 0 ? "" : `id="${issue.elementId}"`,
		issue.message
	].filter(Boolean).join(" "));
	lines.push(`${checked.status.toUpperCase()}: ${checked.errorCount} error(s), ${checked.warningCount} warning(s), ${checked.pageCount} page(s)`);
	return lines.join("\n");
}
function humanRepairs(actions) {
	return actions.map((item) => [
		"[fixed: true]",
		`[Repair:${item.kind}]`,
		item.file,
		item.elementId === void 0 ? "" : `id="${item.elementId}"`,
		item.message
	].filter(Boolean).join(" ")).join("\n");
}
function inspectProject(project, pages, checked) {
	const elementTypes = {};
	const resources = {
		assets: project.source.assets.size,
		bytes: 0
	};
	for (const asset of project.source.assets.values()) resources.bytes += asset.bytes.byteLength;
	for (const pageNumber of pages) {
		const page = project.pages[pageNumber - 1];
		if (page === void 0) continue;
		for (const element of page.elements) {
			const type = typeof element.elementType === "string" ? element.elementType : "unknown";
			elementTypes[type] = (elementTypes[type] ?? 0) + 1;
		}
	}
	return {
		title: project.title,
		size: [project.width, project.height],
		selectedPages: pages,
		elementTypes,
		resources,
		compatibility: checked.compatibility,
		check: checked
	};
}
function defaultConvertOutput(input) {
	const resolved = path.resolve(input);
	return path.join(path.dirname(resolved), path.basename(resolved, path.extname(resolved)));
}
async function projectRoot(input) {
	const entry = await resolvePptdEntry(input);
	return {
		entry,
		root: path.dirname(entry)
	};
}
async function defaultScreenshotOutput(input) {
	const { root } = await projectRoot(input);
	return path.join(path.dirname(root), `${path.basename(root)}-screenshots`);
}
async function defaultRenderOutput(input) {
	const { entry, root } = await projectRoot(input);
	return (await lstat(path.resolve(input))).isDirectory() ? path.join(path.dirname(root), `${path.basename(root)}.pptx`) : path.join(root, `${path.basename(entry, ".pptd")}.pptx`);
}
async function commandConvert(args, io) {
	const input = path.resolve(args.input);
	const metadata = await lstat(input);
	if (!metadata.isFile() || path.extname(input).toLowerCase() !== ".pptx") throw new Error("convert input must be a .pptx file");
	if (metadata.size > MAX_PPTX_BYTES) throw new Error(`PPTX exceeds the ${MAX_PPTX_BYTES} byte limit`);
	const converted = await convertPptxToPptd(await readFile(input), path.basename(input));
	const normalizedCount = converted.diagnostics.filter((item) => item.level === "normalized").length;
	const unsupportedCount = converted.diagnostics.filter((item) => item.level === "unsupported").length;
	if (args.strict && converted.diagnostics.length > 0) throw new Error(`strict conversion requires lossless coverage; received ${normalizedCount} normalized and ${unsupportedCount} unsupported diagnostic(s)`);
	const output = path.resolve(args.output ?? defaultConvertOutput(input));
	await publishPptdDirectory(output, args.force, (stage) => writePptdProjectSource(stage, converted.source));
	printValue(io, {
		status: converted.diagnostics.length > 0 ? "warning" : "pass",
		input,
		output,
		slideCount: converted.slideCount,
		sourceNodeCount: converted.sourceNodeCount,
		outputElementCount: converted.outputElementCount,
		extractedAssetCount: converted.extractedAssetCount,
		normalizedCount,
		unsupportedCount,
		diagnostics: converted.diagnostics
	}, args.json);
	return 0;
}
async function commandPptd(args, io) {
	if (args.level === "auto" && args.command !== "check") throw new Error("--level auto is supported only by check");
	let project = await loadPptdProject(args.input);
	const pages = pageNumbers(args.page, project.pages.length);
	const repaired = args.level === "auto" ? await repairPptdProject(args.input, new Set(pages)) : void 0;
	if (repaired !== void 0) project = await loadPptdProject(args.input);
	const checked = checkedForPages(project, pages, args.severity);
	if (args.command === "check") {
		printValue(io, args.json ? {
			...checked,
			repair: repaired === void 0 ? void 0 : {
				changedFiles: repaired.changedFiles,
				actions: repaired.actions
			}
		} : [repaired === void 0 ? "" : humanRepairs(repaired.actions), humanCheck(checked)].filter(Boolean).join("\n"), args.json);
		return checked.status === "fail" ? 1 : 0;
	}
	if (args.command === "inspect") {
		printValue(io, inspectProject(project, pages, checked), args.json);
		return checked.status === "fail" ? 1 : 0;
	}
	if (checked.status === "fail" || args.strict && checked.status !== "pass") {
		printValue(io, { ...checked, exported: false, status: "needs_revision" }, args.json,
			"No output produced; validation needs revision.\n" + humanCheck(checked));
		return 1;
	}
	if (args.command === "screenshot") {
		const output = path.resolve(args.output ?? await defaultScreenshotOutput(args.input));
		await publishPptdDirectory(output, args.force, async (stage) => {
			await mkdir(path.join(stage, "pages"), {
				recursive: true,
				mode: 448
			});
			const manifest = [];
			for (const page of pages) {
				const bytes = await renderPptdPagePng(project, page - 1, args.scale);
				const file = `pages/page-${page}.png`;
				await writeFile(path.join(stage, ...file.split("/")), bytes, { mode: 384 });
				manifest.push({
					page,
					file,
					bytes: bytes.byteLength
				});
			}
			const index = `${JSON.stringify({
				title: project.title,
				scale: args.scale,
				pages: manifest
			}, null, 2)}\n`;
			await writeFile(path.join(stage, "index.json"), index, { mode: 384 });
		});
		printValue(io, {
			status: checked.status,
			input: path.resolve(args.input),
			output,
			pages,
			scale: args.scale,
			warnings: checked.warningCount
		}, args.json);
		return 0;
	}
	const output = path.resolve(args.output ?? await defaultRenderOutput(args.input));
	const rendered = await renderPptdProject(selectedProject(project, pages));
	await publishPptdFile(output, rendered.bytes, args.force);
	printValue(io, {
		status: checked.status,
		input: path.resolve(args.input),
		output,
		pages,
		pageCount: pages.length,
		nativeObjectCount: rendered.nativeObjectCount,
		sizeBytes: rendered.bytes.byteLength,
		digest: checked.digest,
		warnings: checked.warningCount,
		compatibility: checked.compatibility
	}, args.json);
	return 0;
}
/** Execute the CLI without terminating the host process. */
async function runCli(argv, io = process) {
	try {
		const args = parseArgs(argv);
		if (args.version) {
			writeLine(io.stdout, await packageVersion());
			return 0;
		}
		if (args.help || args.command === void 0) {
			writeLine(io.stdout, usage());
			return args.help ? 0 : 2;
		}
		if (args.input === void 0) throw new Error(`${args.command} requires an input path\n${usage()}`);
		const command = args.command === "package" || args.command === "export" ? "render" : args.command;
		const normalized = {
			...args,
			command,
			input: args.input
		};
		if (command === "convert") return await commandConvert(normalized, io);
		if (![
			"check",
			"inspect",
			"screenshot",
			"render"
		].includes(command)) throw new Error(`Unknown command: ${args.command}\n${usage()}`);
		return await commandPptd(normalized, io);
	} catch (error) {
		writeLine(io.stderr, error instanceof Error ? error.message : String(error));
		return 1;
	}
}
async function main() {
	process.exitCode = await runCli(process.argv.slice(2), process);
}
const invoked = process.argv[1];
// npm installs .bin symlinks on POSIX; compare canonical paths so that entry runs too.
if (invoked !== void 0 && pathToFileURL(await realpath(path.resolve(invoked)).catch(() => path.resolve(invoked))).href === import.meta.url) await main();
//#endregion
export { runCli };
