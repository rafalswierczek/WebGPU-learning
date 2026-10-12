# Analiza 06 — biblioteka tekstur i pędzle złożone (2026-09-04)

Zapis ustaleń: skąd biorą się tekstury, jak wygląda ich config, czym jest pędzel złożony
i jak zachowuje się malowanie takim pędzlem.

Poprzednie: [01 stan projektu](2026-08-31-01-stan-projektu.md) · [02 ładowanie mapy](2026-09-01-02-ladowanie-mapy.md) · [03 refaktor chunka](2026-09-01-03-refaktor-chunka.md) · [04 właściwości kafli](2026-09-02-04-wlasciwosci-kafli.md) · [05 komórka i dwa stosy](2026-09-04-05-komorka-i-dwa-stosy.md)

---

## 1. Droga tekstury: dysk → zip → baza → RAM → GPU

```
assets/Textures/**            źródło prawdy, zwykłe foldery i pliki png
   │  webpack (tools/TexturesZipPlugin.js) - przy każdym buildzie
   ▼
public/assets/textures.zip    jeden plik do pobrania
   │  jeden fetch, TYLKO gdy baza jest pusta
   ▼
IndexedDB (texture_store)     wiersze: path | texture (png) | config (json|null)
   │  każdy start
   ▼
TextureLibrary + ImageBitmap  drzewo pędzli + obrazy
   │
   ▼
TileTextureAtlas              jedna tekstura 2D na GPU
```

Zasada jest ta sama co przy mapie: **sieć dotykana jeden raz**. Zip, bo 463 osobnych zapytań
HTTP na starcie to 463 okazje do czekania, a przeglądarka i tak nie umie wylistować katalogu.
Pakuje go webpack, nie ręczny skrypt — folder ma być jedynym miejscem, które się edytuje.

---

## 2. Struktura w bazie: trzy kolumny

| kolumna | typ | zawartość |
|---|---|---|
| `path` | string (klucz) | `Buildings/6 roof red/601` |
| `texture` | Blob | zawartość `601.png` |
| `config` | json \| null | zawartość `config.json` z folderu albo `null`, gdy go nie ma |

**Struktury katalogów nie zapisujemy osobno** — da się ją odtworzyć w całości z samych ścieżek,
rozbijając je po `/`. Ostatni człon ścieżki jest identyfikatorem tekstury, czyli nazwą pliku
bez rozszerzenia. Config powtarza się w każdym wierszu folderu; to kilkadziesiąt bajtów na wiersz,
za to wiersz jest samowystarczalny i odtworzenie drzewa nie wymaga drugiego zapytania.

---

## 3. Config: domyślny, nadpisywany kluczami z pliku

Gdy w podfolderze **nie ma** `config.json`, każdy obraz w nim dostaje config domyślny:

```json
{
    "brushSize": [1, 1],
    "collision": false,
    "type": "default",
    "speedFactor": 1.0
}
```

Gdy `config.json` **jest**, nadpisuje **tylko te klucze, które w nim wystąpiły**. Plik
z samym `speedFactor` zmienia wyłącznie prędkość, a reszta zostaje domyślna.

| klucz | typ | znaczenie |
|---|---|---|
| `brushSize` | `[wiersze, kolumny]` | indeks 0 to WIERSZE. `[4, 1]` to pędzel 1 szeroki i 4 wysoki |
| `collision` | bool \| `uint[]` | bool dotyczy wszystkich tekstur pędzla; lista wskazuje te kolidujące, reszta nie koliduje |
| `type` | string | typ dla KAŻDEGO kafla pędzla — przy 3x4 dostaje go wszystkie 12 |
| `speedFactor` | float | analogicznie do `type` |
| `textures` | int \| `uint[][]` | int przy `brushSize` `[1,1]`; tablica w układzie `[wiersz][kolumna]` zgodnym z `brushSize` |

### Wiersz 0 to GÓRA obrazka

