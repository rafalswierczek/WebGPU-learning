/**
 * Stan aplikacji dzielony między kontroler (zapisuje) i renderer (czyta).
 *
 * Pauza NIE zatrzymuje pętli renderowania - inaczej nie dałoby się narysować komunikatu
 * o pauzie. Zatrzymywane jest wejście: klawisze kamery i obsługa myszy edytora.
 */
export class AppState
{
    private paused: boolean = false;

    public isPaused(): boolean
    {
        return this.paused;
    }

    public setPaused(paused: boolean): void
    {
        this.paused = paused;
    }
}
