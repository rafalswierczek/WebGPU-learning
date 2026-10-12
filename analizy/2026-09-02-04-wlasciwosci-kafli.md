# Analiza 04 — właściwości kafli i okno kontekstowe (2026-09-02)

Zapis ustaleń z rozmowy: nazwy tekstur, rodzaje kafli, semantyka kolizji, `speedFactor`
oraz projekt edytowalnego pola tekstowego w canvasie.

Poprzednie: [01 stan projektu](2026-08-31-01-stan-projektu.md) · [02 ładowanie mapy](2026-09-01-02-ladowanie-mapy.md) · [03 refaktor chunka](2026-09-01-03-refaktor-chunka.md)

---

## 1. Tekstury: identyfikator = nazwa pliku = indeks w tablicy

`assets/0.jpg` ma `textureId 0`, `1.jpg` ma `1` i tak dalej. Identyfikator **wynika z nazwy pliku**,
nie z kolejności wczytania.

**`tileId === textureId`.** Mapa nie przesuwa identyfikatorów o jeden — kafel o identyfikatorze `0`
to pierwsza tekstura. Pustkę oznacza **`-1`**:

```ts
MapConfig.EMPTY_TILE = -1          // wartość logiczna widziana przez cały kod
MapConfig.EMPTY_TILE_STORED = 0xFFFF   // zapis w Uint16Array, bo ta nie przechowa liczby ujemnej
MapConfig.MAX_TILE_ID = 65534
```

Konwersja siedzi wyłącznie w `Chunk.getTile()` / `setTile()`. Konsekwencja, o którą łatwo się potknąć:
świeżo zaalokowana warstwa musi być **wypełniona `0xFFFF`**, bo domyślne zera oznaczałyby, że cały
chunk jest pokryty teksturą 0. Robi to `Chunk.createLayer()` i pilnuje tego test regresyjny.

### Nazwy tekstur: plik tekstowy, nie moduł TS

Nazwy leżą w `assets/textures.txt`, jeden wiersz na teksturę:

```
0 Hill and rocks
1 Water - ocean
2 Ground/sept
```

Wczytywany **raz**, parsowany do `string[]`, gdzie **indeks jest identyfikatorem**, i cache'owany
w IndexedDB jako gotowa tablica. Kolejne uruchomienia nie dotykają sieci ani parsera. Dostęp do nazwy
to jedno indeksowanie tablicy, więc jest natychmiastowy także przy 10 000 wpisów.

Dlaczego plik, a nie tablica w module TS:

- 10 000 nazw w kodzie to 10 000 wpisów w bundlu i **przebudowa przy każdej nowej teksturze**,
- dane treści gry nie powinny wymagać kompilacji,
- plik da się wygenerować skryptem razem ze spritesheetami.

Identyfikator jest w pliku **jawny**, więc kolejność wierszy nie ma znaczenia, a dziura w numeracji
nie przesuwa pozostałych nazw. Wiersze puste i zaczynające się od `#` są pomijane.

## 2. Rodzaje kafli (`TileCategory`)

Rodzaj mówi, **co gra robi, gdy postać wejdzie na kafel**. Edytor nie egzekwuje żadnego z tych
zachowań — pozwala stawiać i kasować bez ograniczeń.

| rodzaj | wartość | zachowanie w grze |
|---|---:|---|
| `default` | 0 | nic specjalnego, zwykły kafel |
| `stairs` | 1 | postać zmienia warstwę o 1 w górę lub w dół, w zakresie −8..8 |
| `hole-ground` | 2 | dziura w ziemi: wejście działa jak `stairs` w dół (warstwa −1) |
| `hole-ceiling` | 3 | dziura w suficie: **samo wejście nic nie robi**; dopiero użycie liny działa jak `stairs` w górę (warstwa +1) |

Kliknięcie wiersza `Type:` w oknie przechodzi cyklicznie przez tę listę.

Zakres warstw −8..8 jest twardą granicą — `stairs` na warstwie 8 nie ma dokąd prowadzić w górę,
a na −8 w dół. Obsługa tego przypadku należy do logiki gry, której jeszcze nie ma.