Pierwszy wiersz `textures` jest górą tego, co widać — tak jak czyta się obrazek. Na mapie oś Y
rośnie w GÓRĘ, więc malowanie musi ten wiersz odwrócić: wiersz `r` z configu ląduje na
`originY + (wiersze - 1 - r)`. Bez tego posąg stanąłby na głowie — piedestał z kolizją wylądowałby
nad głową zamiast pod nią.

```
"textures": [        na ekranie:      531 = głowa/tors      533 = lewy piedestał
    [531, 532],        531 532        532 = prawa ręka     534 = prawy piedestał
    [533, 534]         533 534
]                                     "collision": [533, 534] - stoi na ziemi, więc koliduje
```

### Obecność `textures` zmienia znaczenie folderu

- **bez `textures`** — config dotyczy **każdego pliku z osobna**. Folder z 10 obrazami daje
  10 wierszy listy, każdy to pędzel 1x1 ze scalonym configiem.
- **z `textures`** — **cały folder jest JEDNYM pędzlem** o wymiarach `brushSize`, a wiersz listy
  nosi nazwę folderu. Pliki spoza listy `textures` są **ignorowane**: 10 plików png i 6 wpisów
  w `textures` znaczy, że 4 pozostałe nie istnieją dla edytora.

### Przykład docelowej struktury

```js
{
    "Buildings": {
        "6 roof red": [597, 598, 599, 600, 601, 602, 603, 604, 605, 606]
        // liść typu array = same identyfikatory, config domyślny dla każdego
    },
    "Structures": {
        "10 statue": {
            // liść typu object = jeden pędzel złożony
            "brushSize": [2, 2],
            "collision": [533, 534],
            "type": "default",
            "speedFactor": 1.2,
            "textures": [
                [531, 532],
                [533, 534]
            ]
        }
    }
}
```

W kodzie odpowiada temu `TextureLibrary`: `TextureNode` to folder, a `brushEntry` to wiersz listy
(etykieta + `Brush`). Nazwy kluczy configu są identyczne jak w pliku, żeby nie było tłumaczenia
między jednym a drugim.

---

## 4. Pędzel

`Brush` to prostokąt tekstur razem z właściwościami, jakie mają dostać malowane kafle.

- **Pędzel 1x1 wolno skalować** (NUMPAD +/−, rozmiary 1, 2, 3, 5, 8, 15, 30). Maluje wtedy
  kwadrat NxN tą samą teksturą.
- **Pędzla złożonego nie wolno skalować.** To logiczny obiekt — posąg, dach, człowiek —
  a rozciągnięcie go dałoby posąg z czterema tułowiami. Rozmiar bierze się wyłącznie z `brushSize`.
- **Walidacja rozmiaru przybliżeniem zniknęła.** Pędzel 30x30 wolno wybrać także z bliska.
  Poprzednie progi zoomu nie broniły przed niczym realnym, a blokowały największe pędzle tam,
  gdzie były potrzebne. Jeśli malowanie wielkim pędzlem okaże się psuć — walidacja wróci.

### Malowanie kliknięciem

Odcisk pędzla nakłada się na mapę tak, że lewy górny róg wzoru trafia w lewy górny róg odcisku.
Każda komórka odcisku dostaje **jeden nowy element na stos**, więc malowanie po już zajętych
komórkach buduje stos, a nie podmienia zawartość.

Przykład: mapa z jedną kolumną już pomalowaną, pędzel `brushSize [2, 3]`,
`textures [[1,2,3],[4,5,6]]` przyłożony teksturą `1` na koordynaty 2x2:

```
- - - - -              - - - - -
- x - - -     →        - 1 2 3 -
- x - - -              - 4 5 6 -
- x - - -              - - - - -
```

Komórki 2x2 i 2x3 mają teraz **dwuelementowy stos tile**, z teksturami `1` i `4` na wierzchu.

### Malowanie przeciąganiem

Pędzel złożony **nie stawia odcisku co jeden kafel**. Kolejny odcisk powstaje dopiero wtedy,
gdy nowy prostokąt **nie nachodzi** na poprzedni — czyli gdy pędzel odjedzie o cały swój bok
na którejkolwiek osi. Dla „człowieka" 1 szerokiego i 4 wysokiego znaczy to: 1 kafel w lewo
lub w prawo wystarczy, ale w górę albo w dół trzeba przejechać 4. Inaczej ciągnięcie w górę
o jeden kafel dałoby człowieka z wydłużonymi nogami.

