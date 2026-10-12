# Analiza 01 — stan projektu (2026-08-31)

Zakres: cały `src/` (TS + WGSL + PHP), konfiguracja builda, `poc/`, zasoby.
Cel odniesienia: **działający map editor** + płynna mapa 10 000 × 10 000 tile z dynamicznym ładowaniem chunków.

---

## 0. TL;DR

Projekt **nie kompiluje się i nie uruchamia**. Nie chodzi o „drobne błędy" — brakuje jednego kluczowego ogniwa
(`RenderPassHandler`), które miało spiąć `Renderer` z `MapEditorHandler`, i cała ścieżka renderowania jest
rozłączona. Do tego dochodzi błąd składni w TS, błąd składni w WGSL, zły podpis konstruktora, singleton
rzucający wyjątkiem przy starcie i brak plików zasobów, których szuka `ResourceLoader`.

Dobra wiadomość: **fundamenty są sensowne**. Podział Core / WebGPU / WGSL jest czytelny, warstwa opakowań
WebGPU (deskryptory jako klasy) jest konsekwentna i kompletna, IndexedDB + format binarny chunków to właściwy
kierunek na mapę 10k×10k. Do działającego edytora brakuje mniej pracy, niż wygląda — ale trzeba naprawić
rzeczy w konkretnej kolejności (rozdział 7).

Statystyka: **7 blokerów**, **~12 błędów walidacji WebGPU**, **7 błędów w WGSL**, **~10 problemów formatu mapy**,
**~15 problemów architektonicznych**, **17 nieużywanych klas/plików**.

---

## 1. Mapa projektu — co tu w ogóle jest

```
src/ts/
├── index.ts, globals.ts          <- wejście + monkey-patch globalny
├── Square.ts                     <- MARTWY, nie kompiluje się (zły import)
├── Core/                         <- Twoja logika
│   ├── Application, Startup, API, NotificationHandler
│   ├── WebGPU.ts (bootstrap urządzenia), Canvas/, Renderer.ts
│   ├── Camera.ts, Database.ts (IndexedDB), ResourceLoader.ts, StagedBuffer.ts
│   ├── Config/  (CameraConfig, SquareConfig, SpritesheetConfig, ColorConfig)
│   ├── Controller/ (Controller, MapEditorController)
│   ├── Exception/
│   └── MapEditor/ (Chunk, Tile, MapGenerator, MapEditorHandler)
├── Math/                         <- CAŁOŚĆ NIEUŻYWANA (Matrix, NDC, ortho, clamp)
├── WebGPU/                       <- biblioteka: deskryptory WebGPU jako klasy OOP (~45 plików)
└── WGSL/                         <- 2 shadery (map_editor.vert / .frag)

poc/StagingBufferRing.ts          <- poza src/, poza buildem, martwy
src/php/                          <- osobny stack (nginx+php-fpm) serwujący 1 plik HTML
```

Deklarowany podział **Core / WebGPU / WGSL** jest już naruszony przez: `Math/`, `Square.ts`, `globals.ts`,
`index.ts` i `poc/`. To do decyzji — albo `Math/` ląduje w `Core/Math/`, albo podział ma 4 części.

---

## 2. BLOKERY — bez tego nic się nie uruchomi

### B1. Błąd składni TypeScript — build pada
`src/ts/Core/Controller/MapEditorController.ts:86`

```ts
for (const )      // <- niedokończona pętla
}
```

`tsc` zwraca `TS1134: Variable declaration expected` i `TS1005: ';' expected`. Cały bundle nie powstaje.
Metoda `prepareData()` jest niedokończona — miała przerobić bloby chunków na coś użytecznego dla GPU.

### B2. Brak typu `RenderPassHandler` — brakujące ogniwo całej architektury
`src/ts/Core/Renderer.ts:10` i `:63` — `TS2304: Cannot find name 'RenderPassHandler'`.

To jest **najważniejszy problem projektu**, nie zwykła literówka. `Renderer` oczekuje obiektu z interfejsem:

```ts
renderPassHandler.getCommandEncoder(): GPUCommandEncoder
renderPassHandler.handle(): void
```

a `MapEditorHandler` — jedyny kandydat — ma zupełnie inny interfejs:

```ts
async draw(commandEncoder: GPUCommandEncoder): Promise<void>
```

Czyli dwie połowy pętli renderowania zostały napisane **pod dwa różne, niekompatybilne kontrakty**:
w `Renderer` encoder tworzy handler, w `MapEditorHandler` encoder przychodzi z zewnątrz. Do tego jedna jest
synchroniczna, druga asynchroniczna. Trzeba wybrać jeden kontrakt (rekomendacja w §7.1).

### B3. `MapEditorHandler` nigdy nie jest tworzony
`grep` pokazuje, że klasa występuje **wyłącznie we własnym pliku**. Nikt nie robi `new MapEditorHandler(...)`,
nikt nie woła `renderer.setRenderPassHandler(...)`. Nawet po naprawie B1/B2 `Renderer.renderFrame()` rzuci
`Missing RenderPassHandler` w pierwszej klatce.

### B4. Zły podpis konstruktora
`src/ts/Core/Application.ts:30` — `TS2554: Expected 4 arguments, but got 3`.

