/**
 * Sadržaj o trenerstvu i članstvu: sekcija "Što dobivaš" na naslovnici i
 * stranica /treneri. Na jednom mjestu, hrvatski i engleski, da tekst lako
 * mijenjaš bez diranja dizajna.
 *
 * Tvrdnje o klubu i trenerstvu oslanjaju se na ono što stranica već kaže;
 * brojke o trenerima (kategorija, dizanja, total, GLP) ne pišu se ovdje nego
 * se čitaju iz tablice lwlup_members, iste koja puni stranicu Tim.
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
      title: 'Program složen samo za tebe',
      items: [
        { title: 'Individualni program', desc: 'Nema nagađanja. Uz RPE tablice i metodično sastavljene blokove određujemo optimalan trening za tvoj napredak.' },
        { title: 'Analiza tehnike', desc: 'Tvoje snimke izvedbe analiziramo kako bismo uklonili slabe točke, spriječili ozljede i unaprijedili tehniku.' },
        { title: 'Prilagodba treninga', desc: 'Život nije linearan, pa nije ni trening. Plan prilagođavamo tvom oporavku, stresu i snazi.' },
        { title: 'Sve u LWL UP aplikaciji', desc: 'Svaku seriju i ponavljanje upisuješ u aplikaciju, a napredak pratiš kroz grafove i projekcije bloka.' },
        { title: 'Priprema za natjecanje', desc: 'Peaking, odabir pokušaja i mentalna priprema za dan natjecanja.' },
      ],
      cta: 'UPOZNAJ TRENERE',
    },
    club: {
      label: 'ČLANSTVO U KLUBU',
      title: 'Dio LWL UP ekipe',
      items: [
        { title: 'Zajednica', desc: 'Okruži se lifterima koji dijele istu strast. Unutar LWL UP-a rast je kolektivan — pobjeđujemo i gubimo zajedno.' },
        { title: 'Natjecanja za klub', desc: 'Nastupaš pod imenom LWL UP-a, a klub te prijavljuje na natjecanja.' },
        { title: 'Mjesto u timu', desc: 'Tvoj profil i natjecateljski rezultati na stranici Tim, uz ostale članove kluba.' },
      ],
      cta: 'UČLANI SE',
    },
  },
  en: {
    eyebrow: 'WHAT YOU GET',
    title: 'COACHING AND THE CLUB',
    coaching: {
      label: 'INDIVIDUAL COACHING',
      title: 'A program built just for you',
      items: [
        { title: 'Individual program', desc: 'No guesswork. Using RPE tables and methodically built blocks, we determine the optimal training for your progress.' },
        { title: 'Technique analysis', desc: 'We analyse videos of your lifts to eliminate weak points, prevent injuries and improve technique.' },
        { title: 'Training adjustments', desc: 'Life is not linear, and neither is training. We adjust the plan to your recovery, stress and strength.' },
        { title: 'Everything in the LWL UP app', desc: 'You log every set and rep in the app and follow your progress through graphs and block projections.' },
        { title: 'Competition preparation', desc: 'Peaking, attempt selection and mental preparation for meet day.' },
      ],
      cta: 'MEET THE COACHES',
    },
    club: {
      label: 'CLUB MEMBERSHIP',
      title: 'Part of the LWL UP team',
      items: [
        { title: 'Community', desc: 'Surround yourself with lifters who share the same passion. Inside LWL UP, growth is collective — we win and lose together.' },
        { title: 'Compete for the club', desc: 'You compete under the LWL UP name, and the club enters you into competitions.' },
        { title: 'A place on the team', desc: 'Your profile and competition results on the Team page, alongside the other club members.' },
      ],
      cta: 'JOIN THE CLUB',
    },
  },
}

/**
 * Screenshotovi aplikacije na stranici /treneri, iz public/slike/aplikacija/.
 * w/h su stvarne dimenzije datoteke — Next po njima poslužuje manje WebP/AVIF
 * verzije. Kad mijenjaš sliku, ažuriraj i dimenzije. Redoslijed = prikaz.
 */