---

## 3. Kolizja

`collision = true` oznacza kolizję **z czymkolwiek i kimkolwiek**: w grze nie da się na taki kafel
wejść ani niczego na nim położyć.

Kluczowe rozróżnienie: **edytor tego nie respektuje**. W edytorze wolno postawić obiekt lub przedmiot
na kaflu z kolizją — bo edytor buduje świat, a nie gra w niego. Ograniczenie obowiązuje wyłącznie
w warstwie gry, przy ruchu postaci i upuszczaniu przedmiotów.

---

## 4. `speedFactor`

Określa, jak szybko postać przechodzi przez kafel:

- `1.0` — prędkość bazowa (domyślna)
- `1.5` — o 50% szybciej
- `0.5` — o połowę wolniej

Zakres jest ograniczony do `0.1`–`10.0` (`TileType.MIN_SPEED_FACTOR` / `MAX_SPEED_FACTOR`); wartości
spoza zakresu są przycinane, a `NaN` ignorowany. Bez tego wpisanie `0` dałoby kafel, przez który nie
da się nigdy przejść, a wpisanie litery — `NaN` rozlewający się na całą logikę ruchu.

---

## 5. Gdzie te właściwości mieszkają — POTWIERDZONE

**Właściwości należą do RODZAJU kafla, nie do pojedynczego wystąpienia na mapie.**
Dotyczy to wszystkich czterech: tekstury, rodzaju, kolizji i `speedFactor`.

Uzasadnienie z rozmowy: nie chcemy miliarda kafli wody, z których każdy niesie własną kopię
informacji o kolizji — wystarczy **jeden rodzaj** z tą właściwością, przypisany do miliarda kafli.

```
mapa (chunki)          tileId: u16          2 bajty na kafel
katalog (TileTypeTable) tileId -> { textureId, category, collision, speedFactor }
```

Zmiana `Collision` dla kafla „Water" dotyczy **wszystkich** kafli wody na całej mapie.

Powody:

1. **Format mapy zostaje przy 2 bajtach na kafel** — ustalenie z analiz 02 i 03. Właściwości per
   wystąpienie oznaczałyby powrót do ~9 bajtów, czyli ~15 GB na mapę 10k × 10k.
2. Okno pokazuje `Texture: 0, Water` jako **pierwszy wiersz i tożsamość kafla** — reszta wierszy
   opisuje właśnie ten rodzaj.
3. Zmiana „drzewo jednak blokuje ruch" to edycja jednego wiersza katalogu, a nie przejście po mapie.

