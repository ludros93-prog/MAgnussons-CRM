// Visuell genomgång av den byggda appen.
// Startar den byggda Workern med isolerad D1/R2, öppnar demoytan som syntetiska
// identiteter per roll och sparar skärmbilder av huvudvyerna på dator och mobil.
// Körs efter `pnpm build`. Inga produktionsdata, inga riktiga konton.
import {readdirSync,readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare,Log,LogLevel}=await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
if(!process.env.PLAYWRIGHT_DIR)throw Error('Ange PLAYWRIGHT_DIR: katalogen där playwright-core är installerat.');
const {chromium}=createRequire(join(process.env.PLAYWRIGHT_DIR,'index.js'))('playwright-core');

const root=fileURLToPath(new URL('../',import.meta.url)),serverRoot=join(root,'dist/server');
const out=join(root,'outputs/walkthrough');mkdirSync(out,{recursive:true});
const statePath=mkdtempSync(join(tmpdir(),'magnussons-walkthrough-'));
const moduleFiles=readdirSync(serverRoot,{recursive:true}).filter(f=>/\.m?js$/.test(f));
const boot=workerFirst=>new Miniflare({modulesRoot:serverRoot,modules:[
 {type:'ESModule',path:join(serverRoot,'index.js')},
 ...moduleFiles.filter(f=>f!=='index.js').map(f=>({type:'ESModule',path:join(serverRoot,f)}))],
 compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false,host:'127.0.0.1',
 log:new Log(LogLevel.ERROR),d1Databases:{DB:'crm-walkthrough'},r2Buckets:{BUCKET:'crm-walkthrough'},
 d1Persist:join(statePath,'d1'),r2Persist:join(statePath,'r2'),
 assets:{directory:join(root,'dist/client'),binding:'ASSETS',routerConfig:workerFirst?{has_user_worker:true,invoke_user_worker_ahead_of_assets:true}:{has_user_worker:true}}});
let mf=boot(true);

// Syntetiska personer. Namnen på säljarna följer demoytans exempelansvariga.
const people=[
 {id:'walk-seller',role:'seller',name:'Erik Lindberg',owner:'Erik Lindberg'},
 {id:'walk-admin',role:'admin',name:'Sebastian Hansson',owner:'Sebastian Hansson'},
 {id:'walk-print',role:'print',name:'Tryck Exempel',owner:''},
 {id:'walk-warehouse',role:'warehouse',name:'Lager Exempel',owner:''},
 {id:'walk-production',role:'production',name:'Produktion Exempel',owner:''}
];
const salesViews=[['today'],['customers'],['customers','prospects'],['customers','search'],['customers','onboarding'],['customers','care'],['customers','year'],['deals'],['deals','orders'],['deals','catalog'],['deals','production'],['calendar'],['calendar','correspondence'],['overview']];
const adminViews=[['admin','settings'],['admin','accounts'],['admin','connections'],['admin','process']];
const viewsFor={seller:salesViews,admin:[...salesViews,...adminViews],print:[['print'],['notices']],warehouse:[['warehouse'],['notices']],production:[['production'],['notices']]};
const sizes=[{name:'dator',width:1440,height:900},{name:'mobil',width:390,height:844}];
const only=(process.env.WALK_ROLES||'').split(',').map(s=>s.trim()).filter(Boolean);

