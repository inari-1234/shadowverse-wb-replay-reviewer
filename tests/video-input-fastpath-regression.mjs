import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const index=read('index.html');
const app=read('app-core.js');

assert.ok(index.includes('id="videoFile" type="file" accept="video/*"'),'video input must remain a plain video file input');
assert.ok(index.includes('id="videoLoadTiming"'),'video input UI must expose handoff timing');
assert.ok(index.includes('「ファイルを選択」'),'iPhone UI must explain the verified Files fast path');

const changeStart=app.indexOf("file?.addEventListener('change'");
const metadataStart=app.indexOf("WB.video?.addEventListener('loadedmetadata'",changeStart);
assert.ok(changeStart>=0&&metadataStart>changeStart,'video change and metadata handlers must be extractable');
const changeBlock=app.slice(changeStart,metadataStart);
assert.ok(changeBlock.includes('URL.createObjectURL(f)'),'video input must keep zero-copy object-URL handoff after File receipt');
assert.equal(changeBlock.includes('FileReader'),false,'video input must not read the whole file with FileReader');
assert.equal(changeBlock.includes('.arrayBuffer('),false,'video input must not materialize the whole file into an ArrayBuffer');
assert.ok(changeBlock.includes('pickerElapsedMs'),'video input must record picker-to-File elapsed time');
assert.ok(changeBlock.includes('pickerElapsedIncludesUserSelection:true'),'picker timing must explicitly declare that user selection time is included');

const metadataEnd=app.indexOf("WB.video?.addEventListener('timeupdate'",metadataStart);
assert.ok(metadataEnd>metadataStart,'metadata handler must be extractable');
const metadataBlock=app.slice(metadataStart,metadataEnd);
assert.ok(metadataBlock.includes('fileToMetadataMs'),'metadata handler must record File-to-metadata time');
assert.ok(metadataBlock.includes('performance.now()-fileReceivedPerf'),'File-to-metadata timing must start only after the browser receives File');
assert.ok(metadataBlock.includes("inputTiming:WB.videoMeta?.inputTiming||null"),'metadata log must retain input timing diagnostics');

assert.ok(app.includes("file?.addEventListener('pointerdown',markPickerStart"),'picker timing must begin from the user opening the picker');

console.log(JSON.stringify({
  filesFastPathGuidance:true,
  pickerToFileTiming:true,
  fileToMetadataTiming:true,
  objectUrlFastPath:true,
  wholeFileRead:false
},null,2));
console.log('VIDEO INPUT FASTPATH REGRESSION PASS');
