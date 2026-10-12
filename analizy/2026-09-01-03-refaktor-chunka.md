# Analiza 03 — refaktor chunka: jak konkretnie zmienić `Chunk` i `MapGenerator` (2026-09-01)

Kontekst: [analiza 02](2026-09-01-02-ladowanie-mapy.md) ustaliła *co* ma być (2 B/tile, rzadkie warstwy).
Ten dokument mówi *jak to wygląda w kodzie* — z gotowymi klasami i mapą zmian plik po pliku.

---

## 1. Sedno zmiany w jednym zdaniu

**Liczba 17 nie znika.** Zmienia się jej znaczenie:

| | dziś | po zmianie |
|---|---|---|
| Czym jest 17 | liczbą **wypełnionych** tablic `Tile[]` | liczbą **slotów**, w większości `null` |
| Walidacja w `Chunk` | „każda z 17 warstw ma dokładnie 10 000 tile" | „jest 17 slotów; niepusty slot ma 10 000 tile" |
| Tworzenie warstwy | z góry, w konstruktorze | leniwie, przy pierwszym `setTile()` |
| Pusta warstwa w RAM | 10 000 obiektów `Tile` (~400 KB) | `null` (8 bajtów) |
| Pusta warstwa w pliku | 90 000 B zer | 0 B (bit w `layerMask`) |
| Chunk z samym gruntem | ~1,5 MB + 170 000 obiektów | **20 KB, 1 obiekt** |

Czyli: `MapConfig.LAYER_COUNT = 17` zostaje jako **zakres dozwolonych warstw**, a nie jako obowiązek ich
zaalokowania. Cała reszta wynika z tej jednej decyzji.

**Dobra wiadomość na start:** nie ma czego migrować. `vita_map.zip` nie istnieje w `public/`, a `saveExampleMap()`
nigdy nie zadziałało (§5.2 analizy 01), więc **nie ma w obiegu żadnych danych w starym formacie**. Masz wolną rękę:
to jest zamiana, nie migracja. Gdyby komuś został stary cache w IndexedDB — sprawdzenie `magic` + `version`
w kodeku odrzuci go i odbuduje z zipa.

---

## 2. Docelowa struktura plików

```
src/ts/Core/Map/                    (nowy katalog, zastępuje Core/MapEditor/ w części danych)
├── MapConfig.ts        stałe + konwersja numeru warstwy na indeks slotu
├── Chunk.ts            17 slotów Uint16Array|null, leniwa alokacja
├── ChunkCodec.ts       Chunk ↔ ArrayBuffer (cała logika binarna z MapGenerator)
├── TileTypeTable.ts    texId → collision, speedFactor  (to, co wypadło z Tile)
└── MapGenerator.ts     TYLKO generowanie danych testowych
```

`Core/MapEditor/` zostaje na to, co faktycznie jest edytorem (`MapEditorHandler`, `MapEditorController`).
Dane mapy nie są częścią edytora — używa ich też renderer i logika gry.

---

## 3. `MapConfig` — jedno miejsce na stałe

```ts
// src/ts/Core/Map/MapConfig.ts
export class MapConfig
{
    public static readonly TILES_IN_ROW: uint = 100;
    public static readonly TILES_IN_CHUNK: uint = MapConfig.TILES_IN_ROW * MapConfig.TILES_IN_ROW; // 10 000

    public static readonly LAYER_MIN: int = -8;
    public static readonly LAYER_MAX: int = 8;
    public static readonly LAYER_COUNT: uint = MapConfig.LAYER_MAX - MapConfig.LAYER_MIN + 1;      // 17
    public static readonly GROUND_LAYER: int = 0;

    /** texId 0 = brak kafla; zgodnie z notatką o zerowym paddingu w todo.txt */
    public static readonly EMPTY_TILE: uint = 0;

    public static readonly TILE_STRIDE: bytes = 2;
    public static readonly LAYER_SIZE: bytes = MapConfig.TILES_IN_CHUNK * MapConfig.TILE_STRIDE;   // 20 000

    /** warstwa -8..8  ->  slot 0..16 */
    public static toLayerIndex(layer: int): uint
    {
        if (layer < MapConfig.LAYER_MIN || layer > MapConfig.LAYER_MAX) {
            throw new Error(`Layer out of range: ${layer}. Expected ${MapConfig.LAYER_MIN}..${MapConfig.LAYER_MAX}`);
        }

        return layer - MapConfig.LAYER_MIN;
    }

    /** slot 0..16  ->  warstwa -8..8 */
    public static toLayer(layerIndex: uint): int
    {
        return layerIndex + MapConfig.LAYER_MIN;
    }
}
```

