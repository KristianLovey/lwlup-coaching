/**
 * Sadržaj o trenerstvu i članstvu: sekcija "Što dobivaš" na naslovnici i
 * stranica /treneri. Hrvatski i engleski na jednom mjestu.
 *
 * Ton prati ostatak stranice: kratke rečenice, izravno, bez crtica. Opisi
 * stavki trenerstva su doslovno oni koji su već bili na naslovnici.
 */

export type Lang = 'hr' | 'en'
export type Item = { title: string; desc: string }

export const OFFER: Record<Lang, {
  eyebrow: string; title: string
  coaching: { label: string; title: string; items: Item[]; cta: string }
  club: { label: string; title: string; items: Item[]; cta: string }
}> = {
  hr: {
    eyebrow: 'ŠTO DOBIVAŠ',
    title: 'TRENERSTVO I KLUB',
    coaching: {
      label: 'INDIVIDUALNO TRENERSTVO',
      title: 'Trening po tvojoj mjeri',
      items: [
        { title: 'Individualni program', desc: 'Nema nagađanja. Uz pomoć RPE tablica i metodološkog sastavljanja treninga, određujemo optimalne treninge za tvoj napredak.' },
        { title: 'Analiza tehnike', desc: 'Izravni povrat informacija. Tvoj video izvedbe analiziramo kako bismo eliminirali slabe točke, spriječili ozljede i unaprijedili tehniku.' },
        { title: 'Prilagodba treninga', desc: 'Tvoj život nije linearan, a tako nije ni trening. Radimo prilagodbe ovisno o tvom oporavku, stresu i snazi.' },
        { title: 'Praćenje podataka', desc: 'Svi tvoji podaci spremaju se u LWL UP sustav. Prati napredak kroz grafikone, svaki set i svako ponavljanje.' },
        { title: 'Natjecateljski fokus', desc: 'Svi programi orijentirani su prema natjecanjima. Peaking, prijava i mentalna priprema, sve na jednom mjestu.' },
      ],
      cta: 'UPOZNAJ TRENERE',
    },
    club: {
      label: 'ČLANSTVO U KLUBU',
      title: 'Mjesto u ekipi',
      items: [
        { title: 'Zajednica', desc: 'Okruži se lifterima koji dijele istu strast. Unutar LWL UP-a, rast je kolektivan. Pobjeđujemo i gubimo zajedno.' },
        { title: 'Natjecanja za klub', desc: 'Nastupaš za LWL UP. Klub te prijavljuje na natjecanja.' },
        { title: 'Mjesto u timu', desc: 'Tvoj profil i rezultati na stranici Tim, uz ostatak ekipe.' },
      ],
      cta: 'UČLANI SE',
    },
  },
  en: {
    eyebrow: 'WHAT YOU GET',
    title: 'COACHING AND THE CLUB',
    coaching: {
      label: 'INDIVIDUAL COACHING',
      title: 'Training built for you',
      items: [
        { title: 'Individual program', desc: 'No guesswork. Using RPE tables and methodical program design, we determine the optimal training for your progress.' },
        { title: 'Technique analysis', desc: 'Direct feedback. We analyse your performance video to eliminate weak points, prevent injuries and improve technique.' },
        { title: 'Training adjustments', desc: 'Your life is not linear, and neither is your training. We adjust based on your recovery, stress and strength.' },
        { title: 'Data tracking', desc: 'All your numbers live in the LWL UP system. Follow your progress through graphs, every set and every rep.' },
        { title: 'Competition focus', desc: 'All programs are competition-oriented. Peaking, entry and mental preparation, all in one place.' },
      ],
      cta: 'MEET THE COACHES',
    },
    club: {
      label: 'CLUB MEMBERSHIP',
      title: 'A spot on the team',
      items: [
        { title: 'Community', desc: 'Surround yourself with lifters who share the same passion. Inside LWL UP, growth is collective. We win and lose together.' },
        { title: 'Compete for the club', desc: 'You lift for LWL UP. The club enters you into competitions.' },
        { title: 'A place on the team', desc: 'Your profile and results on the Team page, next to the rest of the crew.' },
      ],
      cta: 'JOIN THE CLUB',
    },
  },
}

/**
 * Screenshotovi aplikacije na stranici /treneri, iz public/slike/aplikacija/.
 * w/h su stvarne dimenzije datoteke (Next po njima poslužuje manje WebP/AVIF
 * verzije). Kad mijenjaš sliku, ažuriraj i dimenzije. Redoslijed = prikaz.
 */
