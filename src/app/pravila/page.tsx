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
                <span style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', fontWeight: 700 }}>
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
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '12px' }}>NAPOMENA</div>
            <p style={{ fontSize: 'clamp(0.8rem,2vw,0.86rem)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, margin: 0 }}>
              Ova pravila su sastavljena u dobroj vjeri i u skladu s primjenjivim propisima. Korištenjem platforme LWL UP korisnik potvrđuje da je pročitao, razumio i prihvatio sve gore navedene uvjete. Za sva pitanja vezana uz privatnost i uvjete možete nas kontaktirati putem Instagram profila{' '}
              <a href="https://www.instagram.com/lwlup/" target="_blank" rel="noopener noreferrer"
                style={{ color: '#fff', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.4)', paddingBottom: '1px' }}>
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
