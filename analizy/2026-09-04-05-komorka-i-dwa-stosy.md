# Analiza 05 — komórka mapy i jej dwa stosy (2026-09-04)

Zapis ustaleń: komórka jest źródłem prawdy o tym, **co** na niej stoi, ma dwa stosy
identyfikatorów, a właściwości komórki wyliczają się z ich zawartości według trzech reguł.

Poprzednie: [01 stan projektu](2026-08-31-01-stan-projektu.md) · [02 ładowanie mapy](2026-09-01-02-ladowanie-mapy.md) · [03 refaktor chunka](2026-09-01-03-refaktor-chunka.md) · [04 właściwości kafli](2026-09-02-04-wlasciwosci-kafli.md)

---

## 0. Co unieważnia analizę 04

Analiza 04 §5 ustalała, że `Collision`, `SpeedFactor` i `Type` należą do wspólnego katalogu
kafli, a mapa trzyma tylko identyfikator wpisu z tego katalogu. **To już nie obowiązuje** —
katalog był jednopoziomowy i nie znał pojęcia stosu ani obiektu.

Zastąpiły go **dwa rejestry** (`TileRegistry`, `ObjectRegistry`) i **komórka z dwoma stosami**.
Komórka decyduje, co na niej leży; rejestr mówi, jakie to coś ma właściwości.

---

## 1. Słownictwo

| pojęcie | znaczenie |
|---|---|
| **tile** | koncept — wpis w `TileRegistry`, jak klasa w OOP |
| **konkretny tile / komórka** | miejsce na mapie, `Cell` — jak instancja |
| **object** | koncept przedmiotu — wpis w `ObjectRegistry` |
| **tileStack / objectStack** | stosy komórki, trzymające **identyfikatory** wpisów z rejestrów |

---

## 2. Komórka ma dokładnie dwie rzeczy

```
Cell
├── tileStack   : uint[]   identyfikatory tile  (indeksy do TileRegistry)
└── objectStack : uint[]   identyfikatory obiektów (indeksy do ObjectRegistry)
```

**Stosy trzymają wyłącznie identyfikatory.** Właściwości — łącznie z `textureId` — leżą
w rejestrach. Powód jest arytmetyczny: mapa ma rzędu 10^8 komórek, więc powtórzenie przy każdej
z nich kompletu pól tile (8 B) i obiektu (12 B) kosztowałoby gigabajty na dane, które i tak są
identyczne w milionach miejsc. Identyfikator to 2 bajty i jedno indeksowanie tablicy.

**Cały stos obiektów leży nad całym stosem tile.** Pierwszy obiekt od dołu jest wyżej niż
ostatni tile — dzięki temu tekstury obiektów nigdy nie przemieszają się z tile. Renderer emituje
instancje w tej samej kolejności: najpierw `tileStack`, potem `objectStack`, rozwiązując po
drodze każdy identyfikator na `textureId` przez rejestr.

### Tile (wpis w `TileRegistry`)

| pole | typ |
|---|---|
| `textureId` | uint |
| `collision` | bool |
| `speedFactor` | float (0.1–10.0, domyślnie 1.0) |
| `type` | `default` \| `stairs` \| `hole-ground` \| `hole-ceiling` |

### MapObject (wpis w `ObjectRegistry`)

Obiekty to przedmioty w grze: można je podnieść (znikają z ziemi i trafiają do plecaka), użyć
albo przenieść na inną komórkę.

| pole | typ |
|---|---|
| `textureId` | uint |
| `collision`, `canPickup`, `canMove`, `canStack`, `canUse`, `active` | bool |
| `type` | `default` \| `chest` \| `light` \| `lever` \| `button` |
| `weight` | uint |
| `timeLeftSec` | uint |

Klasa nazywa się `MapObject`, a nie `Object`, bo `Object` jest wbudowaną nazwą w JavaScripcie.

### Co to znaczy dla edycji

Zmiana **składu stosu** (dołożenie, zdjęcie) dotyczy **wyłącznie tej jednej komórki** — stos
jest jej własnością. Zmiana **właściwości** tile albo obiektu dotyczy **każdej komórki, która
trzyma ten identyfikator** — bo właściwości mieszkają w rejestrze i tam są jednym wpisem.
To jest zamierzone: „kamień" ma być kamieniem na całej mapie. Gdy potrzebny będzie wariant,
dochodzi nowy wpis w rejestrze, a nie kopia właściwości w komórce.

