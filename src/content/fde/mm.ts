/**
 * Text that is safe inside a Mermaid sequence diagram. Mermaid treats `;` as a statement separator and `#` and `%%` as entity and
 * comment markers, and `:` ends the actor part of a message, so none of them may appear in a label.
 */
export const mm = (s: string): string =>
  s
    .replace(/;/g, ',')
    .replace(/[:"#%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
