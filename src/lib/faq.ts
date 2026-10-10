import { LEGAL } from '@/lib/legal'

/**
 * Česta pitanja s naslovnice.
 *
 * Isti tekst ide u sekciju na stranici i u FAQPage JSON-LD, pa su ovdje, a ne u
 * i18n.ts — tražilica smije vidjeti samo ono što piše i na stranici, a dva
 * odvojena izvora bi se prije ili kasnije razišla.
 *
 * Svaka tvrdnja oslanja se na nešto što stranica već kaže (statistike, opis
 * trenera, prijavni obrazac, kategorije). Kad se te brojke promijene na
 * naslovnici, promijeni ih i ovdje.
 */

export type Faq = { q: string; a: string }

export const FAQ: Record<'hr' | 'en', Faq[]> = {
  hr: [
    {
      q: 'Što je powerlifting?',
      a: 'Powerlifting je sport snage u kojem se natječe u tri discipline: čučnju (squat), potisku s klupe (bench press) i mrtvom dizanju (deadlift). Svaki natjecatelj ima tri pokušaja po disciplini, a zbroj najboljih uspješnih pokušaja čini total. Natječe se po spolu, težinskoj i dobnoj kategoriji, pa se rezultati uspoređuju s dizačima slične tjelesne mase i dobi.',
    },
    {
      q: 'Mogu li se prijaviti ako nikad nisam trenirao powerlifting?',
      a: 'Možeš. U prijavnom obrascu navodiš svoje iskustvo, od početnika do naprednog, i trenutne kilaže ako ih znaš. Program se slaže prema tvojoj razini, a tehnika se gradi kroz analizu snimki tvoje izvedbe.',
    },
    {
      q: 'Kako se učlaniti u LWL UP?',
      a: 'Ispuni prijavni obrazac na stranici i odaberi učlanjenje u klub ili individualno trenerstvo. Javit ćemo ti se i dogovoriti sve detalje. Ako si trenutno član drugog kluba, članstvo u LWL UP-u moguće je nakon ispisa iz tog kluba.',
    },
    {
      q: 'Kako izgleda individualni program?',
      a: 'Program se slaže za tebe pomoću RPE tablica i planiranih trenažnih blokova, a prilagođava se tvom oporavku, stresu i napretku. Sve serije, kilaže i ponavljanja upisuješ u LWL UP aplikaciju, gdje trener prati tvoj napredak i po potrebi korigira plan.',
    },
    {
      q: 'Pripremate li sportaše za natjecanja?',
      a: 'Da. Svi programi usmjereni su prema natjecanjima: peaking, odabir pokušaja, prijava i mentalna priprema. Članovi kluba drže 12 državnih rekorda i nastupili su na 6 europskih natjecanja.',
    },
    {
      q: 'Tko vodi treninge?',
      a: 'Glavni trener je Walter Smajlović, desetorostruki državni prvak s više od četiri državna rekorda i 10. mjestom na European Openu 2025. Trenutno vodi više od deset aktivnih natjecatelja.',
    },
    {
      q: 'U kojim se kategorijama natječe?',
      a: 'Dobne kategorije su kadeti (14–18 godina), juniori (19–23), open (24–39) i masters (40 i više). Težinske kategorije za muškarce idu od −59 do +120 kg, a za žene od −47 do +84 kg.',
    },
    {
      q: 'Gdje se nalazi klub?',
      a: `LWL UP je powerlifting klub sa zagrebačkog područja, sa sjedištem u mjestu ${LEGAL.locality}.`,
    },
  ],
  en: [
    {
      q: 'What is powerlifting?',
      a: 'Powerlifting is a strength sport with three lifts: the squat, the bench press and the deadlift. Each lifter gets three attempts per lift, and the sum of the best successful attempts is the total. Lifters compete by sex, weight class and age category, so results are compared with lifters of similar bodyweight and age.',
    },
    {
      q: 'Can I apply if I have never done powerlifting?',
      a: 'Yes. In the application form you state your experience, from beginner to advanced, and your current numbers if you know them. The program is built for your level, and technique is developed through analysis of videos of your lifts.',
    },
    {
      q: 'How do I join LWL UP?',
      a: 'Fill in the application form on the site and choose club membership or individual coaching. We will get in touch and arrange the details. If you are currently a member of another club, LWL UP membership is possible once you leave that club.',
    },
    {
      q: 'What does an individual program look like?',
      a: 'Your program is built with RPE tables and planned training blocks, and adjusted to your recovery, stress and progress. You log every set, weight and rep in the LWL UP app, where your coach follows your progress and adjusts the plan when needed.',
    },
    {
      q: 'Do you prepare athletes for competitions?',
      a: 'Yes. Every program is competition-oriented: peaking, attempt selection, entry and mental preparation. Club members hold 12 national records and have competed at 6 European competitions.',
    },
    {
      q: 'Who coaches the training?',
      a: 'Head coach Walter Smajlović is a ten-time national champion with more than four national records and 10th place at the 2025 European Open. He currently coaches more than ten active competitors.',
    },
    {
      q: 'Which categories do lifters compete in?',
      a: 'Age categories are sub-juniors (14–18), juniors (19–23), open (24–39) and masters (40+). Men\'s weight classes range from −59 to +120 kg and women\'s from −47 to +84 kg.',
    },
    {
      q: 'Where is the club?',
      a: `LWL UP is a powerlifting club from the Zagreb area, registered in ${LEGAL.locality}.`,
    },
  ],
}

/** schema.org FAQPage — hrvatska verzija, jer je to jezik koji stranica poslužuje. */
export const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  inLanguage: 'hr-HR',
  mainEntity: FAQ.hr.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}
