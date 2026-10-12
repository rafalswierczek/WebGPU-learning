/**
 * Jeden przełącznik mówiący, czy klawiaturę przejął jakiś widget (np. pole tekstowe).
 *
 * Dzięki temu kamera i skróty edytora wiedzą, że mają się nie odzywać, gdy użytkownik pisze.
 * Bez tego wpisanie "wsad" w pole tekstowe rozjechałoby kamerę.
 */
export class KeyboardFocus
{
    private owner: object|null = null;

    public capture(owner: object): void
    {
        this.owner = owner;
    }

    public release(owner: object): void
    {
        if (this.owner === owner) {
            this.owner = null;
        }
    }

    public isCaptured(): boolean
    {
        return this.owner !== null;
    }

    public isOwnedBy(owner: object): boolean
    {
        return this.owner === owner;
    }
}
