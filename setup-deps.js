const fs = require('fs');

const orig = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const vite = JSON.parse(fs.readFileSync('frontend-vite/package.json', 'utf8'));

const depsToSkip = ['next', 'next-auth', 'next-intl', 'eslint-config-next', 'prisma', '@prisma/client'];

for (const [dep, ver] of Object.entries(orig.dependencies)) {
  if (!depsToSkip.includes(dep)) {
    vite.dependencies[dep] = ver;
  }
}

for (const [dep, ver] of Object.entries(orig.devDependencies)) {
  if (!depsToSkip.includes(dep) && !vite.devDependencies[dep]) {
    vite.devDependencies[dep] = ver;
  }
}

// Add react-router-dom and @tailwindcss/vite
vite.dependencies['react-router-dom'] = '^6.22.3';
vite.devDependencies['@tailwindcss/vite'] = '^4.0.0';

// Also add path aliases for Vite
vite.devDependencies['@types/node'] = '^20.11.24';

fs.writeFileSync('frontend-vite/package.json', JSON.stringify(vite, null, 2));
