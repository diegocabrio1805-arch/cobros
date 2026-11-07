import fs from 'fs';

// 1. MobileCollectorMode: convertir el <input que contiene onValueChange={setSearchTerm}
{
  const f = 'components/MobileCollectorMode.tsx';
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  s = s.replace(/<input(\s*\r?\n\s*type="text" placeholder=\{lang[^\n]*onValueChange=\{setSearchTerm\})/, '<FastInput$1');
  console.log('MobileCollectorMode input:', s !== before);
  fs.writeFileSync(f, s);
}

// 2. Imports
for (const f of ['components/MobileCollectorMode.tsx', 'components/CollectionRoute.tsx', 'components/Loans.tsx']) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes("from './FastInput'")) { console.log(f, 'ya importa'); continue; }
  // Insertar después del primer import de React
  const m = s.match(/^import React[^\n]*\n/m);
  if (!m) { console.log(f, 'SIN import React!'); continue; }
  s = s.replace(m[0], m[0] + "import FastInput from './FastInput';\n");
  fs.writeFileSync(f, s);
  console.log(f, 'import agregado');
}