export const SCREENS: { file: string; w: number; h: number; text: Record<Lang, Item> }[] = [
  { file: 'pregled.png', w: 1278, h: 355, text: {
    hr: { title: 'Pregled bloka', desc: 'Sve bitno na jednom mjestu. Tjedni, treninzi, serije i koliko ti je ostalo do natjecanja.' },
    en: { title: 'Block overview', desc: 'Everything that matters in one place. Weeks, sessions, sets and how long until the next meet.' },
  } },
  { file: 'serije.png', w: 1327, h: 775, text: {
    hr: { title: 'Plan i upis serija', desc: 'Trener složi, ti odradiš. Za svaku seriju upisuješ kilažu, ponavljanja i RPE. Top setovi i backoffi su odmah označeni.' },
    en: { title: 'Plan and set logging', desc: 'Your coach builds it, you lift it. Log weight, reps and RPE for every set. Top sets and backoffs are marked right away.' },
  } },
  { file: 'natjecanje.png', w: 1303, h: 764, text: {
    hr: { title: 'Dan natjecanja', desc: 'Vaganje, zagrijavanje i pokušaji isplanirani prije nego izađeš na platformu.' },
    en: { title: 'Meet day', desc: 'Weigh-in, warm-up and attempts planned before you step on the platform.' },
  } },
  { file: 'alati.png', w: 1312, h: 631, text: {
    hr: { title: 'Alati i dnevnik', desc: 'RPE kalkulator, GL bodovi, water cut i slaganje šipke. Uz to dnevnik kilaže, prehrane i oporavka.' },
    en: { title: 'Tools and log', desc: 'RPE calculator, GL points, water cut and bar loading. Plus a log for bodyweight, nutrition and recovery.' },
  } },
]

/**
 * Treneri redoslijedom prikaza. Ime mora odgovarati imenu u lwlup_members
 * (odatle se čita Instagram). Opisi su kratki i činjenični; zamijeni ih
 * pravim tekstom kad ga treneri pošalju.
 */
export const COACHES: { name: string; photo: string; role: Record<Lang, string>; bio: Record<Lang, string> }[] = [
  { name: 'Walter Smajlović', photo: '/slike/walter-s.jpg',
    role: { hr: 'Glavni trener i suosnivač', en: 'Head coach and co-founder' },
    bio: {
      hr: 'Izgradio je LWL UP na temeljima beskompromisnog rada. Deseterostruki državni prvak, vodi više od deset aktivnih natjecatelja.',
      en: 'Built LWL UP on uncompromising work. Ten-time national champion, coaching more than ten active competitors.',
    } },
  { name: 'Petar Rendulić', photo: '/slike/petar-r.jpg',
    role: { hr: 'Trener', en: 'Coach' },
    bio: { hr: 'Trener i natjecatelj u kategoriji do 83 kg.', en: 'Coach and competitor in the 83 kg class.' } },
  { name: 'Kristian Lovey', photo: '/slike/kristian-l.jpg',
    role: { hr: 'Trener', en: 'Coach' },
    bio: { hr: 'Trener i natjecatelj u kategoriji do 93 kg. Napravio je LWL UP aplikaciju u kojoj treniraš.', en: 'Coach and competitor in the 93 kg class. Built the LWL UP app you train in.' } },
  { name: 'Ivan Petriček', photo: '/slike/ivan-p.jpg',
    role: { hr: 'Trener', en: 'Coach' },
    bio: { hr: 'Trener i natjecatelj u kategoriji do 83 kg.', en: 'Coach and competitor in the 83 kg class.' } },
]

export const COACHES_PAGE: Record<Lang, {
  eyebrow: string; title: string; desc: string
  appEyebrow: string; appTitle: string; appDesc: string; shotSoon: string
  teamEyebrow: string; teamTitle: string
  ctaTitle: string; ctaDesc: string; ctaBtn: string
}> = {
  hr: {
    eyebrow: 'INDIVIDUALNO TRENERSTVO',
    title: 'TRENERI',
    desc: 'Program po tvojoj mjeri, analiza tehnike i priprema za natjecanje. Treneri koji i sami izlaze na platformu.',
    appEyebrow: 'LWL UP SUSTAV',
    appTitle: 'KAKO IZGLEDA TRENING',
    appDesc: 'Sve što trener isplanira i sve što ti odradiš, na jednom mjestu.',
    shotSoon: 'SCREENSHOT USKORO',
    teamEyebrow: 'NAŠ TIM',
    teamTitle: 'TKO TE VODI',
    ctaTitle: 'OSTAVI SVOJ TRAG',
    ctaDesc: 'Prijavi se, upoznajmo se i krenimo graditi tvoju snagu.',
    ctaBtn: 'PRIJAVI SE',
  },
  en: {
    eyebrow: 'INDIVIDUAL COACHING',
    title: 'COACHES',
    desc: 'A program built for you, technique analysis and meet preparation. Coaches who step on the platform themselves.',
    appEyebrow: 'THE LWL UP SYSTEM',
    appTitle: 'WHAT TRAINING LOOKS LIKE',
    appDesc: 'Everything your coach plans and everything you lift, in one place.',
    shotSoon: 'SCREENSHOT COMING SOON',
    teamEyebrow: 'OUR TEAM',
    teamTitle: 'WHO LEADS YOU',
    ctaTitle: 'LEAVE YOUR MARK',
    ctaDesc: "Sign up, let's meet, and start building your strength.",
    ctaBtn: 'SIGN UP',
  },
}
