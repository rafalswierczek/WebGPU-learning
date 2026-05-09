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
            let worldToCanvasRatioX: number = canvasWidth / 800; // world x coordinates must be based on 800 resulution
            let worldToCanvasRatioY: number = canvasHeight / 600; // also y coords are hardcoded for 600 height

            let realWorldCoordX: number = worldToCanvasRatioX * worldCoords[i][0];
            let realWorldCoordY: number = worldToCanvasRatioY * worldCoords[i][1];

            let worldCoordXOffset: number = realWorldCoordX - cameraX;
            let worldCoordYOffset: number = realWorldCoordY - cameraY;

            let worldCoordXRatio: number = worldCoordXOffset / canvasWidth;
            let worldCoordYRatio: number = worldCoordYOffset / canvasHeight;

            let NDCX: number = 2 * worldCoordXRatio - 1;
            let NDCY: number = 2 * worldCoordYRatio - 1;

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
