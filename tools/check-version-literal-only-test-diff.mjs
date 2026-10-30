import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const QUOTED=/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g;

export function isVersionIdentifierLiteral(value){
  const s=String(value||'');
  return /candidate-assets-[0-9a-f]{8,}/i.test(s)
    || /(?:^|[-_/])v\d+(?:\.\d+){1,3}(?:$|[-_/])/i.test(s)
    || /\d+\.\d+(?:\.\d+){0,2}/.test(s)
    || /quality-gate-v\d+/i.test(s)
    || /diagnostics-clean-\d+(?:\.\d+)+/i.test(s);
}

function unquote(token){return token.slice(1,-1);}

export function isVersionLiteralOnlyLinePair(oldLine,newLine){
  const oldTokens=[...String(oldLine).matchAll(QUOTED)].map(m=>m[0]);
  const newTokens=[...String(newLine).matchAll(QUOTED)].map(m=>m[0]);
  if(!oldTokens.length||oldTokens.length!==newTokens.length)return false;
  let changed=0;
  for(let i=0;i<oldTokens.length;i++){
    if(oldTokens[i]===newTokens[i])continue;
    changed++;
    if(!isVersionIdentifierLiteral(unquote(oldTokens[i]))||!isVersionIdentifierLiteral(unquote(newTokens[i])))return false;
  }
  if(!changed)return false;
  const oldSkeleton=String(oldLine).replace(QUOTED,'<LITERAL>');
  const newSkeleton=String(newLine).replace(QUOTED,'<LITERAL>');
  return oldSkeleton===newSkeleton;
}

export function classifyUnifiedDiff(diff){
  const lines=String(diff||'').split(/\r?\n/);
  const files=[];let current=null;
  for(const line of lines){
    if(line.startsWith('diff --git ')){
      const m=line.match(/^diff --git a\/(.+) b\/(.+)$/);current={path:m?.[2]||null,deleted:[],added:[],rejected:[]};files.push(current);continue;
    }
    if(!current||line.startsWith('--- ')||line.startsWith('+++ ')||line.startsWith('@@'))continue;
    if(line.startsWith('-'))current.deleted.push(line.slice(1));
    else if(line.startsWith('+'))current.added.push(line.slice(1));
  }
  let ok=true;
  for(const file of files){
    if(!file.path?.startsWith('tests/')){file.rejected.push('changed path is outside tests/');ok=false;continue;}
    if(file.deleted.length!==file.added.length){file.rejected.push('added/deleted line count differs');ok=false;continue;}
    for(let i=0;i<file.deleted.length;i++)if(!isVersionLiteralOnlyLinePair(file.deleted[i],file.added[i])){
      file.rejected.push(`non-version-only change at pair ${i+1}`);ok=false;
    }
  }
  if(!files.length)ok=false;
  return {version_literal_only:ok,files};
}

export function diffBetween(base,head='HEAD',cwd=process.cwd(),paths=[]){
  const args=['diff','--unified=0',`${base}..${head}`,'--',...(paths.length?paths:['tests/'])];
  return execFileSync('git',args,{cwd,encoding:'utf8'});
}

function isMain(){const self=fileURLToPath(import.meta.url);return process.argv[1]&&path.resolve(process.argv[1])===path.resolve(self);}

if(isMain()){
  const [base,head='HEAD',...paths]=process.argv.slice(2);
  if(!base){console.error('Usage: node tools/check-version-literal-only-test-diff.mjs <base> [head] [test-path ...]');process.exit(2);}
  const report=classifyUnifiedDiff(diffBetween(base,head,process.cwd(),paths));
  console.log(JSON.stringify(report,null,2));
  if(!report.version_literal_only)process.exitCode=1;
}
