/** Fuzzy score: subsequence match with consecutive-run bonus. Higher is better; 0 = no match. */
export function fuzzyScore(query: string, text: string): number {
	const q = query.trim().toLowerCase()
	if (!q) return 1
	const t = text.toLowerCase()
	let qi = 0
	let score = 0
	let run = 0
	let prev = -2

	for (let ti = 0; ti < t.length && qi < q.length; ti++) {
		if (t[ti] !== q[qi]) {
			run = 0
			continue
		}
		run = ti === prev + 1 ? run + 1 : 1
		score += 1 + run
		if (ti === 0 || t[ti - 1] === '/' || t[ti - 1] === ' ' || t[ti - 1] === '-') {
			score += 3
		}
		prev = ti
		qi++
	}

	return qi === q.length ? score : 0
}

/** Best fuzzy score across several fields. */
export function fuzzyScoreFields(query: string, fields: string[]): number {
	let best = 0
	for (const field of fields) {
		const s = fuzzyScore(query, field)
		if (s > best) best = s
	}
	return best
}
