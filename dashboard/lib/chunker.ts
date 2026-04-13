/**
 * Split text into chunks for embedding generation.
 * Splits on paragraph boundaries with overlap for context continuity.
 */
export function chunkText(
  text: string,
  maxChars: number = 2000,
  overlap: number = 200
): { text: string; index: number }[] {
  const chunks: { text: string; index: number }[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = "";
  let index = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const combined = current ? current + "\n\n" + trimmed : trimmed;

    if (combined.length > maxChars && current.length > 0) {
      chunks.push({ text: current.trim(), index: index++ });
      // Keep tail of previous chunk for overlap
      const tail = current.slice(-overlap);
      current = tail + "\n\n" + trimmed;
    } else {
      current = combined;
    }
  }

  if (current.trim()) {
    chunks.push({ text: current.trim(), index: index });
  }

  return chunks;
}