To zabija klucze `'layer-8'`, `'layer0'`… z `Record<string, Tile[]>`. Stringi jako klucze warstw były źródłem
dwóch problemów naraz: kolejność iteracji `Object.entries()` decydowała o kolejności zapisu bajtów
(`MapGenerator.setTiles`), a literówka `'layer-9'` nie była błędem, tylko cichym dodaniem 18. warstwy.
Indeks liczbowy + walidacja zakresu załatwiają oba.

---

## 4. `Chunk` — 17 slotów zamiast 17 tablic

```ts
// src/ts/Core/Map/Chunk.ts
import { MapConfig } from "./MapConfig";

/** Współrzędne chunka w siatce chunków — nie w tile, nie w pikselach */
export type coordsChunk = {
    readonly cx: uint;
    readonly cy: uint;
};

export class Chunk
{
    public readonly coords: coordsChunk;

    /** 17 slotów; null = warstwa nie istnieje w tym chunku i nie zajmuje pamięci */
    private readonly layers: (Uint16Array|null)[];

    public constructor(coords: coordsChunk, layers?: (Uint16Array|null)[])
    {
        this.coords = coords;
        this.layers = layers ?? new Array<Uint16Array|null>(MapConfig.LAYER_COUNT).fill(null);

        if (this.layers.length !== MapConfig.LAYER_COUNT) {
            throw new Error(`Expected ${MapConfig.LAYER_COUNT} layer slots, got ${this.layers.length}`);
        }

        for (let i: uint = 0; i < this.layers.length; i++) {
            const tiles: Uint16Array|null = this.layers[i];

            if (tiles !== null && tiles.length !== MapConfig.TILES_IN_CHUNK) {
                throw new Error(
                    `Layer ${MapConfig.toLayer(i)} has ${tiles.length} tiles, expected ${MapConfig.TILES_IN_CHUNK}`
                );
            }
        }
    }

    public hasLayer(layer: int): boolean
    {
        return this.layers[MapConfig.toLayerIndex(layer)] !== null;
    }

    public getLayer(layer: int): Uint16Array|null
    {
        return this.layers[MapConfig.toLayerIndex(layer)];
    }

    public getTile(layer: int, x: uint, y: uint): uint
    {
        const tiles: Uint16Array|null = this.layers[MapConfig.toLayerIndex(layer)];

        if (tiles === null) {
            return MapConfig.EMPTY_TILE;
        }

        return tiles[y * MapConfig.TILES_IN_ROW + x];
    }

    /** Alokuje warstwę dopiero wtedy, gdy faktycznie coś w niej stawiasz. */
    public setTile(layer: int, x: uint, y: uint, tileId: uint): void
    {
        const layerIndex: uint = MapConfig.toLayerIndex(layer);
        let tiles: Uint16Array|null = this.layers[layerIndex];

        if (tiles === null) {
            if (tileId === MapConfig.EMPTY_TILE) {
                return; // nie alokujemy warstwy po to, żeby wpisać do niej zero
            }

            tiles = new Uint16Array(MapConfig.TILES_IN_CHUNK);
            this.layers[layerIndex] = tiles;
        }

        tiles[y * MapConfig.TILES_IN_ROW + x] = tileId;
    }

    /** Zwalnia warstwy, które w całości wyzerowano. Wołać przed zapisem chunka. */
    public compact(): void
    {
        for (let i: uint = 0; i < this.layers.length; i++) {
            const tiles: Uint16Array|null = this.layers[i];

            if (tiles !== null && tiles.every((id: uint): boolean => id === MapConfig.EMPTY_TILE)) {
                this.layers[i] = null;
            }
        }
    }

    /** Bit i = slot i jest niepusty. Trafia wprost do nagłówka pliku. */
    public getLayerMask(): uint
    {
        let mask: uint = 0;

        for (let i: uint = 0; i < this.layers.length; i++) {
            if (this.layers[i] !== null) {
                mask |= (1 << i);
            }
        }

        return mask;
    }

    public getFilledLayerCount(): uint
    {
        let count: uint = 0;

        for (const tiles of this.layers) {
            if (tiles !== null) {
                count++;
            }
        }

        return count;
    }

    /** Rozmiar samych danych warstw, bez nagłówka. */
    public getPayloadSize(): bytes
    {
        return this.getFilledLayerCount() * MapConfig.LAYER_SIZE;
    }
}
```

