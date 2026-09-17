/**
 * Pure request-projection geometry shared by attachment providers and
 * provider-side request pricing. @module @deepseek-ai/dsh-attachment/request-projection
 */
/**
 * Compute aspect-preserving integer dimensions within a hard total-pixel budget.
 * @param width - positive source width.
 * @param height - positive source height.
 * @param maxPixels - positive width-times-height cap.
 * @returns inward-rounded dimensions; small images are not enlarged.
 */
export function requestImageDimensions(width, height, maxPixels) {
    const scale = Math.min(1, Math.sqrt(maxPixels / (width * height)));
    if (scale === 1)
        return { width, height };
    if (width >= height) {
        let projectedWidth = Math.max(1, Math.floor(width * scale));
        let projectedHeight = Math.max(1, Math.round(projectedWidth * height / width));
        while (projectedWidth * projectedHeight > maxPixels && projectedWidth > 1) {
            projectedWidth -= 1;
            projectedHeight = Math.max(1, Math.round(projectedWidth * height / width));
        }
        return { width: projectedWidth, height: projectedHeight };
    }
    let projectedHeight = Math.max(1, Math.floor(height * scale));
    let projectedWidth = Math.max(1, Math.round(projectedHeight * width / height));
    while (projectedWidth * projectedHeight > maxPixels && projectedHeight > 1) {
        projectedHeight -= 1;
        projectedWidth = Math.max(1, Math.round(projectedHeight * width / height));
    }
    return { width: projectedWidth, height: projectedHeight };
}
//# sourceMappingURL=request-projection.js.map