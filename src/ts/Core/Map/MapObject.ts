import { ObjectType } from "./ObjectType";

/**
 * Obiekt jako koncept: jeden wpis w rejestrze obiektów, na który wskazują identyfikatory
 * ze stosów obiektów konkretnych komórek.
 *
 * Obiekty to przedmioty w grze: można je podnieść do plecaka, użyć albo przenieść
 * na inną komórkę.
 *
 * Nazwa klasy to MapObject, a nie Object, bo Object jest wbudowaną nazwą w JavaScripcie
 * i przesłonięcie jej w module psułoby Object.entries i spółkę.
 */
export class MapObject
{
    public readonly textureId: uint;

    /**
     * Sciezka w drzewie tekstur, np. "Objects/Food/271".
     *
     * Nazwa nalezy do obiektu z tego samego powodu co do kafla: zapisana mapa ma byc czytelna
     * bez biblioteki tekstur, a okno komorki nie ma doklejac nazwy z zewnatrz.
     */
    public name: string = '';

    public collision: boolean = false;
    /** Da się podnieść: przedmiot znika z ziemi i trafia do plecaka */
    public canPickup: boolean = false;
    /** Da się przenieść na inną komórkę */
    public canMove: boolean = false;
    /** Da się układać jeden na drugim */
    public canStack: boolean = false;
    public canUse: boolean = false;
    public active: boolean = false;
    public type: string = ObjectType.DEFAULT;
    public weight: uint = 0;
    /** Ile sekund zostało, np. do wypalenia się pochodni; 0 = bez limitu */
    public timeLeftSec: uint = 0;

    public constructor(textureId: uint)
    {
        this.textureId = textureId;
    }
}
