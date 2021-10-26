import { WorldSize } from "../object/worldSize";

export class WorldFactory {
    private name: string;
    private worldSize: WorldSize;

    constructor(worldSize: WorldSize, name: string) {
        this.worldSize = worldSize;
        this.name = name;
    }

    public buildWorld(): void {

    }
}