/** Lower-case the first letter of a sentence when it starts an ordinary word (leaves acronyms such as "PR-AUC" alone). */
export const lcFirstText = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
