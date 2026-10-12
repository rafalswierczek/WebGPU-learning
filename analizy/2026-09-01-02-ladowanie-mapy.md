# Analiza 02 — ładowanie mapy: cała mapa w RAM (2026-09-01)

Kontekst: decyzja projektowa — **wczytujemy całą mapę raz, przy starcie gry, i trzymamy ją w pamięci**.
Bez doładowywania chunków w trakcie gry. Budżet: „kilka GB RAM to nie problem".

Ta analiza odpowiada na pytanie *jak* to zrobić i ile to naprawdę kosztuje.
Poprzednia: [2026-08-31-01-stan-projektu.md](2026-08-31-01-stan-projektu.md).

---

## 1. Werdykt

**Da się, i to dobrze — ale nie w obecnym formacie.** Przy dzisiejszych 9 bajtach na tile i gęstym trzymaniu
wszystkich 17 warstw wychodzi **15,3 GB**, czyli poza zasięgiem karty pamięci przeglądarki, nie tylko Twojego
budżetu. Po przeprojektowaniu układu danych ta sama mapa mieści się w **~0,5–1,1 GB** — czyli **mniej niż
zakładałeś**, a dostajesz dokładnie to, o co Ci chodziło: zero doładowywania w trakcie gry.

Co ważniejsze: ta decyzja **radykalnie upraszcza renderer**. Znika `ChunkStreamer`, LRU, eviction, asynchroniczne
ładowanie w trakcie klatki i wszystkie związane z tym błędy. Zostaje: „przeczytaj prostokąt z tablicy, wypchnij
520 instancji na GPU". To jest realna wygrana, nie kompromis. Rozdział 9 pokazuje ile kodu to wycina.

Warunek: **2 bajty na tile zamiast 9** i **rzadkie warstwy alokowane tylko tam, gdzie istnieją**.

---

## 2. Skąd się biorą gigabajty (i dlaczego nie z rozmiaru mapy)

Intuicja mówi „10 000 × 10 000 = 10⁸ tile, po 2 bajty = 200 MB, spoko". I to jest prawda — **dla jednej warstwy**.
Problemem nie jest szerokość mapy, tylko **17 warstw**:

| Wariant | Bajtów/tile | Slotów | RAM |
|---|---:|---:|---:|
| Dziś: 17 warstw gęsto, `Tile.SIZE = 9` | 9 | 1,7 × 10⁹ | **15,3 GB** ❌ |
| 17 warstw gęsto, 4 B/tile | 4 | 1,7 × 10⁹ | 6,8 GB ❌ |
| 17 warstw gęsto, 2 B/tile | 2 | 1,7 × 10⁹ | 3,4 GB ⚠️ |
| **Grunt gęsto + overlaye rzadko, 2 B/tile** | 2 | ~2,5–5 × 10⁸ | **0,5–1,1 GB** ✅ |
| To samo, ale 4 B/tile | 4 | ~2,5–5 × 10⁸ | 1,0–2,2 GB ✅ |

Kluczowa obserwacja jest w Twoim własnym `todo.txt`:

> *„poziom 0 ma najwięcej tile (raczej 100% wypełnienia); im dalszy poziom, tym mniej wypełnienia i więcej paddingu"*

Czyli **16 z 17 warstw jest rzadkich**. Trzymanie ich gęsto to płacenie 3,2 GB za tablice wypełnione zerami.
Wystarczy nie alokować pustych — i cały problem znika. Nie trzeba żadnej egzotyki, kompresji w pamięci ani
sprytnych struktur. Wystarczy **nie alokować tego, czego nie ma**.

Dodatkowo: górna granica pojedynczego `ArrayBuffer` w V8 jest ograniczona (rząd 2 GB, zależnie od wersji
przeglądarki). Wariant „jeden gęsty bufor na wszystko" i tak trzeba by dzielić. Przy proponowanym układzie
największy pojedynczy bufor ma 200 MB, więc problem nie występuje.

---

## 3. Model pamięci

Dwa poziomy, bo dane mają dwie zupełnie różne charakterystyki.