**Trzy rzeczy, które to zmienia w stosunku do dzisiejszego `Chunk.ts`:**

1. Konstruktor przyjmuje **opcjonalne** warstwy. `new Chunk({cx: 0, cy: 0})` to poprawny, pusty chunk.
   Dziś musisz podać 17 tablic po 10 000 elementów, inaczej wyjątek — i to jest dokładnie ten przymus,
   o którym piszesz.
2. `setTile()` alokuje leniwie. Edytor nigdy nie „tworzy warstwy" świadomie — po prostu stawia kafel,
   a warstwa powstaje sama. Nie ma czego zapomnieć.
3. `size` jako pole zniknęło na rzecz `getPayloadSize()`, bo rozmiar **przestał być stały** — teraz zależy
   od tego, ile warstw faktycznie istnieje. Pole liczone raz w konstruktorze byłoby nieaktualne
   po pierwszym `setTile()`.

---

## 5. `ChunkCodec` — cała logika binarna z `MapGenerator`

### 5.1 Nagłówek (48 B)

Doprecyzowanie względem §5 analizy 02: nagłówek urósł z 40 do 48 B (doszły `tilesInRow` i `reserved`),
i **cały format jest little-endian**. Uzasadnienie obu zmian pod tabelą.

```
offset  typ      pole          wartość
--------------------------------------------------------------
 0      u32      magic         0x56544D50 ("VTMP")
 4      u16      version       2
 6      u8       tileStride    2
 7      u8       layerCount    17
 8      u16      tilesInRow    100
10      u16      reserved      0
12      u32      originTileX   cx * tilesInRow
16      u32      originTileY   cy * tilesInRow
20      u32      layerMask     bit i = slot i obecny
24      u8[17]   layerMode     0=EMPTY, 1=DENSE, 2=SPARSE_ROWS (na przyszłość)
41      u8[7]    padding       0
--------------------------------------------------------------
48      dane obecnych warstw, rosnąco po indeksie slotu
```

**Dlaczego 48, a nie 40:** `tilesInRow` i `tileStride` w nagłówku sprawiają, że plik jest **samoopisujący** —
`originTileX` da się przeliczyć na `cx` bez znajomości stałych z kodu, a zmiana rozmiaru chunka w przyszłości
nie unieważnia starych plików po cichu, tylko daje czytelny błąd walidacji. 48 jest podzielne przez 4,
`LAYER_SIZE = 20 000` też, więc **każda warstwa zaczyna się pod parzystym offsetem** — a to jest warunek,
żeby dało się zrobić `new Uint16Array(buffer, offset, 10000)` bez kopiowania.

**Dlaczego little-endian (zmiana!):** dzisiejszy `MapGenerator` używa `false` w `DataView`, czyli big-endian
(`MapGenerator.ts:87-89`, `120-122`). Przy BE każdy tile trzeba przepisywać bajt po bajcie przez `DataView`.
Przy LE dane warstwy są **binarnie identyczne** z `Uint16Array` w pamięci, więc odczyt to jeden `set()`
na cały blok 20 000 B zamiast 10 000 wywołań `getUint16`. Wszystkie docelowe platformy (x86, ARM, WASM, WebGPU)
są LE, więc przenośność nic nie kosztuje. To jest ta zmiana, która robi z dekodowania `memcpy`.

### 5.2 Kod