```ts
new MapEditorController(webGPU.canvas.getCanvasElement(), mapGenerator, database)
// MapEditorController wymaga jeszcze resourceLoader (MapEditorController.ts:18)
```

`resourceLoader` jest w `Application.run()` tworzony (linia 24) i… nigdzie nie używany.

### B5. `Camera.getInstance()` bez argumentów rzuca wyjątkiem
`src/ts/Core/Application.ts:17` woła `Camera.getInstance()`, a `Camera.getInstance()`
(`Camera.ts:29-31`) przy pierwszym wywołaniu bez `worldTilesX`/`worldTilesY` robi
`throw new Error('Missing params')`. **Gwarantowany crash w linii 17 `Application.run()`** — czyli nawet po
naprawie B1–B4 aplikacja nie dojdzie do stworzenia renderera.

### B6. `Square.ts` — import nieistniejącego modułu
`src/ts/Square.ts:1`: `import { Vec2 } from "./WebGPU/uCoordsWs"` — plik `uCoordsWs.ts` nie istnieje.
Klasa `Square` nie jest nigdzie używana. Do usunięcia albo do przepisania na `coordsWs` z `types.d.ts`.

### B7. Błąd składni WGSL
`src/ts/WGSL/VertexShader/map_editor.vert.wgsl:28` — brak przecinka:

```wgsl
world_space_to_clip_space(objects[instance].b camera, canvas_size);
//                                          ^ brak przecinka
```

Webpack tego nie złapie (`.wgsl` idzie przez `ts-shader-loader` jako string) — błąd wyjdzie dopiero
w runtime przy `createShaderModule`, jako komunikat w konsoli, bez wyjątku.

---

## 3. WGSL — shader nie ma prawa działać

Poza B7:

| # | Miejsce | Problem |
|---|---|---|
| W1 | `vert:31` | `var output: SquareOutput;` — struktura `SquareOutput` nie istnieje. Zadeklarowana jest `Output`. |
| W2 | `vert:40,42,45,48,56,59` | `const` użyty do wartości runtime (`canvas_size`, `camera`, `ws_coord`). W WGSL `const` = wyrażenie stałe w czasie kompilacji. Musi być `let`. |
| W3 | `vert:20` vs `MapEditorHandler.ts:87-90` | Shader deklaruje `camera: vec2f`, a TS wysyła `new Uint32Array([x, y])`. Typ się nie zgadza (u32 vs f32) — na GPU wyjdą śmieci. Zadeklarowany `struct Camera { x: u32, y: u32 }` jest nieużywany. |
| W4 | `vert:21` | `@group(0) @binding(1) var<uniform> canvas_size` — a TS pod binding 1 podpina **texture view**, pod 2 sampler. Kompletny rozjazd bindingów. |
| W5 | `vert:22` | `@group(1) @binding(0) storage objects` — pipeline layout ma tylko **jedną** bind group layout (`MapEditorHandler.ts:147`). Group 1 nie istnieje. |
| W6 | `vert:27-33` | `cs_vertex_a/b/c` są liczone i wyrzucane; `output.pos` to na sztywno `vec4f(1,1,0,1)`. Vertex shader nic nie rysuje. |
| W7 | `frag:1-4` | Fragment shader zwraca na sztywno czerwony. Brak `@location` wejścia, brak samplowania tekstury — mimo że cała maszyneria spritesheetów jest po stronie TS gotowa. |

**Problem koncepcyjny (ważniejszy niż powyższe):** `struct Triangle { a, b, c: vec2f }` + `@builtin(instance_index)`
oznacza „jedna instancja = jeden trójkąt". Dla mapy kaflowej to zły model. Kwadrat = 2 trójkąty = 6 wierzchołków,
a pozycje rogów są **wyliczalne** z `@builtin(vertex_index)` i pozycji kafla. Nie potrzebujesz ani vertex buffera,
ani index buffera, ani przesyłania trójkątów — patrz §7.2.

---

## 4. WebGPU — błędy walidacji i wydajności

### 4.1 Rzeczy, które API odrzuci

| # | Miejsce | Problem |
|---|---|---|
| G1 | `MapEditorHandler.ts:130-136` | `BindGroupLayoutEntry(0, VERTEX, bufferLayout, samplerLayout, textureLayout)` — spec wymaga **dokładnie jednego** z `buffer`/`sampler`/`texture`/`storageTexture`/`externalTexture`. Podane trzy naraz → błąd walidacji. |
| G2 | `MapEditorHandler.ts:137-140` | Layout ma **1 entry**, a bind group ma **3 entries** (binding 0,1,2). Liczba i typy muszą się zgadzać. |
| G3 | `MapEditorHandler.ts:80` | `{ binding: 0, resource: this.cameraBuffer.masterBuffer }` — `GPUBindingResource` to sampler / texture view / **`GPUBufferBinding`** / external texture. Goły `GPUBuffer` jest niepoprawny. Trzeba `{ buffer }` — i dokładnie po to istnieje nieużywana klasa `WebGPU/Buffer/BufferBinding.ts`. |
| G4 | `MapEditorHandler.ts:56` | `new RenderPassColorAttachment(this.context.getCurrentTexture())` — `view` musi być `GPUTextureView`, brakuje `.createView()`. Sama klasa opakowująca ma zbyt luźny typ (`GPUTexture\|GPUTextureView`) i to ukrywa błąd przed `tsc`. |
| G5 | `MapEditorHandler.ts:131` | `visibility: GPUShaderStage.VERTEX` dla tekstury i samplera, których potrzebuje **fragment** shader. Powinno być `VERTEX \| FRAGMENT` (albo rozbite na osobne entry). |
| G6 | `MasterBufferDescriptor.ts:18` | `allowedUsages.includes(usage)` porównuje flagę jako liczbę — czyli akceptuje tylko **pojedynczą** flagę. `VERTEX \| STORAGE` odpadnie. Powinno być sprawdzenie bitowe: `(usage & MASK) !== 0`. |

