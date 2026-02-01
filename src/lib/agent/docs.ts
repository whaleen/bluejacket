type DocChunk = {
  path: string;
  section: string;
  content: string;
};

const rawDocs = import.meta.glob([
  '/docs/**/*.md',
  '/README.md',
  '/services/ge-sync/docs/**/*.md',
  '/src/components/Map/README.md',
], { eager: true, as: 'raw' }) as Record<string, string>;

const EXCLUDED_PATHS = new Set([
  'services/ge-sync/docs/SECRETS.md',
]);

const normalizePath = (path: string) => path.replace(/^\//, '');

const splitIntoSections = (content: string) => {
  const lines = content.split('\n');
  const sections: Array<{ title: string; content: string[] }> = [];
  let currentTitle = 'Overview';
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) {
      sections.push({ title: currentTitle, content: text.split('\n') });
    }
    buffer = [];
  };

  lines.forEach((line) => {
    const headingMatch = /^#{1,3}\s+(.*)$/.exec(line.trim());
    if (headingMatch) {
      flush();
      currentTitle = headingMatch[1].trim();
      return;
    }
    buffer.push(line);
  });

  flush();
  return sections;
};

const chunkSection = (textLines: string[], maxChars = 1600) => {
  const chunks: string[] = [];
  let buffer: string[] = [];
  let size = 0;

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) chunks.push(text);
    buffer = [];
    size = 0;
  };

  textLines.forEach((line) => {
    const nextSize = size + line.length + 1;
    if (nextSize > maxChars && buffer.length > 0) {
      flush();
    }
    buffer.push(line);
    size += line.length + 1;
  });

  flush();
  return chunks;
};

const buildDocChunks = (): DocChunk[] => {
  const chunks: DocChunk[] = [];

  Object.entries(rawDocs).forEach(([path, content]) => {
    const normalized = normalizePath(path);
    if (EXCLUDED_PATHS.has(normalized)) return;

    const sections = splitIntoSections(content);
    sections.forEach((section) => {
      const sectionChunks = chunkSection(section.content);
      sectionChunks.forEach((chunk) => {
        chunks.push({
          path: normalized,
          section: section.title,
          content: chunk,
        });
      });
    });
  });

  return chunks;
};

const docChunks = buildDocChunks();

const tokenize = (input: string) =>
  input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1);

const scoreChunk = (queryTokens: string[], chunk: DocChunk) => {
  const haystack = `${chunk.section}\n${chunk.content}`.toLowerCase();
  let score = 0;
  queryTokens.forEach((token) => {
    if (!token) return;
    if (chunk.section.toLowerCase().includes(token)) score += 3;
    const matches = haystack.split(token).length - 1;
    score += matches;
  });

  // Boost GE DMS documentation (end-user focused)
  if (chunk.path.includes('services/ge-sync/docs/')) {
    score *= 2;
  }

  // Penalize source code files (developer focused)
  if (chunk.path.includes('.tsx') || chunk.path.includes('.ts')) {
    score *= 0.3;
  }

  return score;
};

export const searchDocChunks = (query: string, limit = 6): DocChunk[] => {
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  // Detect if query is about GE DMS workflows (user-facing)
  const geDmsKeywords = ['inbound', 'order', 'load', 'truck', 'delivery', 'manifest', 'checkin', 'pod', 'download', 'report', 'dms', 'ge'];
  const isGeDmsQuery = tokens.some(token => geDmsKeywords.includes(token));

  let candidates = docChunks;

  // If query is about GE DMS, exclude dev docs entirely
  if (isGeDmsQuery) {
    candidates = candidates.filter(chunk =>
      chunk.path.includes('services/ge-sync/docs/') ||
      chunk.path.includes('docs/features/') ||
      chunk.path === 'README.md'
    );
  }

  return candidates
    .map((chunk) => ({ chunk, score: scoreChunk(tokens, chunk) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.chunk);
};

export const buildContextBlock = (chunks: DocChunk[]) => {
  if (!chunks.length) return '';
  return chunks
    .map((chunk, index) => {
      return `Source ${index + 1}: ${chunk.path} (${chunk.section})\n${chunk.content}`;
    })
    .join('\n\n');
};

export type { DocChunk };