### 3.1 Grunt (warstwa 0) — jedna wielka gęsta tablica

```ts
ground: Uint16Array          // 10_000 * 10_000 = 10⁸ elementów = 200 MB
index  = y * WORLD_TILES_X + x     // globalne współrzędne tile, row-major
```

Zawsze wypełniony, zawsze zaalokowany, odczyt O(1) bez żadnego wyszukiwania chunka.
**To jest cała magia tego podejścia**: nie ma „znajdź chunk, znajdź tile w chunku". Jest jeden indeks.

200 MB to koszt, który akceptujemy w całości i bezwarunkowo.

### 3.2 Overlaye (pozostałe 16 warstw) — alokowane per (chunk, warstwa)

```ts
/** 10_000 chunków × 17 slotów; null = warstwa nie istnieje w tym chunku */
overlays: (Uint16Array | null)[]      // długość 170_000, ~1,4 MB samych wskaźników
slot     = chunkIndex * LAYER_COUNT + layer
chunkIndex = chunkY * CHUNKS_X + chunkX
```

Każdy niepusty slot to `Uint16Array(100 * 100)` = **20 KB**.

Koszt zależy wyłącznie od tego, ile warstw faktycznie użyjesz:

| Śr. niepustych warstw overlay na chunk | RAM overlayów | Razem z gruntem |
|---:|---:|---:|
| 1 | 200 MB | 400 MB |
| 3 | 600 MB | **800 MB** |
| 5 | 1,0 GB | 1,2 GB |
| 16 (wszystkie, nierealne) | 3,2 GB | 3,4 GB |

Realistycznie: grunt + 1–2 warstwy dekoracji + sporadycznie dach/drzewo → **~800 MB**. Mieści się w budżecie
z dużym zapasem i zostawia miejsce na tekstury, bufory GPU i resztę gry.

### 3.3 Furtka na później: warstwy rzadkie z indeksem wierszy

Jeśli okaże się, że wiele warstw ma po kilkadziesiąt tile na chunk, gęste 20 KB jest marnotrawstwem.
Wtedy trzeci tryb przechowywania:

```
rowStart: Uint16Array(100)     // offset początku każdego wiersza w entries
entries:  Uint32Array(n)       // spakowane (x:u16, texId:u16), posortowane po x w obrębie wiersza
```
Koszt `200 B + n × 4 B`, opłaca się poniżej ~50% wypełnienia, a odczyt viewportu nadal jest szybki
(skanujesz tylko wiersze, które widać).

**Nie implementuj tego teraz.** Ale **zarezerwuj bajt trybu w formacie pliku** (`EMPTY | DENSE | SPARSE_ROWS`),
żeby dodanie tego później nie wymagało migracji danych. To kosztuje jeden bajt i zero wysiłku dzisiaj.

---

## 4. Tile ma 2 bajty, reszta idzie do tabeli typów

To jest zmiana, która robi całą różnicę (9 B → 2 B):

```ts
// W mapie: tylko identyfikator.
type TileId = uint;    // u16, 0 = pusto, 1..65535 = typ kafla

// Obok mapy, ładowane raz: właściwości KAŻDEGO typu kafla.
class TileTypeTable {
    private readonly collision: Uint8Array;    // 65_536 B
    private readonly speedFactor: Float32Array; // 262_144 B
    // razem < 512 KB na całą grę
}
```

Uzasadnienie: `collision` i `speedFactor` **nie są cechą konkretnego kafla na mapie, tylko jego typu**.
Każda ściana o `texId = 412` ma tę samą kolizję. Trzymanie tego per tile to powielenie tej samej informacji
10⁸ razy — 500 MB na dane, które mieszczą się w 512 KB.

Efekt uboczny, który jest czystym zyskiem: zmiana „drzewo jednak blokuje ruch" to edycja **jednego wiersza
tabeli**, a nie przejście po całej mapie i przepisanie 40 000 kafli.

