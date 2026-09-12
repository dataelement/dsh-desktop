import path from "node:path";
import { createHash } from "node:crypto";
import yaml from "js-yaml";
import { RECOMMENDED_ZIP_LIMITS, buildPresentation, parseZip, serializePresentation } from "@aiden0z/pptx-renderer";
import { JSDOM } from "jsdom";
import { supplementResources, isSafeSvg } from "./pptx-resources.js";
import { flattenPptxGroups } from "./pptx-groups.js";
import { emfToSvg } from "./emf-image.js";
import { markSourceLayout } from "./source-layout.js";
//#region lib/types/pptd-convert.js
/** Bounded PPTX to PPTD v2 conversion used by the local CLI. */
const CSS_PIXEL_TO_POINT = 72 / 96;
function record(value) {
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
	if (color === void 0 || (color.length === 9 && color.endsWith("00"))) return void 0;
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
			...childElement(body, "normAutofit") === void 0 ? {} : { fit: "shrink" },
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
	if (node.presetGeometry === "line" || node.presetGeometry === "straightConnector1") return [lineElement(node, elementId, offsetX, offsetY, raw, theme)];
	const fill = convertedFill(raw?.fill, theme);
	const border = convertedBorder(raw?.line, theme);
	const text = convertedText(node, raw?.textBody, theme);
	const hasText = text.markup.replace(/<[^>]*>/gu, "").trim() !== "";
	const items = [];
	if (fill !== void 0 || border !== void 0 || !hasText) items.push({
		elementId: hasText ? `${elementId}-shape` : elementId,
		elementType: "shape",
		bounds: bounds(node, offsetX, offsetY),
		shapeName: node.presetGeometry ?? "rect",
		...fill === void 0 ? {} : { fill },
		...border === void 0 ? {} : { border },
		...node.rotation === 0 ? {} : { rotation: node.rotation },
		...!node.flipH && !node.flipV ? {} : { flip: [node.flipH, node.flipV] }
	});
	if (hasText) items.push({
		elementId: items.length === 0 ? elementId : `${elementId}-text`,
		elementType: "text",
		bounds: bounds(node, offsetX, offsetY),
		...node.rotation === 0 ? {} : { rotation: node.rotation },
		...!node.flipH && !node.flipV ? {} : { flip: [node.flipH, node.flipV] },
		content: text.content
	});
	return items;
}
function mediaType(file, bytes) {
	const extension = path.extname(file).toLowerCase();
	if (extension === ".png" && bytes[0] === 137 && bytes[1] === 80) return "image/png";
	if ((extension === ".jpg" || extension === ".jpeg") && bytes[0] === 255 && bytes[1] === 216) return "image/jpeg";
	if (extension === ".gif" && Buffer.from(bytes.subarray(0, 3)).toString("ascii") === "GIF") return "image/gif";
	if (extension === ".webp" && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP") return "image/webp";
	if (extension === ".svg" && isSafeSvg(bytes)) return "image/svg+xml";
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
		const minimum = Number(childElement(scaling, "min")?.getAttribute("val") ?? NaN);
		const maximum = Number(childElement(scaling, "max")?.getAttribute("val") ?? NaN);
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
		...outputSeries.some((item) => record(item.encode)?.y === "category") ? convertedAxes[0] === void 0 || Object.keys(convertedAxes[0]).length === 0 ? {} : { xAxis: convertedAxes[0] } : convertedAxes.length === 0 ? {} : { yAxis: convertedAxes.length === 1 ? convertedAxes[0] : convertedAxes }
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
let pptxConversionTail = Promise.resolve();
function convertPptxToPptd(bytes, fileName) {
	const pending = pptxConversionTail.catch(() => {}).then(() => convertPptxWithDomParser(bytes, fileName));
	pptxConversionTail = pending;
	return pending;
}
async function convertPptxWithDomParser(bytes, fileName) {
	const restoreDomParser = installDomParser();
	try {
		const files = supplementResources(await parseZip(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), RECOMMENDED_ZIP_LIMITS), bytes);
		const diagnostics = [];
        for (const [slidePath, xml] of files.slides) {
            const flattened = flattenPptxGroups(xml);
            files.slides.set(slidePath, flattened.xml);
            if (flattened.count) diagnostics.push({ level: "normalized", feature: "group", message: `${flattened.count} 个组合已按完整坐标变换展开，并保留子对象样式。` });
        }
        const presentation = buildPresentation(files);
        const serialized = serializePresentation(presentation);
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
				// Display names can repeat or collapse after normalization; source traversal owns identity.
				const elementId = `slide-${slide.index + 1}-node-${sourceNodeCount}-${safeId(node.name, node.nodeType)}`;
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
                if (node.nodeType === "picture") {
                    const rawPicture = rawNode?.nodeType === "picture" ? rawNode : void 0;
                    const svgEmbed = descendantElement(safeElement(rawPicture?.source), "svgBlip")?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed");
                    const relationship = sourceSlide.rels.get(svgEmbed || node.blipEmbed);
					const mediaPath = relationship === void 0 ? void 0 : normalizedRelationshipTarget(sourceSlide.slidePath, relationship.target);
					let media = mediaPath === void 0 ? void 0 : files.media.get(mediaPath);
					let imageError;
					if (media && /\.emf$/i.test(mediaPath)) {
						try { media = emfToSvg(media); } catch (error) { imageError = error.message; media = void 0; }
					}
					const type = mediaPath === void 0 || media === void 0 ? void 0 : mediaType(/\.emf$/i.test(mediaPath) ? "converted.svg" : mediaPath, media);
					if (mediaPath === void 0 || media === void 0 || type === void 0) {
						diagnostics.push({
							level: "unsupported",
							slide: slide.index + 1,
							nodeId: node.id,
							feature: "picture",
							message: imageError || "图片资源格式或关系无法转换。"
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
				elements: output.map(markSourceLayout)
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

export { convertPptxToPptd, yamlText, record };
