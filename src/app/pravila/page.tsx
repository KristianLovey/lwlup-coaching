import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'
import { publicPageMetadata } from '@/lib/page-metadata'
import { LEGAL, contactLabel, contactHref } from '@/lib/legal'

export const metadata = publicPageMetadata('Pravila privatnosti i korištenja', 'Pravila privatnosti, zaštita osobnih podataka i uvjeti korištenja platforme LWL UP.', '/pravila')

const SECTIONS = [
  {
    title: 'VODITELJ OBRADE PODATAKA',
    body: [
      'Voditelj obrade osobnih podataka prikupljenih putem platforme LWL UP (u daljnjem tekstu: "Platforma") je subjekt čiji su identifikacijski podaci navedeni u podnožju svake stranice Platforme.',
      'Za sva pitanja o obradi osobnih podataka, kao i za ostvarivanje prava opisanih u ovim Pravilima, možete nas kontaktirati putem podataka za kontakt navedenih u podnožju Platforme.',
      'Ako smatrate da obrađujemo vaše podatke protivno propisima, imate pravo podnijeti pritužbu nadzornom tijelu — Agenciji za zaštitu osobnih podataka (AZOP), Selska cesta 136, 10000 Zagreb, azop.hr.',
    ],
  },
  {
    title: 'KORIŠTENJE NA VLASTITU ODGOVORNOST',
    body: [
      'Korištenjem Platforme i svih njenih usluga korisnik izričito potvrđuje da razumije i prihvaća da se radi o treninzima visokog intenziteta koji nose inherentni rizik ozljede.',
      'LWL UP, njegovi osnivači, treneri, administratori i suradnici ne snose nikakvu odgovornost za tjelesne ozljede, zdravstvene komplikacije ili materijalnu štetu nastalu kao posljedica primjene trenažnih programa, savjeta ili informacija dostupnih na Platformi.',
      'Preporučujemo svim korisnicima da se prije početka intenzivnih treninga savjetuju s kvalificiranim liječnikom ili zdravstvenim stručnjakom. Svaki korisnik individualno je odgovoran za procjenu vlastite zdravstvene sposobnosti.',
    ],
  },
  {
    title: 'KOJE PODATKE PRIKUPLJAMO I PO KOJOJ OSNOVI',
    body: [
      'Prijavni obrasci (upitnik za trenerstvo i zahtjev za učlanjenje): ime i prezime, adresa e-pošte, broj telefona, dob odnosno datum rođenja, spol, državljanstvo i mjesto prebivališta, tjelesna težina, trenažno iskustvo i rezultati te podaci o ozljedama i ograničenjima koje sami upišete. Pravna osnova je vaša privola (čl. 6. st. 1. t. (a) GDPR-a), koju dajete označavanjem potvrdnog okvira prije slanja obrasca.',
      'Sadržaj prijavnih obrazaca ne pohranjuje se u bazu podataka Platforme — prosljeđuje se isključivo e-poštom na službenu adresu kluba, gdje se čuva do obrade zahtjeva.',
      'Korisnički račun i trenažni podaci: adresa e-pošte, ime, uloga, trenažni blokovi, odrađene serije, kilaže, osobni rekordi i rezultati s natjecanja. Pravna osnova je izvršavanje ugovora o pružanju usluge trenerstva odnosno članstva (čl. 6. st. 1. t. (b) GDPR-a).',
      'Javno objavljeni podaci članova (ime, kategorija, natjecateljski rezultati i fotografije na stranicama Tim, Rekordi i Natjecanja) objavljuju se na temelju privole člana, koju član može povući u svakom trenutku.',
      'Ne prikupljamo podatke o lokaciji, ne provodimo profiliranje niti automatizirano donošenje odluka s pravnim učinkom.',
    ],
  },
  {
    title: 'PODACI O ZDRAVLJU',
    body: [
      'Podaci o ozljedama, ograničenjima i zdravstvenom stanju koje upišete u prijavni obrazac ili u bilješke uz trening pripadaju posebnoj kategoriji osobnih podataka iz čl. 9. GDPR-a.',
      'Takve podatke obrađujemo isključivo na temelju vaše izričite privole i isključivo u jednu svrhu — prilagodbu trenažnog programa vašem stanju. Ne koristimo ih ni za koju drugu svrhu i ne dijelimo ih izvan trenerskog tima.',
      'Upisivanje zdravstvenih podataka je dobrovoljno. Ako ih ne želite navesti, obrazac možete poslati i bez njih, uz napomenu da program tada neće moći uzeti u obzir vaša ograničenja.',
      'Privolu za obradu zdravstvenih podataka možete povući u svakom trenutku, bez obrazloženja i bez posljedica za ostatak usluge.',
    ],
  },
  {
    title: 'KOLIKO DUGO ČUVAMO PODATKE',
    body: [
      'Prijave putem obrazaca čuvaju se najdulje dvanaest (12) mjeseci od zaprimanja, osim ako iz prijave proizađe članstvo ili trenerski odnos — tada se podaci prenose u korisnički račun.',
      'Podaci korisničkog računa i trenažni podaci čuvaju se za vrijeme trajanja članstva odnosno trenerskog odnosa te najdulje dvanaest (12) mjeseci nakon njegova prestanka, kako bi se korisniku omogućio povratak bez gubitka povijesti treninga.',
      'Natjecateljski rezultati i rekordi ostaju trajno zabilježeni kao dio sportske evidencije kluba, s obzirom na to da su rezultati natjecanja javno objavljeni podaci.',
      'Podatke brišemo i prije navedenih rokova, bez odgode, ako to zatražite.',
    ],
  },
  {
    title: 'KOME SE PODACI POVJERAVAJU',
    body: [
      'Podaci se ne prodaju, ne iznajmljuju i ne dijele s trećim stranama u komercijalne svrhe. Povjeravaju se isključivo izvršiteljima obrade nužnima za rad Platforme, i to u opsegu nužnom za pružanje njihove usluge:',
      'Supabase — baza podataka i prijava korisnika; Vercel — posluživanje web-aplikacije; Resend — dostava e-pošte iz prijavnih obrazaca. Svaki od njih obrađuje podatke isključivo prema našim uputama, na temelju ugovora o obradi.',
      'Kada se obrada odvija izvan Europskog gospodarskog prostora, prijenos se temelji na standardnim ugovornim klauzulama Europske komisije ili na odluci o primjerenosti.',
      'Podatke možemo otkriti nadležnim tijelima kada to nalaže propis, te sportskim savezima u opsegu nužnom za prijavu na natjecanje.',
    ],
  },
  {
    title: 'VAŠA PRAVA',
    body: [
      'U svakom trenutku imate pravo na: pristup svojim podacima i presliku istih, ispravak netočnih podataka, brisanje ("pravo na zaborav"), ograničenje obrade, prenosivost podataka u strojno čitljivom obliku te prigovor na obradu.',
      'Kada se obrada temelji na privoli, privolu možete povući u svakom trenutku. Povlačenje ne utječe na zakonitost obrade koja se temeljila na privoli prije povlačenja.',
      'Zahtjev šaljete na adresu za kontakt navedenu u podnožju Platforme. Na zahtjev odgovaramo bez odgode, a najkasnije u roku od mjesec dana od zaprimanja. Zahtjev je besplatan.',
      'Brisanje računa i svih pripadajućih trenažnih podataka provodi se na vaš zahtjev. Nakon brisanja podaci se ne mogu vratiti.',
    ],
  },
  {
    title: 'MALOLJETNI KORISNICI',
    body: [
      'Usluge Platforme namijenjene su osobama starijima od 18 godina.',
      'Osobe mlađe od 18 godina mogu se prijaviti i koristiti Platformu isključivo uz izričitu privolu roditelja ili zakonskog skrbnika, koja se potvrđuje pri slanju prijavnog obrasca, a klub ju može zatražiti i u pisanom obliku prije početka treniranja.',
      'Ako utvrdimo da smo podatke maloljetne osobe prikupili bez takve privole, brišemo ih bez odgode. Ako ste roditelj ili skrbnik i smatrate da se to dogodilo, javite nam se putem kontakta u podnožju Platforme.',
    ],
  },
  {
    title: 'UVJETI KORIŠTENJA',
    body: [
      'Korisnik se obvezuje da će Platformu koristiti isključivo u svrhe za koje je namijenjena — praćenje i planiranje treninga powerliftinga — te da neće pokušavati neovlašteno pristupiti podacima drugih korisnika, zaobići sigurnosne mehanizme ili na bilo koji drugi način kompromitirati integritet Platforme.',
      'Strogo je zabranjena svaka neovlaštena krađa, kopiranje, distribucija ili zlouporaba osobnih podataka korisnika. Svako takvo djelovanje predstavlja kršenje pozitivnih propisa Republike Hrvatske i Europske unije (GDPR — Uredba EU 2016/679) te može rezultirati kaznenom i građanskom odgovornošću počinitelja.',
      'LWL UP zadržava pravo privremenog ili trajnog ukidanja pristupa korisniku koji krši ove uvjete, bez prethodne najave i bez naknade.',
      'Sav sadržaj objavljen na Platformi — uključujući trenažne programe, tekstove, fotografije i grafičke elemente — zaštićen je autorskim pravom. Reprodukcija ili distribucija bez pisanog odobrenja LWL UP-a strogo je zabranjena.',
    ],
  },
  {
    title: 'KOLAČIĆI I ANALITIKA',
    body: [
      'Platforma koristi isključivo tehničke kolačiće neophodne za prijavu i ispravan rad aplikacije. Riječ je o kolačićima sustava za autentifikaciju koji pamte da ste prijavljeni.',
      'Uz njih, aplikacija u lokalnoj pohrani preglednika (localStorage) čuva vaše postavke prikaza i privremeni predmemorirani sadržaj kako bi se stranice brže otvarale. Ti podaci ostaju na vašem uređaju i ne šalju se nikome.',
      'Ne koristimo kolačiće za oglašavanje, ne ugrađujemo alate za analitiku niti mjerne piksele trećih strana, pa privola za kolačiće nije potrebna.',
      'Kolačiće možete onemogućiti u postavkama preglednika, uz napomenu da prijava u tom slučaju neće raditi.',
    ],
  },
  {
    title: 'SIGURNOST PODATAKA',
    body: [
      'Podaci se prenose šifriranom vezom (HTTPS) i pohranjuju se šifrirano kod pružatelja usluge baze podataka.',
      'Pristup podacima ograničen je na razini baze pravilima pristupa po korisniku, tako da svaki korisnik vidi isključivo vlastite podatke, a trener podatke sportaša koji su mu dodijeljeni.',
      'U slučaju povrede osobnih podataka koja može prouzročiti visok rizik za vaša prava i slobode, obavijestit ćemo vas bez nepotrebnog odgađanja, a nadzorno tijelo u roku od 72 sata.',
    ],
  },
  {
    title: 'IZMJENE UVJETA',
    body: [
      'LWL UP zadržava pravo izmjene ovih Pravila u bilo koje vrijeme. O značajnim izmjenama korisnici će biti obaviješteni putem Platforme. Nastavak korištenja Platforme nakon objave izmjena smatra se prihvaćanjem novih uvjeta.',
      'Ova Pravila privatnosti i korištenja stupaju na snagu danom objave i primjenjuju se na sve korisnike Platforme.',
    ],
  },
]