const report=[],problems=[];
const problem=data=>{problems.push(data);console.log('WALK problem '+JSON.stringify(data));};
const note=(kind,data)=>{report.push({kind,...data});console.log('WALK '+kind+' '+JSON.stringify(data));};
const facts=()=>{
 const text=s=>(s||'').replace(/\s+/g,' ').trim();
 const seen=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
 const main=document.querySelector('main.main')||document.body,width=document.documentElement.clientWidth;
 const controls=[...main.querySelectorAll('button,a[href],input,select,textarea,[role=combobox]')].filter(seen);
 return {
  view:main.getAttribute('data-view')||'',
  h1:text(document.querySelector('h1')?.textContent),
  crumb:text(document.querySelector('.crumb b')?.textContent),
  tabs:[...document.querySelectorAll('nav.section-nav button')].filter(seen).map(b=>text(b.textContent)+(b.getAttribute('aria-current')?' *':'')),
  menu:[...document.querySelectorAll('[data-nav]')].map(n=>n.getAttribute('data-nav')+'='+text(n.textContent)),
  overflowX:document.documentElement.scrollWidth-width,
  outside:controls.filter(el=>{const r=el.getBoundingClientRect();return r.right>width+1||r.left<-1;}).map(el=>text(el.textContent||el.getAttribute('aria-label')||el.tagName).slice(0,40)).slice(0,12),
  small:width<600?controls.filter(el=>{const r=el.getBoundingClientRect();return r.height<32||r.width<32;}).map(el=>text(el.textContent||el.getAttribute('aria-label')||el.tagName).slice(0,30)+' '+Math.round(el.getBoundingClientRect().width)+'x'+Math.round(el.getBoundingClientRect().height)).slice(0,12):[],
  notices:[...document.querySelectorAll('[data-profile-diagnostic],.panel.error,[role=alert],.day-profile-notice')].filter(seen).map(n=>text(n.textContent).slice(0,260)),
  headings:[...main.querySelectorAll('h2,h3')].filter(seen).map(h=>text(h.textContent).slice(0,70)).slice(0,40),
  buttons:[...new Set(controls.filter(el=>el.tagName==='BUTTON').map(b=>text(b.textContent||b.getAttribute('aria-label')).slice(0,50)).filter(Boolean))].slice(0,70),
  words:text(main.innerText).split(' ').length,
  height:document.documentElement.scrollHeight
 };
};

