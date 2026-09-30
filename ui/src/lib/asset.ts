/** Public asset URL that works both in vite dev and under the relative `./` build base. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