---

## 3. Reguła kolizji

**Wystarczy jeden element z `collision = true` w którymkolwiek stosie, żeby komórka była
nieprzechodnia.** Komórka jest przechodnia dopiero wtedy, gdy żaden element obu stosów nie ma
kolizji.

Przykład z rozmowy: stos tile ma 5 elementów, kolizję mają nr 2 i 4; stos obiektów ma
6 elementów bez kolizji. Kolizja jest spowodowana tile nr 4 — najwyższym kolizyjnym w swoim
stosie. Gdyby w tym samym układzie kolizję miały obiekty nr 2, 3 i 5, decydowałby obiekt nr 5,
bo stos obiektów leży wyżej.

Praktycznie sam wynik `hasCollision()` jest logicznym LUB po obu stosach — wskazanie, który
element ją spowodował, ma znaczenie dopiero wtedy, gdy gra będzie chciała to pokazać graczowi.

## 4. Reguła speedFactor

**Liczy się wyłącznie stos tile i wyłącznie jego ostatni element.** Obiekty nie wpływają
na prędkość — postać chodzi po ziemi, nie po skrzyniach.

Gdy stos tile jest pusty, obowiązuje wartość domyślna 1.0.

## 5. Reguła type

**Pierwszeństwo mają obiekty:** typem komórki jest `type` ostatniego obiektu. Gdy stos obiektów
jest pusty, decyduje `type` ostatniego tile. Gdy oba są puste — `default`.

---

## 6. Przechowywanie: 2 bajty na komórkę zostają

Zwykła komórka mieści się w **gęstej tablicy `u16`** jako sam identyfikator tile. Taki zapis
reprezentuje dokładnie ten stan:

- `tileStack` z jednym elementem, wskazującym na tile o **domyślnych atrybutach**,
- **pusty** `objectStack`.

Czyli: wszystkie „rzeczy" komórki w stanie domyślnym. Gęsty zapis nie jest osobnym modelem, tylko
skrótem dla najczęstszego przypadku — istnieje wyłącznie po to, żeby oszczędzić pamięć.

Komórka ze stosem głębszym niż jeden tile albo z jakimkolwiek obiektem dostaje znacznik
`COMPLEX_CELL_STORED` (`0xFFFE`), a jej pełna zawartość ląduje w sekcji za warstwami — koszt
ponosi się **tylko tam, gdzie faktycznie coś się dzieje**. Kody `0xFFFE` i `0xFFFF` są
zarezerwowane na znaczniki, więc identyfikator tile powyżej `MAX_TILE_ID` (65533) też idzie
do sekcji komórek złożonych, mimo że stos ma jeden element.

Rekord komórki to same identyfikatory:

```
u32 recordCount
u8 layerIndex | u8 tileCount | u16 cellIndex | u16 objectCount | u16 reserved
tileCount   * u16 tileId      2 B
objectCount * u16 objectId    2 B
```

**Kompatybilności wstecznej nie ma i na razie nie będzie.** Czytany jest wyłącznie bieżący
format, a starszy zapis jest odrzucany. W fazie, w której bazę i tak kasuje się przy każdym
teście, kod czytający nieaktualne układy bajtów kosztowałby więcej, niż jest wart; wersjonowanie
przyjdzie razem z grą, która ma zapisy warte utrzymywania.

### Rejestry zapisują się obok mapy

Bez rejestrów komórki byłyby zbiorem liczb bez znaczenia, więc `MapRepository` zapisuje je
w tej samej transakcji co chunki, pod kluczami `tiles` i `objects`:

```
VTLR: u32 magic | u16 version | u16 count | count * (u16 textureId | u8 flags | u8 type | f32 speedFactor)
VOBR: u32 magic | u16 version | u16 count | count * (u16 textureId | u8 flags | u8 type | u16 weight | u16 res | u32 timeLeftSec)
```

