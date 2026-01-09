/**
 * Decodes HTML entities in a string
 * Converts entities like &quot; to " and &amp; to &
 */
export function decodeHTMLEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}
