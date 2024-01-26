import { Matrix4x4 } from './Matrix4x4';

export class OrthographicProjectionMatrix extends Matrix4x4
{
    public constructor(width: number, height: number, near: number = -1.0, far: number = 1.0)
    {
        const elements: number[] = [
            1 / (width / 2), 0 , 0, 0,
            0, 1 / (height / 2), 0, 0,
            0, 0, -2 / (far - near), - (far + near) / (far - near),
            0, 0, 0, 1
        ];

        super(new Float32Array(elements));
    }
}
