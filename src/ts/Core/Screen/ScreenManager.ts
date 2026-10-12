import { Renderer } from "../Renderer";
import { Screen } from "./Screen";

/** Przełącza ekrany: odpina wejście poprzedniego, podpina nowy i przekierowuje renderowanie. */
export class ScreenManager
{
    private readonly renderer: Renderer;
    private readonly screens: Map<string, Screen> = new Map<string, Screen>();

    private currentName: string = '';

    public constructor(renderer: Renderer)
    {
        this.renderer = renderer;
    }

    public register(name: string, screen: Screen): void
    {
        this.screens.set(name, screen);
    }

    public getCurrentName(): string
    {
        return this.currentName;
    }

    public goTo(name: string): void
    {
        const next: Screen|undefined = this.screens.get(name);

        if (next === undefined) {
            throw new Error(`Unknown screen: ${name}`);
        }

        if (name === this.currentName) {
            return;
        }

        const current: Screen|undefined = this.screens.get(this.currentName);

        if (current !== undefined) {
            current.deactivate();
        }

        this.currentName = name;
        this.renderer.setRenderPassHandler(next);
        next.activate();
    }
}
