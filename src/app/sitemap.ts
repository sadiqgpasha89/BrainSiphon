import type { MetadataRoute } from 'next';
import { getIndex } from '../lib/content';
import { DOMAINS, PATTERN_IDS } from '../schemas/usecase.schema';
import { SITE_URL } from '../lib/site';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getIndex();
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    ...DOMAINS.map((d) => ({ url: `${SITE_URL}/${d}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    { url: `${SITE_URL}/patterns`, changeFrequency: 'monthly' as const, priority: 0.7 },
    ...PATTERN_IDS.map((k) => ({
      url: `${SITE_URL}/patterns/${k}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...entries.map((e) => ({
      url: `${SITE_URL}/${e.slug}`,
      lastModified: e.lastVerifiedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
