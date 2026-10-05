/**
 * Trenutni blok liftera.
 *
 * Trenutni je onaj koji je trener označio kvačicom — u bazi `status = 'active'`,
 * isti status koji već čitaju dashboard, profil i prioriteti. Novi blok pri
 * kreiranju postaje trenutni sam od sebe; trener to može promijeniti kvačicom.
 * Ako nijedan blok nije označen, trenutni je zadnji kreirani.
 *
 * Odabir bloka u dropdownu samo ga OTVARA za pregled i uređivanje — trenutni
 * se mijenja isključivo kvačicom. Projekcije se uvijek odnose na trenutni blok.
 */

type WithStatus = { id: string; status: string | null }

/** Lista mora biti od najnovijeg prema starijem (order created_at desc). */
export function currentBlockOf<T extends WithStatus>(newestFirst: T[]): T | null {
  return newestFirst.find(b => b.status === 'active') ?? newestFirst[0] ?? null
}

/** Dovoljno od Supabase klijenta za dva updatea — bez vezanja na generike. */
type Db = { from: (table: string) => any }

/**
 * Označi blok trenutnim: on postaje 'active', a ostali aktivni iz liste 'planned'.
 * Prvo se podiže novi, pa spuštaju stari — ako drugi korak padne, lifter i dalje
 * ima trenutni blok, a ne nijedan. Vraća poruku greške ili null.
 */
export async function setCurrentBlock(db: Db, blockId: string, blocks: WithStatus[]): Promise<string | null> {
  const { error } = await db.from('blocks').update({ status: 'active' }).eq('id', blockId)
  if (error) return error.message as string
  const demote = blocks.filter(b => b.status === 'active' && b.id !== blockId).map(b => b.id)
  if (demote.length === 0) return null
  const { error: e2 } = await db.from('blocks').update({ status: 'planned' }).in('id', demote)
  return e2 ? (e2.message as string) : null
}

/** Lokalno stanje liste nakon setCurrentBlock. */
export const withCurrent = <T extends WithStatus>(blocks: T[], blockId: string): T[] =>
  blocks.map(b => (b.id === blockId ? { ...b, status: 'active' } : b.status === 'active' ? { ...b, status: 'planned' } : b))
