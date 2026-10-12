type uint = number;

type int = number;

type float = number;

type bytes = uint;

/** unsigned coords in world space */
type coordsWs = {
    readonly x: uint;
    readonly y: uint;
};

/** unsigned coords in tiles, from the bottom left corner of the world */
type coordsTile = {
    readonly tileX: uint;
    readonly tileY: uint;
};

/** unsigned coords in the chunk grid (not tiles, not pixels) */
type coordsChunk = {
    readonly cx: uint;
    readonly cy: uint;
};

/** rectangle in canvas pixels, origin in the top left corner */
type rectPx = {
    readonly x: uint;
    readonly y: uint;
    readonly width: uint;
    readonly height: uint;
};

/** rgba, each component from 0.0 to 1.0 */
type colorRgba = readonly [float, float, float, float];

/** unsigned coords in canvas pixels, origin in the top left corner */
type coordsCanvas = {
    readonly canvasX: uint;
    readonly canvasY: uint;
};

/** kind of a running mouse stroke in the map editor */
type strokeMode = 'none' | 'paint' | 'erase';
