import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ulnentpnmfzswbrsznot.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || ''

export const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

export async function query(table, opts = {}) {
  if (!supabase) return []
  let q = supabase.from(table).select(opts.select || '*')
  if (opts.order) q = q.order(opts.order, { ascending: opts.asc ?? false })
  if (opts.limit) q = q.limit(opts.limit)
  if (opts.eq) Object.entries(opts.eq).forEach(([col, val]) => { q = q.eq(col, val) })
  const { data, error } = await q
  if (error) { console.warn('[SG Supabase]', table, error.message); return [] }
  return data || []
}