Kontrola zakresu: `u16` daje 65 535 typów kafli. Dziś `SpritesheetConfig` to 100 × 100 × 3 arkusze = **30 000
sprite'ów**, więc masz ponad 2× zapasu. Gdyby kiedyś zabrakło — przejście na `u32` podwaja RAM (400 MB grunt),
co nadal mieści się w budżecie. Decyzja jest odwracalna, więc nie ma co się nad nią zastanawiać teraz.

**`texId = 0` jest zarezerwowane jako „pusto"** — zgodnie z Twoją notatką o zerowym paddingu w `todo.txt`.

---

## 5. Format pliku chunka

Format dystrybucyjny (to, co siedzi w `vita_map.zip` i co eksportuje edytor). Nagłówek wyrównany do 4 B:

> **Doprecyzowane w [analizie 03](2026-09-01-03-refaktor-chunka.md) §5.1:** nagłówek ma finalnie 48 B
> (doszły `tilesInRow` i `reserved`, dzięki czemu plik jest samoopisujący), a cały format jest little-endian.

```
offset  typ    pole
------------------------------------------------------------------
 0      u32    magic          "VTMP" (0x504D5456)
 4      u16    version        2
 6      u8     tileStride     2
 7      u8     layerCount     17
 8      u32    chunkX         w TILE, nie w pikselach
12      u32    chunkY
16      u32    layerMask      bit N = warstwa N obecna w pliku
20      u8[17] layerMode      0=EMPTY, 1=DENSE, 2=SPARSE_ROWS
37      u8[3]  padding        wyrównanie do 40
------------------------------------------------------------------
40      dane obecnych warstw, w kolejności rosnących indeksów
```

Trzy rzeczy, które to naprawia względem obecnego `MapGenerator`:

1. **`u32` na współrzędne.** Dzisiejsze `setUint16` (`MapGenerator.ts:130-131`) przepełnia się przy 65 535,
   a docelowa mapa ma 500 000 jednostek świata na oś. To była mina z opóźnionym zapłonem.
2. **`layerMask` zamiast paddingu zerami.** Twój `todo.txt` przewidywał kompresowanie paddingu przy transporcie.
   Lepiej **nie zapisywać go w ogóle** — kompresor nie musi się domyślać, że 20 KB zer to nic. Pusta warstwa
   kosztuje 0 bajtów zamiast 20 KB przed kompresją.
3. **Współrzędne w tile, nie w pikselach.** Dzisiaj klucz chunka to `x * SquareConfig.LENGTH`
   (`MapEditorController.ts:49`), czyli zmiana rozmiaru kafla z 50 na 32 px unieważnia całą mapę.
   Współrzędne w tile są niezależne od tego, jak duży kafel narysujesz.

Rozmiar chunka: 40 B + (liczba obecnych warstw × 20 000 B). Chunk z gruntem + 2 overlayami = ~60 KB
(zamiast dzisiejszych 1,5 MB). Po DEFLATE — dużo mniej, bo mapy kaflowe mają ogromne powtarzalne obszary.

---

## 6. IndexedDB: rozdziel format dystrybucji od formatu runtime

Dziś `ResourceLoader.getMapBin()` (`ResourceLoader.ts:71-88`) wrzuca do IndexedDB **bloby wyjęte z zipa**,
czyli za każdym startem gry parsujesz 10 000 plików od nowa. To jest ten sam koszt co przy pierwszym uruchomieniu —
cache nie daje prawie nic.

Zamiast tego: **w IndexedDB trzymaj to, co wchodzi do RAM 1:1, gotowe do `memcpy`.**

### Store'y

| Store | Klucz | Wartość | Rozmiar |
|---|---|---|---|
| `map_meta` | `'meta'` | `{version, worldTilesX/Y, tilesInChunk, layerCount, bandCount}` | < 1 KB |
| `map_ground` | `bandIndex` 0..99 | `Blob` — 100 wierszy tile gruntu | 2 MB × 100 |
| `map_overlay` | `bandIndex` 0..99 | `Blob` — spakowane overlaye pasma + indeks | zmienne |
| `tile_types` | `'table'` | `Blob` | 512 KB |

**Pasmo (band)** = jeden rząd chunków = 100 chunków = 10 000 × 100 tile gruntu = **2 MB**.

