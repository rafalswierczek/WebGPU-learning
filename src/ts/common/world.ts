import { WorldFactory } from "../factory/worldFactory"
import { WorldType } from "../headers/worldType";

export class World {
    private worldFactory: WorldFactory;
    private worldType: WorldType;

    constructor(worldFactory: WorldFactory, worldType: WorldType = WorldType.MEDIUM) {
        this.worldFactory = worldFactory;
        this.worldType = worldType;
    }

    public initialize() {

    }

    public generate() {
        this.worldFactory.buildWorld();
    }

    public load() {

    }
}
