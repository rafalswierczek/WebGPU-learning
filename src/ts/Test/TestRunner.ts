import { BrushTest } from "./BrushTest";
import { ChunkCodecTest } from "./ChunkCodecTest";
import { CellTest } from "./CellTest";

/**
 * Testy funkcjonalne uruchamiane z konsoli przez runTests().
 *
 * Świadomie stoją obok API - API to polecenia gry i edytora, a to jest narzędzie deweloperskie.
 * Docelowo trafią pod runner uruchamiany poza przeglądarką; dopóki go nie ma, wystarcza jedno wejście.
 */
export class TestRunner
{
    public static register(): void
    {
        (globalThis as any).runTests = (): boolean => TestRunner.run();
    }

    public static run(): boolean
    {
        const results: boolean[] = [
            (new ChunkCodecTest()).run(),
            (new BrushTest()).run(),
            (new CellTest()).run(),
        ];

        const failed: uint = results.filter((passed: boolean): boolean => !passed).length;

        console.log(
            `%cTests: ${results.length - failed}/${results.length} suites passed`,
            `color: ${failed === 0 ? 'green' : 'red'}; font-weight: bold;`
        );

        return failed === 0;
    }
}