Przy 65 534 możliwych wpisach rejestr tile waży najwyżej 512 KB, a obiektów 768 KB — wobec mapy
liczonej w gigabajtach to nic. Każdy rejestr ma licznik wersji, po którym renderer poznaje,
że musi przebudować bufor instancji (sama zmiana `collision` go nie dotyczy, ale zmiana
tekstury już tak).

---

## 7. Rozmiar kafla na ekranie skaluje się z rozdzielczością

**Wyznacznikiem prawdy jest 800 x 600 przy boku kafla 50**, czyli pole widzenia 16 x 12 kafli.
Tyle samo ma być widać w **każdej** rozdzielczości — inaczej gracz na większym monitorze widziałby
większy kawałek mapy, czyli miałby przewagę. Nie skaluje się więc liczba kafli, tylko rozmiar
kafla na ekranie:

```
tileSizeX = resX / 16        1280 / 16 = 80
tileSizeY = resY / 12         960 / 12 = 80
```

| rozdzielczość | kafel na ekranie | kafli na ekranie |
|---|---|---|
| 800 x 600 | 50 x 50 | 16 x 12 |
| 1024 x 768 | 64 x 64 | 16 x 12 |
| 1280 x 960 | 80 x 80 | 16 x 12 |
| 2560 x 1920 | 160 x 160 | 16 x 12 |

W kodzie siedzi to w `ViewConfig` jako rozdzielczość odniesienia. Konsekwencje:

- **Kamera pracuje wyłącznie w pikselach świata** i o rozdzielczości nic nie wie. Widoczny
  prostokąt to `REFERENCE / zoom`, a nie `canvas / zoom`, więc zmiana rozdzielczości, pełny ekran
  i `devicePixelRatio` nie ruszają tego, co widać.
- **Uniform klatki dostaje skalę `vec2f`** (piksele canvasa na piksel świata), a nie skalarny zoom.
  Osobno na oś, bo przy proporcji innej niż 4:3 kafel nie byłby na ekranie kwadratem. Dziś wszystkie
  rozdzielczości z listy są 4:3, więc obie składowe są równe.
- **Rozmiar tekstury nie ma z tym nic wspólnego** — tekstura jest rozciągana na kafel, więc 32 px
  i 100 px trafiają na ten sam kwadrat. `SquareConfig.LENGTH` to jednostka MAPY, nie ekranu.
- **Progi pędzla są w zoomie**, bo przy stałym polu widzenia to zoom mówi, jaką część mapy widać,
  i jest porównywalny między rozdzielczościami.
- **Pełny ekran zdejmuje ramkę przeglądarki, a nie podmienia rozdzielczość.** Canvas dostaje
  wybraną rozdzielczość, zmniejszaną tylko wtedy, gdy nie mieści się na ekranie.

## 8. Co z tego wynika na przyszłość

- **Zakładka Brush** wybiera TEKSTURĘ z drzewa `assets/Textures`, a nie wpis rejestru. Na wpis
  przekłada to kontroler w chwili malowania (`findOrAdd`), więc wybór przeżywa zmiany w rejestrach.
  To, czy pędzel stawia tile czy obiekt, jest nadal pod klawiszem `O`.
- **Drzewo tekstur powstaje przy budowaniu** — patrz [analiza 06](2026-09-04-06-biblioteka-tekstur-i-pedzle.md).
  Identyfikatorem tekstury jest nazwa pliku.
- **Rejestry startują jako „jeden wpis na teksturę"** (`fillFrom`), bo nie ma jeszcze edytora
  rejestru. Docelowo wpisów będzie więcej niż tekstur — dwa tile mogą dzielić teksturę i różnić
  się prędkością; wtedy `findOrAdd` przestanie wystarczać i wybór wariantu trafi do UI.
- **Tablica tekstur na GPU indeksuje się identyfikatorem tekstury**, a `maxTextureArrayLayers`
  to zwykle 256. Powyżej tego progu potrzebne będą spritesheety — `TileTextureArray` rzuca wtedy
  jasnym błędem zamiast cichej awarii.
- **Obiekty potrzebują przezroczystości.** Wszystkie tekstury są już `.png`, więc kanał alpha
  jest dostępny dla każdej z nich.
- **Logika `stairs` / `hole-*`** nadal czeka na warstwę gry.