Dlaczego pasma, a nie 10 000 osobnych rekordów:

- **Odczyt**: 100 requestów po 2 MB zamiast 10 000 requestów po 60 KB. Każdy `IDBRequest` to round-trip przez
  wątek IDB — przy 10 000 rekordach sam narzut przebija czas czytania danych.
- **Zapis po edycji**: edytor zmienia jeden kafel → przepisujesz **jedno pasmo 2 MB**, nie całe 200 MB.
- Pasmo jest liniowym wycinkiem areny gruntu, więc wczytanie to `ground.set(new Uint16Array(bandBuffer), offset)` —
  dosłownie kopiowanie pamięci, zero parsowania.

### Skąd co pochodzi

```
vita_map.zip  ─── format DYSTRYBUCJI (per chunk, edytowalny, eksportowalny)
      │
      │  jednorazowo, przy pierwszym uruchomieniu
      ▼
IndexedDB     ─── format RUNTIME (pasma, gotowe do memcpy) ── cache, odtwarzalny
      │
      │  przy każdym starcie
      ▼
RAM           ─── areny (ground + overlays)
```

IndexedDB jest **cache'em pochodnym** — jeśli `map_meta.version` nie zgadza się z wersją kodu, kasujesz store'y
i odbudowujesz z zipa. Żadnych migracji, żadnego wersjonowania w nieskończoność.

---

## 7. Pipeline ładowania

### Ścieżka A — pierwsze uruchomienie (albo zmiana wersji formatu)

```
1. fetch('vita_map.zip')                     ~30-80 MB, zależnie od zawartości
2. rozpakuj (DecompressionStream/JSZip)
3. dla każdego chunka: zdekoduj nagłówek, wpisz warstwy do aren w RAM
4. zrzuć areny do IndexedDB pasmami (100 + 100 zapisów)
5. gotowe — dane już są w RAM, nie czytamy ich z powrotem
```

Krok 5 jest ważny: budując areny **już masz mapę w pamięci**. Zapis do IDB to tylko przygotowanie
na następny raz i może lecieć w tle, po tym jak gra już wystartuje.

### Ścieżka B — każde kolejne uruchomienie

```
1. przeczytaj map_meta, sprawdź wersję
2. zaalokuj ground: Uint16Array(10⁸)                        200 MB
3. 100 × get(map_ground, band) → ground.set(band, offset)   czysty memcpy
4. 100 × get(map_overlay, band) → alokuj niepuste Uint16Array
5. gotowe
```

Zero parsowania, zero dekompresji, zero tworzenia obiektów. Tylko kopiowanie bloków pamięci.

### Wszystko w Web Workerze

```ts
// worker: buduje areny, potem oddaje je bez kopiowania
self.postMessage({ ground: groundBuf, overlays }, [groundBuf, ...overlayBufs]);
```

`ArrayBuffer` są **transferable** — przekazanie 800 MB do wątku głównego jest przepięciem wskaźnika, nie kopią.
Dzięki temu ekran ładowania animuje się płynnie, a nie zamarza na kilka sekund. To jest jedyny moment
w całej grze, kiedy Worker jest naprawdę potrzebny — i akurat tutaj daje bardzo dużo za bardzo mało.

Postęp raportuj per pasmo (`{loaded: 47, total: 200}`) — masz naturalny pasek ładowania za darmo.

### Budżety czasowe (szacunki do zweryfikowania pomiarem)

| Etap | Szacunek |
|---|---|
| Alokacja `Uint16Array(10⁸)` | < 100 ms (system zeruje strony leniwie) |
| Odczyt 200 rekordów IDB, ~400 MB | 1–3 s (SSD, bloby są file-backed) |
| `set()` do aren | ~0,3 s |
| **Ścieżka B razem** | **~2–4 s** |
| Ścieżka A (zip + dekompresja + budowa) | 10–40 s, raz w życiu |

Te liczby trzeba **zmierzyć**, nie zakładać — różnice między maszynami będą duże. Ale rząd wielkości jest
akceptowalny dla ekranu ładowania na starcie gry.

---

## 8. Co to daje rendererowi — właściwa nagroda

