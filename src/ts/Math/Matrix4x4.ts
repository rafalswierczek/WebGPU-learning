import { Matrix } from "./Matrix";

export class Matrix4x4 extends Matrix
{
    constructor(elements: Float32Array)
    {
        super(4, 4, elements);
    }

    public multiplyBy4x4(matrix: Matrix4x4): Matrix4x4
    {
        this.validateMultiplyBy(matrix);

        let result: number[] = [];
        const elementsA = this.getElements();
        const elementsB = matrix.getElements();
        
        result[0] = elementsA[0] * elementsB[0] + elementsA[1] * elementsB[4] + elementsA[2] * elementsB[8] + elementsA[3] * elementsB[12];
        result[1] = elementsA[0] * elementsB[1] + elementsA[1] * elementsB[5] + elementsA[2] * elementsB[9] + elementsA[3] * elementsB[13];
        result[2] = elementsA[0] * elementsB[2] + elementsA[1] * elementsB[6] + elementsA[2] * elementsB[10] + elementsA[3] * elementsB[14];
        result[3] = elementsA[0] * elementsB[3] + elementsA[1] * elementsB[7] + elementsA[2] * elementsB[11] + elementsA[3] * elementsB[15];
        
        result[4] = elementsA[4] * elementsB[0] + elementsA[5] * elementsB[4] + elementsA[6] * elementsB[8] + elementsA[7] * elementsB[12];
        result[5] = elementsA[4] * elementsB[1] + elementsA[5] * elementsB[5] + elementsA[6] * elementsB[9] + elementsA[7] * elementsB[13];
        result[6] = elementsA[4] * elementsB[2] + elementsA[5] * elementsB[6] + elementsA[6] * elementsB[10] + elementsA[7] * elementsB[14];
        result[7] = elementsA[4] * elementsB[3] + elementsA[5] * elementsB[7] + elementsA[6] * elementsB[11] + elementsA[7] * elementsB[15];

        result[8] = elementsA[8] * elementsB[0] + elementsA[9] * elementsB[4] + elementsA[10] * elementsB[8] + elementsA[11] * elementsB[12];
        result[9] = elementsA[8] * elementsB[1] + elementsA[9] * elementsB[5] + elementsA[10] * elementsB[9] + elementsA[11] * elementsB[13];
        result[10] = elementsA[8] * elementsB[2] + elementsA[9] * elementsB[6] + elementsA[10] * elementsB[10] + elementsA[11] * elementsB[14];
        result[11] = elementsA[8] * elementsB[3] + elementsA[9] * elementsB[7] + elementsA[10] * elementsB[11] + elementsA[11] * elementsB[15];

        result[12] = elementsA[12] * elementsB[0] + elementsA[13] * elementsB[4] + elementsA[14] * elementsB[8] + elementsA[15] * elementsB[12];
        result[13] = elementsA[12] * elementsB[1] + elementsA[13] * elementsB[5] + elementsA[14] * elementsB[9] + elementsA[15] * elementsB[13];
        result[14] = elementsA[12] * elementsB[2] + elementsA[13] * elementsB[6] + elementsA[14] * elementsB[10] + elementsA[15] * elementsB[14];
        result[15] = elementsA[12] * elementsB[3] + elementsA[13] * elementsB[7] + elementsA[14] * elementsB[11] + elementsA[15] * elementsB[15];

        return new Matrix4x4(new Float32Array(result));
    }
}