### 4.2 Wydajność — `draw()` tworzy wszystko od nowa w każdej klatce

`MapEditorHandler.draw()` (linie 52-70) na **każdą klatkę**:

1. tworzy sampler (`getBindGroup` → `createSampler`),
2. tworzy **teksturę 3200×3200×3 rgba8unorm = ~123 MB** (`getSpritesheetView`),
3. kopiuje do niej 3 spritesheety (`copyExternalImageToTexture` ×3),
4. tworzy bind group layout, bind group, pipeline layout,
5. kompiluje **oba shadery** (`createShaderModule` ×2),
6. tworzy render pipeline (`createRenderPipelineAsync`).

To jest dokładne przeciwieństwo tego, co sam zapisałeś w `todo.txt`:
> *„Pipeline creation - extremely expensive, < 100 is ideal iirc, and all should be done on startup"*
> *„Resource (texture/buffer/bind groups) creation - not that expensive, but cache where possible, esp textures/buffers"*

Przy 60 FPS to ~7 GB alokacji tekstur na sekundę. Sterownik padnie w kilka klatek.
**Wszystko z listy 1-6 musi wyjechać do jednorazowego `init()`.**

### 4.3 Asynchroniczność wewnątrz nagrywania render passa

```ts
const renderPass = commandEncoder.beginRenderPass(...);
renderPass.setBindGroup(0, await this.getBindGroup(...));   // <- await w środku passa
renderPass.setPipeline(await this.getPipeline(...));        // <- await w środku passa
```

Do tego `Renderer.renderFrame()` (linia 78) robi `commandEncoder.finish()` **synchronicznie**, nie czekając na
`draw()`. Efekt: encoder zostaje zamknięty, gdy pass jest wciąż nagrywany → `finish()` na encoderze z otwartym
passem albo nagrywanie do zamkniętego encodera. Nie da się tego naprawić inaczej niż przenosząc `await`
poza pętlę klatki (§4.2 rozwiązuje to samo przy okazji).

Ten sam wzorzec w `MapEditorHandler.ts:54`: `this.cameraBuffer.update(...)` jest `async`, wołane **bez `await`**
— `copyBufferToBuffer` może zostać nagrane po `finish()`.

### 4.4 Pozostałe

- **`Renderer.ts:82`** — `requestAnimationFrame(this.renderFrame)` **bez `.bind(this)`** (w linii 39 bind jest).
  Druga klatka poleci z `this === undefined` → `TypeError`. Klasyczny bug „działa raz".
- **`StagedBuffer`** ma **jeden** staging buffer. Po `unmap()` kolejny `update()` musi czekać na `mapAsync`,
  co oznacza stall CPU↔GPU co klatkę. Rozwiązanie (ring N buforów) jest już napisane w `poc/StagingBufferRing.ts`,
  ale leży poza `src/`, poza buildem i nikt go nie używa. Do decyzji: dokończyć i wciągnąć albo skasować.
- **`StagedBuffer` dla uniformu 8 bajtów** to armata na muchę. Dla malutkiego, co-klatkowego uniformu
  `device.queue.writeBuffer` jest szybszy i prostszy; staging ring ma sens dla dużych buforów tile'i.
- **Liczba spritesheetów `3` zahardkodowana w dwóch miejscach** (`ResourceLoader.ts:36`, `MapEditorHandler.ts:96`)
  zamiast w `SpritesheetConfig`.
- **Niespójność z własnymi notatkami:** `todo.txt` mówi *„nie używać `device.queue.writeTexture`, robić
  `encoder.copyBufferToTexture`"*, a kod używa `copyExternalImageToTexture`. To akurat rozsądne dla `ImageBitmap`,
  ale warto tę notatkę doprecyzować, żeby za pół roku nie było wątpliwości.
- **`SquareConfig.LENGTH = 50` vs `SpritesheetConfig.IMAGE_SIZE = 32`** — kafle o źródle 32 px rysowane na 50 px
  to skalowanie 1,5625×. Dla pixel-artu = rozmycie i nierówne piksele. Rekomendacja: `LENGTH = 32` (lub 64 przy
  zoomie ×2), a rozmiar kafla na ekranie kontrolować kamerą/zoomem, nie źródłem.

---

## 5. Mapa i format chunków — tu leży cel projektu

### 5.1 Sprzeczności w liczbach

