/** Classic Elo with a higher K-factor while a player is still provisional. */
export function kFactor(games) {
  if (games < 20) return 40;
  if (games < 60) return 28;
  return 20;
}

export function expected(ra, rb) {
  return 1 / (1 + 10 ** ((rb - ra) / 400));
}

/**
 * @param {{rating:number,games:number}} white
 * @param {{rating:number,games:number}} black
 * @param {'1-0'|'0-1'|'1/2-1/2'} result
 */
export function ratingDeltas(white, black, result) {
  const sw = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;
  const ew = expected(white.rating, black.rating);
  const w = Math.round(kFactor(white.games) * (sw - ew));
  const b = Math.round(kFactor(black.games) * (1 - sw - (1 - ew)));
  return { w, b };
}
