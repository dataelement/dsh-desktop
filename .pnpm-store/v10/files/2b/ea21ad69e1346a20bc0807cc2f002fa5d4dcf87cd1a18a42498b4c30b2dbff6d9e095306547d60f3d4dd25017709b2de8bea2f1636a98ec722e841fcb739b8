interface PathPoint {
    x: number;
    y: number;
}
interface PathCubicSegment {
    c1: PathPoint;
    c2: PathPoint;
    end: PathPoint;
}
interface PathArcSegment {
    rx: number;
    ry: number;
    xAxisRotation: number;
    largeArc: 0 | 1;
    sweep: 0 | 1;
    end: PathPoint;
}
export declare function flipAbsoluteSvgPathData(pathD: string, width: number, height: number, flipH: boolean, flipV: boolean): string;
export declare function tokenizeSvgPathData(pathD: string, maxChars?: number): string[] | null;
export declare function parseSimpleMoveLinePathData(pathD: string): {
    start: PathPoint;
    end: PathPoint;
} | null;
export declare function parseMoveLinePathData(pathD: string): PathPoint[] | null;
export declare function parseMoveCubicPathData(pathD: string): {
    start: PathPoint;
    segments: PathCubicSegment[];
} | null;
export declare function parseMoveArcPathData(pathD: string): {
    start: PathPoint;
    arc: PathArcSegment;
} | null;
export {};