```ts
// src/ts/Core/Map/ChunkCodec.ts
import { Chunk, coordsChunk } from "./Chunk";
import { MapConfig } from "./MapConfig";

export class ChunkCodec
{
    public static readonly MAGIC: uint = 0x56544D50; // "VTMP"
    public static readonly VERSION: uint = 2;
    public static readonly HEADER_SIZE: bytes = 48;

    private static readonly MODE_EMPTY: uint = 0;
    private static readonly MODE_DENSE: uint = 1;

    private static readonly OFFSET_LAYER_MODE: bytes = 24;

    public static encode(chunk: Chunk): ArrayBuffer
    {
        const buffer: ArrayBuffer = new ArrayBuffer(ChunkCodec.HEADER_SIZE + chunk.getPayloadSize());
        const view: DataView = new DataView(buffer);

        view.setUint32(0, ChunkCodec.MAGIC, true);
        view.setUint16(4, ChunkCodec.VERSION, true);
        view.setUint8(6, MapConfig.TILE_STRIDE);
        view.setUint8(7, MapConfig.LAYER_COUNT);
        view.setUint16(8, MapConfig.TILES_IN_ROW, true);
        view.setUint16(10, 0, true);
        view.setUint32(12, chunk.coords.cx * MapConfig.TILES_IN_ROW, true);
        view.setUint32(16, chunk.coords.cy * MapConfig.TILES_IN_ROW, true);
        view.setUint32(20, chunk.getLayerMask(), true);

        let offset: bytes = ChunkCodec.HEADER_SIZE;

        for (let i: uint = 0; i < MapConfig.LAYER_COUNT; i++) {
            const tiles: Uint16Array|null = chunk.getLayer(MapConfig.toLayer(i));

            view.setUint8(ChunkCodec.OFFSET_LAYER_MODE + i, tiles === null ? ChunkCodec.MODE_EMPTY : ChunkCodec.MODE_DENSE);

            if (tiles !== null) {
                new Uint16Array(buffer, offset, MapConfig.TILES_IN_CHUNK).set(tiles); // jeden blok, bez pętli po tile
                offset += MapConfig.LAYER_SIZE;
            }
        }

        return buffer;
    }

    public static decode(buffer: ArrayBuffer): Chunk
    {
        const view: DataView = new DataView(buffer);

        ChunkCodec.validateHeader(view, buffer.byteLength);

        const tilesInRow: uint = view.getUint16(8, true);
        const layerMask: uint = view.getUint32(20, true);
        const coords: coordsChunk = {
            cx: view.getUint32(12, true) / tilesInRow,
            cy: view.getUint32(16, true) / tilesInRow,
        };

        const layers: (Uint16Array|null)[] = new Array<Uint16Array|null>(MapConfig.LAYER_COUNT).fill(null);
        let offset: bytes = ChunkCodec.HEADER_SIZE;

        for (let i: uint = 0; i < MapConfig.LAYER_COUNT; i++) {
            const mode: uint = view.getUint8(ChunkCodec.OFFSET_LAYER_MODE + i);
            const present: boolean = (layerMask & (1 << i)) !== 0;

            if (present !== (mode !== ChunkCodec.MODE_EMPTY)) {
                throw new Error(`Layer ${MapConfig.toLayer(i)}: layerMask and layerMode disagree`);
            }

            if (mode === ChunkCodec.MODE_EMPTY) {
                continue;
            }

            if (mode !== ChunkCodec.MODE_DENSE) {
                throw new Error(`Layer ${MapConfig.toLayer(i)}: unsupported layer mode ${mode}`);
            }

            // .slice() = kopia własna; bez niej chunk trzymałby przy życiu cały bufor pliku
            layers[i] = new Uint16Array(buffer, offset, MapConfig.TILES_IN_CHUNK).slice();
            offset += MapConfig.LAYER_SIZE;
        }

        return new Chunk(coords, layers);
    }

    private static validateHeader(view: DataView, byteLength: bytes): void
    {
        if (byteLength < ChunkCodec.HEADER_SIZE) {
            throw new Error(`Chunk too short: ${byteLength} B`);
        }

        if (view.getUint32(0, true) !== ChunkCodec.MAGIC) {
            throw new Error('Not a chunk file (bad magic)');
        }

        const version: uint = view.getUint16(4, true);

        if (version !== ChunkCodec.VERSION) {
            throw new Error(`Unsupported chunk version: ${version}. Expected: ${ChunkCodec.VERSION}`);
        }

        if (view.getUint8(6) !== MapConfig.TILE_STRIDE) {
            throw new Error(`Tile stride mismatch: ${view.getUint8(6)} vs ${MapConfig.TILE_STRIDE}`);
        }

        if (view.getUint8(7) !== MapConfig.LAYER_COUNT) {
            throw new Error(`Layer count mismatch: ${view.getUint8(7)} vs ${MapConfig.LAYER_COUNT}`);
        }

        if (view.getUint16(8, true) !== MapConfig.TILES_IN_ROW) {
            throw new Error(`Tiles in row mismatch: ${view.getUint16(8, true)} vs ${MapConfig.TILES_IN_ROW}`);
        }
    }
}
```

Zwróć uwagę na `validateHeader`: dzisiejszy `getHeader()` sprawdza tylko wersję. Tu każda niezgodność
ze stałymi kodu wychodzi **od razu, z czytelnym komunikatem**, a nie jako „mapa wygląda dziwnie".
Dla formatu binarnego to jest różnica między godziną a trzema dniami debugowania.

### 5.3 Ścieżka szybka do aren (analiza 02 §7)