export const SCREENS: { file: string; w: number; h: number; text: Record<Lang, Item> }[] = [
  { file: 'pregled.png', w: 1278, h: 355, text: {
    hr: { title: 'Pregled bloka', desc: 'Na vrhu treninga uvijek vidiš gdje si: tjedni, odrađeni treninzi i serije, napredak bloka i odbrojavanje do sljedećeg natjecanja. Jednim klikom otvaraš kilaže iz prošlog bloka ili projekcije za kraj bloka.' },
    en: { title: 'Block overview', desc: 'At the top of your training you always see where you stand: weeks, completed workouts and sets, block progress and a countdown to your next competition. One click opens last block’s numbers or the end-of-block projections.' },
  } },
  { file: 'serije.png', w: 1327, h: 775, text: {
    hr: { title: 'Plan i upis serija', desc: 'Trening po tjednima i danima, točno onako kako ga je trener složio. Svaku seriju upisuješ odmah — kilažu, ponavljanja i RPE — a top setovi i backoff serije jasno su označeni.' },
    en: { title: 'Plan and set logging', desc: 'Training by week and day, exactly as your coach built it. You log every set right away — weight, reps and RPE — with top sets and backoff sets clearly marked.' },
  } },
  { file: 'natjecanje.png', w: 1303, h: 764, text: {
    hr: { title: 'Dan natjecanja', desc: 'Za odabrano natjecanje planiraš raspored dana — vaganje, zagrijavanje i nastup — te pokušaje za čučanj, bench i mrtvo dizanje. Uz to usporedba s konkurencijom i bilješke nakon natjecanja.' },
    en: { title: 'Meet day', desc: 'For your chosen competition you plan the day — weigh-in, warm-up and lifting — and your attempts for squat, bench and deadlift. Plus a comparison with the competition and post-meet notes.' },
  } },
  { file: 'alati.png', w: 1312, h: 631, text: {
    hr: { title: 'Alati i dnevnik', desc: 'Kalkulatori za RPE, GL bodove, water cut i slaganje utega na šipku, vodiči za pripremu natjecanja te dnevnik tjelesne kilaže, prehrane, hidratacije i oporavka.' },
    en: { title: 'Tools and log', desc: 'Calculators for RPE, GL points, water cut and loading the bar, guides for meet preparation, and a log for bodyweight, nutrition, hydration and recovery.' },
  } },
]

/** Treneri redoslijedom prikaza. Ime mora odgovarati imenu u lwlup_members. */
export const COACHES: { name: string; photo: string; role: Record<Lang, string> }[] = [
  { name: 'Walter Smajlović', photo: '/slike/walter-s.jpg', role: { hr: 'Glavni trener & suosnivač', en: 'Head coach & co-founder' } },
  { name: 'Petar Rendulić',   photo: '/slike/petar-r.jpg',  role: { hr: 'Trener', en: 'Coach' } },
  { name: 'Kristian Lovey',   photo: '/slike/kristian-l.jpg', role: { hr: 'Trener', en: 'Coach' } },
  { name: 'Ivan Petriček',    photo: '/slike/ivan-p.jpg',   role: { hr: 'Trener', en: 'Coach' } },
]

export const COACHES_PAGE: Record<Lang, {
  eyebrow: string; title: string; desc: string
  appEyebrow: string; appTitle: string; appDesc: string; shotSoon: string
  teamEyebrow: string; teamTitle: string
  ctaTitle: string; ctaDesc: string; ctaBtn: string
  total: string; best: string
}> = {
  hr: {
    eyebrow: 'INDIVIDUALNO TRENERSTVO',
    title: 'TRENERI',
    desc: 'Program složen samo za tebe, analiza tehnike i priprema za natjecanje — uz trenere koji i sami nastupaju na platformi.',
    appEyebrow: 'LWL UP APLIKACIJA',
    appTitle: 'KAKO IZGLEDA TRENING',
    appDesc: 'Sve što trener isplanira i sve što ti odradiš stoji na jednom mjestu.',
    shotSoon: 'SCREENSHOT USKORO',
    teamEyebrow: 'TRENERSKI TIM',
    teamTitle: 'TKO TE VODI',
    ctaTitle: 'KRENIMO',
    ctaDesc: 'Ispuni kratku prijavu i javit ćemo ti se da dogovorimo sve detalje.',
    ctaBtn: 'PRIJAVI SE ZA TRENERSTVO',
    total: 'TOTAL',
    best: 'Najbolja dizanja',
  },
  en: {
    eyebrow: 'INDIVIDUAL COACHING',
    title: 'COACHES',
    desc: 'A program built just for you, technique analysis and competition preparation — with coaches who compete on the platform themselves.',
    appEyebrow: 'THE LWL UP APP',
    appTitle: 'WHAT TRAINING LOOKS LIKE',
    appDesc: 'Everything your coach plans and everything you complete lives in one place.',
    shotSoon: 'SCREENSHOT COMING SOON',
    teamEyebrow: 'COACHING TEAM',
    teamTitle: 'WHO LEADS YOU',
    ctaTitle: "LET'S START",
    ctaDesc: 'Fill in a short application and we will get in touch to arrange the details.',
    ctaBtn: 'APPLY FOR COACHING',
    total: 'TOTAL',
    best: 'Best lifts',
  },
}