`Chunk.ts:6` mówi `TILES_IN_ROW = 100`, a walidacja (`Chunk.ts:35`) wymaga `TILES_IN_ROW²` = **10 000 tile na warstwę**.
Ale komentarz przy `layers` (`Chunk.ts:8-26`) opisuje **1 000 tile na warstwę**, a komentarz przy `size`
(`Chunk.ts:42`) liczy `17 × 1000 × 9 = 153 000 bajtów`.

Realnie: `17 × 10 000 × 9 = **1 530 000 bajtów** (~1,5 MB) na chunk`. Komentarze są 10× zaniżone.

### 5.2 `saveExampleMap()` zawsze rzuca wyjątkiem

`MapEditorController.ts:26-67`:

```ts
let lastTexId: uint = 1;
const generateChunk = (coords, lastTexId, chunkNumber) => {   // <- parametr PRZESŁANIA zewnętrzne lastTexId
    for (texId = lastTexId; texId <= 1000; texId++) { ... }    // <- max 1000 tile, a walidacja chce 10 000
    lastTexId = texId * chunkNumber + 1;                       // <- modyfikuje parametr, nie zewnętrzną zmienną
};
```

Trzy błędy naraz:
1. **Shadowing** — zewnętrzne `lastTexId` nigdy się nie zmienia, wszystkie 9 chunków dostają `1`.
2. **Za mało tile** — pierwsza warstwa dostaje 1000 tile zamiast 10 000.
3. **Kolejne warstwy dostają 0 tile** — po pierwszej iteracji `lastTexId = 1002 > 1000`, pętla się nie wykonuje.

`new Chunk(...)` rzuca `Wrong layer tile count`. Funkcja wystawiona w `API` (`saveExampleMap()` w konsoli) nigdy
nie zadziałała.

### 5.3 Nagłówek chunka jest za mały na docelową mapę

`MapGenerator.HEADER_SIZE = 5`: `version: u8` + `x: u16` + `y: u16`.

Docelowo: 10 000 tile × 50 px = **500 000 jednostek świata** na oś. `setUint16` przepełnia się przy 65 535.
Dla obecnych 3×3 chunków (max x = 10 000) działa, ale to ślepy zaułek. Nagłówek nie zawiera też:
liczby warstw, rozmiaru tile, rozmiaru chunka, informacji o kompresji/paddingu — wszystkiego, co `todo.txt`
przewiduje. `getTiles()` na sztywno zakłada 17 warstw `-8..8` i ignoruje nagłówek.

### 5.4 Skala — dlaczego obecny format się nie skaluje

| Wielkość | Wartość |
|---|---|
| Mapa | 10 000 × 10 000 = **10⁸ tile** |
| Chunk | 100 × 100 tile = 5 000 × 5 000 px |
| Liczba chunków | 100 × 100 = **10 000 chunków** |
| Tile na chunk (17 warstw) | 170 000 |
| Rozmiar chunka (9 B/tile) | ~1,5 MB |
| **Cała mapa nieskompresowana** | **~15,3 GB** |
| Widoczne kafle (800×600, 50 px) | 16 × 12 = 192 (+ ramka → 17 × 13 = 221) |
| Widoczne chunki | max 2 × 2 = **4** |

Wnioski:
- **Renderowanie nie jest problemem.** 221 kafli × 17 warstw ≈ 3 757 quadów w najgorszym razie. To dla GPU nic.
  Cel „60+ FPS" jest osiągalny z ogromnym zapasem.
- **Problem to wyłącznie strumieniowanie danych.** I dokładnie tego w kodzie nie ma.
- **9 bajtów/tile to za dużo.** `collision: bool` i `speedFactor: f32` są w 99% przypadków funkcją `textureId`,
  a nie konkretnego kafla. Rekomendacja: tabela typów kafli (`texId → {collision, speedFactor, ...}`) ładowana raz,
  a w chunku **4 bajty na tile** (`u16 texId` + `u8 flags` + `u8 reserved`) lub nawet 2. To od razu 15,3 GB → 6,8 GB
  przed kompresją, a po kompresji paddingu warstw ≫8 (rzadko wypełnionych) — realnie ułamek tego.
- **Wyrównanie:** `Tile.SIZE = 9` daje offsety 5, 14, 23… — niewyrównane odczyty `getUint32`/`getFloat32`.
  `DataView` to zniesie, ale będzie wolniejsze i **nie da się takiego bufora wrzucić na GPU bez przepakowania**.
  4 bajty na tile rozwiązują to za darmo.

### 5.5 Ładowanie ładuje wszystko naraz — czyli odwrotnie niż zakłada cel

- `Database.getMapBin()` (`Database.ts:124-148`) robi `openCursor()` po **całym** store i zwraca **wszystkie**
  chunki. `ResourceLoader.getMapBin()` (linia 57) cache'uje ten cały wynik w polu. Dla docelowej mapy to
  próba wczytania 15 GB do RAM.
- Nie ma **niczego**, co wybiera chunki wokół kamery. `MapGenerator.getChunk(coords)` czyta tylko z własnej
  pamięci po wygenerowaniu. Brak LRU, brak eviction, brak „załaduj sąsiadów, zwolnij dalekie".
- `Chunk` i `MapGenerator` materializują **obiekty `Tile`** — 170 000 obiektów JS na chunk. Przy 4 widocznych
  chunkach to 680 000 obiektów tylko po to, żeby je zaraz spłaszczyć do bufora GPU. Dane kafli powinny
  **nigdy** nie opuszczać `TypedArray`.

