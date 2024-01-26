export class Matrix
{
    protected rowNumber: number;

    protected columnNumber: number;

    protected elements: Float32Array;

    /**
     * elements: [1,2,3,4,5,6,7,8]
     * 
     * result (2 cols, 4 rows):
     * | 1 2 |
     * | 3 4 |
     * | 5 6 |
     * | 7 8 |
     * 
     * result (4 cols, 2 rows):
     * | 1 2 3 4 |
     * | 5 6 7 8 |
     * 
     * elements: [1,2,3,4,5,6,7,8,9]
     * 
     * result (3 cols, 3 rows):
     * | 1 2 3 |
     * | 4 5 6 |
     * | 7 8 9 |
     */
    constructor(rowNumber: number, columnNumber: number, elements: Float32Array)
    {
        this.rowNumber = rowNumber;
        this.columnNumber = columnNumber;

        if (elements.length !== this.rowNumber * this.columnNumber) {
            throw new Error('Invalid number of elements')
        }

        this.elements = elements;
    }

    public getRowNumber(): number
    {
        return this.rowNumber;
    }

    public getColumnNumber(): number
    {
        return this.columnNumber;
    }

    public getElements(): Float32Array
    {
        return this.elements;
    }

    public toArray(): number[][]
    {
        let result: number[][] = [];
        let row: number[] = [];

        for (let i = 0; i < this.elements.length; i++) {
            if ((i + 1) % this.columnNumber === 0) {
                row.push(this.elements[i]);
                
                result.push(row);

                row = [];

                continue;
            }

            row.push(this.elements[i]);
        }

        return result;
    }

    public updateElement(row: number, column: number, value: number): void
    {
        if (column > this.columnNumber || row > this.rowNumber || row <= 0 || column <= 0) {
            throw new Error(`Cannot update to value ${value}`);
        }

        this.elements[((row - 1) * this.columnNumber) + column - 1] = value;
    }

    public getElement(row: number, column: number): number
    {
        if (column > this.columnNumber || row > this.rowNumber || row <= 0 || column <= 0) {
            throw new Error(`Cannot get element with coordinates ${row}x${column}`);
        }

        return this.elements[((row - 1) * this.columnNumber) + column - 1];
    }

    public multiplyBy(matrix: Matrix): Matrix
    {
        this.validateMultiplyBy(matrix);

        const result: number[] = [];
        const elementsB: Float32Array = matrix.getElements();
        const columnsB: number = matrix.getColumnNumber();
        const columnsA: number = this.getColumnNumber();
        const rowsA: number = this.getRowNumber();

        for (let rowNumberA = 0; rowNumberA < rowsA; rowNumberA++) {
            for (let columnNumberB = 0; columnNumberB < columnsB; columnNumberB++) {
                let sum: number = 0;

                for (let columnNumberA = 0; columnNumberA < columnsA; columnNumberA++) {
                    const elementA = this.elements[rowNumberA * this.columnNumber + columnNumberA];
                    const elementB = elementsB[columnNumberA * columnsB + columnNumberB];

                    sum += elementA * elementB;
                }

                result.push(sum);
            }
        }

        return new Matrix(this.getRowNumber(), matrix.getColumnNumber(), new Float32Array(result));
    }

    public addScalar(scalar: number): Matrix
    {
        let result = [];

        for (let i = 0; i < this.elements.length; i++) {
            result[i] = this.elements[i] + scalar;
        }

        return new Matrix(this.getRowNumber(), this.getColumnNumber(), new Float32Array(result));
    }

    protected validateMultiplyBy(matrix: Matrix): void
    {
        if (this.columnNumber != matrix.getRowNumber()) {
            throw new Error(`Cannot multiply ${this.rowNumber}x${this.columnNumber} matrix by ${matrix.rowNumber}x${matrix.columnNumber} matrix`)
        }
    }
}
