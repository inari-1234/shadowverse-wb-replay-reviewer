import fs from 'node:fs';import path from 'node:path';
const read=f=>fs.readFileSync(f,'utf8'),write=(f,s)=>fs.writeFileSync(f,s);
function must(file,from,to){const s=read(file),n=s.split(from).length-1;if(n!==1)throw new Error(`${file}: expected one occurrence, got ${n}`);write(file,s.replace(from,to))}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}
must('tests/pf1r2-0923-tradeoff-integrated-acceptance-regression.cjs','const {window}=dom,document=window;','const {window}=dom,document=window.document;');
for(const f of walk('tests').filter(f=>/\.(?:mjs|cjs|js|json)$/.test(f))){const s=read(f);if(s.includes('pf1r2-preaction-resource-authority-v1.0.0'))write(f,s.split('pf1r2-preaction-resource-authority-v1.0.0').join('pf1r2-preaction-resource-authority-v1.0.1'))}
console.log('human-review corrective postfix applied');
