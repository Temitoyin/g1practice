// Bundles the app into dist/artifact.html for publishing as a Claude Artifact.
// Artifacts supply their own <!doctype>/<html>/<head>/<body>, so this emits
// only the page content. The sign images ship alongside via the publish `files`
// map, keeping their assets/signs/... paths.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap';

const page = `<title>G1 Practice</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS.replace(/&/g, '&amp;')}">
<style>
${read('./styles.css').trim()}
</style>

<main id="app" class="shell">
  <div class="loading">Loading questions&hellip;</div>
</main>

<script>
${read('./data/questions.js').trim()}
</script>
<script>
${read('./app.js').trim()}
</script>
`;

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/artifact.html', import.meta.url), page);
console.log(`dist/artifact.html — ${(page.length / 1024).toFixed(1)} KB`);
