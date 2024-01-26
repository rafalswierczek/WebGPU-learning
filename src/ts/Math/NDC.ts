import { Matrix } from './Matrix';
import { OrthographicProjectionMatrix } from '../Math/OrthographicProjectionMatrix';

export class NDC
{
    public calculateNDC(
        worldCoords: number[][], // triangle [[1,2],[3,4],[5,6]]
        canvasWidth: number,
        canvasHeight: number,
        cameraX: number,
        cameraY: number,
    ): number[][] {
        let result: number[][] = [];

        for (let i = 0; i < worldCoords.length; i++) {
            const worldToCanvasRatioX: number = canvasWidth / 800; // world x coordinates must be based on 800 resulution
            const worldToCanvasRatioY: number = canvasHeight / 600; // also y coords are hardcoded for 600 height

            const realWorldCoordX: number = worldToCanvasRatioX * worldCoords[i][0];
            const realWorldCoordY: number = worldToCanvasRatioY * worldCoords[i][1];

            const worldCoordXOffset: number = realWorldCoordX - cameraX;
            const worldCoordYOffset: number = realWorldCoordY - cameraY;

            const worldCoordXRatio: number = worldCoordXOffset / canvasWidth;
            const worldCoordYRatio: number = worldCoordYOffset / canvasHeight;

            const NDCX: number = 2 * worldCoordXRatio - 1;
            const NDCY: number = 2 * worldCoordYRatio - 1;

            result[i] = [NDCX, NDCY];
        }

        return result;
    }

    public calculateNDC2(
        worldCoords: number[][], // triangle [[1,2],[3,4],[5,6]]
        canvasWidth: number,
        canvasHeight: number,
    ): number[][] {
        const baseMatrix: Matrix = new Matrix(3, 4, new Float32Array([
            worldCoords[0][0], worldCoords[0][1], 0, 1, // x, y, z, w
            worldCoords[1][0], worldCoords[1][1], 0, 1,
            worldCoords[2][0], worldCoords[2][1], 0, 1,
        ]));

        const orthographicProjectionMatrix: OrthographicProjectionMatrix = new OrthographicProjectionMatrix(canvasWidth, canvasHeight);

        const resultMatrix: Matrix = baseMatrix.multiplyBy(orthographicProjectionMatrix).addScalar(-1); //  własna formuła + własny pomysł, wynik ma -1 z coord

        return resultMatrix.toArray();
    }
}
