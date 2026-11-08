/**
 * Reciprocal Rank Fusion: score(d) = Σ_lists 1 / (k + rank_list(d)).
 * Robust to incomparable score scales (ts_rank vs cosine similarity), which is why we use it
 * instead of weighted score blending.
 */
export interface Ranked {
  id: string;
}

export function reciprocalRankFusion<T extends Ranked>(lists: T[][], k = 60): (T & { rrf: number })[] {
  const scores = new Map<string, { item: T; score: number }>();
  for (const list of lists) {
    list.forEach((item, idx) => {
      const add = 1 / (k + idx + 1);
      const cur = scores.get(item.id);
      if (cur) cur.score += add;
      else scores.set(item.id, { item, score: add });
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .map(({ item, score }) => ({ ...item, rrf: score }));
}
