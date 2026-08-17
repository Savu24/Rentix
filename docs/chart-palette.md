# Paleta wykresów Rentiksa

Wyprowadzona metodą snap-to-passing i **przewalidowana skryptem**, nie dobrana na
oko. Wartości są gotowe do wpięcia w etapie 8 (dashboard + raporty).

Powierzchnia wykresu = `--surface` (wykresy siedzą w kartach `.r-card`):
light `#FFFFFF`, dark `#17281F`.

## Kategorialna (identyczność serii)

Kolejność slotów jest mechanizmem bezpieczeństwa CVD, nie kosmetyką — wyszła
z enumeracji wszystkich kolejności przy slocie 1 przypiętym do zieleni marki.

| Slot | Barwa | Light | Dark |
|---|---|---|---|
| 1 | zieleń (marka) | `#018161` | `#339e7c` |
| 2 | niebieski | `#166eb9` | `#3a84ca` |
| 3 | bursztyn | `#cd971b` | `#b98918` |
| 4 | śliwka | `#a54c8b` | `#af5594` |
| 5 | oliwka | `#7b9040` | `#6a7e2d` |
| 6 | fiolet | `#644b9e` | `#9882d4` |
| 7 | terakota (marka) | `#c66337` | `#c96c44` |
| 8 | morski | `#10a6ad` | `#0ca1a7` |

Wynik walidatora — **ALL CHECKS PASS w obu trybach**:

- pasmo jasności: 8/8 w paśmie · chroma: 8/8 ≥ 0.10
- CVD (sąsiednie): najgorsza para ΔE **14.6** light / **12.8** dark (cel ≥ 8)
- widzenie normalne (sąsiednie): ΔE **16.6** light / **16.1** dark (podłoga ≥ 15)
- kontrast: dark 8/8 ≥ 3:1; **light: bursztyn 2.61 i morski 2.97 poniżej 3:1**
  → obowiązuje reguła reliefu: widoczne etykiety bezpośrednie albo widok tabeli

**Limit serii dla `--pairs all`** (scatter, bubble, small multiples, mapa):
**3 sloty**. Powyżej — zwijaj do „Pozostałe" albo facetuj. Dla słupków, linii
i stosów (pary sąsiednie) obowiązuje pełna ósemka.

### Dlaczego niebieski i fiolet, skoro marka jest zielono-terakotowa

Bo zieleń (h≈168), terakota (h≈43) i bursztyn (h≈84) leżą w jednym łuku
czerwień–zieleń, a protanopia i deuteranopia właśnie tę oś zlepiają.
Enumeracja pokazała to twardo: **nie istnieje kolejność z terakotą na slocie 2,
która przechodzi bramki** — para marki nie może stać obok siebie na wykresie.
Wciągnięcie terakoty na slot 3 obniża limit `--pairs all` z 3 do 2 slotów.
Dlatego terakota zostaje na slocie 7: w UI dalej jest kolorem CTA, a w wykresach
pojawia się dopiero przy 7+ seriach, czyli praktycznie nigdy.

## Sekwencyjna (wielkość) — jedna barwa, zieleń marki

| Stopień | Light | Dark |
|---|---|---|
| 100 | `#d9f2e7` | `#1e3f33` |
| 200 | `#b4e0ce` | `#1d5946` |
| 300 | `#8bcab1` | `#1e7359` |
| 400 | `#5eb193` | `#268e6e` |
| 500 | `#269573` | `#3ea885` |
| 600 | `#017558` | `#68c2a2` |
| 700 | `#00523d` | `#99dfc4` |

Monotoniczna jasność, każda sąsiednia różnica ΔL ≥ 0.06 — sprawdzone.
Stopień 100 celowo recesuje ku powierzchni („bliskie zeru").

**Dla skali porządkowej** (etapy, przedziały, kubełki) nie startuj od 100:
light od stopnia **400** (`#5eb193`, 2.57:1), dark od stopnia **300**
(`#1e7359`, 2.69:1) — poniżej stopień znika w tle.

## Dywergentna (biegunowość) — terakota ↔ niebieski

Neutralna szarość w środku. **Zieleń odrzucona jako biegun**: z terakotą daje
CVD ΔE 8.6 (ledwo nad progiem), niebieski daje **19.2 light / 23.6 dark**.

Zieleń↔terakota zostaje jako wariant „markowy" — wolno go użyć wyłącznie
z etykietami bezpośrednimi albo widokiem tabeli.

## Status (stan) — nigdy nie tematyzowany

Rentix ma trzy realne stany rozliczenia, więc skala jest trzystopniowa.

| Rola | Znaczenie w produkcie | Light | Dark |
|---|---|---|---|
| good | opłacone | `#3F7D52` | `#5FAE7C` |
| warning | zbliża się termin | `#B9832B` | `#D8A857` |
| critical | zaległość | `#B14A34` | `#D3735A` |

To są istniejące tokeny `--good` / `--warn` / `--bad` — status nie dostaje
własnej palety.

**Świadomie pominięty stopień `serious`** ze skali skilla: kandydat
(terakota `#C4653B`) wypadł ΔE **0.5** od kategorialnego slotu 7 — status
podszywałby się pod serię. Trzy stany wystarczają Rentiksowi.

Statusy siedzą blisko słotów kategorialnych tej samej rodziny (good↔zieleń
ΔE 3.1 light, critical↔terakota ΔE 3.3 dark), więc **zawsze jadą z ikoną
i etykietą** — nigdy sam kolor.

## Reguły, które trzeba trzymać

- Kolor idzie za encją, nigdy za jej rankingiem. Filtr zmieniający liczbę serii
  nie przemalowuje tych, które zostały.
- Nigdy dwie osie Y. Dwie miary o różnej skali → dwa wykresy albo indeksacja
  do wspólnej bazy.
- Słupki nominalne (przychód wg nieruchomości) biorą **ten sam** slot 1 —
  kolorowanie ich wartością marnuje kanał identyczności na to, co już pokazuje
  długość słupka.
- Gdy seria *znaczy* dobrze/źle, nosi tokeny statusu, nie kategorialne.
- Tekst nosi tokeny tekstu (`--text`, `--text-secondary`), nigdy kolor serii.

## Jak to przewalidować ponownie

```bash
node <skill>/scripts/validate_palette.js \
  "#018161,#166eb9,#cd971b,#a54c8b,#7b9040,#644b9e,#c66337,#10a6ad" \
  --mode light --surface "#FFFFFF"
```

Dla dark: `--mode dark --surface "#17281F"` i ciąg z kolumny Dark.
