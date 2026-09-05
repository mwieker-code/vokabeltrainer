const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../oberstufe/analysis');let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
function setup(seed){const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.org/oberstufe/analysis/'});if(seed)dom.window.localStorage.setItem('vt:analysis:v1',seed);for(const f of ['data.js','app.js'])dom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));return dom;}
const dom=setup(),w=dom.window,d=w.document,data=w.ANALYSIS_DATA;
ok(data.devices.length===12,'12 devices');ok(data.writing.length===4,'four writing tasks');
for(const device of data.devices){ok(data.devices.some(x=>x.id===device.contrast),'contrast exists');ok(device.examples.length===3,'three variants');for(const e of device.examples){ok(e.length===3,'context quote explanation');ok(e[1].split('|').length===3,'highlight valid');}}
for(const mode of ['terms','identify','distinguish','effect']){
 d.querySelector('[data-start="'+mode+'"]').click();let attempts=0;
 while(d.querySelector('#next')||d.querySelector('#form')||d.querySelector('[data-option]')){
  if(d.querySelector('#reveal'))d.querySelector('#reveal').click();else if(d.querySelector('[data-option]'))d.querySelector('[data-option]').click();
  const next=d.querySelector('#next');ok(next,'feedback and continue exist');next.click();attempts++;ok(attempts<=12,'bounded round');
 }
 ok(d.querySelector('#again'),'round completes');d.querySelector('#home').click();
}
const state=JSON.parse(w.localStorage.getItem('vt:analysis:v1'));ok(Object.keys(state.results).length>0,'results saved');
d.querySelector('#write').click();for(const task of data.writing){d.querySelector('[data-write="'+task.id+'"]').click();d.querySelector('#compare').click();ok(!d.querySelector('#model .feedback'),'attempt before model');let draft=d.querySelector('#draft');draft.value='The writer uses evidence to present a supported interpretation. <script>alert(1)</script>';draft.dispatchEvent(new w.Event('input'));d.querySelector('#compare').click();ok(d.querySelector('#model .feedback'),'model after attempt');d.querySelector('[data-check]').click();d.querySelector('#back').click();}
const backup=w.localStorage.getItem('vt:analysis:v1');const reloaded=setup(backup);reloaded.window.document.querySelector('#write').click();reloaded.window.document.querySelector('[data-write]').click();ok(reloaded.window.document.querySelector('#draft').value.includes('<script>'),'draft preserved and escaped');ok(reloaded.window.document.querySelector('[data-check]').checked,'checklist restored');
ok(reloaded.window.localStorage.getItem('vt9:progress')===null,'vocabulary storage isolated');
dom.window.close();reloaded.window.close();console.log(checks+' analysis checks passed');
