import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const projects = [
  'pdf-form-filler-pro',
  'map-ai-assistant',
  'visual-strategy-canvas',
  'doublestep',
];

const required = ['index.html', 'styles.css', 'provenance.json'];
for (const path of required) {
  if (!existsSync(path)) throw new Error('Missing root artifact: ' + path);
}
for (const project of projects) {
  if (!existsSync(join(project, 'index.html'))) throw new Error('Missing project entry point: ' + project);
  if (!readFileSync('index.html', 'utf8').includes('./' + project + '/')) {
    throw new Error('Root catalog does not link to: ' + project);
  }
}

const provenance = JSON.parse(readFileSync('provenance.json', 'utf8'));
if (provenance.artifacts.length !== projects.length) throw new Error('Provenance count mismatch.');
for (const artifact of provenance.artifacts) {
  if (!/^[0-9a-f]{40}$/.test(artifact.source_commit)) throw new Error('Invalid source commit for ' + artifact.path);
}

function files(path) {
  return readdirSync(path).flatMap((name) => {
    const current = join(path, name);
    return statSync(current).isDirectory() ? files(current) : [current];
  });
}

const textFiles = files('.').filter((path) => /\.(?:html|css|js|json|md)$/.test(path) && !path.includes(join('.git', '')));
const forbidden = /(?:sk-proj-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{20,}|OPENAI_API_KEY\s*=|GEMINI_API_KEY\s*=)/;
const leaks = textFiles.filter((path) => forbidden.test(readFileSync(path, 'utf8')));
if (leaks.length) throw new Error('Potential secret material in: ' + leaks.join(', '));

console.log('PASS - 4 demos, root links, provenance, and public secret patterns validated.');