let browser;
try{
 const db=await mf.getD1Database('DB');
 for(const file of readdirSync(join(root,'drizzle')).filter(f=>f.endsWith('.sql')).sort())
  for(const sql of readFileSync(join(root,'drizzle',file),'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 for(const p of people)await db.prepare('INSERT INTO crm_members(id,email,user_id,name,role,owner,active) VALUES(?,?,?,?,?,?,1)').bind(p.id,p.id+'@example.test',p.id,p.name,p.role,p.owner).run();
 let base=(await mf.ready).toString().replace(/\/$/,'');
 // Den byggda sidan måste kunna hämta sina skript. Pröva vem som serverar dem.
 const html=await (await fetch(base+'/')).text(),asset=(html.match(/(?:src|href)="(\/[^"]+\.js)"/)||[])[1];
 let assetStatus=asset?(await fetch(base+asset)).status:0;
 note('start',{base,asset:asset||'',assetStatus,workerFirst:true,htmlBytes:html.length});
 if(asset&&assetStatus!==200){
  await mf.dispose();mf=boot(false);base=(await mf.ready).toString().replace(/\/$/,'');
  assetStatus=(await fetch(base+asset)).status;note('start',{base,asset,assetStatus,workerFirst:false});
 }
 browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'});
 for(const person of people.filter(p=>!only.length||only.includes(p.role))){
  const context=await browser.newContext({viewport:{width:sizes[0].width,height:sizes[0].height},locale:'sv-SE',timezoneId:'Europe/Stockholm',extraHTTPHeaders:{'oai-authenticated-user-id':person.id,'oai-authenticated-user-email':person.id+'@example.test'}});
  context.setDefaultTimeout(8000);
  const page=await context.newPage();
  page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>problem({role:person.role,type:'pageerror',text:String(e).slice(0,300)}));
  page.on('console',m=>{if(m.type()==='error')problem({role:person.role,type:'console',text:m.text().slice(0,300)});});
  page.on('requestfailed',r=>problem({role:person.role,type:'requestfailed',text:r.method()+' '+r.url().replace(base,'')+' '+(r.failure()?.errorText||'')}));
  page.on('response',r=>{if(r.status()>=400)problem({role:person.role,type:'http',text:r.status()+' '+r.request().method()+' '+r.url().replace(base,'')});});
  const step=async(label,run)=>{try{await run();return true}catch(e){problem({role:person.role,type:'step',label,text:String(e).split('\n')[0].slice(0,300)});return false}};
  const shot=async(size,label)=>{
   await page.waitForTimeout(350);
   const data=await page.evaluate(facts),file=[person.role,size.name,label].join('-')+'.jpg';
   await page.screenshot({path:join(out,file),fullPage:true,type:'jpeg',quality:72});
   note('vy',{role:person.role,size:size.name,label,file,...data});
  };
  await page.goto(base+'/',{waitUntil:'load',timeout:30000});
  await page.waitForTimeout(1500);
  const ready=await step('välj demoyta',async()=>{
   await page.getByRole('combobox',{name:'Arbetsyta'}).first().click({timeout:15000});
   await page.getByRole('option',{name:'Demoyta'}).click();
   await page.locator('.workspace-banner b',{hasText:'DEMO'}).waitFor({timeout:15000});
  });
  if(!ready){
   await page.screenshot({path:join(out,person.role+'-START-FEL.jpg'),fullPage:true,type:'jpeg',quality:72}).catch(()=>{});
   note('startfel',{role:person.role,url:page.url(),text:(await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,600)).catch(()=>'')),scripts:(await page.evaluate(()=>[...document.scripts].map(s=>s.src).filter(Boolean).slice(0,6)).catch(()=>[]))});
   await context.close();continue;
  }
  for(const size of sizes){
   await page.setViewportSize({width:size.width,height:size.height});
   await page.waitForTimeout(300);
   for(const path of viewsFor[person.role]){
    const target=path[path.length-1],label=path.join('_');
    const ok=await step(size.name+' '+label,async()=>{
     const item=page.locator('[data-nav="'+path[0]+'"] button').first();
     if(!(await item.isVisible())){await page.locator('[data-sidebar="trigger"]').first().click();await item.waitFor({state:'visible',timeout:5000});}
     await item.click();
     if(path.length>1&&path[0]!=='admin'||path[0]==='admin'&&target!=='settings'){
      const current=await page.locator('main.main').getAttribute('data-view');
      if(current!==target){
       const before=await page.evaluate(()=>[...document.querySelectorAll('nav.section-nav button')].map(b=>b.textContent));
       const index=await page.evaluate(([group,id])=>{const order={customers:['customers','prospects','search','onboarding','care','year'],deals:['deals','orders','catalog','print','warehouse','production'],calendar:['calendar','correspondence'],admin:['settings','accounts','connections','process']}[group];return order.indexOf(id)},[path[0],target]);
       // Flikarna visas i gruppens ordning; vissa roller saknar enstaka flikar.
       let clicked=false;
       for(const button of await page.locator('nav.section-nav button').all()){await button.click();await page.waitForTimeout(120);if(await page.locator('main.main').getAttribute('data-view')===target){clicked=true;break}}
       if(!clicked)throw Error('Hittade inte fliken '+target+' bland '+JSON.stringify(before)+' (plats '+index+')');
      }
     }
     await page.locator('main.main[data-view="'+target+'"]').waitFor({timeout:8000});
    });
    if(ok)await step('bild '+size.name+' '+label,()=>shot(size,label));
    else await step('felbild '+size.name+' '+label,()=>page.screenshot({path:join(out,[person.role,size.name,label,'FEL'].join('-')+'.jpg'),fullPage:true,type:'jpeg',quality:72}));
   }
  }
  await context.close();
 }
}finally{
 writeFileSync(join(out,'rapport.json'),JSON.stringify({generated:new Date().toISOString(),report,problems},null,1));
 console.log('WALK klart '+JSON.stringify({vyer:report.filter(r=>r.kind==='vy').length,problem:problems.length}));
 await browser?.close().catch(()=>{});
 await mf.dispose().catch(()=>{});
 rmSync(statePath,{recursive:true,force:true});
}
if(!report.some(r=>r.kind==='vy'))process.exit(1);
