import type { Color } from '../types';
import type { Role } from './util';
import { asset } from '../lib/asset';

const cache = new Map<string, string>();

export function pieceUrl(color: Color, role: Role): string {
  const key = color + role;
  let url = cache.get(key);
  if (!url) {
    url = asset(`pieces/cburnett/${color}${role.toUpperCase()}.svg`);
    cache.set(key, url);
  }
  return url;
}

/** Warm the image cache so the first render has no flashing pieces. */
export function preloadPieces() {
  for (const c of ['w', 'b'] as Color[])
    for (const r of ['k', 'q', 'r', 'b', 'n', 'p'] as Role[]) {
      const img = new Image();
      img.src = pieceUrl(c, r);
    }
}
