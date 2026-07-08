---
name: design
description: Design system and visual language for this project (dark admin OS + public marketing pages). Use when styling anything - layout, colors, typography, cards, modals, charts, animations, responsive. Triggers - dizajn, design, stil, izgled, boje, tipografija, tema, dark mode, animacija, responsive.
---

# Design — vizualni jezik LWL UP-a

Projekt ima **dva vizualna svijeta**. Nikad ih ne miješaj:

## 1) Javne / marketinške stranice (`/`, `/team`, `/records`, `/competitions`…)

- Pozadina `#0e0e0e` – `#000`, bijela tipografija s prozirnostima (`rgba(255,255,255,0.3–0.65)`), **bez zaobljenja** (oštri rubovi), tanke linije `1px solid rgba(255,255,255,0.08–0.15)`.
- Font varijable: `var(--fd)` display (Bricolage), `var(--fm)` mono (JetBrains). Hero naslovi: `clamp(3rem, 8–10vw, 6–8rem)`, `line-height: 0.9`.
- **Eyebrow etikete**: mono, `0.55–0.75rem`, `letter-spacing: 0.2–0.45em`, uppercase, prigušena boja. To je zaštitni znak — koristi ih iznad naslova i nad poljima.
- Efekti: reveal-on-scroll (`useReveal` + IntersectionObserver, `translateY(30px)→0`, `cubic-bezier(0.16,1,0.3,1)`, ~0.7–1s), `ParticleCanvas`/`star-field` pozadine, grayscale slike koje se otkrivaju na hover (`filter: grayscale(0.6) → 0.2`, `scale(1.08)`).
- Gumbi: bijela pozadina + crni tekst, uppercase mono, `letter-spacing: 0.2em+`; hover invert preko `::before` scaleX animacije (vidi `.join-button`).

## 2) Admin OS (`/admin`, `/trainer` — sve pod `.lwl-admin-os`)

Sav CSS je **scopan pod `.lwl-admin-os`** u `admin-os.css` — nikad globalni selektori. Svijetla tema preko `[data-theme="light"]` (samo redefinira tokene).

### Tokeni (koristi ISKLJUČIVO varijable, ne raw hex)

| Token | Dark | Svrha |
|---|---|---|
| `--bg` | `#0a0a0a` | pozadina |
| `--surface-1/2/3/hi` | `#121212/#181818/#202020/#2a2a2a` | slojevi kartica |
| `--border` / `--border-strong` | `#232323` / `#3a3a3a` | linije |
| `--text` / `--text-dim` / `--text-muted` / `--text-faint` | `#f5f4f1/#a6a6a2/#7c7c77/#565650` | hijerarhija teksta |
| `--accent` / `--accent-soft` / `--accent-glow` | `#ef3535` / rgba 0.12 / rgba 0.35 | signalna crvena (štedljivo!) |
| `--radius-xs…xl` | 8/12/18/24/32px | zaobljenja |
| `--font-display` / `--font-mono` / `--font-body` | Bricolage / JetBrains / Bricolage | tipografija |
| `--shadow-card` | inset highlight + duboka sjena | kartice |

### Tipografski obrasci

- `.eyebrow` — mono 11px, `letter-spacing 0.18em`, uppercase, `--text-muted`. Za naslove sekcija i labele.
- Veliki brojevi (KPI, 1RM): `--font-display`, weight 800, `letter-spacing -0.02…-0.04em`, uz malu `kg`/`%` jedinicu u `--text-dim`.
- Tablični brojevi: `font-variant-numeric: tabular-nums` + mono.

### Komponente (postojeće klase — koristi ih, ne izmišljaj nove)

- **Kartica**: `.card` + `.card-head` (`<span class="t">Naslov</span>` + `.card-tools`), collapse preko `.is-collapsed`.
- **Modal**: `position:fixed; inset:0; background:rgba(0,0,0,0.8); zIndex:4000; display:grid; placeItems:center`, unutra `.card` s `maxWidth 380–560`, `onClick={onClose}` na scrimu + `stopPropagation` unutra. Akcije desno: `btn-a` (sekundarni) + `btn-a accent` (primarni).
- **Forme**: `.field` (label + input), `.field-row` (grid kolone), `.edit-grid`/`.edit-card` za mrežu kartica s poljima, `.saved-flash` za potvrdu spremanja.
- **Kontrole**: `.seg` segmented control (SQUAT/BENCH/DEADLIFT), `.range-select` + `.rs-caret` (mali select), `.os-select` (veliki select s chevronom), `.icon-sm` (+ `.danger`) ikonske akcije, `.ctrl.icon` topbar gumbi.
- **Stanja**: `.os-empty` (prazno/prigušeno, hrvatska poruka s uputom što kliknuti), `Loader2` s klasom `.os-spin` za loading.
- **Avatar**: `.a-avatar` s inicijalima (`initials()` helper), status točka `.sdot.on-track/.monitor`.

### Grafovi (custom SVG u `admin-os-charts.tsx`)

- Glavna linija **bijela**, sekundarna/naglasak `--accent` crvena; gradient fill ispod linije; zadnja točka prsten + isprekidana vertikala.
- Osi minimalne: mono 10–11px tickovi, bez grid mreže; datumi `dd.mm.` formatom.
- Blok-trake: pilule s imenom bloka VELIKIM SLOVIMA u boji bloka (`BLOCK_COLORS` paleta: `#22c55e #6b8cff #f59e0b #a78bfa #ef4444 #14b8a6`).

### Pokret i interakcija

- Tranzicije 0.2–0.4s; ulazi `cubic-bezier(0.16,1,0.3,1)`; stagger animacije `.os-stagger`, fade `.os-fade`, `os-fadeUp` za dropdownove.
- Hover na karticama: blagi `translateY(-4…-6px)` + jača sjena. Nikad drastične promjene boje.

## Responsive

- Breakpointi: `1180px` (rail), `768px` (mobitel — nav u drawer, gridovi u 1 kolonu), `480px` (uski padding).
- Široki sadržaj (tablice, mjesečni plan) u `overflow-x: auto` kontejneru s `minWidth` — stranica se nikad ne scrolla horizontalno.

## Mikrocopy

Hrvatski. Kratko i direktno: "Spremljeno", "Odustani", "Obriši", "Nema blokova", "Greška pri spremanju: …". Prazna stanja uvijek kažu **što napraviti**: „Nema spremljenih predložaka. Klikni 'Kreiraj predložak'."
