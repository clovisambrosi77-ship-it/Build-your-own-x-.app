export const REPO_URL = 'https://github.com/codecrafters-io/build-your-own-x';

export const fallbackTutorials = [
  {
    category: '3D Renderer',
    language: 'C++',
    title: 'Introduction to Ray Tracing',
    url: 'https://www.scratchapixel.com/lessons/3d-basic-rendering/introduction-to-ray-tracing/how-does-it-work',
    tags: ['tutorial'],
  },
  {
    category: 'AI Model',
    language: 'Python',
    title: 'A Large Language Model (LLM)',
    url: 'https://github.com/rasbt/LLMs-from-scratch',
    tags: ['tutorial'],
  },
  {
    category: 'Database',
    language: 'Go',
    title: 'Build your own database',
    url: 'https://build-your-own.org/database/',
    tags: ['tutorial'],
  },
];

export function parseReadme(text) {
  const tutorials = [];
  let currentCategory = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = line.match(/^#### Build your own `(.+?)`$/);
    if (heading) {
      currentCategory = heading[1].trim();
      continue;
    }

    const match = line.match(/^\* \[\*\*(.+?)\*\*: _(.+?)_\]\((https?:\/\/[^)]+)\)(?:\s+\[(.+?)\])?$/);
    if (!match || !currentCategory) continue;

    tutorials.push({
      category: currentCategory,
      language: match[1].trim(),
      title: match[2].trim(),
      url: match[3].trim(),
      tags: match[4] ? [match[4].trim()] : ['tutorial'],
    });
  }

  return tutorials.sort((a, b) => a.title.localeCompare(b.title));
}

export function matchesQuery(item, query) {
  const haystack = `${item.title} ${item.category} ${item.language} ${item.tags.join(' ')}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export function createDownloadMarkdown(item) {
  return `# ${item.title}\n\n- Catégorie: ${item.category}\n- Langage: ${item.language}\n- URL: ${item.url}\n`;
}

export function createDownloadFilename(title) {
  return `${title.replace(/\s+/g, '-').toLowerCase()}.md`;
}
