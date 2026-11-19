/**
 * The site's navigation, written once. The header, the phone menu and the footer all read these lists, so a link can never be
 * present in one and missing from another, and the order a newcomer meets things in is the same everywhere.
 *
 * The rule behind the lists: a beginner sees three things first (Start here, the blueprints, the delivery guide) plus the worked templates.
 * Everything specialised sits one click away under "More", each with a plain-language line saying what it is.
 */

export interface NavLink {
  href: string;
  label: string;
  /** One plain sentence, shown in menus and the footer so no label has to be decoded. */
  blurb: string;
}

/** The first things a newcomer needs, besides the blueprints themselves. */
export const START_LINK: NavLink = {
  href: '/start',
  label: 'Start here',
  blurb: 'A guided first hour: pick a use case and know what to read next.',
};

export const GUIDE_LINK: NavLink = {
  href: '/delivery',
  label: 'Delivery guide',
  blurb: 'Every step from scoping to monitoring, with who does it and what it produces.',
};

/** The worked template for every blueprint lives in this repository; the link goes to its folder on GitHub. */
export const TEMPLATES_URL = 'https://github.com/sadiqgpasha89/BrainSiphon/tree/main/templates';

export const TEMPLATES_LINK: NavLink = {
  href: TEMPLATES_URL,
  label: 'Worked templates',
  blurb: 'A runnable worked template for every blueprint, free, in the repository.',
};

/** Specialised material, grouped under "More" so the top bar stays short. */
export const MORE_LINKS: NavLink[] = [
  {
    href: '/patterns',
    label: 'Patterns',
    blurb: 'Reusable building blocks that many blueprints share.',
  },
  {
    href: '/implementations',
    label: 'Reference implementations',
    blurb: 'Complete systems you can run and study.',
  },
  {
    href: '/deployment',
    label: 'Deployment',
    blurb: 'Environments, infrastructure and recovery.',
  },
  {
    href: '/fde',
    label: 'FDE hub',
    blurb: 'A toolkit for forward-deployed engineers working at customer sites.',
  },
  {
    href: '/about',
    label: 'About',
    blurb: 'What this project is and how it is built.',
  },
  {
    href: '/release',
    label: 'Release report',
    blurb: 'What has been checked, and what has not.',
  },
  {
    href: 'https://sadiqgpasha89.github.io',
    label: 'Portfolio',
    blurb: 'Return to Sadiq G Pasha portfolio.',
  },
];

/** Extra pages that belong to a section for the purpose of "you are here" highlighting. */
const SECTION_ALIASES: Record<string, string[]> = {
  '/fde': ['/workspace'],
};

/** Is `pathname` on `href` or inside it? Handles the aliases above. */
export function isHere(pathname: string, href: string): boolean {
  const hit = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
  return hit(href) || (SECTION_ALIASES[href] ?? []).some(hit);
}
