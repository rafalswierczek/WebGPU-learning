# Analiza 07 — BB code w wierszach interfejsu (2026-09-05)

Odpowiedź na pytanie „ile kosztuje BB code w `makeRow()`". **Nic z tego nie jest zaimplementowane** —
to rozpoznanie terenu i wycena.

Wersja druga, po wymianie czcionki na Verdana Bold. Poprzednia wycena zakładała font monospace
i jeden krój; oba założenia przestały być prawdą, więc cena części znaczników się zmieniła.

Poprzednie: [05 komórka i dwa stosy](2026-09-04-05-komorka-i-dwa-stosy.md) · [06 biblioteka tekstur i pędzle](2026-09-04-06-biblioteka-tekstur-i-pedzle.md)

---

## 1. Jak rysowany jest tekst dzisiaj

```
makeRow(label)  →  wrap(label): string[]     zawijanie po słowach, szerokość MIERZONA
                       ↓
renderRow()     →  painter.drawText(x, y, linia, kolor)      jeden kolor na CAŁY wiersz
                       ↓
OverlayPass     →  jedna instancja kwadratu na ZNAK; kursor przesuwa się o szerokość glifu
                       ↓
FontAtlas       →  siatka glifów z Verdana Bold + tablica szerokości (advances)
```

Co zmieniła nowa czcionka:

1. **Font jest proporcjonalny.** `measureText()` sumuje szerokości glifów, `drawText()` przesuwa
   kursor o szerokość każdego znaku, a `wrap()` mierzy tekst zamiast liczyć znaki.
   `getCharWidth()` został, ale znaczy dziś „szerokość odniesienia dla układu kolumnowego"
   (szerokość litery `M`), a nie „szerokość każdego znaku".
2. **Bazowy krój jest już pogrubiony.** Verdana **Bold** to jedyny krój w atlasie.
3. **Kolor nadal jedzie per instancja kwadratu** (`quad.color` mnożony przez próbkę z atlasu),
   więc jest darmowy z punktu widzenia GPU.

---

## 2. Wycena znacznik po znaczniku

| znacznik | koszt | zmiana wobec poprzedniej wyceny | dlaczego |
|---|---|---|---|
| `[color=#rrggbb]` | **mały** | bez zmian | kolor już jedzie per znak; brakuje parsera i pętli po fragmentach |
| `[u]` | **mały** | bez zmian | prostokąt 1 px pod fragmentem, `drawRect` już to potrafi |
| `[s]` | **mały** | bez zmian | to samo, tylko w połowie wysokości |
| `[b]` | **duży, ale inaczej** | **było: pogrubienie. Jest: ODCHUDZENIE** | bazowy krój jest już bold; „normalny" tekst wymagałby drugiego atlasu z Verdana Regular |
| `[i]` | **duży** | bez zmian | osobny atlas na kursywę |
| `[size=N]` | **średni** | bez zmian | skala tekstu jest globalna dla malarza |
| `[url=...]` | **średni** | bez zmian | rysowanie jak `[color]` + `[u]` plus trafianie myszą we fragment |

### Co trzeba zbudować niezależnie od wybranych znaczników

**Parser** (~80 linii): tekst → lista fragmentów `{ text, style }`. Stos otwartych znaczników,
bo `[color=#f00]a[u]b[/u]c[/color]` musi działać. Niedomknięty znacznik zamyka się na końcu
wiersza — w interfejsie gry lepszy jest tekst z błędem niż wyjątek.

**Zawijanie po fragmentach** (~50 linii, przeróbka `wrap()`): funkcja już mierzy tekst zamiast
liczyć znaki, więc zmiana jest mniejsza niż była — trzeba ciąć listę fragmentów i pamiętać
sumę szerokości, żeby kolejny fragment w linii zaczynał się we właściwym `x`.

**`menuRow.lines` z `string[]` na `fragment[][]`**. `renderRow` przechodzi po fragmentach i woła
`drawText` z własnym kolorem i przesunięciem. Zmiana jest lokalna: `UiMenu` jest jedynym miejscem,
które te linie rysuje.

### Skąd bierze się koszt `[b]` i `[i]`

`FontAtlas` renderuje jedną siatkę glifów jednym `font`-em Canvas2D. Drugi krój wymaga:

- drugiego atlasu → druga tekstura w bind group `OverlayPass` albo jeden atlas z dwiema siatkami
  i przesunięciem `v` w uv,
- pola „która siatka" w instancji kwadratu → zmiana struktury `Quad` w `overlay.vert.wgsl`,
- **drugiej tablicy szerokości glifów** — to jest nowy koszt, którego przy foncie monospace
  by nie było: Verdana Regular ma inne szerokości niż Bold, więc `measureText` musiałby wiedzieć,
  którym krojem mierzy. To dotyka `wrap()`, `TextInput` (karetka) i `MenuBar` (szerokości pozycji).

Wniosek: po przejściu na font proporcjonalny drugi krój **podrożał**, bo metryki przestały być
jedną liczbą.

---

## 3. Rekomendacja

Bez zmian wobec poprzedniej: zrobić **`[color]`, `[u]`, `[s]`**. To parser plus przeróbka
zawijania — dwa pliki (`UiMenu`, nowy `BbCode`), zero zmian w shaderach i w atlasie. Daje
dokładnie to, po co sięga się po BB code w takim interfejsie: wyróżnienie wartości kolorem
(`collision: [color=#f66]true[/color]`), oddzielenie etykiety od wartości, podkreślenie nagłówka.

`[b]` i `[i]` odłożyć — a gdy przyjdą, zrobić je razem, bo oba wymagają tej samej przebudowy
atlasu na wiele krojów z osobnymi metrykami.

### Ryzyko, o którym warto wiedzieć zawczasu

Tekst wierszy powstaje ze **stringów budowanych z danych** (`name`, `type`). Gdy nazwa tekstury
będzie zawierać `[`, parser zobaczy znacznik tam, gdzie go nie ma. Trzeba więc albo escape'ować
dane wchodzące do wiersza, albo parsować wyłącznie tam, gdzie autor wiersza sam o to poprosi
(np. `makeRichRow()` obok zwykłego `makeRow()`). Druga droga jest bezpieczniejsza i tańsza.

---

## 4. Przy okazji: czcionka i odstęp między wierszami

- **Plik**: `assets/Verdana Bold.ttf`, kopiowany do `public/assets/` przez plugin webpacka —
  folder `assets/` zostaje jedynym miejscem, które się edytuje.
- **Ładowanie**: `FontFace` + `document.fonts.add()` **przed** narysowaniem atlasu. Bez tego
  atlas powstałby krojem systemowym i nikt by nie zauważył aż do obejrzenia ekranu, dlatego
  brak pliku jest twardym błędem, a nie cichym fallbackiem.
- **Odstęp**: `UiConfig.LINE_SPACING_PX` doliczany do wysokości wiersza w `getLineHeight()`.
  Cały układ interfejsu liczy się z tej metody, więc jedna liczba rozsuwa wszystkie listy, menu
  i okno debugowe naraz.