Docelowo ładowanie nie tworzy obiektów `Chunk` w ogóle — wpisuje prosto do aren:

```ts
    /** Bez tworzenia Chunk i bez kopii warstw: prosto do aren MapData. */
    public static decodeInto(buffer: ArrayBuffer, map: MapData): void
    {
        const view: DataView = new DataView(buffer);

        ChunkCodec.validateHeader(view, buffer.byteLength);

        const tilesInRow: uint = view.getUint16(8, true);
        const originTileX: uint = view.getUint32(12, true);
        const originTileY: uint = view.getUint32(16, true);
        const layerMask: uint = view.getUint32(20, true);

        let offset: bytes = ChunkCodec.HEADER_SIZE;

        for (let i: uint = 0; i < MapConfig.LAYER_COUNT; i++) {
            if ((layerMask & (1 << i)) === 0) {
                continue;
            }

            const tiles: Uint16Array = new Uint16Array(buffer, offset, MapConfig.TILES_IN_CHUNK); // widok, zero kopii
            map.writeLayer(MapConfig.toLayer(i), originTileX, originTileY, tilesInRow, tiles);
            offset += MapConfig.LAYER_SIZE;
        }
    }
```

`Chunk` zostaje wtedy **obiektem edytora** (wygodne `getTile`/`setTile` na jednym chunku), a nie strukturą
przez którą przechodzi ładowanie 10 000 chunków. To jest ta sama klasa, ale używana tylko tam, gdzie jej
wygoda coś daje, a nie na gorącej ścieżce.

---

## 6. Co wypada z `Tile`

```ts
// src/ts/Core/Map/TileTypeTable.ts
export class TileTypeTable
{
    public static readonly MAX_TYPES: uint = 65536;

    private readonly collision: Uint8Array;      //  64 KB
    private readonly speedFactor: Float32Array;  // 256 KB

    public constructor(collision: Uint8Array, speedFactor: Float32Array) { ... }

    public hasCollision(tileId: uint): boolean
    {
        return this.collision[tileId] !== 0;
    }

    public getSpeedFactor(tileId: uint): float
    {
        return this.speedFactor[tileId];
    }
}
```

