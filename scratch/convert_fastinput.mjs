import fs from 'fs';
const file = 'components/Clients.tsx';
let src = fs.readFileSync(file, 'utf8');
const re = /<input((?:(?!\/>|<input)[\s\S])*?)onChange=\{e => setEditClientFormData\(prev => prev \? \{ \.\.\.prev, (\w+): e\.target\.value \} : null\)\}/g;
let n = 0;
src = src.replace(re, (_m, before, field) => {
  n++;
  return `<FastInput${before}onValueChange={v => setEditClientFormData(prev => prev ? { ...prev, ${field}: v } : null)}`;
});
fs.writeFileSync(file, src);
console.log('Convertidos:', n);