Pędzel 1x1 maluje po staremu, ciągiem — tam przed powtórnym dotknięciem tej samej komórki
broni zbiór komórek dotkniętych w bieżącym pociągnięciu.

### Agregat i jego kasowanie

**Agregat** to pędzel opisany kluczem `textures`, czyli jeden logiczny obiekt rozłożony na kilka
kafli. **Agregaty dotyczą WYŁĄCZNIE kafli — obiekty są zawsze 1x1.**

Kafel należący do agregatu ma w rejestrze `isAggregate = true`. Znacznik jest prawdziwy wtedy,
gdy identyfikator tekstury występuje w kluczu `textures` jej folderu.

**Agregat kasuje się w całości.** Usunięcie jednej komórki zostawiłoby posąg bez piedestału,
czyli obiekt, którego nie da się zbudować pędzlem — a więc stan, w którym mapa przestaje być
spójna z tym, czym się ją maluje. Kliknięcie w dowolną komórkę agregatu zdejmuje wszystkie.

Do znalezienia reszty agregatu nie trzeba niczego zapisywać przy komórce: `Tile.name` to ścieżka
w drzewie (`Structures/10 statue/533`), a jej **folder jest tożsamością agregatu**. Z folderu
biblioteka oddaje pędzel, pędzel mówi, w którym miejscu wzoru leży kliknięta tekstura, i stąd
wynika położenie pozostałych. Zdejmowane są tylko te komórki, które naprawdę mają na wierzchu
kafel z tego samego folderu, więc częściowo zamalowany posąg nie zabiera ze sobą sąsiadów.

### Co wolno położyć na komórce

**Obiekt na obiekt** — tylko gdy CAŁY stos na to pozwala. Wystarczy jeden element z
`canStack = false` gdziekolwiek w stosie (nie tylko na wierzchu), żeby nie dało się na nim nic
położyć. Dokładany obiekt też musi być stackowalny. Domyślnie obiekt NIE jest stackowalny;
flagę przestawia się w oknie pędzla.

**Kafel na obiekt** — nie wolno, bez wyjątków. Obiekt leży nad kaflami, więc kafel i tak by go
nie zasłonił, a stos przestałby opisywać to, co widać. Wcześniejszy wyjątek dla agregatów bez
kolizji został usunięty: dawał zachowanie, którego nie dało się przewidzieć z ekranu, bo ten sam
pędzel raz wchodził, a raz nie — zależnie od tego, która jego tekstura trafiła na obiekt.

**Agregat nie może być obiektem.** Obiekty są zawsze 1x1, więc zakładka Object nie pokazuje
pędzli złożonych — nie da się ich wybrać, a nie tylko „nie wypada".

**Agregat wchodzi w całości albo wcale.** Jeśli choć jedna komórka odcisku jest zablokowana,
nie powstaje żaden kafel — inaczej jedna zajęta komórka zostawiłaby posąg bez piedestału.
Pędzel prosty maluje tam, gdzie może, i pomija komórki zablokowane przez obiekty.

---

## 5. Pędzel a rejestry

**Rejestry są indeksowane identyfikatorem TEKSTURY**, a stosy komórek trzymają wprost ten
identyfikator. Osobna numeracja wpisów, którą miały wcześniej, była drugim identyfikatorem tego
samego — i to trudniejszym do odczytania, bo w oknie kafla widać było numer wpisu zamiast numeru
tekstury z drzewa.

Osobna numeracja nie ma zresztą czego rozróżniać: **tekstura leży na dysku w dokładnie jednym
folderze**, więc jej właściwości wynikają z jednego `config.json`. Nie da się namalować dwóch
kafli o tej samej teksturze i różnych właściwościach, bo nie da się takiej pary opisać na dysku.

