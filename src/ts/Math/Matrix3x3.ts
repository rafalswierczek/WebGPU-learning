import { Matrix } from "./Matrix";

export class Matrix3x3 extends Matrix
{
    constructor(elements: Float32Array)
    {
        super(3, 3, elements);
    }

    public multiplyBy3x3(matrix: Matrix3x3): Matrix3x3
    {
        this.validateMultiplyBy(matrix);

        let result: number[] = [];
        const elementsA = this.getElements();
        const elementsB = matrix.getElements();
        
        result[0] = elementsA[0] * elementsB[0] + elementsA[1] * elementsB[3] + elementsA[2] * elementsB[6];
        result[1] = elementsA[0] * elementsB[1] + elementsA[1] * elementsB[4] + elementsA[2] * elementsB[7];
        result[2] = elementsA[0] * elementsB[2] + elementsA[1] * elementsB[5] + elementsA[2] * elementsB[8];

        result[3] = elementsA[3] * elementsB[0] + elementsA[4] * elementsB[3] + elementsA[5] * elementsB[6];
        result[4] = elementsA[3] * elementsB[1] + elementsA[4] * elementsB[4] + elementsA[5] * elementsB[7];
        result[5] = elementsA[3] * elementsB[2] + elementsA[4] * elementsB[5] + elementsA[5] * elementsB[8];

        result[6] = elementsA[6] * elementsB[0] + elementsA[7] * elementsB[3] + elementsA[8] * elementsB[6];
        result[7] = elementsA[6] * elementsB[1] + elementsA[7] * elementsB[4] + elementsA[8] * elementsB[7];
        result[8] = elementsA[6] * elementsB[2] + elementsA[7] * elementsB[5] + elementsA[8] * elementsB[8];

        return new Matrix3x3(new Float32Array(result));
    }
}
