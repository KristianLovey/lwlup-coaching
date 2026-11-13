# LWL UP — upute za rad na projektu

Detaljni projektni vodiči su skillovi u `.claude/skills/` (frontend, design, backend, database, workflow).
Ovdje su pravila koja vrijede uvijek.

## UI pravila

### Baza

- Stil je **ručno pisani CSS**, bez Tailwinda i bez shadcn/ui. Tailwind je u `package.json`, ali nije uključen
  (nema `@tailwind` direktiva). **Ne uključuj ga**: njegov globalni reset promijenio bi i javne stranice.
- Dva vizualna svijeta, nikad ih ne miješaj (detalji u skillu `design`):
  - **javne stranice** (`/`, `/team`, `/records`…): oštri rubovi, Inter + Oswald;
  - **paneli**: admin/trener (`.lwl-admin-os`, `src/app/admin/admin-os.css`) i lifterov trening panel
    (`/training`, omotan u `.lwl-panel`, tokeni `--t-*` iz `src/app/globals.css`).
- U panelima koristi **tokene, ne hex vrijednosti**. Nove boje, radiusi i fontovi idu u tokene, ne u komponentu.

### Brand tokeni

| Što | Token | Vrijednost |
|---|---|---|
| Pozadina i plohe | `--t-bg`, `--t-s1` … `--t-hi` (admin: `--bg`, `--surface-*`) | `#0a0a0a` → `#2a2a2a` |
| Rubovi | `--t-border`, `--t-border-hi` | `#232323`, `#3a3a3a` |
| Akcent | `--accent` (meet card `--acc`) | `#ef3535`, štedljivo: signal, glavna akcija, ključni broj |
| Naslovi, veliki brojevi | `--fd`, `--font-display` | Oswald |
| Tekst u panelima | `--fb`, `--font-body` (u `.lwl-panel` i `--fm`) | Barlow |
| Labele, tablični brojevi | `--font-mono` (u adminu i `--fm`) | JetBrains Mono |
| Radius: kartice, sekcije, modali | `--t-r` (admin `--radius-md/lg/xl`) | 6px |
| Radius: polja, gumbi, chipovi | `--t-r-sm` (admin `--radius-xs/sm`) | 4px |

- **Ništa u panelima nema veći radius od `--t-r`.** Iznimke su samo krugovi (`50%`) i pilule (`999px`).
- Bez ljubičasto-indigo gradijenata i bez novih fontova. Plava i ljubičasta postoje samo kao boje blokova
  (`BLOCK_COLORS`), tj. kao podatkovne boje, ne kao ukras.
- Dojam: **snažno, sportski, ozbiljno, powerlifting klub.** Mono eyebrow labele velikim slovima, veliki Oswald brojevi,
  tanke linije, crvena samo kao signal.

### Koja biblioteka za koji problem

| Problem | Biblioteka |
|---|---|
| Obavijest nakon radnje (spremljeno, greška) | `sonner` |
| Potvrda nepovratne radnje (brisanje) | `@radix-ui/react-alert-dialog` |
| Modal / dijalog | `@radix-ui/react-dialog` (na mobitelu bottom sheet kroz `vaul`) |
| Drawer, bottom sheet, mobilni izbornik | `vaul` |
| Padajući izbornik (profil, akcije) | `@radix-ui/react-dropdown-menu` |
| Picker / popover (odabir bloka, tjedna, natjecanja) | `@radix-ui/react-popover` |
| Pretraga, combobox, command menu (⌘K) | `cmdk` |
| Brojevi koji se mijenjaju (kg, total, %, KPI) | `@number-flow/react` |
| Collapse/expand, izlazne animacije, layout animacije | `motion` |

- Biblioteke su **headless**: stiliziraj ih postojećim tokenima i klasama. Ne kopiraj shadcn Tailwind klase.

### Zajednički UI sloj (`src/components/ui/`) — koristi ovo prije nego išta napišeš

| Datoteka | Što | Kako |
|---|---|---|
| `ui-hosts.tsx` | Toaster + host za potvrde | Montiran jednom: u korijenu AdminOS-a i u `training/layout.tsx`. Ne montiraj ga ponovno. |
| `toast.ts` | `toast.success / error / info` | Greške traju 6 s. Umjesto `alert()`. |
| `confirm.tsx` | `confirmDialog({ title, description, confirmLabel, destructive })` | `if (!(await confirmDialog({...}))) return` umjesto `confirm()`. |
| `num.tsx` | `<Num value={…} />` | Animirani broj; tekst (`'—'`) ispiše kakav jest. Meet card: `locales="hr-HR"` + 1 decimala. |
| `collapse.tsx` | `<Collapse open={…}>` | Umjesto `{open && …}` za sadržaj koji se širi/skuplja. |
| `use-media-query.ts` | `useMediaQuery('(max-width: 900px)')` | Prvi render je `false` (desktop). Hook pozovi prije ranih `return`-ova. |
| `ui.css` | `.ui-menu`, `.ui-pop`, `.ui-item`, `.ui-cmd-item`, `.ui-cmd-empty` | Klase za Radix izbornike/popovere i cmdk stavke. |

Zamke koje su se već dogodile:
- Admin resetira gumbe s `.lwl-admin-os button { background: none; border: none }` (0,1,1). Stil gumba kao sama klasa
  (0,1,0) tu gubi; scopaj ga (npr. `.ui-confirm .ui-btn`) ili koristi `.lwl-admin-os .klasa`.
- `globals.css` boji sve `h1–h5` u bijelo. Radix/Vaul `Title` je `<h2>`: daj mu `margin: 0; color: …` (svijetla tema).
- Popover/izbornik unutar Vaul drawera dobiva `data-vaul-no-drag=""`, inače povlačenje liste pomiče drawer.
- Sidebar admina na ≤900px ima `transform` i `overflow`: popoveri iz njega idu kroz `Portal container={osRoot}`.
- Prije instalacije provjeri da biblioteka podržava React 18 (peer dependencies).
- Portali (Radix, Vaul, Sonner) moraju naslijediti tokene panela: montiraj ih unutar `.lwl-admin-os` odnosno
  `.lwl-panel` (prop `container`), inače dobiju font i boje javnih stranica.
- Jednostavni ulazi (fade, stagger) ostaju CSS keyframes. Uvijek poštuj `prefers-reduced-motion`.

### Pravila

1. **Ne piši ručno komponentu ako postoji biblioteka s popisa.** Bez novih `document.addEventListener('mousedown', …)`
   handlera za klik izvan, bez `alert()` i `confirm()`, bez ručnih drawera i modala.
2. **Najviše jedan animirani showpiece efekt po stranici** (Magic UI / Aceternity i slično). U panelima po pravilu nijedan:
   alat za trenere i liftere mora biti brz i miran.
3. UI posao ne mijenja logiku aplikacije, rute ni podatke.
4. Mikrocopy je hrvatski, kratak i kaže što napraviti ("Nema blokova. Klikni 'Novi blok'.").
