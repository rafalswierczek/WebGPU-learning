# Analizy

Katalog na dokumenty analityczne dotyczące projektu (stan kodu, decyzje architektoniczne, plany).

Konwencja nazw: `RRRR-MM-DD-NN-krotki-temat.md`

| Dokument | Data | Temat |
|---|---|---|
| [2026-08-31-01-stan-projektu.md](2026-08-31-01-stan-projektu.md) | 2026-08-31 | Pełny przegląd stanu kodu: blokery, błędy WebGPU/WGSL, format mapy, architektura, plan na map editor |
| [2026-09-01-02-ladowanie-mapy.md](2026-09-01-02-ladowanie-mapy.md) | 2026-09-01 | Ładowanie całej mapy do RAM przy starcie: model pamięci, format chunka, pasma w IndexedDB, pipeline |
| [2026-09-01-03-refaktor-chunka.md](2026-09-01-03-refaktor-chunka.md) | 2026-09-01 | Refaktor Chunk/Tile/MapGenerator: 17 slotów zamiast 17 tablic, ChunkCodec, gotowy kod docelowy |
| [2026-09-02-04-wlasciwosci-kafli.md](2026-09-02-04-wlasciwosci-kafli.md) | 2026-09-02 | Nazwy tekstur, rodzaje kafli, kolizja, speedFactor, okno kontekstowe i reużywalny TextInput |
| [2026-09-04-05-komorka-i-dwa-stosy.md](2026-09-04-05-komorka-i-dwa-stosy.md) | 2026-09-04 | Komórka źródłem prawdy: tileStack i objectStack z identyfikatorami, rejestry, reguły kolizji, speedFactor i type |
| [2026-09-04-06-biblioteka-tekstur-i-pedzle.md](2026-09-04-06-biblioteka-tekstur-i-pedzle.md) | 2026-09-04 | Tekstury z zipa do bazy, config.json i jego dziedziczenie, pędzle złożone, odcisk przy przeciąganiu, atlas na GPU |
| [2026-09-05-07-bb-code-w-interfejsie.md](2026-09-05-07-bb-code-w-interfejsie.md) | 2026-09-05 | Wycena BB code w wierszach UI: co jest tanie (kolor, podkreślenie), co drogie (bold/italic) i dlaczego |