`Core/MapEditor/Tile.ts` w obecnej postaci znika. Jeśli chcesz zachować wygodny obiekt dla edytora
(„pokaż mi właściwości kafla pod kursorem"), zrób z niego **widok tworzony na żądanie**, nie jednostkę
przechowywania:

```ts
export class TileView
{
    public constructor(
        public readonly tileId: uint,
        public readonly collision: boolean,
        public readonly speedFactor: float,
    ) {}
}
// edytor: new TileView(id, table.hasCollision(id), table.getSpeedFactor(id))
```

Różnica: dziś takich obiektów istnieje 170 000 na chunk **cały czas**. Po zmianie istnieje **jeden, na czas
wyświetlenia panelu właściwości**.

---

## 7. `MapGenerator` — co z niego zostaje

Dzisiaj robi trzy rzeczy naraz. Rozpada się tak:

| Dzisiejsza metoda | Trafia do |
|---|---|
| `generateBinary`, `setHeader`, `setTiles` | `ChunkCodec.encode()` |
| `getHeader`, `getTiles`, `chunkFromBlob` | `ChunkCodec.decode()` / `decodeInto()` |
| `mapBin`, `generateChunk`, `getChunk`, `getMapBin` | `MapRepository` (IndexedDB, pasma — analiza 02 §6) |
| generowanie zawartości testowej | chudy `MapGenerator` |

Nowy `MapGenerator` jest banalny — i przy okazji **nie da się w nim popełnić błędów z §5.2 analizy 01**,
bo nigdy nie buduje tablic ręcznie:

```ts
// src/ts/Core/Map/MapGenerator.ts
export class MapGenerator
{
    public generateChunk(coords: coordsChunk): Chunk
    {
        const chunk: Chunk = new Chunk(coords);

        for (let y: uint = 0; y < MapConfig.TILES_IN_ROW; y++) {
            for (let x: uint = 0; x < MapConfig.TILES_IN_ROW; x++) {
                chunk.setTile(MapConfig.GROUND_LAYER, x, y, this.groundTileId(coords, x, y));
            }
        }

        // warstwa 1: rzadka ramka wokół chunka — do sprawdzenia, czy overlaye działają
        for (let i: uint = 0; i < MapConfig.TILES_IN_ROW; i++) {
            chunk.setTile(1, i, 0, 5000);
            chunk.setTile(1, i, MapConfig.TILES_IN_ROW - 1, 5000);
            chunk.setTile(1, 0, i, 5000);
            chunk.setTile(1, MapConfig.TILES_IN_ROW - 1, i, 5000);
        }

        return chunk;
    }

    /** Mapa testowa: 3 × 3 chunki, nie 100 × 100. */
    public generateTestMap(): Chunk[]
    {
        const chunks: Chunk[] = [];

        for (let cy: uint = 0; cy < 3; cy++) {
            for (let cx: uint = 0; cx < 3; cx++) {
                chunks.push(this.generateChunk({ cx, cy }));
            }
        }

        return chunks;
    }
}
```

Efekt dla mapy testowej: 9 chunków × (grunt 20 KB + ramka 20 KB) = **~360 KB i 18 obiektów `Uint16Array`**.
Dzisiejsza wersja próbowała zrobić 9 × 1,5 MB i **1,53 mln obiektów `Tile`** — i rzucała wyjątkiem, zanim
zdążyła to zrobić.

---

## 8. Mapa zmian plik po pliku

| Plik | Akcja |
|---|---|
| `Core/MapEditor/Chunk.ts` | **przepisany** → `Core/Map/Chunk.ts` (§4) |
| `Core/MapEditor/Tile.ts` | **usunięty**; właściwości → `Core/Map/TileTypeTable.ts` (§6) |
| `Core/MapEditor/MapGenerator.ts` | **rozbity** na `ChunkCodec` + `MapRepository` + chudy `MapGenerator` (§7) |
| `Core/Map/MapConfig.ts` | **nowy** (§3) |
| `Core/Map/ChunkCodec.ts` | **nowy** (§5) |
| `Core/Controller/MapEditorController.ts` | `saveExampleMap()` przepisany na `mapGenerator.generateTestMap()`; przy okazji znika bloker B1 i błędy §5.2 analizy 01 |
| `Core/Database.ts` | `saveMapBin`/`getMapBin` → operacje na pasmach (analiza 02 §6); zaznaczona linia 138 (`openCursor` po całym store) znika |
| `Core/ResourceLoader.ts` | przestaje wrzucać do IDB bloby z zipa; buduje areny i zapisuje format runtime |
| `Core/Config/SquareConfig.ts` | zostaje, ale **przestaje wpływać na klucze mapy** — współrzędne chunków są w tile, nie w pikselach |

### Kolejność, żeby na każdym kroku było zielono

1. `MapConfig` + `Chunk` + `TileTypeTable` — czyste struktury, zero I/O, zero WebGPU.
2. `ChunkCodec` + **testy round-trip**: `chunk → encode → decode → ten sam chunk`, plus przypadki brzegowe
   (chunk pusty, sam grunt, wszystkie 17 warstw, zły magic, zła wersja). To jedyne miejsce w projekcie,
   gdzie testy naprawdę się zwracają — błąd o jeden bajt w offsecie objawia się trzy tygodnie później
   jako „mapa wygląda dziwnie".
3. `MapGenerator` na 3 × 3 + `saveExampleMap()` z powrotem do życia.
4. Dopiero potem `MapRepository`, pasma i areny (analiza 02 §6–7).

Punkty 1–3 **nie zależą od naprawy renderera** — możesz je zrobić natychmiast, niezależnie od blokerów
B2/B3 z analizy 01.

---

## 9. Podsumowanie liczbowe

| | dziś (zamierzone) | po refaktorze |
|---|---:|---:|
| Bajtów na tile | 9 | **2** |
| Chunk z samym gruntem, w RAM | ~1,5 MB + 170 000 obiektów | **20 KB + 1 obiekt** |
| Chunk z samym gruntem, w pliku | 1 530 005 B | **20 048 B** |
| Mapa testowa 3 × 3 | 13,8 MB / 1,53 mln obiektów | **~360 KB / 18 obiektów** |
| Pełna mapa 10k × 10k w RAM | 15,3 GB | **~800 MB** |
| Dekodowanie warstwy | 10 000 × `getUint32`+`getUint8`+`getFloat32` | **1 × `set()`** |

Cała zmiana sprowadza się do tego, że `Chunk` przestaje wymagać 17 wypełnionych warstw, a zaczyna trzymać
17 slotów, które wypełniasz w miarę potrzeb. Reszta — kodek, generator, repozytorium — wynika z tej jednej
decyzji i sprowadza się do przepisania logiki binarnej, która i tak wymagała poprawek (`u16` na współrzędne,
brak walidacji, big-endian).