Skoro cała mapa jest w RAM, warstwa renderowania robi się banalna:

```ts
class ViewportSampler
{
    /** Buduje bufor instancji dla widocznego prostokąta. */
    public sample(camera: Camera, out: Uint32Array): uint
    {
        // 1. przelicz pozycję kamery na zakres tile (+1 kafel marginesu)
        // 2. dla gruntu: 20 wierszy × memcpy-podobna pętla po ground
        // 3. dla overlayów: dla widocznych chunków sprawdź overlays[slot] !== null
        // 4. zwróć liczbę instancji
    }
}
```

Liczby przy kaflu 32 px i canvasie 800 × 600:

| | |
|---|---:|
| Widoczne kafle (+ margines) | 26 × 20 = **520** |
| Instancji w najgorszym razie (17 warstw) | ~8 800 |
| Rozmiar bufora instancji (8 B) | **~71 KB** |
| Przebudowa | tylko gdy kamera przekroczy granicę kafla |

Płynne przewijanie między kaflami załatwia uniform kamery w shaderze — bufor instancji nie musi się zmieniać
co klatkę. Przy prędkości kilku pikseli na klatkę to przebudowa raz na kilkanaście klatek, kosztem
kilkudziesięciu mikrosekund.

**Czego nie trzeba napisać** dzięki decyzji „wszystko w RAM":

- ~~`ChunkStreamer`~~ — który chunk załadować, kiedy, z jakim marginesem
- ~~LRU / eviction~~ — co wyrzucić i kiedy
- ~~asynchroniczne ładowanie w trakcie klatki~~ — i cała klasa błędów „kafel jeszcze się nie doczytał"
- ~~zarządzanie pulą buforów GPU per chunk~~
- ~~zacięcia przy przekraczaniu granicy chunka~~ — najbardziej upierdliwy problem w grach z otwartą mapą

To jest kilkaset linii kodu i tydzień debugowania, których po prostu **nie będzie**. Dlatego uważam,
że Twój pomysł jest dobry — nie jako kompromis „mamy dużo RAM, to się nie starajmy", tylko jako świadomy
wybór prostszej architektury opłacony pamięcią, której faktycznie jest pod dostatkiem.

---

## 9. Uczciwie: koszty i ryzyka tego podejścia

Trzy realne minusy, każdy z obejściem:

### 9.1 Pierwsze uruchomienie wymaga pobrania całej mapy

30–80 MB downloadu i 10–40 s budowy aren, zanim gra w ogóle wystartuje. Na wolnym łączu to bolesne pierwsze
wrażenie.

**Obejście (na później, nie teraz):** *progressive backfill* — załaduj najpierw pasma wokół pozycji startowej
gracza (kilka sekund), pozwól grać, resztę dociągaj w Workerze w tle. Efekt końcowy jest ten sam (cała mapa
w RAM), zmienia się tylko moment, w którym gracz przestaje patrzeć na pasek postępu. Ważne: **ten wariant nie
wymaga zmiany formatu ani modelu pamięci**, tylko kolejności wypełniania aren. Można dopisać kiedykolwiek.

### 9.2 Maszyny z małą ilością RAM

Tab zajmujący 1 GB na komputerze z 8 GB zadziała. Na 4 GB albo na telefonie — może zostać ubity przez system,
i to bez żadnego czytelnego błędu, po prostu „Aw, Snap".

**Obejście:** `navigator.deviceMemory` daje przybliżoną ilość RAM. Poniżej progu — komunikat i tryb awaryjny
(np. tylko grunt + 2 warstwy, reszta doładowywana). Ale to jest problem na **później**; teraz nie projektuj
pod niego, tylko **nie zamykaj sobie drogi**: trzymaj ładowanie w `MapLoader` za interfejsem, żeby druga
strategia dała się dopisać obok, a nie przez przepisanie połowy kodu.

### 9.3 Edytor musi śledzić zmiany

Skoro mapa jest w RAM w całości, zapis „całości" po każdym kliknięciu odpada.