### 5.6 `MapGenerator` łamie SRP

Jedna klasa robi trzy rzeczy: serializację binarną, deserializację i przechowywanie mapy w pamięci
(`mapBin: Record<string, Blob>`). Do rozdzielenia na `ChunkCodec` (blob ↔ typed array) + `ChunkStore`
(co jest w pamięci, LRU) + ewentualnie `MapGenerator` (tworzenie zawartości testowej).

### 5.7 Edytor — co faktycznie jest, a czego nie ma

Jest: `clickHandler` liczący `selectedTileCoords` z pozycji myszy.
Nie ma: **niczego więcej**. `selectedTileCoords` jest zapisywane i **nigdy nie odczytywane**. Brak palety kafli,
brak wyboru warstwy, brak pędzla, brak podświetlenia zaznaczenia, brak zapisu zmiany do chunka, brak undo.

Do tego dwa błędy w tym, co jest:
- **`start(cameraCoords)` przyjmuje snapshot pozycji kamery** (`MapEditorController.ts:69`, `115-120`) i wiąże go
  na stałe w `bind`. `coordsWs` ma `readonly x/y`, a `Camera` zwraca liczby przez gettery — więc po pierwszym
  ruchu kamery kliknięcia trafią w złe kafle. Handler powinien dostać referencję do `Camera`, nie kopię wartości.
  (Obecnie i tak nikt nie woła `start()`.)
- **Niespójna oś Y.** `clickHandler` odwraca Y (`cameraCoords.y + this.canvas.height - event.offsetY`), a shader
  nie odwraca nic. Trzeba wybrać jedną konwencję (proponuję: świat = Y w górę, konwersja tylko na wejściu myszy)
  i zapisać ją w dokumentacji, bo to źródło błędów, które wracają.

---

## 6. Architektura i higiena kodu

### 6.1 Kompozycja i wstrzykiwanie zależności

`Application.run()` to composition root — i to dobrze. Ale:
- tworzy `resourceLoader` i `mapGenerator`, po czym `resourceLoader` **nigdzie nie trafia** (B4),
- nie tworzy `MapEditorHandler`, więc pętla renderowania nie ma co renderować (B3),
- miesza dwa style: **wstrzykiwanie przez konstruktor** (`Renderer`, `Controller`) z **singletonami**
  (`Camera.getInstance()`, `Database.getInstance()`).

`Camera.getInstance(worldTilesX?, worldTilesY?, ...)` to szczególnie zły wariant singletona: **pierwszy wołający
decyduje o konfiguracji**, każdy następny dostaje cudzą. Skoro `Application` i tak jest composition rootem —
`new Camera(...)` i przekazanie referencji jest prostsze, testowalne i nie rzuca wyjątkiem (B5).

### 6.2 `globals.ts` — globalny monkey-patch na kruchym fundamencie

```ts
function empty(obj) { ... }
(globalThis as any).empty = empty;
```

To działa w TS **tylko dlatego**, że `globals.ts` nie ma żadnego `import`/`export` — więc TS traktuje go jako
*skrypt*, a nie moduł, i `function empty` staje się deklaracją globalną. Dodanie jednego `import` do tego pliku
wysypie typowanie `empty()` we wszystkich plikach naraz (`ResourceLoader.ts:23`, `:65`), a błąd będzie wyglądał
na niezwiązany. Rekomendacja: zwykły `export function isEmpty()` w `Core/` albo, skoro OOP — metoda statyczna.
Globalne funkcje w projekcie OOP i tak są obce stylowi.

### 6.3 Kod martwy

**Nieużywane w ogóle** (poza własnym plikiem):

| Kategoria | Pliki |
|---|---|
| Blokujące (nie kompiluje się / brak wywołań) | `Square.ts`, `Core/MapEditor/MapEditorHandler.ts` |
| Cała warstwa matematyczna | `Math/Matrix.ts`, `Matrix2x2/3x3/4x4.ts`, `NDC.ts`, `OrthographicProjectionMatrix.ts`, `clamp.ts` |
| Config | `Core/Config/ColorConfig.ts` |
| Infrastruktura | `Core/NotificationHandler.ts` (importowany w `index.ts`, ale nikt nie dodaje powiadomień) |
| Poza buildem | `poc/StagingBufferRing.ts` |

**Nieużywane opakowania WebGPU** (to akurat normalne dla biblioteki, ale warto wiedzieć):
`BufferBinding`, `BindGroupEntry`, `VertexAttribute`, `PrimitiveState`, `BlendState`, `BlendComponent`,
`MultisampleState`, `DepthStencilState`, `StencilFaceState`, `ComputePipelineDescriptor`, `ComputePassDescriptor`,
`QuerySetDescriptor`, `RenderPassTimestampWrites`, `RenderPassDepthStencilAttachment`, `Origin2DDict`,
`StorageTextureBindingLayout`, `ShaderModuleCompilationHint`.

Ironia: `BufferBinding` jest dokładnie tym, czego brakuje w G3.

### 6.4 Warstwa `Math/` — nieużywana i częściowo błędna

