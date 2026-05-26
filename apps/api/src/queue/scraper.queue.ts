// Scraper queue — disabled when Redis is unavailable
// This file is kept for future use but won't crash the API if Redis is down.

export const scraperQueue = {
  add: async (name: string, data: any) => {
    console.warn('[SCRAPER] Queue not available — skipping job:', name);
  },
};
