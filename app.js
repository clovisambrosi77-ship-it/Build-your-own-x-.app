import { REPO_URL, fallbackTutorials, parseReadme, matchesQuery, createDownloadMarkdown, createDownloadFilename } from './knowledge.js';

const STORAGE_KEY = 'build-your-own-x-app';
const app = document.getElementById('app');

app.innerHTML = `
  <div class="phone-shell">
    <div class="status-bar"></div>

    <header class="topbar">
      <div>
        <p class="eyebrow">Knowledge OS</p>
        <h1>Build Your Own X</h1>
      </div>
      <a class="chip" href="${REPO_URL}" target="_blank" rel="noreferrer">Repo</a>
    </header>

    <section class="hero-card">
      <div>
        <h2>Apprends à construire l’invisible</h2>
        <p>Un espace mobile pour découvrir, organiser et réviser des savoirs techniques issus de la repo officielle.</p>
      </div>
      <button id="refresh" class="primary-btn">Actualiser</button>
    </section>

    <nav class="tabs" aria-label="navigation principale">
      <button class="tab active" data-view="discover">Explorer</button>
      <button class="tab" data-view="library">Bibliothèque</button>
      <button class="tab" data-view="plan">Plan</button>
    </nav>

    <section id="discover-view" class="view active">
      <div class="search-row">
        <input id="search" placeholder="Rechercher un sujet, langage ou catégorie" />
        <button id="clearSearch" class="secondary-btn">Effacer</button>
      </div>
      <div id="stats" class="stats"></div>
      <div id="results" class="results"></div>
    </section>

    <section id="library-view" class="view">
      <div class="section-title">
        <h3>Ma bibliothèque</h3>
        <button id="exportLibrary" class="secondary-btn">Exporter</button>
      </div>
      <div id="library" class="results"></div>
    </section>

    <section id="plan-view" class="view">
      <div class="plan-card">
        <h3>Plan d’apprentissage du jour</h3>
        <ul>
          <li>1. Choisir un sujet à explorer</li>
          <li>2. Sauvegarder la ressource</li>
          <li>3. Ouvrir la ressource et prendre des notes</li>
          <li>4. Réviser plus tard depuis la bibliothèque</li>
        </ul>
      </div>
      <div id="notes" class="plan-card"></div>
    </section>
  </div>
`;

const searchInput = document.getElementById('search');
const clearSearchButton = document.getElementById('clearSearch');
const refreshButton = document.getElementById('refresh');
const exportButton = document.getElementById('exportLibrary');
const statsContainer = document.getElementById('stats');
const resultsContainer = document.getElementById('results');
const libraryContainer = document.getElementById('library');
const notesContainer = document.getElementById('notes');
const tabs = Array.from(document.querySelectorAll('.tab'));
const views = Array.from(document.querySelectorAll('.view'));

let tutorials = [];
let library = [];
let notes = {};

function loadStorage() {
  try {
    const rawLibrary = localStorage.getItem(STORAGE_KEY + ':library');
    const rawNotes = localStorage.getItem(STORAGE_KEY + ':notes');
    library = rawLibrary ? JSON.parse(rawLibrary) : [];
    notes = rawNotes ? JSON.parse(rawNotes) : {};
  } catch {
    library = [];
    notes = {};
  }
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEY + ':library', JSON.stringify(library));
  localStorage.setItem(STORAGE_KEY + ':notes', JSON.stringify(notes));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
  saveStorage();
  renderLibrary();
  renderResults(tutorials.filter((entry) => matchesQuery(entry, searchInput.value)));
  renderStats();
}

