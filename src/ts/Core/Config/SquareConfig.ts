export class SquareConfig
{
    /**
     * Bok komórki w PIKSELACH ŚWIATA - to jednostka mapy, a nie ekranu.
     *
     * Ile ta komórka zajmie pikseli ekranu, wynika z rozdzielczości i zoomu (patrz ViewConfig),
     * więc rozmiar tekstury nie ma tu nic do rzeczy: tekstura jest rozciągana na komórkę.
     */
    static readonly LENGTH: uint = 50;
}