Nawet gdyby była używana:
- `NDC.calculateNDC2()` (`NDC.ts:50`) robi `.addScalar(-1)` na **całej** macierzy wynikowej — czyli odejmuje 1
  także od `z` i `w`. `w` z 1 robi się 0, co rozwala dzielenie perspektywiczne. Komentarz *„własna formuła +
  własny pomysł"* jest szczery, ale wynik jest matematycznie niepoprawny.
- `OrthographicProjectionMatrix` ma translację w **ostatniej kolumnie** (konwencja wektor-kolumna), a
  `Matrix.multiplyBy()` mnoży wiersze bazowej macierzy przez tę macierz (konwencja wektor-wiersz), gdzie
  translacja powinna być w ostatnim **wierszu**. Przy `near=-1, far=1` ten wyraz wynosi 0, więc dziś nie boli —
  ale zaboli przy każdej innej wartości.
- `Matrix2x2/3x3/4x4.multiplyByNxN()` duplikują generyczne `multiplyBy()` (rozwinięte ręcznie dla wydajności),
  ale nikt ich nie woła, a `multiplyBy()` na `Matrix4x4` zwraca `Matrix`, nie `Matrix4x4` — czyli traci typ.

**Decyzja do podjęcia:** shader (`world_space_to_clip_space`) już liczy NDC na GPU i to jest właściwe miejsce.
Wtedy `Math/NDC` + `OrthographicProjectionMatrix` są zbędne. Macierze przydadzą się dopiero przy zoomie/rotacji.
Proponuję: zostawić `Matrix*` jako narzędzie na przyszłość, skasować `NDC.ts` (albo przenieść do `analizy/`
jako notatkę), bo utrwala nieprawidłową formułę.

### 6.5 Build, uruchamianie, zasoby

- **`yarn dev` nie zadziała** — `webpack serve` wymaga `webpack-dev-server`, którego nie ma ani w `package.json`,
  ani w `node_modules`.
- **`"prod": "webpack --help"`** — placeholder, brak builda produkcyjnego.
- **`publicPath: './public'`** w `webpack.config.js` jest niepoprawny dla bundla serwowanego z `/build/`.
- **`src/php/App/index.html:10`** — `<script src="/build/main.bundle.js">` jest **zakomentowany**.
  Nawet gdyby TS się kompilował, przeglądarka niczego by nie załadowała.
- **Brakuje zasobów, których szuka kod:**
  - `ResourceLoader.ts:30` pobiera `spritesheets/spritesheet_${i}.png` — w `public/` są tylko `assets/0.jpg`,
    `1.jpg`, `2.jpg`. Zła ścieżka, zła nazwa, zły format.
  - `ResourceLoader.ts:71` pobiera `vita_map.zip` — plik nie istnieje.
  - `fetch` na 404 nie rzuca wyjątkiem; `response.blob()` zwróci HTML-a, a `createImageBitmap` wywali się
    z mylącym komunikatem. Warto dodać sprawdzenie `response.ok`.
- **Dwa niezależne stacki:** nginx + php-fpm (który serwuje jeden statyczny HTML przez cały pipeline
  `Application → PipeKernel → Pipe → Task → Response`) obok webpacka. Dla projektu w 100% klienckiego PHP nie
  robi nic poza `file_get_contents` + `echo`. Do decyzji: albo świadomie zostawiasz to jako poligon OOP, albo
  zastępujesz statycznym `index.html` i jednym serwerem.

### 6.6 Kamera

- **`keyDownHandler` / `keyUpHandler` przekazane bez `.bind(this)`** (`Camera.ts:51-52`) → wewnątrz handlera
  `this` to `document`, więc `this.isMovingTop = true` ustawia właściwość na `document`. **Kamera nigdy się nie
  ruszy.** (`removeEventListener` akurat zadziała, bo referencja jest ta sama — ale to przypadek.)
- **Ruch zależny od klatek** — `speed` to piksele na klatkę, nie na sekundę. Brak delta time.
- **`CameraConfig.WIDTH/HEIGHT` pełni dwie role naraz**: rozmiar canvasa (`WebGPU.ts:40`) i rozmiar viewportu
  kamery (`Camera.ts:19-20`). Przy celu „obsługa resize" i „zoom" (README p. 7 i 8) to trzeba rozdzielić:
  rozmiar canvasa ≠ obszar świata widziany przez kamerę.
- **Brak zoomu** — a `world_space_to_clip_space` w shaderze ma zaszyty `viewport = vec2f(800, 600)` jako stałą,
  co blokuje zarówno zoom, jak i resize.

### 6.7 Drobiazgi

- `API.init()` przypina prywatne metody do `window` przez `Object.getOwnPropertyNames(API.prototype)` —
  sprytne, ale bez obsługi błędów: `saveExampleMap()` w konsoli rzuci wyjątkiem bez kontekstu (§5.2).
- `MapEditorController.saveExampleMap()` nie czeka na `this.database.saveMapBin(mapBin)` (linia 66) →
  ewentualny błąd zapisu zginie jako unhandled rejection.
- `types.d.ts`: `uint`, `int`, `float`, `bytes` to aliasy `number` — czyli **dokumentacja, nie typowanie**.
  Nic nie powstrzyma ujemnego `uint`. To świadomy kompromis, ale warto go zapisać, żeby nie mylić z gwarancją.
