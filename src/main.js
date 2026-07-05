import './styles.css';

const app = document.getElementById('app');
const STORAGE_KEY = 'build-your-own-x-library';
const REPO_URL = 'https://github.com/codecrafters-io/build-your-own-x';

app.innerHTML = `
  <div class="app-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">Apprentissage mobile</p>
        <h1>Build Your Own X</h1>
        <p class="subtitle">Découvrez des ressources de la repo, sauvegardez-les et apprenez à l’instant.</p>
      </div>
      <div class="hero-actions">
        <a class="btn primary" href="${REPO_URL}" target="_blank" rel="noreferrer">Ouvrir la repo</a>
        <button id="exportLibrary" class="btn secondary">Télécharger ma bibliothèque</button>
      </div>
    </header>

    <section class="toolbar">
      <input id="search" type="text" placeholder="Rechercher un tuto, langage ou catégorie" />
      <div class="toolbar-actions">
        <button id="refresh">Actualiser</button>
        <button id="clearSearch" class="ghost">Effacer</button>
      </div>
    </section>

    <section id="stats" class="stats"></section>

    <section class="panel">
      <h2>Explorer les connaissances</h2>
      <div id="results" class="results"></div>
    </section>

    <section class="panel">
      <h2>Ma bibliothèque</h2>
      <div id="library" class="library"></div>
    </section>
  </div>
`;

const searchInput = document.getElementById('search');
const refreshButton = document.getElementById('refresh');
const clearButton = document.getElementById('clearSearch');
const exportButton = document.getElementById('exportLibrary');
const statsContainer = document.getElementById('stats');
const resultsContainer = document.getElementById('results');
const libraryContainer = document.getElementById('library');

let tutorials = [];
let library = [];

function loadLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    library = raw ? JSON.parse(raw) : [];
  } catch {
    library = [];
  }
}

function saveLibrary() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

function isSaved(item) {
  return library.some((entry) => entry.url === item.url);
}

function toggleSave(item) {
  if (isSaved(item)) {
    library = library.filter((entry) => entry.url !== item.url);
  } else {
    library.unshift({ ...item, addedAt: new Date().toISOString() });
  }
  saveLibrary();
  renderLibrary();
  renderResults(tutorials.filter((entry) => matchesQuery(entry, searchInput.value)));
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadTutorial(item) {
  const content = `# ${item.title}\n\n- Catégorie: ${item.category}\n- Langage: ${item.language}\n- URL: ${item.url}\n`;
  downloadText(`${item.title.replace(/\s+/g, '-').toLowerCase()}.md`, content);
}

function exportLibrary() {
  if (!library.length) {
    return;
  }
  const payload = JSON.stringify(library, null, 2);
  downloadText('build-your-own-x-library.json', payload);
}

async function loadTutorials() {
  resultsContainer.innerHTML = '<div class="empty">Chargement…</div>';
  try {
    const response = await fetch('https://raw.githubusercontent.com/codecrafters-io/build-your-own-x/master/README.md');
    const text = await response.text();
    tutorials = parseReadme(text);
    applyFilter();
  } catch {
    tutorials = [
      {
        category: '3D Renderer',
        language: 'C++',
        title: 'Introduction to Ray Tracing',
        url: 'https://www.scratchapixel.com/lessons/3d-basic-rendering/introduction-to-ray-tracing/how-does-it-work',
        tags: ['tutorial'],
      },
    ];
    applyFilter();
  }
}

function parseReadme(text) {
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function matchesQuery(item, query) {
  const haystack = `${item.title} ${item.category} ${item.language} ${item.tags.join(' ')}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function renderStats(items) {
  const categories = new Set(items.map((item) => item.category)).size;
  const languages = new Set(items.map((item) => item.language)).size;
  statsContainer.innerHTML = `
    <div class="stat-card"><strong>${items.length}</strong><span>Tutoriels à explorer</span></div>
    <div class="stat-card"><strong>${categories}</strong><span>Catégories</span></div>
    <div class="stat-card"><strong>${languages}</strong><span>Langages</span></div>
    <div class="stat-card"><strong>${library.length}</strong><span>Ressources sauvegardées</span></div>
  `;
}

function renderResults(items) {
  if (!items.length) {
    resultsContainer.innerHTML = '<div class="empty">Aucun résultat pour cette recherche.</div>';
    return;
  }
  resultsContainer.innerHTML = items.map((item) => `
    <article class="card">
      <h3>${escapeHtml(item.title)}</h3>
      <div class="meta">${escapeHtml(item.category)} • ${escapeHtml(item.language)}</div>
      <div class="tags">${item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="actions">
        <button class="btn small" data-action="save">${isSaved(item) ? 'Retirer' : 'Sauvegarder'}</button>
        <button class="btn small secondary" data-action="download">Télécharger</button>
        <a class="link" href="${item.url}" target="_blank" rel="noreferrer">Ouvrir</a>
      </div>
    </article>
  `).join('');
}

function renderLibrary() {
  if (!library.length) {
    libraryContainer.innerHTML = '<div class="empty">Aucune ressource sauvegardée. Appuyez sur “Sauvegarder” pour créer votre pack de connaissances.</div>';
    return;
  }

  libraryContainer.innerHTML = library.map((item) => `
    <article class="card compact">
      <h3>${escapeHtml(item.title)}</h3>
      <div class="meta">${escapeHtml(item.category)} • ${escapeHtml(item.language)}</div>
      <div class="actions">
        <button class="btn small" data-library-action="remove">Retirer</button>
        <button class="btn small secondary" data-library-action="download">Télécharger</button>
        <a class="link" href="${item.url}" target="_blank" rel="noreferrer">Ouvrir</a>
      </div>
    </article>
  `).join('');
}

function applyFilter() {
  const query = searchInput.value;
  const filtered = tutorials.filter((item) => matchesQuery(item, query));
  renderStats(filtered);
  renderResults(filtered);
}

resultsContainer.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }
  const itemTitle = button.closest('.card')?.querySelector('h3')?.textContent || '';
  const item = tutorials.find((entry) => entry.title === itemTitle);
  if (!item) {
    return;
  }

  if (button.dataset.action === 'save') {
    toggleSave(item);
  }
  if (button.dataset.action === 'download') {
    downloadTutorial(item);
  }
});

libraryContainer.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-library-action]');
  if (!button) {
    return;
  }
  const itemTitle = button.closest('.card')?.querySelector('h3')?.textContent || '';
  const item = library.find((entry) => entry.title === itemTitle);
  if (!item) {
    return;
  }

  if (button.dataset.libraryAction === 'remove') {
    library = library.filter((entry) => entry.url !== item.url);
    saveLibrary();
    renderLibrary();
    renderStats(tutorials.filter((entry) => matchesQuery(entry, searchInput.value)));
  }
  if (button.dataset.libraryAction === 'download') {
    downloadTutorial(item);
  }
});

searchInput.addEventListener('input', applyFilter);
refreshButton.addEventListener('click', loadTutorials);
clearButton.addEventListener('click', () => {
  searchInput.value = '';
  applyFilter();
});
exportButton.addEventListener('click', exportLibrary);

loadLibrary();
loadTutorials();