export default function PravilaPage() {
  return (
    <>
      <Navbar variant="solid" simple />

      <main style={{ background: '#131317', minHeight: '100vh', fontFamily: 'var(--fm)', color: '#fff' }}>

        {/* Hero */}
        <div style={{ position: 'relative', overflow: 'hidden', paddingTop: 'clamp(120px,18vw,170px)', paddingBottom: 'clamp(50px,8vw,80px)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)' }} />

          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 clamp(20px,5vw,60px)', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ width: '28px', height: '2px', background: 'rgba(255,255,255,0.6)' }} />
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.42em', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--fm)', fontWeight: 700 }}>PRAVNI DOKUMENTI</span>
            </div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,6vw,5rem)', fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.02, margin: '0 0 24px' }}>
              Pravila privatnosti<br />
              <span style={{ opacity: 0.4 }}>&amp; uvjeti korištenja</span>
            </h1>
            <p style={{ fontSize: 'clamp(0.82rem,2vw,0.95rem)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, margin: 0, maxWidth: '540px' }}>
              Zadnja izmjena: travanj 2026. Molimo pročitajte ove uvjete prije korištenja platforme LWL UP.
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'clamp(40px,6vw,64px) clamp(20px,5vw,60px) clamp(70px,10vw,100px)' }}>
          {SECTIONS.map((section, i) => (
            <div key={i} style={{ marginBottom: 'clamp(40px,6vw,56px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                <span style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--fm)', fontWeight: 700 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.13)' }} />
              </div>
              {/* Naslov u vlastitom retku — predugačak je za redak s linijom na mobitelu */}
              <h2 style={{ fontFamily: 'var(--fm)', fontSize: 'clamp(0.62rem,1.7vw,0.72rem)', fontWeight: 700, letterSpacing: '0.2em', lineHeight: 1.7, color: 'rgba(255,255,255,0.9)', margin: '0 0 20px' }}>
                {section.title}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {section.body.map((para, j) => (
                  <p key={j} style={{ fontSize: 'clamp(0.82rem,2vw,0.9rem)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, margin: 0, paddingLeft: '20px', borderLeft: '1px solid rgba(255,255,255,0.13)' }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {/* Disclaimer box */}
          <div style={{ marginTop: 'clamp(48px,7vw,64px)', padding: 'clamp(22px,4vw,28px) clamp(20px,4vw,32px)', background: '#181818', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '4px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '12px' }}>NAPOMENA</div>
            <p style={{ fontSize: 'clamp(0.8rem,2vw,0.86rem)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, margin: 0 }}>
              Ova pravila sastavljena su u dobroj vjeri i u skladu s primjenjivim propisima. Korištenjem platforme LWL UP korisnik potvrđuje da je pročitao, razumio i prihvatio sve gore navedene uvjete. Za sva pitanja o privatnosti, kao i za zahtjev za uvid ili brisanje podataka, kontaktirajte nas na{' '}
              <a href={contactHref()} target={LEGAL.email ? undefined : '_blank'} rel={LEGAL.email ? undefined : 'noopener noreferrer'}
                style={{ color: '#fff', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.4)', paddingBottom: '1px' }}>
                {contactLabel()}
              </a>. Verzija na snazi od {LEGAL.updated}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
