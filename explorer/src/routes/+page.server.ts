import { loadArchive } from '$lib/loadArchive'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  return loadArchive()
}

export const prerender = false
export const ssr = true