**Rozwiązanie:** `Set<bandIndex>` z brudnymi pasmami + zapis z debounce (np. 2 s po ostatniej edycji albo na
`beforeunload`). Edycja jednego kafla brudzi jedno pasmo = 2 MB zapisu. Do tego stos undo jako lista operacji
`{layer, tileIndex, oldId, newId}` — po 12 bajtów na operację, więc 100 000 kroków undo kosztuje 1,2 MB.

---

## 10. Szkielet klas i kolejność wdrożenia

```
Core/Map/
├── MapData.ts          areny + get/setTile(x, y, layer); JEDYNE miejsce znające układ pamięci
├── TileTypeTable.ts    texId → {collision, speedFactor}
├── ChunkCodec.ts       nagłówek + warstwy: blob ↔ zapis do aren (bez tworzenia obiektów Tile)
├── BandCodec.ts        arena ↔ blob pasma (format runtime w IndexedDB)
├── MapLoader.ts        orkiestracja: meta → IDB albo zip → areny; raportuje postęp
├── MapRepository.ts    dostęp do IndexedDB (zastępuje getMapBin/saveMapBin)
├── ViewportSampler.ts  areny → bufor instancji dla widocznego prostokąta
└── worker/MapWorker.ts ładowanie poza wątkiem głównym
```

`Chunk` i `Tile` w obecnej postaci **znikają z gorącej ścieżki**. `Tile` może zostać jako obiekt widoku
w edytorze (`getTileAt(x, y): TileView`), ale mapa nigdy nie materializuje 170 000 obiektów na chunk.

### Kolejność, żeby cały czas mieć coś działającego

1. **`MapData` + `TileTypeTable`** — czyste struktury, zero I/O. Da się przetestować bez przeglądarki.
2. **`ChunkCodec` + testy round-trip** (`zapis → odczyt → to samo`). To **jedyne** miejsce w projekcie,
   gdzie testy naprawdę się opłacają — błąd o jeden bajt w offsecie objawi się jako „mapa wygląda dziwnie"
   trzy tygodnie później.
3. **`MapGenerator` na nowo** — generuj mapę testową **3 × 3 chunki** (a nie 100 × 100). Wszystko działa
   tak samo, tylko szybciej się iteruje. Przy okazji naprawiasz błędy z §5.2 analizy 01.
4. **`MapRepository` + `BandCodec`** — ścieżka B ładowania.
5. **`ViewportSampler`** — i dopiero teraz podpinasz to pod renderer z Fazy 1 analizy 01.
6. **Worker** — na końcu, jako optymalizacja. Do 3 × 3 chunków wątek główny wystarczy w zupełności.

Punkty 1–3 możesz zrobić **zanim** cokolwiek się wyrenderuje — nie zależą od naprawy renderera.
To dobra robota na teraz, bo odblokowuje decyzję nr 2 z analizy 01 (ile bajtów na tile), która blokuje resztę.

---

## 11. Co ta decyzja zmienia w analizie 01

| Punkt analizy 01 | Status po tej decyzji |
|---|---|
| §7.2 pkt 17 — `ChunkStreamer`, LRU, eviction | **Skreślone.** Nie będzie potrzebne. |
| §7.2 pkt 16 — `Database.getChunk(key)` per chunk | **Zmienione** na odczyt pasmami (§6). |
| §5.5 — „ładuje wszystko naraz, odwrotnie niż zakłada cel" | **Nieaktualne** — teraz to jest cel. Problemem zostaje *jak* (obiekty `Tile`, brak formatu runtime), nie *czy*. |
| §5.4 — 9 B/tile za dużo | **Potwierdzone i zaostrzone** — musi być 2 B, nie 4 B. |
| Decyzja nr 2 (ile bajtów na tile) | **Rozstrzygnięta:** 2 B + tabela typów. |
| README cel 3 „dynamic render of the map + movement" | **Bez zmian — cel jest spełniony wprost.** Dotyczy renderowania, nie wczytywania. Wczytywanie: raz, wszystko do RAM. Renderowanie: dynamiczne — ~520 widocznych kafli zamiast 10⁸. |

---

## 12. Podsumowanie