Wpis zakłada `TileRegistry.ensure(textureId, name, isAggregate, collision, type, speedFactor)`
w chwili malowania. **Istniejący wpis zostaje nietknięty** — mógł zostać ręcznie zmieniony
w oknie kafla, a `config.json` tylko zasiewa wartości początkowe i nie ma prawa nadpisywać pracy
w edytorze. Rejestry startują puste i rosną dokładnie o to, co naprawdę stoi na mapie.

### Nazwa należy do tile, nie do warstwy prezentacji

`Tile` ma pola `name` (ścieżka w drzewie) i `isAggregate`. Nazwa nie jest wyliczana przy
rysowaniu okna, bo:

- **zapisana mapa ma być czytelna bez biblioteki tekstur** — rejestr mówi wprost, czym jest kafel,
- **folder z nazwy jest tożsamością agregatu**, więc kasowanie całości nie potrzebuje żadnego
  dodatkowego pola przy komórce.

Kosztem jest duplikat: nazwa jest wyprowadzalna z `textureId` przez bibliotekę, a teraz leży też
w rejestrze i w zapisie mapy (`VTLR` wersja 2, rekord zmiennej długości z tekstem UTF-8).
Przy 65 tysiącach wpisów to najwyżej 2 MB — wobec mapy liczonej w gigabajtach nic. Druga
konsekwencja jest wręcz pożądana: przeniesienie pliku do innego folderu nie zmienia wstecz tego,
czym kafel był w chwili malowania.

---

## 6. Atlas zamiast tablicy warstw

Tekstur jest 463, a identyfikatory sięgają 610. Tablica `texture_2d_array` indeksowana
identyfikatorem przestała się mieścić: `maxTextureArrayLayers` to na typowym sprzęcie **256**
i nie da się tego podnieść.

Wszystkie tekstury leżą więc w **jednej teksturze 2D** ułożone w siatkę komórek 32 px
(463 tekstury → 22x22 → atlas 704x704). Limitem jest `maxTextureDimension2D`, zwykle 8192,
czyli przy komórce 32 px mieści się 65 536 tekstur.

Identyfikator tekstury **nie jest** pozycją w atlasie — identyfikatory są rzadkie, więc każda
tekstura dostaje kolejny **slot**, a mapowanie `id → slot` siedzi w `TileTextureAtlas`.
Do instancji trafia slot, a shader przelicza go na współrzędne komórki, mając w uniformie klatki
wymiary siatki atlasu. Filtrowanie jest `nearest`, więc sąsiednie komórki nie mają jak się zlać.

---

## 7. Interfejs edytora

Zakładka `Brush` rozpadła się na **dwie wyszukiwarki**: `Tile` i `Object`. Obie pokazują to samo
drzewo, ale wybór z pierwszej ustawia pędzel kafla, a z drugiej pędzel obiektu — i każda pamięta
swój wybór osobno. Na razie pracujemy tylko na kaflach; zakładka obiektów jest gotowa
na to, co przyjdzie potem.

**Okno komórki (PPM) tylko czyta**: nagłówek z nazwą tego, co leży na wierzchu, oba stosy
w całości (jedna linia na element z kompletem atrybutów) i sekcja `Cell info` z właściwościami
wyliczonymi z reguł z analizy 05.

**Edycja atrybutów siedzi w oknie pędzla**, otwieranym kliknięciem w podgląd pod debuggerem.
Edytuje się tam to, czym się MALUJE, a nie to, w co się kliknęło — dlatego nie ma tam stosów ani
słowa „top". Wpis w rejestrze jest zakładany w chwili otwarcia okna, żeby dało się ustawić
właściwości tekstury, zanim trafi ona na mapę.

Wiersz listy to `ETYKIETA MINIATURA`: dla pojedynczej tekstury etykietą jest jej identyfikator,
dla pędzla złożonego — nazwa folderu i jego rozmiar (`10 statue 2x2`). Miniatura ma bok
z `UiConfig.THUMBNAIL_PX` i jest skalowana przez sampler, więc zmiana tej liczby wystarczy.
Ramka zaznaczenia na mapie ma kształt odcisku pędzla, więc widać dokładnie, co stanie na mapie.