- Brak testów, lintera, CI. Przy formacie binarnym mapy testy round-trip (`Chunk → bin → Chunk`) zwróciłyby się
  natychmiast — to jedyne miejsce, gdzie testy w tym projekcie są naprawdę opłacalne.

---

## 7. Plan naprawczy — kolejność ma znaczenie

### Faza 0 — „kompiluje się i nie wybucha" (kilka godzin)

1. Napraw `for (const )` w `MapEditorController.prepareData()` — na razie wystarczy pusty szkielet metody.
2. Usuń `Square.ts` (albo popraw import na `coordsWs`).
3. **Zdefiniuj `RenderPassHandler`** w `Core/` i wybierz kontrakt. Rekomendacja — właścicielem encodera jest
   `Renderer`, handler jest synchroniczny:
   ```ts
   export interface RenderPassHandler {
       handle(commandEncoder: GPUCommandEncoder): void;
   }
   ```
   `MapEditorHandler` implementuje to zamiast `async draw(...)`. Wszystko, co asynchroniczne (tekstury, pipeline),
   ląduje w osobnym `static async create(...)` / `init()`.
4. `Camera` — `new Camera(...)` w `Application` zamiast `getInstance()`, plus `.bind(this)` na handlerach klawiszy.
5. `Renderer.renderFrame` — `.bind(this)` w linii 82 (albo arrow function jako pole klasy — wtedy problem znika raz na zawsze).
6. `Application` — przekaż `resourceLoader` do `MapEditorController`, stwórz `MapEditorHandler`, zawołaj
   `renderer.setRenderPassHandler(...)`.
7. Odkomentuj `<script>` w `index.html`, dodaj `webpack-dev-server` do devDeps (albo usuń skrypt `dev`).
8. Dorzuć brakujące zasoby: `public/spritesheets/spritesheet_{0,1,2}.png` — na start wystarczą wygenerowane
   placeholdery. Dodaj `if (!response.ok) throw ...` w `ResourceLoader`.

**Kryterium wyjścia:** canvas na ekranie wypełniony kolorem czyszczenia, konsola bez błędów, `start()` i `pause()` działają.

### Faza 1 — „widać jeden kafel" (najważniejszy krok)

9. Przenieś **całe** tworzenie zasobów z `draw()` do `MapEditorHandler.create()`: tekstura spritesheetów,
   sampler, bind group layout, bind group, pipeline. W klatce zostaje: update uniformu kamery + `beginRenderPass`
   + `setPipeline` + `setBindGroup` + `draw` + `end`.
10. Napraw bindingi: **jedna** `BindGroupLayoutEntry` na binding, `visibility` zgodne z użyciem w shaderze,
    `BufferBinding` zamiast gołego `GPUBuffer`, `getCurrentTexture().createView()`.
11. Napraw WGSL: przecinek, `Output` zamiast `SquareOutput`, `let` zamiast `const`, `u32`↔`f32`,
    dodaj wyjście UV z vertex shadera i samplowanie w fragmencie.
12. **Zmień model rysowania na instancing bez vertex buffera:**
    ```wgsl
    struct TileInstance { pos: vec2u, texId: u32, layer: u32 }
    @group(1) @binding(0) var<storage, read> tiles: array<TileInstance>;

    @vertex fn main(@builtin(vertex_index) vi: u32,
                    @builtin(instance_index) ii: u32) -> Output { ... }
    ```
    `renderPass.draw(6, tileCount)` — róg kwadratu liczysz z `vi` (0..5), pozycję i teksturę z `tiles[ii]`.
    Zero vertex bufferów, zero index bufferów, jeden draw call na warstwę (albo jeden na wszystko, jeśli
    warstwę trzymasz w danych instancji i sortujesz po niej po stronie CPU przy wypełnianiu bufora).
    Dodaj drugą bind group (group 1) do pipeline layoutu.

**Kryterium wyjścia:** siatka kafli z tekstur na ekranie, kamera na WSAD przesuwa mapę, stabilne 60 FPS.

### Faza 2 — strumieniowanie chunków (właściwy cel)

13. **Przeprojektuj format chunka.** Propozycja nagłówka (16 B, wyrównany):
    ```
    u32 magic ("VTMP")
    u16 version
    u16 tileStride        (bajty na tile)
    u32 chunkX, chunkY    (współrzędne w tile, nie w pikselach)
    u8  layerCount
    u8  compression       (0 = brak, 1 = RLE/bitmask paddingu)
    u16 tilesInRow
    ```
    Tile: **4 bajty** (`u16 texId`, `u8 flags`, `u8 reserved`). `collision`/`speedFactor` → tabela typów kafli
    ładowana raz, indeksowana przez `texId`.
14. **Nigdy nie materializuj `Tile[]`.** `ChunkCodec.decode(blob): Uint32Array` i koniec — ten sam bufor idzie
    prosto do `device.queue.writeBuffer` / staging ring.
15. Rozbij `MapGenerator` na `ChunkCodec` (bin ↔ typed array), `ChunkStore` (LRU w pamięci + IndexedDB, ładowanie
    i zwalnianie pojedynczych chunków po kluczu) i `MapGenerator` (tylko dane testowe — i napraw §5.2).
