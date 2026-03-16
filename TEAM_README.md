# LWLUP TEAM PAGE - UPUTE ZA AŽURIRANJE

## 📸 SLIKE ATLETA

Sve slike atleta trebaju biti u `/public/slike/` folderu s imenima:

- `walter-s.jpg` - Walter Smajlović
- `petar-r.jpg` - Petar Rendulić
- `kristian-l.jpg` - Kristian Lovey
- `lara-z.jpg` - Lara Žic
- `filip-h.jpg` - Filip Humski
- `amar-k.jpg` - Amar Kantarević
- `ivan-p.jpg` - Ivan Petriček
- `luka-g.jpg` - Luka Grežina
- `filip-p.jpg` - Filip Pavlović
- `daren-g.jpg` - Daren Grgičević

## 🏋️ KAKO PRONAĆI PODATKE NA OPENIPF

1. Idi na: https://www.openipf.org/
2. Pretraži ime atleta u search baru
3. Klikni na profil atleta
4. U "Personal Bests" tablici vidi:
   - **Squat** - Najbolji čučanj
   - **Bench** - Najbolji bench press
   - **Deadlift** - Najbolji deadlift
   - **Total** - Ukupan zbroj
   - **GLP** - IPF Points (GLP scoring)

## ✏️ KAKO AŽURIRATI PODATKE U KODU

Otvori `/app/team/page.tsx` i nađi `TEAM_MEMBERS` array.

Za svakog člana, ažuriraj:

```typescript
{
  name: 'Ime Prezime',
  nickname: 'NADIMAK', // Ostavi prazno '' ako nema
  img: '/slike/ime-p.jpg',
  category: 'M-83kg', // Spol-Kategorija (M-muški, F-ženski)
  squat: 262.5,       // Najbolji squat u kg
  bench: 185,         // Najbolji bench u kg
  deadlift: 295,      // Najbolji deadlift u kg
  total: 735,         // Ukupan total u kg
  glp: 101.89,        // GLP points
  highlights: [       // Lista uspjeha
    'Državni prvak 2024',
    'European Open 10th place'
  ],
  instagram: '#'      // Instagram link ili '#' ako nema
}
```

## 📊 PRIMJER PODATAKA (WALTER SMAJLOVIĆ)

```typescript
{
  name: 'Walter Smajlović',
  nickname: 'GICA',
  img: '/slike/walter-s.jpg',
  category: 'M-83kg',
  squat: 262.5,
  bench: 185,
  deadlift: 295,
  total: 735,
  glp: 101.89,
  highlights: [
    '10x Državni prvak',
    'European Open 2025 - 10th place',
    '12+ državnih rekorda'
  ],
  instagram: 'https://instagram.com/waltersmajlovic'
}
```

## 🔍 GDJE PRONAĆI KATEGORIJU (CLASS)

Na OpenIPF profilu atleta, kategorija je u "Class" koloni (npr. 83kg, 93kg, 63kg).
Dodaj prefiks:
- **M-** za muškarce (npr. M-83kg)
- **F-** za žene (npr. F-63kg)

## 💡 SAVJETI

- Slike bi trebale biti **square format** (1:1 ratio) ili **portrait** (3:4)
- Preporučena rezolucija: **1000x1000px** ili veća
- Format: `.jpg` ili `.png`
- Komprimiraj slike za brže učitavanje

## 📝 TEAM STATS

Za ažuriranje statistika tima, promijeni `TEAM_STATS` array:

```typescript
const TEAM_STATS = [
  { label: 'AKTIVNIH ATLETA', value: '10', icon: <Trophy size={20} /> },
  { label: 'DRŽAVNIH REKORDA', value: '12+', icon: <Award size={20} /> },
  // ...
]
```

---

**Za dodatna pitanja ili pomoć, kontaktiraj developera! 💪**
