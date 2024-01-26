import { Matrix } from "./Matrix";

export class Matrix2x2 extends Matrix
{
    constructor(elements: Float32Array)
    {
        super(2, 2, elements);
    }

    public multiplyBy2x2(matrix: Matrix2x2): Matrix2x2
    {
        this.validateMultiplyBy(matrix);

        let result: number[] = [];
        const elementsA = this.getElements();
        const elementsB = matrix.getElements();
        
        result[0] = elementsA[0] * elementsB[0] + elementsA[1] * elementsB[2];
        result[1] = elementsA[0] * elementsB[1] + elementsA[1] * elementsB[3];
        
        result[2] = elementsA[2] * elementsB[0] + elementsA[3] * elementsB[2];
        result[3] = elementsA[2] * elementsB[1] + elementsA[3] * elementsB[3];

        return new Matrix2x2(new Float32Array(result));
    }
}