16. Dodaj `Database.getChunk(key)` / `putChunk(key, blob)` — **pojedynczy chunk**, nie `openCursor()` po całym
    store (`Database.ts:124`).
17. `ChunkStreamer`: z pozycji i rozmiaru kamery licz zbiór widocznych chunków + ramkę bezpieczeństwa (3×3),
    ładuj brakujące asynchronicznie, zwalniaj te poza zasięgiem. Docelowo ładowanie/dekompresja w Web Workerze,
    żeby nie zacinać klatki.

**Kryterium wyjścia:** przejazd kamerą przez mapę 3×3 chunki bez zacięć, w konsoli widać ładowanie i zwalnianie
chunków, zużycie pamięci stałe.

### Faza 3 — właściwy edytor

18. Paleta kafli (render spritesheeta do DOM lub drugi render pass), wybór warstwy (-8..8), podświetlenie
    zaznaczonego kafla.
19. `selectedTileCoords` → faktyczna edycja: zapis do `Uint32Array` chunka, oznaczenie chunka jako „dirty",
    ponowny upload tylko zmienionego fragmentu bufora.
20. Zapis dirty chunków do IndexedDB, eksport zip (`download()` już jest — wystarczy wystawić w `API`).
21. Undo/redo jako stos operacji (`{chunkKey, layer, index, oldTexId, newTexId}`) — tanie i wystarczające.

### Faza 4 — porządki

22. Usuń kod martwy (§6.3) albo świadomie go oznacz.
23. Zdecyduj los `poc/StagingBufferRing.ts` i `Math/NDC.ts`.
24. Ujednolić oś Y i zapisać konwencję w `CLAUDE.md`.
25. Testy round-trip formatu chunka.
26. Rozdzielić rozmiar canvasa od viewportu kamery (przygotowanie pod zoom i resize).

---

## 8. Decyzje do podjęcia (blokują projektowanie dalszych rzeczy)

1. **Kto jest właścicielem `GPUCommandEncoder`** — `Renderer` czy handler? (Rekomendacja: `Renderer`.)
2. **Ile bajtów na tile i co w nich siedzi?** Bez tego nie da się zaprojektować ani formatu pliku, ani bufora GPU.
   (Rekomendacja: 4 B + tabela typów kafli.)
3. **Rozmiar kafla: 32 czy 50 px?** (Rekomendacja: 32, zgodnie ze spritesheetem.)
4. **Czy 17 warstw to sztywna stała?** Jeśli tak — do `Config`, jeśli nie — do nagłówka chunka.
5. **Los warstwy PHP** — poligon OOP czy do usunięcia?
6. **NDC na CPU czy na GPU?** (Rekomendacja: GPU, jak teraz w shaderze — wtedy `Math/NDC` do kasacji.)
7. **Singletony czy DI?** Mieszanie obu jest najgorszą opcją. (Rekomendacja: DI z `Application` jako composition root.)

---

## 9. Co jest dobre i czego nie ruszać

Żeby nie zgubić proporcji — sporo rzeczy jest tu zrobionych porządnie:

- **Warstwa `WebGPU/`** — konsekwentne opakowania deskryptorów z komentarzami wartości domyślnych ze specyfikacji.
  To realnie ułatwia pracę i jest najlepiej utrzymaną częścią projektu.
- **Podział Core / WebGPU / WGSL** — dobry pomysł, wart wyegzekwowania (dziś częściowo naruszony).
- **`Database`** — poprawna obsługa IndexedDB: `initPromise` przeciw podwójnej inicjalizacji, resolve na
  `transaction.oncomplete` a nie na `request.onsuccess` (częsty błąd), obsługa `onblocked`.
- **Format binarny chunków + zip + IndexedDB jako cache** — właściwy kierunek na 10k×10k, wymaga tylko
  przeprojektowania szczegółów (§7.2).
- **`todo.txt`** — notatki o kosztach operacji WebGPU są trafne. Kod ich na razie nie stosuje, ale wiedza jest.
- **Rozmiar chunka 100×100 tile** — dobrze dobrany: max 4 chunki widoczne naraz przy viewporcie 800×600.
- **`poc/StagingBufferRing.ts`** — analiza problemu w komentarzach jest sensowna, łącznie z samokrytyką.

---

## 10. Podsumowanie jednym akapitem

Największym problemem nie są błędy składni (te naprawia się w 15 minut), tylko **rozjazd kontraktów między
`Renderer` a `MapEditorHandler`** oraz **model danych mapy, który nie skaluje się do zadeklarowanego celu**
(9 B/tile × 10⁸ tile = 15 GB, ładowane w całości do RAM). Renderowanie 10k×10k tile jest z punktu widzenia GPU
banalne — całą trudność stanowi strumieniowanie, a strumieniowania w kodzie jeszcze nie ma. Kolejność prac:
najpierw spiąć pętlę renderowania i zobaczyć jeden otekstursowany kafel (Faza 0-1), dopiero potem przeprojektować
format chunka i dopisać `ChunkStore` + `ChunkStreamer` (Faza 2). Edytor (Faza 3) jest wtedy prostą nadbudową,
bo cała mechanika już działa.
