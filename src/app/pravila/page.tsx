import Navbar from '@/app/components/Navbar'
import Footer from '@/app/components/Footer'

const SECTIONS = [
  {
    title: 'KORIŠTENJE NA VLASTITU ODGOVORNOST',
    body: [
      'Korištenjem platforme LWL UP i svih njenih usluga (u daljnjem tekstu: "Platforma") korisnik izričito potvrđuje da razumije i prihvaća da se radi o treninzima visokog intenziteta koji nose inherentni rizik ozljede.',
      'LWL UP, njegovi osnivači, treneri, administratori i suradnici ne snose nikakvu odgovornost za tjelesne ozljede, zdravstvene komplikacije ili materijalnu štetu nastalu kao posljedica primjene trenažnih programa, savjeta ili informacija dostupnih na Platformi.',
      'Preporučujemo svim korisnicima da se prije početka intenzivnih treninga savjetuju s kvalificiranim liječnikom ili zdravstvenim stručnjakom. Svaki korisnik individualno je odgovoran za procjenu vlastite zdravstvene sposobnosti.',
    ],
  },
  {
    title: 'ZAŠTITA OSOBNIH PODATAKA',
    body: [
      'LWL UP prikuplja isključivo podatke neophodne za funkcioniranje Platforme: ime i prezime, adresu e-pošte, podatke o tjelesnim mjerama i trenažnim rezultatima. Svi podaci pohranjuju se na sigurnim serverima uz primjenu enkripcije u prijenosu i mirovanju.',
      'Strogo je zabranjena svaka neovlaštena krađa, kopiranje, distribucija ili zlouporaba osobnih podataka korisnika. Svako takvo djelovanje predstavlja kršenje pozitivnih propisa Republike Hrvatske i Europske unije (GDPR – Uredba EU 2016/679) te može rezultirati kaznenom i građanskom odgovornošću počinitelja.',
      'Korisnik ima pravo u svakom trenutku zatražiti uvid u svoje podatke, ispravak netočnih podataka, brisanje podataka ("pravo na zaborav") te prenosivost podataka. Zahtjeve možete uputiti putem kontakta navedenog na Platformi.',
      'LWL UP ne prodaje, ne iznajmljuje niti ne dijeli osobne podatke korisnika s trećim stranama u komercijalne svrhe.',
    ],
  },
  {
    title: 'UVJETI KORIŠTENJA',
    body: [
      'Pristup Platformi dozvoljen je isključivo punoljetnim osobama ili maloljetnim osobama uz izričitu suglasnost roditelja ili zakonskog skrbnika.',
      'Korisnik se obvezuje da će Platformu koristiti isključivo u svrhe za koje je namijenjena — praćenje i planiranje treninga powerliftinga — te da neće pokušavati neovlašteno pristupiti podacima drugih korisnika, zaobići sigurnosne mehanizme ili na bilo koji drugi način kompromitirati integritet Platforme.',
      'LWL UP zadržava pravo privremenog ili trajnog ukidanja pristupa korisniku koji krši ove uvjete, bez prethodne najave i bez naknade.',
      'Sav sadržaj objavljen na Platformi — uključujući trenažne programe, tekstove, fotografije i grafičke elemente — zaštićen je autorskim pravom. Reprodukcija ili distribucija bez pisanog odobrenja LWL UP-a strogo je zabranjena.',
    ],
  },
  {
    title: 'KOLAČIĆI I ANALITIKA',
    body: [
      'Platforma koristi tehničke kolačiće neophodne za autentifikaciju i ispravan rad. Ne koristimo kolačiće za praćenje korisnika u reklamne svrhe niti ne dijelimo analitičke podatke s trećim stranama.',
      'Korištenjem Platforme pristajete na upotrebu navedenih tehničkih kolačića. Možete ih onemogućiti u postavkama preglednika, uz napomenu da to može utjecati na funkcionalnost pojedinih dijelova Platforme.',
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

      <main style={{ background: '#050505', minHeight: '100vh', fontFamily: 'var(--fm)' }}>

        {/* Hero */}
        <div style={{ position: 'relative', overflow: 'hidden', paddingTop: '140px', paddingBottom: '80px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)' }} />

          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 clamp(20px,5vw,60px)', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '28px', height: '1px', background: 'rgba(99,102,241,0.6)' }} />
              <span style={{ fontSize: '0.58rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>PRAVNI DOKUMENTI</span>
            </div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.2rem,6vw,4rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 24px', color: '#f0f0f8' }}>
              Pravila privatnosti<br />
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>&amp; uvjeti korištenja</span>
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, margin: 0 }}>
              Zadnja izmjena: travanj 2026. Molimo pročitajte ove uvjete prije korištenja platforme LWL UP.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 clamp(20px,5vw,60px)' }}>
          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)' }} />
        </div>

        {/* Content */}
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '64px clamp(20px,5vw,60px) 100px' }}>
          {SECTIONS.map((section, i) => (
            <div key={i} style={{ marginBottom: '56px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <span style={{ fontFamily: 'var(--fd)', fontSize: '0.62rem', color: 'rgba(99,102,241,0.6)', fontWeight: 800, letterSpacing: '0.04em', minWidth: '20px' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--fm)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.22em', color: '#e0e0f0', marginBottom: '20px', marginTop: 0 }}>
                {section.title}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {section.body.map((para, j) => (
                  <p key={j} style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.8, margin: 0, paddingLeft: '20px', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {/* Disclaimer box */}
          <div style={{ marginTop: '64px', padding: '28px 32px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.35em', color: 'rgba(99,102,241,0.6)', fontWeight: 700, marginBottom: '12px' }}>NAPOMENA</div>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, margin: 0 }}>
              Ova pravila su sastavljena u dobroj vjeri i u skladu s primjenjivim propisima. Korištenjem platforme LWL UP korisnik potvrđuje da je pročitao, razumio i prihvatio sve gore navedene uvjete. Za sva pitanja vezana uz privatnost i uvjete možete nas kontaktirati putem Instagram profila{' '}
              <a href="https://www.instagram.com/lwlup/" target="_blank" rel="noopener noreferrer"
                style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '1px' }}>
                @lwlup
              </a>.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