**Czego to nie obsługuje:** wyjątku na jednym konkretnym kaflu („ta jedna kałuża jest przechodnia").
Gdyby to kiedyś było potrzebne, dochodzi opcjonalny blok nadpisań w chunku — kilka bajtów na wyjątek,
zamiast na każdy kafel. To rozszerzenie formatu, nie jego przebudowa.

Katalog jest zapisywany i wczytywany **razem z mapą** (`saveMap()` / `loadMap()`), w osobnym store
IndexedDB, we własnym formacie binarnym `VTTT` (u32 magic, u16 wersja, u16 licznik, potem 8 B na rekord).

---

## 6. Edytowalne pole tekstowe w canvasie

Wymaganie było takie, żeby dało się je użyć ponownie w grze. Stąd podział na trzy warstwy:

```
UiPainter (interfejs)   drawRect / drawBorder / drawText / measureText / metryki fontu
    ^
    |  implementuje
OverlayPass             instancjonowane quady + atlas fontu na GPU
    ^
    |  używają
TextInput, TileContextMenu, DebugOverlay
```

**`TextInput` (`Core/Ui/TextInput.ts`) nie wie nic o kaflach, edytorze ani WebGPU.** Dostaje prostokąt
i maluje się przez `UiPainter`. Obsługuje: wpisywanie znaków, `Backspace`, `Delete`, strzałki, `Home`,
`End`, `Enter` (zatwierdź), `Escape` (anuluj), migający kursor, filtr dozwolonych znaków (dla
`speedFactor` to `[0-9.]`) i limit długości. Nadaje się w tej postaci na czat, nazwę postaci czy pole
wyszukiwania w grze.

**`KeyboardFocus` (`Core/Ui/KeyboardFocus.ts`)** to jeden przełącznik mówiący, że klawiaturę przejął
widget. Bez niego wpisanie „wsad" w pole tekstowe rozjechałoby kamerę — `Camera` i skróty edytora
sprawdzają ten obiekt i milczą, gdy ktoś pisze. Kamera dodatkowo zwalnia wciśnięte klawisze w momencie
przejęcia, żeby nie została z zablokowanym kierunkiem.

---

## 7. Okno kontekstowe

- **PPM** otwiera, kolejne **PPM** zamyka (toggle). **Escape** też zamyka.
- **CTRL+PPM** kasuje kafel (wcześniej robiło to samo PPM).
- Rozmiar 300 × 500 (`UiConfig`).
- **Kliknięcie poza oknem zamyka je** i jest pochłaniane — tak jak w menu systemowych, gdzie
  pierwsze kliknięcie obok zamyka menu, a nie wykonuje akcji pod kursorem.
- **PPM na innym kaflu** zamyka bieżące okno i od razu otwiera nowe dla wskazanego kafla;
  PPM na tym samym kaflu tylko zamyka.
- Długie nazwy tekstur są **zawijane po słowach** (słowo dłuższe niż wiersz łamane twardo),
  a wysokość wiersza rośnie z liczbą linii. Font jest monospace, więc szerokość tekstu to
  liczba znaków razy szerokość znaku — te same metryki służą do rysowania i do trafiania myszą.
- Pozycja: **w prawo od kliknięcia**, domyślnie **w dół**; gdy nie mieści się w dół — w górę;
  gdy nie mieści się w żadną stronę (canvas 800 × 600, okno 500 wysokości — to występuje często)
  — dosuwane do krawędzi canvasa.
- Kliknięcie w obszar okna nie maluje kafla; ruch myszy nad oknem też nie.
- Układ (pozycje i wysokości wierszy) liczy się **raz, przy otwarciu i po każdej zmianie treści**,
  a nie osobno przy rysowaniu i osobno przy kliknięciu — dzięki temu nie da się ich rozjechać.
  Metryki fontu wstrzykuje `MapEditorHandler` przez `setFontMetrics()`.

### Artefakt: pojedyncze piksele między wierszami

Komórki atlasu fontu nie miały marginesu. Tusz glifu wychodzący poza swoje pole — ogonek „y",
przecinek, akcent — lądował w sąsiedniej komórce i był samplowany przy rysowaniu **zupełnie innej
litery**, co dawało pojedyncze jasne piksele w przerwach między wierszami.

Naprawa: każda komórka ma teraz margines `FontAtlas.GUTTER = 2 px`, glif rysowany jest z przesunięciem,
a UV obejmuje wyłącznie pole glifu. Margines nigdy nie jest samplowany, więc żadne przelanie tuszu
nie ma jak trafić do sąsiada. Przy okazji panel okna dostał pełną nieprzezroczystość — przy 0.96
prześwitywała przez niego siatka i kafle.

Wiersze: `Texture` (bez akcji — wybór tekstury dojdzie z paletą kafli), `Type` (cykl),
`Collision` (przełącznik), `SpeedFactor` (pole tekstowe).

---

## 8. Co z tego wynika na przyszłość

- **Paleta kafli** zastąpi skróty 1–9 i odblokuje wiersz `Texture`. `TileContextMenu.buildRows()`
  ma już na to miejsce.
- **`stairs` / `hole-*`** nie mają jeszcze żadnej logiki — to jest do zrobienia po stronie gry,
  razem z ruchem postaci.
- **Spritesheety** zastąpią pojedyncze pliki tekstur; wtedy `textureId` przestanie być nazwą pliku,
  a stanie się indeksem w arkuszu. `TileTextureConfig` jest jedynym miejscem, które to zobaczy.