function addNote(item) {
  const text = window.prompt(`Note personnelle pour “${item.title}”`, notes[item.url] || '');
  if (text === null) return;
  notes[item.url] = text.trim();
  saveStorage();
  renderNotes();
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportLibrary() {
  if (!library.length) {
    return;
  }
  const payload = JSON.stringify(library, null, 2);
  downloadText('build-your-own-x-library.json', payload);
}

function renderStats() {
  const filtered = tutorials.filter((entry) => matchesQuery(entry, searchInput.value));
  const categories = new Set(filtered.map((item) => item.category)).size;
  const languages = new Set(filtered.map((item) => item.language)).size;
  statsContainer.innerHTML = `
    <div class="stat-card"><strong>${filtered.length}</strong><span>Ressources</span></div>
    <div class="stat-card"><strong>${categories}</strong><span>Catégories</span></div>
    <div class="stat-card"><strong>${languages}</strong><span>Langages</span></div>
    <div class="stat-card"><strong>${library.length}</strong><span>Sauvegardées</span></div>
  `;
}

function renderResults(items) {
  if (!items.length) {
    resultsContainer.innerHTML = '<div class="empty">Aucune ressource à afficher pour cette recherche.</div>';
    return;
  }

  resultsContainer.innerHTML = items.map((item) => `
    <article class="card">
      <h3>${escapeHtml(item.title)}</h3>
      <div class="meta">${escapeHtml(item.category)} • ${escapeHtml(item.language)}</div>
      <div class="tags">${item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="actions">
        <button class="mini-btn" data-action="save">${isSaved(item) ? 'Retirer' : 'Sauvegarder'}</button>
        <button class="mini-btn secondary" data-action="note">Notes</button>
        <button class="mini-btn secondary" data-action="download">Télécharger</button>
        <a class="link" href="${item.url}" target="_blank" rel="noreferrer">Ouvrir</a>
      </div>
    </article>
  `).join('');
}

function renderLibrary() {
  if (!library.length) {
    libraryContainer.innerHTML = '<div class="empty">Votre bibliothèque est vide. Sauvegardez des ressources pour les retrouver facilement.</div>';
    return;
  }

  libraryContainer.innerHTML = library.map((item) => `
    <article class="card">
      <h3>${escapeHtml(item.title)}</h3>
      <div class="meta">${escapeHtml(item.category)} • ${escapeHtml(item.language)}</div>
      <div class="actions">
        <button class="mini-btn" data-library-action="save">Retirer</button>
        <button class="mini-btn secondary" data-library-action="note">Notes</button>
        <button class="mini-btn secondary" data-library-action="download">Télécharger</button>
        <a class="link" href="${item.url}" target="_blank" rel="noreferrer">Ouvrir</a>
      </div>
    </article>
  `).join('');
}

function renderNotes() {
  const items = Object.entries(notes).filter(([, value]) => value && value.trim());
  if (!items.length) {
    notesContainer.innerHTML = '<div class="empty">Ajoutez des notes à vos ressources pour garder vos idées de progression.</div>';
    return;
  }

  notesContainer.innerHTML = items.map(([url, value]) => {
    const item = tutorials.find((entry) => entry.url === url) || library.find((entry) => entry.url === url);
    const title = item ? item.title : 'Ressource';
    return `
      <div class="note-item">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(value)}</p>
      </div>
    `;
  }).join('');
}

function downloadItem(item) {
  downloadText(createDownloadFilename(item.title), createDownloadMarkdown(item));
}

async function loadTutorials() {
  resultsContainer.innerHTML = '<div class="empty">Chargement des connaissances…</div>';
  try {
    const response = await fetch('https://raw.githubusercontent.com/codecrafters-io/build-your-own-x/master/README.md');
    const text = await response.text();
    tutorials = parseReadme(text);
    renderStats();
    renderResults(tutorials.filter((entry) => matchesQuery(entry, searchInput.value)));
    renderNotes();
  } catch {
    tutorials = fallbackTutorials;
    renderStats();
    renderResults(tutorials.filter((entry) => matchesQuery(entry, searchInput.value)));
    renderNotes();
  }
}

resultsContainer.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const title = button.closest('.card')?.querySelector('h3')?.textContent || '';
  const item = tutorials.find((entry) => entry.title === title);
  if (!item) return;

  if (button.dataset.action === 'save') toggleSave(item);
  if (button.dataset.action === 'note') addNote(item);
  if (button.dataset.action === 'download') downloadItem(item);
});

libraryContainer.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-library-action]');
  if (!button) return;
  const title = button.closest('.card')?.querySelector('h3')?.textContent || '';
  const item = library.find((entry) => entry.title === title);
  if (!item) return;

  if (button.dataset.libraryAction === 'save') {
    library = library.filter((entry) => entry.url !== item.url);
    saveStorage();
    renderLibrary();
    renderStats();
  }
  if (button.dataset.libraryAction === 'note') addNote(item);
  if (button.dataset.libraryAction === 'download') downloadItem(item);
});

searchInput.addEventListener('input', () => {
  renderStats();
  renderResults(tutorials.filter((entry) => matchesQuery(entry, searchInput.value)));
});

clearSearchButton.addEventListener('click', () => {
  searchInput.value = '';
  renderStats();
  renderResults(tutorials.filter((entry) => matchesQuery(entry, searchInput.value)));
});

refreshButton.addEventListener('click', loadTutorials);
exportButton.addEventListener('click', exportLibrary);

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((item) => item.classList.remove('active'));
    views.forEach((view) => view.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.view}-view`).classList.add('active');
  });
});

loadStorage();
loadTutorials();
renderLibrary();
renderNotes();