Twój pomysł jest dobry i zostawiam go bez zmian — zmieniam tylko układ danych, żeby się w nim zmieścił.
Wszystko sprowadza się do dwóch rzeczy:

1. **2 bajty na tile** zamiast 9 (`collision` i `speedFactor` → tabela typów kafli, bo to cecha typu, nie kafla).
2. **Nie alokuj pustych warstw** — grunt gęsto (200 MB), overlaye tylko tam, gdzie faktycznie coś jest.

Efekt: **~800 MB zamiast 15,3 GB**, cała mapa w RAM, start w ~2–4 s od drugiego uruchomienia, i renderer,
który nie musi wiedzieć nic o chunkach, ładowaniu ani asynchroniczności. Za cenę jednego dłuższego pierwszego
uruchomienia dostajesz architekturę bez najbardziej upierdliwej klasy błędów w grach z dużą mapą.

---

## 13. Rewizje po implementacji (2026-09-01)

Trzy rzeczy z tego dokumentu zmieniły się przy pisaniu kodu. Powody:

### 13.1 Areny (§3) → gęste warstwy per chunk

Zamiast jednej areny `Uint16Array(10⁸)` na grunt, mapa trzyma `Map<chunkIndex, Chunk>`, a chunk trzyma
gęste `Uint16Array(10 000)` per warstwa. **Sumaryczna pamięć jest identyczna** (10 000 chunków × 20 KB = 200 MB
na grunt), ale:

- **pusta mapa kosztuje zero** — arena wymagałaby zaalokowania 200 MB, zanim postawisz pierwszy kafel.
  Dla edytora, który zaczyna od pustej mapy, to jest różnica jakościowa;
- zapis do bazy jest naturalnie per chunk, więc edycja jednego kafla to jeden rekord, a nie 2 MB;
- `GameMap.getTile(layer, tileX, tileY)` daje i tak widok „całego świata", więc gra nie odczuwa różnicy.

Areny wracają jako opcja, jeśli `ViewportSampler` okaże się wąskim gardłem na granicach chunków — ale to
optymalizacja renderera, nie modelu danych.

### 13.2 Pasma w IndexedDB (§6) → rekordy per chunk

Uzasadnieniem pasm było „10 000 osobnych `get()` to zbyt duży narzut". To prawda dla 10 000 osobnych żądań,
ale **nieprawda dla kursora**: `openCursor()` to jedno żądanie, które przechodzi po rekordach, więc narzut
nie rośnie liniowo z liczbą chunków. Za to pasma kosztowały:

- drugi format binarny obok formatu chunka (dwa kodeki do utrzymania),
- zapis 2 MB przy edycji jednego kafla zamiast ~20 KB,
- rozjazd między tym, co edytuje edytor, a tym, co leży w bazie.

Skoro baza ma trzymać **jedną mapę, która służy i grze, i edytorowi**, format w bazie musi być tym samym
formatem, który edytuje edytor. Rekordy per chunk + odczyt kursorem spełniają jedno i drugie.
Gdyby ładowanie 10 000 chunków okazało się za wolne, pasma wrócą jako **cache pochodny** obok źródła prawdy,
a nie zamiast niego.

### 13.3 Puste tile w ogóle nie trafiają do pliku (nowe)

W dokumencie warstwa była zawsze zapisywana gęsto. W implementacji kodek wybiera tryb **per warstwa**:
gęsty dla wypełnionych (grunt), **rzadki dla reszty** — zapisywane są wyłącznie niepuste tile, jako pary
`(tileIndex, tileId)` po 4 B. Próg opłacalności to 50% wypełnienia (`4 + n × 4 < 20 000`).

Zmierzone na mapie testowej:

| | |
|---|---:|
| Warstwa ramki (396 kafli z 10 000) | **1 588 B** zamiast 20 000 B |
| Warstwa dekoracji (40 kafli) | **164 B** zamiast 20 000 B |
| Chunk: grunt + ramka + dekoracje | **21 800 B** wobec 1 530 005 B w starym formacie |
| Mapa testowa 3 × 3 | **191,6 KB** wobec 13,13 MB — **70× mniej** |
