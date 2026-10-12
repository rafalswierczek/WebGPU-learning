export class TileTextureConfig
{
    /**
     * Cały folder assets/Textures spakowany przez webpack (tools/TexturesZipPlugin.js).
     * Jeden plik zamiast setek zapytań HTTP i jedyna rzecz, jaką gra pobiera z sieci
     * przy pierwszym uruchomieniu.
     */
    static readonly ARCHIVE_FILE: string = 'assets/textures.zip';

    /**
     * Bok, do którego skalowana jest KAŻDA tekstura. Atlas na GPU wymaga jednakowych komórek,
     * a assety mogą przyjść w różnych rozmiarach.
     */
    static readonly SIZE: uint = 32;
}
