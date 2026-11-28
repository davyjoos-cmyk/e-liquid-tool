const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(id,d=0)=>{const v=parseFloat($(id).value);return isNaN(v)?d:v};
const today=()=>new Date().toLocaleDateString('nl-BE');
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}};
let chgT=0;const CHGK=['vape_inv_master','vape_steep_master','vape_saved_recipes','vape_log','vape_liquids','vape_bases','vape_bottles','vape_devs','vape_prices'];
const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));if(CHGK.includes(k)&&Date.now()-chgT>60000){chgT=Date.now();localStorage.setItem('vape_chg',String((+localStorage.getItem('vape_chg')||0)+1))}}catch{}};
let tt;const toast=m=>{const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2800)};
const copy=async(t,m)=>{try{await navigator.clipboard.writeText(t);toast(m)}catch{toast('⚠️ Kopiëren niet mogelijk in deze omgeving')}};
const D={NIC:1.1,FL:1.04,VG:1.26,PG:1.036},P={fl:.25};

let nicType='freebase',flavors=[{name:'Capella - Sweet Strawberry',pct:6},{name:'TPA - Bavarian Cream',pct:3}];
let inventory=load('vape_inv_master',[{id:1,name:'Capella - Sweet Strawberry',ml:30,rec:6,max:10,steep:5,base:'PG'},{id:2,name:'TPA - Bavarian Cream',ml:4,rec:3,max:5,steep:10,base:'PG'},{id:3,name:'Inawera - Custard',ml:50,rec:4,max:8,steep:14,base:'PG'},{id:4,name:'TPA - Peppermint',ml:15,rec:2,max:4,steep:3,base:'PG'}]);
let steep=load('vape_steep_master',[{id:1,name:'Vanilla Strawberry Custard',date:today(),start:Date.now()-5*864e5,days:14,rating:5,notes:'Heerlijk romig!'}]);
let saved=load('vape_saved_recipes',[{id:1,name:'Strawberry Bavarian Custard',targetMl:60,targetNic:3,targetVg:70,nicType:'freebase',flavors:[{name:'Capella - Sweet Strawberry',pct:6},{name:'TPA - Bavarian Cream',pct:3}]}]);
const presets=[
 {name:'Vanilla Strawberry Custard',required:['Capella - Sweet Strawberry','TPA - Bavarian Cream'],flavors:[{name:'Capella - Sweet Strawberry',pct:6},{name:'TPA - Bavarian Cream',pct:4},{name:'Inawera - Custard',pct:2}]},
 {name:'Peppermint Breeze',required:['TPA - Peppermint'],flavors:[{name:'TPA - Peppermint',pct:5}]}];

const TABS=[['calc','🧪','Mixen'],['today','📅','Vandaag'],['saved','📖','Recepten'],['suggest','💡','Ideeën'],['inv','📦','Voorraad'],['liq','🍶','Liquids'],['dash','📊','Stats']];
$('nav').innerHTML=TABS.map(([id,i,l],n)=>`<button data-tab="${id}" class="${n?'':'on'}"><i>${i}</i>${l}</button>`).join('');
$('nav').onclick=e=>{const b=e.target.closest('button');if(b)switchTab(b.dataset.tab)};
const R={fles:()=>renderBottle(),liq:()=>{renderLiquids();renderSteep();renderBottle()},calc:()=>calcCorrection(),today:()=>{renderToday();renderDash();checkBadges()},dash:()=>{renderDash();renderBadges();checkBadges();renderToday();renderLog()},suggest:()=>{renderTaste();renderSuggestions();renderMatcher();renderCook();renderMyTaste();renderBuy();ingFill();renderInvMap()},saved:()=>{renderSaved();renderCmp();updateLabel()},label:()=>{updateLabel();autoAI()},correct:()=>calcCorrection(),steep:()=>renderSteep()};
function toggleTheme(){const d=document.documentElement,l=d.dataset.theme==='dark';d.dataset.theme=l?'light':'dark';$('th').textContent=l?'☀️':'🌙'}
['recipeName','targetMl','targetNic','targetVg','nicBaseMg','nicBaseVg'].forEach(id=>$(id).addEventListener('input',calculate));
['cMl','cNic','tNic','cRatio'].forEach(id=>$(id).addEventListener('input',calcCorrection));
['bgTheme','lblSize','lblW','lblH','lblMode','lblWarn','lblOwner','lblBatch','lblSteep','gMode','gArt'].forEach(id=>$(id).addEventListener('input',updateLabel));
$('q').addEventListener('input',renderSaved);
$('mlChips').innerHTML=[10,30,60,100,120].map(v=>`<span class="chip" onclick="$('targetMl').value=${v};calculate()">${v} ml</span>`).join('');

function setNicType(t){nicType=t;$('btn-fb').className=t==='freebase'?'fb':'';$('btn-salt').className=t==='salts'?'salt':'';calculate()}
function renderFlavors(){$('flavors').innerHTML=flavors.map((f,i)=>`<div class="fr"><input type="text" value="${esc(f.name)}" autocomplete="off" list="aromaDL" placeholder="Aroma" oninput="updFlavor(${i},'name',this.value)"><input type="number" value="${f.pct}" step="0.5" min="0" oninput="updFlavor(${i},'pct',parseFloat(this.value)||0)"><span class="sub">%</span><button class="x" onclick="rmFlavor(${i})">✕</button></div>`).join('')}
const addFlavor=()=>{flavors.push({name:'',pct:2});renderFlavors();calculate()};
const rmFlavor=i=>{flavors.splice(i,1);renderFlavors();calculate()};
const updFlavor=(i,k,v)=>{flavors[i][k]=v;const L=k==='name'&&findInv(v);if(L&&L.rec&&flavors[i].pct===2){flavors[i].pct=L.rec;renderFlavors()}calculate()};

function calc(){
 const ml=num('targetMl'),nic=num('targetNic'),vg=num('targetVg'),pg=100-vg,bm=num('nicBaseMg',20)||20,bv=num('nicBaseVg');
 const bl=blend.map(x=>({L:liq(x.id),ml:x.ml})).filter(x=>x.L&&x.ml>0),bMl=bl.reduce((a,x)=>a+x.ml,0),blNic=bl.reduce((a,x)=>a+x.ml*x.L.nic,0),blVg=bl.reduce((a,x)=>a+x.ml*x.L.vg/100,0),bCost=bl.reduce((a,x)=>a+x.ml*(x.L.cpm||0),0);
 const nicMl=Math.max(0,ml*nic-blNic)/bm,nVg=nicMl*bv/100,nPg=nicMl-nVg;
 const flPct=flavors.reduce((s,f)=>s+(+f.pct||0),0),flMl=ml*flPct/100;
 const flVg=flavors.reduce((a,f)=>a+(findInv(f.name)?.base==='VG'?(+f.pct||0):0),0)*ml/100,vN=ml*vg/100-nVg-flVg-blVg,pN=ml*pg/100-nPg-(flMl-flVg)-(bMl-blVg);
 const px=bases.find(b=>b.kind==='mix'&&String(b.id)===$('mixSel').value),r=px?(px.vg||0)/100:0;let mixMl=0,capped=false;
 if(px){const nv=Math.max(vN,0),np=Math.max(pN,0),x=r>=1?nv:r<=0?np:Math.min(nv/r,np/(1-r));mixMl=Math.min(x,px.ml);capped=x>px.ml+.05}
 return{ml,nic,vg,pg,bm,nicMl,flPct,flMl,vN,pN,bMl,blNic,bCost,mixMl,capped,mixVgPct:px?px.vg:0,vgMl:Math.max(0,vN-mixMl*r),pgMl:Math.max(0,pN-mixMl*(1-r))};
}
let raf=0;function calculate(){cancelAnimationFrame(raf);raf=requestAnimationFrame(calcNow)}
function calcNow(){$('vgSlider').value=num('targetVg');
 const c=calc();$('ratio').textContent=`${c.vg}VG / ${c.pg}PG`;
 let cost=c.nicMl*price.nic/10+c.vgMl*price.vg/1000+c.pgMl*price.pg/1000+c.mixMl*(c.mixVgPct/100*price.vg+(1-c.mixVgPct/100)*price.pg)/1000+c.bCost;
 flavors.forEach(f=>{const L=findInv(f.name);cost+=c.ml*(+f.pct||0)/100*(L&&L.price&&L.size?L.price/L.size:P.fl)});
 const it=blend.filter(x=>x.ml>0&&liq(x.id)).map(x=>{const L=liq(x.id),v=L.vg/100;return['var(--pk)',`🍶 ${esc(L.name)}`,x.ml,D.VG*v+D.PG*(1-v)]});if(c.nicMl>0)it.push(['var(--pu)',`Nic ${nicType==='salts'?'Salt':'Freebase'} ${c.bm}mg · ${(c.nicMl/10).toFixed(1)}×10ml`,c.nicMl,D.NIC]);
 flavors.forEach(f=>it.push(['var(--am)',`${esc(f.name||'Aroma')} (${f.pct}%${findInv(f.name)?.base==='VG'?' · VG':''})`,c.ml*(+f.pct||0)/100,D.FL]));
 const base=[...(c.mixMl>0?[['var(--tl)',`Premix ${c.mixVgPct}VG/${100-c.mixVgPct}PG`,c.mixMl,D.VG*c.mixVgPct/100+D.PG*(1-c.mixVgPct/100)]]:[]),['var(--ok)','VG',c.vgMl,D.VG],['var(--ac)','PG',c.pgMl,D.PG]],G=mode==='g',all=it.concat(G?base.slice().sort((a,b)=>rk(a[1])-rk(b[1])):base);let cum=0;
 $('res').innerHTML=(G?'<div class="note" style="padding-top:8px">⚖️ Zet de fles op de weegschaal en vul aan tot het cumulatieve gewicht (niet tarreren). Dikke VG als laatste.</div>':'')+all.map(([col,l,ml,d],n)=>{const g=ml*d;cum+=g;return`<div class="rr"${G?' onclick="this.classList.toggle(\'dn\');chk()" style="cursor:pointer"':''}><span style="color:${col};font-weight:700">${G?(n+1)+'. ':''}${l}</span>${G?`<span class="rv" style="color:${col}">+${gf(g)} g <small style="color:var(--mu)">→ ${gf(cum)} g</small></span>`:`<span class="rv" style="color:${col}">${ml.toFixed(2)} ml / ${g.toFixed(2)} g</span>`}</div>`}).join('');
 const seg=[['nic',c.nicMl,'var(--pu)'],['aroma',c.flMl,'var(--am)'],['VG',c.vgMl,'var(--ok)'],['PG',c.pgMl,'var(--ac)'],['premix',c.mixMl,'var(--tl)'],['liquids',c.bMl,'var(--pk)']],tot=seg.reduce((s,x)=>s+x[1],0)||1;
 $('bar').innerHTML=seg.map(s=>`<div style="width:${s[1]/tot*100}%;background:${s[2]}"></div>`).join('');
 $('leg').innerHTML=seg.map(s=>`<span><i style="background:${s[2]}"></i>${s[0]} ${(s[1]/tot*100).toFixed(1)}%</span>`).join('');
 lastCost=cost;showMax();costGoalRender(c,cost);resRender(c);drawBottle();showAfter();drawRadar();renderMtl();renderBuild();renderNicConv();$('sNic').textContent=(c.nic*c.ml).toFixed(0);$('sFl').textContent=c.flPct.toFixed(1)+'%';$('sCost').textContent='€'+cost.toFixed(2);$('sMl').textContent='€'+(c.ml?cost/c.ml:0).toFixed(3);
 const w=[];
 if(c.vN<0)w.push(['e','Nic-shot bevat meer VG dan het doel toelaat. Verlaag shot-VG% of verhoog doel-VG%.']);
 if(c.pN<0)w.push(['e','Nic-shot en aroma\'s nemen meer PG in dan beschikbaar. Verhoog PG of verlaag aroma%.']);
 if(c.flPct>25)w.push(['','Hoog aromapercentage ('+c.flPct.toFixed(1)+'%): kan smaak verzadigen en zwaar aanvoelen.']);
 if(c.nic>20)w.push(['','Hoge nicotinesterkte: let op bij freebase.']);
 if(c.nicMl>0&&c.nicMl>c.ml*.5)w.push(['','Meer dan de helft van de batch is nic-shot.']);
 let rs=0;flavors.forEach(f=>{const L=findInv(f.name);if(!L)return;if(L.max&&f.pct>L.max)w.push(['e',`${esc(f.name)}: ${f.pct}% ligt boven het maximum van ${L.max}%.`]);else if(L.rec&&f.pct>L.rec*1.5)w.push(['',`${esc(f.name)}: ${f.pct}% is ruim boven het aanbevolen ${L.rec}%.`]);rs=Math.max(rs,L.steep||0)});recSteep=rs;
 if(rs)w.push(['i',`⏳ Aanbevolen steep: ${rs} dagen (tik om te gebruiken)`]);
 const nbS=bases.find(b=>b.kind==='nic'&&String(b.id)===$('nicSel').value);if(nbS&&c.nicMl>nbS.ml)w.push(['e',`${esc(nbS.name)}: voorraad ${nbS.ml} ml, nodig ${c.nicMl.toFixed(1)} ml.`]);
 [['vg',c.vgMl,'VG'],['pg',c.pgMl,'PG']].forEach(([k,v,l])=>{const t=bases.filter(b=>b.kind===k).reduce((a,b)=>a+b.ml,0);if(bases.some(b=>b.kind===k)&&v>t)w.push(['e',`${l}-voorraad onvoldoende: nodig ${v.toFixed(1)} ml, beschikbaar ${t.toFixed(0)} ml.`])});
 if(c.capped)w.push(['i','ℹ️ De voorgemengde base is op: de rest wordt aangevuld met pure VG/PG.']);
 blend.forEach(x=>{const L=liq(x.id);if(L&&x.ml>L.ml)w.push(['e',`${esc(L.name)}: voorraad ${L.ml} ml, nodig ${x.ml} ml.`])});
 if(c.bMl>c.ml+.01)w.push(['e',`De liquids (${c.bMl.toFixed(1)} ml) zijn meer dan het batchvolume (${c.ml} ml).`]);
 if(c.blNic>c.ml*c.nic+.01)w.push(['e',`De gebruikte liquids bevatten al meer nicotine dan het doel: minstens ${(c.blNic/c.ml).toFixed(2)} mg/ml.`]);
 if(blend.some(x=>liq(x.id)&&x.ml>0)){const pr=aromaProfile();if(pr.length)w.push(['i',`🍓 Resulterend aromaprofiel: ${pr.map(f=>`${esc(f.name)} ${f.pct}%`).join(' · ')}`])}
 $('calcWarn').innerHTML=w.map(x=>`<div class="${x[0]}"${x[0]==='i'?' onclick="useSteep()" style="cursor:pointer"':''}>${x[0]==='i'?'':'⚠️ '}${x[1]}</div>`).join('');
 updateLabel();
}
function roundShots(){const n=num('targetNic'),bm=num('nicBaseMg',20)||20,ml=num('targetMl',60);if(n<=0)return toast('⚠️ Voer eerst nicotine in');const s=Math.max(1,Math.round(ml*n/bm/10)),m=Math.round(s*10*bm/n);$('targetMl').value=m;calculate();toast(`🎯 ${m} ml = ${s} volle shot(s)`)}
function copySheet(){const c=calc();let t=`${$('recipeName').value}\n${c.ml}ml · ${c.vg}VG/${c.pg}PG · ${c.nic}mg ${nicType}\n\n`;if(c.nic>0)t+=`Nic: ${c.nicMl.toFixed(2)} ml\n`;flavors.forEach(f=>t+=`${f.name}: ${(c.ml*f.pct/100).toFixed(2)} ml\n`);if(c.mixMl>0)t+=`Premix ${c.mixVgPct}VG/${100-c.mixVgPct}PG: ${c.mixMl.toFixed(2)} ml\n`;t+=`VG: ${c.vgMl.toFixed(2)} ml (${(c.vgMl*D.VG).toFixed(2)} g)\nPG: ${c.pgMl.toFixed(2)} ml (${(c.pgMl*D.PG).toFixed(2)} g)`;copy(t,'📋 Mixlijst gekopieerd')}

const curRecipe=()=>({id:Date.now(),name:$('recipeName').value||'Mijn Recept',targetMl:num('targetMl',60),targetNic:num('targetNic',3),targetVg:num('targetVg',70),nicType,dev:recDev.id,watt:recDev.w,flavors:structuredClone(flavors),blend:structuredClone(blend)});
const saveRecipe=()=>{const r={...curRecipe(),...(recMeta||{})};saved.push(r);store('vape_saved_recipes',saved);toast(`✅ "${r.name}" opgeslagen`);checkBadges()};
function renderSaved(){renderRecent();
 const q=$('q').value.toLowerCase();$('savedCount').textContent=`${saved.length} recepten`;
 const list=saved.map((r,i)=>[r,i]).filter(([r])=>!q||(r.name+(r.desc||'')+r.flavors.map(f=>f.name).join()).toLowerCase().includes(q)).sort((a,b)=>(b[0].fav?1:0)-(a[0].fav?1:0));
 $('saved').innerHTML=list.map(([r,i])=>`<div class="it" style="flex-wrap:wrap"><div style="flex:1;min-width:150px"><b style="font-size:.86rem"><span style="cursor:pointer" onclick="fav(${i})">${r.fav?'⭐':'☆'}</span> ${esc(r.name)}</b><div class="sub">${r.targetVg}VG/${100-r.targetVg}PG · ${r.targetNic}mg · ${r.flavors.length} aroma's${(m=>m!=null?` · max ${m} ml`:'')(maxBatch(r.flavors))}</div>${devSub(r)}${recTagHTML(r,i)}${metaHTML(r,i)}</div><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="b2 sm" onclick="scaleTog(${i})">⚖️</button><button class="b2 sm" onclick="tagEd=tagEd===${i}?-1:${i};renderSaved()">🏷️</button><button class="b2 sm" onclick="loadSaved(${i})">Laden</button><button class="b2 sm" onclick="dupSaved(${i})">⧉</button><button class="b2 sm" onclick="shareRecipe(${i})">📤</button><button class="x" onclick="delSaved(${i})">✕</button></div></div>${scEd===i?scalePanel(r,i):''}`).join('')||'<p class="note">Geen recepten gevonden.</p>';
}
const sv=()=>{store('vape_saved_recipes',saved);renderSaved()};
const fav=i=>{saved[i].fav=!saved[i].fav;sv()};
const dupSaved=i=>{saved.push({...structuredClone(saved[i]),id:Date.now(),name:saved[i].name+' (kopie)',fav:false});sv();toast('⧉ Gedupliceerd')};
const delSaved=i=>{undoPush('Recept verwijderd');saved.splice(i,1);sv()};
function loadSaved(i){applyR(saved[i])}function applyR(r){recMeta=metaPick(r);$('recipeName').value=r.name;$('targetMl').value=r.targetMl;$('targetNic').value=r.targetNic;$('targetVg').value=r.targetVg;flavors=structuredClone(r.flavors);blend=(r.blend||[]).filter(b=>liq(b.id));renderFlavors();renderBlend();setNicType(r.nicType||'freebase');recDev={id:r.dev||'',w:r.watt||0};renderDev();switchTab('calc')}

function deductInventory(ov){undoPush('Mix afgeboekt');
 const ml=ov?ov.total:num('targetMl'),miss=[];let n=0;useBases(miss,ov);
 flavors.forEach(f=>{const m=inventory.find(i=>i.name.toLowerCase()===f.name.toLowerCase()),need=ov?takeOv(ov,f.name):ml*(+f.pct||0)/100;if(!m)return;if(m.ml<need)miss.push(`${m.name} (${(need-m.ml).toFixed(1)} ml tekort)`);invTake(m,need);n++});
 log.unshift({t:Date.now(),ml:+ml.toFixed(1),cost:ov?lastCost*ov.total/Math.max(1,num('targetMl')):lastCost,r:curRecipe(),g:mode==='g'||labOpen});log.length=Math.min(log.length,500);store('vape_log',log);renderLog();addAutoSteep();addLiquidFromBatch();renderInventory();checkBadges();toast(miss.length?`⚠️ Tekort: ${miss.join(', ')}`:`📉 ${n} aroma('s) afgetrokken · steep gestart · liquid opgeslagen`);
}
function renderInventory(){renderInvF();if(cntMode){renderCount();store('vape_inv_master',inventory);return}
 $('invCount').textContent=`${inventory.length} items`;
 $('inv').innerHTML=inventory.map((it,i)=>{if(!invOk(it))return'';
  const tags=[kindTag(it),it.dil>0&&it.dil<100&&('verdund '+it.dil+'%'),it.rec&&`aanb. ${it.rec}%`,it.max&&`max ${it.max}%`,it.steep&&`steep ${it.steep}d`,it.base==='VG'&&'VG-basis',it.price&&it.size&&`€${(it.price/it.size).toFixed(2)}/ml`,it.fl&&it.fl.length>0&&`🍶 ${it.fl.length} flesje${it.fl.length>1?'s':''}: ${it.fl.map(b=>bf(b.ml)+'/'+b.size).join(' · ')} ml`,it.brand&&'🏷️ '+esc(it.brand),it.str&&`sterkte ${it.str}`,it.cmix&&'eigen smaakmix',it.note&&'📝 '+esc(it.note),ingrTag(it)].filter(Boolean).join(' · ');
  const fld=[['rec','Aanbev. %','0.5'],['max','Max %','0.5'],['steep','Steep (dgn)','1'],['price','Prijs (€)','0.01'],['size','Flesje (ml)','1'],['min','Herbestel bij (ml)','1']].filter(([k])=>!(it.fl&&it.fl.length&&(k==='price'||k==='size'))).map(([k,l,st])=>`<div class="fg"><label>${l}</label><input type="number" min="0" step="${st}" value="${it[k]||''}" onchange="setInvF(${i},'${k}',this.value)"></div>`).join('');
  return`<div class="it" id="inv-${i}" style="flex-wrap:wrap"><div><b style="font-size:.86rem">${esc(it.name)}</b><div class="sub">${tags||'Geen richtlijnen ingesteld'}</div>${it.ml<=0?'<span class="bg bw">❌ Op</span>':it.ml<=thr(it)?'<span class="bg bw">⚠️ Laag (≤'+thr(it)+' ml)</span>':it.ml<=15?'<span class="bg ba">Bijna op</span>':''}</div><div style="display:flex;align-items:center;gap:6px"><input type="number" value="${it.ml}" ${it.fl&&it.fl.length?'readonly title="Bepaald door je flesjes"':''} onchange="updInv(${i},this.value)" style="width:70px;text-align:center"><span class="sub">ml</span><button class="b2 sm" onclick="refI=refI===${i}?-1:${i};renderInventory()">📖</button><button class="b2 sm" onclick="editIdx=editIdx===${i}?-1:${i};renderInventory()">✎</button><button class="b2 sm" title="Alle gegevens" onclick="detIdx=detIdx===${i}?-1:${i};renderInventory()">🗂️</button><button class="x" onclick="rmInv(${i})">✕</button></div>${editIdx===i?`<div class="g3" style="flex-basis:100%;margin-top:6px">${fld}<div class="fg"><label>Basis</label><select onchange="setInvF(${i},'base',this.value)"><option value="PG"${it.base==='VG'?'':' selected'}>PG</option><option value="VG"${it.base==='VG'?' selected':''}>VG</option></select></div><div class="fg"><label>Categorie</label><select onchange="setInvF(${i},'cat',this.value)"><option value="">Automatisch</option>${CATS.map(([k,n])=>`<option value="${k}"${it.cat===k?' selected':''}>${n}</option>`).join('')}</select></div></div>${invMixHTML(it,i)}${invFlHTML(it,i)}`:''}${detIdx===i?detPanel(it,i):''}${refI===i?refPanel(it,i):''}</div>`}).join('')||(inventory.length?'<p class="note">✅ Geen aroma\'s in deze categorie.</p>':'');
 store('vape_inv_master',inventory);
}
const updInv=(i,v)=>{undoPush('Voorraad aangepast',1);inventory[i].ml=parseFloat(v)||0;renderInventory()};
const rmInv=i=>{undoPush('Aroma verwijderd');inventory.splice(i,1);renderInventory();renderFlavors()};
const copyShopping=()=>{const l=inventory.filter(i=>invFilter==='all'?i.ml<=thr(i):invOk(i));l.length?copy('🛒 Bijkopen:\n'+l.map(i=>'• '+i.name).join('\n'),'🛒 Lijst gekopieerd'):toast('✅ Alles op voorraad')};

function renderSuggestions(){
 const names=inventory.map(i=>i.name.toLowerCase());
 $('suggestions').innerHTML=presets.map((r,i)=>{if(!recOk(r))return'';const have=r.required.filter(q=>names.some(n=>n.includes(q.toLowerCase()))).length,ok=have===r.required.length;
  return`<div class="it"><div><b style="font-size:.86rem">${esc(r.name)}</b><div class="sub">${r.flavors.map(f=>esc(f.name)).join(', ')}</div><span class="bg ${ok?'bk':'bw'}">${ok?'✅ In voorraad':`⚠️ ${have}/${r.required.length} aanwezig`}</span></div><button class="b2 sm" onclick="loadPreset(${i})">Laden</button></div>`}).join('')||'<p class="note">Geen voorbeeldrecepten met dit profiel.</p>';
}
function loadPreset(i){const r=presets[i];$('recipeName').value=r.name;flavors=structuredClone(r.flavors);renderFlavors();calculate();switchTab('calc')}

function renderSteep(){
 $('steep').innerHTML=steep.map((b,i)=>{
  const r=b.rating||0,el=(Date.now()-(b.start||b.id))/864e5,left=Math.ceil(b.days-el),p=Math.min(100,Math.max(0,el/b.days*100)),done=left<=0;
  return`<div class="it" style="flex-direction:column;align-items:stretch;gap:8px"><div style="display:flex;gap:12px;align-items:center">
  <div class="ring" style="background:conic-gradient(${done?'var(--ok)':'var(--ac)'} ${p}%,var(--bd) 0)"><span>${done?'✓':left+'d'}</span></div>
  <div style="flex:1"><b style="font-size:.86rem">${esc(b.name)}</b><div class="sub">Start ${esc(b.date)} · ${b.days} dagen · ${done?'klaar om te vapen!':left+' dagen te gaan'}</div></div><button class="b2 sm" onclick="tsTog(${i})" title="Proefkaart">📝</button><button class="b2 sm" onclick="stGrTog(${i})" title="Steep-verloop">📈</button><button class="b2 sm" onclick="icsOne(${i})" title="In agenda">📅</button><button class="x" onclick="rmSteep(${i})">✕</button></div>
  <div style="display:flex;align-items:center;gap:10px"><span style="color:var(--am);cursor:pointer;white-space:nowrap" onclick="cycleRating(${i})">${'★'.repeat(r)+'☆'.repeat(5-r)}</span>
  <input type="text" value="${esc(b.notes)}" placeholder="Proefnotities..." onchange="steep[${i}].notes=this.value;store('vape_steep_master',steep)" style="font-size:.78rem"></div>${stGr===i?stChart(b):''}${tsEd===i?tsPanel(b,i):tsSum(b)}</div>`}).join('');
 store('vape_steep_master',steep);ntfRender();
}
function addSteep(){const n=$('steepName').value.trim()||$('recipeName').value;steep.push({id:Date.now(),name:n,date:today(),start:Date.now(),days:parseInt($('steepDays').value)||7,rating:0,notes:''});$('steepName').value='';renderSteep()}
const cycleRating=i=>{steep[i].rating=((steep[i].rating||0)+1)%6;renderSteep();checkBadges()};
const rmSteep=i=>{undoPush('Batch verwijderd');steep.splice(i,1);renderSteep()};

function calcCorrection(){
 const ml=num('cMl'),cur=num('cNic'),tgt=num('tNic'),vp=num('cRatio',70);
 if(cur<=0||tgt<=0||tgt>=cur){$('cRes').textContent=cur>0&&tgt>=cur?'Doel ≥ huidig':'Ongeldig';$('cSplit').textContent='–';$('cTotal').textContent=ml.toFixed(1)+' ml';return}
 const t=ml*cur/tgt,a=t-ml,v=a*vp/100;$('cRes').textContent=`+${a.toFixed(1)} ml`;$('cSplit').textContent=`${v.toFixed(1)} / ${(a-v).toFixed(1)} ml`;$('cTotal').textContent=t.toFixed(1)+' ml';
}


let mode='ml',seed=0,upImg=null,wl=null,lastCost=0,lastSig='',custom=false,recSteep=0,editIdx=-1;
function setMode(m){mode=m;try{if(m==='g'){navigator.wakeLock?.request('screen').then(w=>wl=w).catch(()=>{});toast('⚖️ Scherm blijft aan tijdens het mixen')}else{wl?.release();wl=null}}catch{}$('m-ml').className=m==='ml'?'fb':'';$('m-g').className=m==='g'?'salt':'';calculate()}
const ART={
 tobacco:{k:['tabak','tobacco','ry4','cigar','pipe','cuban','virginia'],c:['#1c0d02','#78350f','#d97706'],m:'waves'},
 fruit:{k:['strawberry','berry','fruit','apple','mango','peach','grape','cherry','aarbei','framboos','lemon','melon','banana'],c:['#4c0519','#be123c','#fb7185'],m:'bubbles'},
 cream:{k:['custard','cream','vanilla','bavarian','butter','caramel','pie','donut','cake','waffle'],c:['#451a03','#92400e','#fde68a'],m:'waves'},
 frost:{k:['menthol','ice','mint','frost','cool','koolada','fris'],c:['#0c4a6e','#0284c7','#bae6fd'],m:'crystal'},
 drinks:{k:['coffee','cola','espresso','energy','lemonade','tea','soda','latte'],c:['#180e07','#451a03','#f59e0b'],m:'bubbles'},
 toxic:{k:['toxic','alien','cyber','acid','sour','neon'],c:['#3b0764','#052e16','#22c55e'],m:'hex'}};
const rng=s=>()=>(s=(s*16807)%2147483647)/2147483647;
function artThemes(){const t=(($('recipeName').value||'')+' '+(blend.length?aromaProfile():flavors).map(f=>f.name).join(' ')).toLowerCase(),sc=Object.entries(ART).map(([k,v])=>[k,v.k.filter(w=>t.includes(w)).length]).sort((a,b)=>b[1]-a[1]);return[sc[0][1]?sc[0][0]:'fruit',sc[1][1]?sc[1][0]:null]}
function motif(x,w,h,t,r,al){
 x.globalAlpha=.4*al;const p=t.c;
 if(t.m==='bubbles')for(let i=0;i<26;i++){const R=(.03+r()*.1)*w,cx=r()*w,cy=r()*h,g=x.createRadialGradient(cx-R*.3,cy-R*.3,R*.1,cx,cy,R);g.addColorStop(0,'#fff');g.addColorStop(.35,p[2]);g.addColorStop(1,p[1]);x.fillStyle=g;x.beginPath();x.arc(cx,cy,R,0,7);x.fill()}
 else if(t.m==='waves')for(let i=0;i<9;i++){x.strokeStyle=i%2?p[2]:'#fff';x.lineWidth=w*.02*(1+r());x.beginPath();const y0=h*i/9+r()*h*.08,A=h*.06*(1+r()),f=2+r()*3,ph=r()*6;for(let u=0;u<=w;u+=4)x[u?'lineTo':'moveTo'](u,y0+Math.sin(u/w*f*6.28+ph)*A);x.stroke()}
 else if(t.m==='crystal')for(let i=0;i<7;i++){const cx=r()*w,cy=r()*h,L=(.1+r()*.2)*w;x.strokeStyle=i%2?'#fff':p[2];x.lineWidth=w*.008;for(let k=0;k<6;k++){const an=k*Math.PI/3+i,mx=cx+Math.cos(an)*L*.6,my=cy+Math.sin(an)*L*.6;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(an)*L,cy+Math.sin(an)*L);x.stroke();for(const d of[-1,1]){x.beginPath();x.moveTo(mx,my);x.lineTo(mx+Math.cos(an+d*.8)*L*.25,my+Math.sin(an+d*.8)*L*.25);x.stroke()}}}
 else for(let i=0;i<40;i++){const cx=r()*w,cy=r()*h,R=(.03+r()*.05)*w;x.strokeStyle=i%2?p[2]:'#fff';x.lineWidth=w*.006;x.beginPath();for(let k=0;k<=6;k++)x[k?'lineTo':'moveTo'](cx+R*Math.cos(k*Math.PI/3),cy+R*Math.sin(k*Math.PI/3));x.stroke()}
 x.globalAlpha=1}
function artCanvas(w,h){
 const[a,b]=artThemes(),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
 const sd=seed||[...(($('recipeName').value)+flavors.map(f=>f.name).join())].reduce((q,ch)=>(q*31+ch.charCodeAt(0))%2147483646,7)+1,r=rng(sd);
 const g=x.createLinearGradient(0,0,w,h);ART[a].c.forEach((col,i)=>g.addColorStop(i/2,col));x.fillStyle=g;x.fillRect(0,0,w,h);
 motif(x,w,h,ART[a],r,1);if(b)motif(x,w,h,ART[b],r,.55);return c}
function bgSource(w,h){
 if(!upImg)return artCanvas(w,h);
 const c=document.createElement('canvas');c.width=w;c.height=h;const k=Math.max(w/upImg.width,h/upImg.height),dw=upImg.width*k,dh=upImg.height*k;
 c.getContext('2d').drawImage(upImg,(w-dw)/2,(h-dh)/2,dw,dh);return c}
function loadBg(e){const f=e.target.files[0];if(!f)return;const i=new Image();i.onload=()=>{upImg=i;custom=true;$('bgTheme').value='art';updateLabel();toast('🖼️ Achtergrond geladen')};i.src=URL.createObjectURL(f)}
function newArt(){seed=Math.floor(Math.random()*2e9)+1;upImg=null;custom=false;lastSig=sig();$('bgTheme').value='art';updateLabel()}

let log=load('vape_log',[]);
const cfg=load('vape_cfg',{key:'',model:'gemini-3.1-flash-image',style:'watercolor',auto:false}),aiCache=load('vape_ai_art',{});
let aiBusy=false;
const STYLES={watercolor:'lush watercolor painting',neon:'neon cyberpunk synthwave illustration',vintage:'vintage retro poster lithograph with halftone texture',vector:'bold flat vector illustration with geometric shapes',oilpaint:'rich oil painting with expressive brush strokes',pop:'vibrant pop art with bold outlines'};
function initCfg(){$('pNic').value=price.nic;$('pShop').value=price.shop;$('pDay').value=price.day;$('pVg').value=price.vg;$('pPg').value=price.pg;$('gKey').value=cfg.key||'';$('gModel').value=cfg.model;$('gStyle').value=cfg.style;$('gAuto').checked=!!cfg.auto}
function saveCfg(){cfg.key=$('gKey').value.trim();cfg.model=$('gModel').value.trim()||'gemini-3.1-flash-image';cfg.style=$('gStyle').value;cfg.auto=$('gAuto').checked;store('vape_cfg',cfg)}
const sig=()=>(($('recipeName').value)+'|'+flavors.map(f=>f.name).join(',')+'|'+cfg.style).toLowerCase();
function useImg(u){const i=new Image();i.onload=()=>{upImg=i;$('bgTheme').value='art';updateLabel()};i.src=u}
function autoAI(){if(custom||aiBusy||!cfg.auto||!cfg.key)return;const k=sig();if(k===lastSig)return;lastSig=k;aiCache[k]?useImg(aiCache[k]):genAI(true)}
async function genAI(silent){
 if(aiBusy)return;saveCfg();if(!cfg.key)return silent||toast('🔑 Vul eerst je Gemini API-sleutel in');
 aiBusy=true;$('gBtn').disabled=true;$('gStat').textContent='⏳ Gemini schildert je achtergrond...';custom=false;
 const names=flavors.filter(f=>f.name).map(f=>f.name.replace(/^[\w.]+\s*-\s*/,'')).join(', ')||'sweet fruit';
 const prompt=`Create an abstract ${STYLES[cfg.style]||STYLES.watercolor} background artwork for an e-liquid bottle label named "${$('recipeName').value}", capturing these flavors: ${names}. Evoke the taste with colors, shapes and textures (ingredients, swirls, vapor). Rich saturated colors. Keep the center calm and low-detail so overlaid text stays readable. Absolutely no text, letters, numbers, logos or people.`;
 try{
  const ar={'50x50':'1:1','50x30':'3:2','40x30':'4:3','40x20':'21:9'}[$('lblSize').value];
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':cfg.key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseModalities:['IMAGE'],imageConfig:{aspectRatio:ar}}})});
  const j=await r.json();if(!r.ok)throw new Error(j.error?.message||'HTTP '+r.status);
  const d=(j.candidates?.[0]?.content?.parts||[]).map(q=>q.inlineData||q.inline_data).find(Boolean);if(!d)throw new Error('Geen afbeelding ontvangen (mogelijk geblokkeerd door filters)');
  const i=new Image();await new Promise((ok,no)=>{i.onload=ok;i.onerror=no;i.src=`data:${d.mimeType||d.mime_type||'image/png'};base64,${d.data}`});
  const c=document.createElement('canvas'),k=Math.min(1,800/Math.max(i.width,i.height));c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);
  const u=c.toDataURL('image/jpeg',.82);aiCache[sig()]=u;lastSig=sig();Object.keys(aiCache).slice(0,-10).forEach(x=>delete aiCache[x]);store('vape_ai_art',aiCache);
  useImg(u);$('gStat').textContent='✅ AI-achtergrond klaar, gemaakt met Gemini';
 }catch(e){$('gStat').textContent='❌ '+e.message;if(!silent)toast('❌ Gemini: '+e.message)}
 aiBusy=false;$('gBtn').disabled=false}
function renderLog(){
 const t=log.reduce((a,l)=>a+l.ml,0),c=log.reduce((a,l)=>a+l.cost,0);
 $('logStat').textContent=log.length?`${log.length} batches · ${t} ml · €${c.toFixed(2)}`:'';
 $('log').innerHTML=log.slice(0,8).map((l,i)=>`<div class="it"><div><b style="font-size:.86rem">${esc(l.r.name)}</b><div class="sub">${new Date(l.t).toLocaleDateString('nl-BE')} · ${l.ml} ml · €${l.cost.toFixed(2)}</div></div><button class="b2 sm" onclick="applyR(log[${i}].r)">↻ Opnieuw</button></div>`).join('')||'<p class="note">Nog geen batches gemixt.</p>'}

const price=load('vape_prices',{nic:3,vg:15,pg:15});price.shop=price.shop??5;price.day??=3;
const findInv=n=>inventory.find(i=>i.name.toLowerCase()===String(n||'').toLowerCase().trim());
function savePrice(){price.nic=parseFloat($('pNic').value)||0;price.vg=parseFloat($('pVg').value)||0;price.pg=parseFloat($('pPg').value)||0;price.shop=parseFloat($('pShop').value)||0;price.day=parseFloat($('pDay').value)||0;store('vape_prices',price);calculate();renderDash()}
function setInvF(i,k,v){inventory[i][k]=(k==='base'||k==='cat'||k==='note'||k==='str'||k==='brand'||k==='ingr'||k==='barcode')?v:(parseFloat(v)||0);renderInventory();renderFlavors();calculate()}
function useSteep(){if(!recSteep)return;$('steepDays').value=recSteep;$('lblSteep').value=recSteep;updateLabel();toast(`⏳ Steep ingesteld op ${recSteep} dagen`)}
function addAutoSteep(){steep.push({id:Date.now()+1,name:$('recipeName').value||'Batch',date:today(),start:Date.now(),days:recSteep||parseInt($('steepDays').value)||7,rating:0,notes:''});renderSteep()}

function maxBatch(fl){let m=Infinity;for(const f of fl){if(!f.name||!(+f.pct>0))continue;const L=findInv(f.name);if(!L)return null;m=Math.min(m,L.ml/(f.pct/100))}return isFinite(m)?Math.floor(m):null}
function showMax(){const m=maxBatch(flavors);$('maxB').innerHTML=subHint()+(m==null?'':`📦 Met je voorraad kun je maximaal <b>${m} ml</b> mixen. <a href="#" style="color:var(--ac)" onclick="$('targetMl').value=${m};calculate();return false">Gebruik</a>`)}
function chk(){const r=[...document.querySelectorAll('#res .rr')];if(r.length&&r.every(x=>x.classList.contains('dn'))){toast('🎉 Alles toegevoegd: schudden en laten steepen!');navigator.vibrate?.(200)}}
function renderDash(){
 const t=log.reduce((a,l)=>a+l.ml,0),c=log.reduce((a,l)=>a+l.cost,0);
 $('dStats').innerHTML=[[log.length,'batches'],[t,'ml gemixt'],['€'+c.toFixed(2),'uitgegeven'],['€'+(t?c/t:0).toFixed(3),'per ml']].map(([v,l])=>`<div class="st"><b>${v}</b><span>${l}</span></div>`).join('');
 const now=new Date(),ms=[...Array(6)].map((_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return{k:d.getFullYear()*12+d.getMonth(),l:d.toLocaleDateString('nl-BE',{month:'short'}),v:0}});
 log.forEach(l=>{const d=new Date(l.t),m=ms.find(x=>x.k===d.getFullYear()*12+d.getMonth());if(m)m.v+=l.ml});
 const mx=Math.max(1,...ms.map(m=>m.v));
 $('dChart').innerHTML=`<svg viewBox="0 0 300 120" style="width:100%"><defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#c084fc"/></linearGradient></defs>${ms.map((m,i)=>{const h=m.v/mx*75;return`<rect x="${i*50+10}" y="${95-h}" width="30" height="${Math.max(h,2)}" rx="6" fill="url(#gb)"/><text x="${i*50+25}" y="111" text-anchor="middle" font-size="10" fill="#8b9ab3">${m.l}</text><text x="${i*50+25}" y="${90-h}" text-anchor="middle" font-size="9" fill="#8b9ab3">${m.v||''}</text>`}).join('')}</svg>`;
 const al=[];
 steep.forEach(b=>{const left=Math.ceil(b.days-(Date.now()-(b.start||b.id))/864e5);if(left<=0)al.push(['bk',`✅ ${esc(b.name)} is klaar om te vapen`]);else if(left<=2)al.push(['ba',`⏳ ${esc(b.name)}: nog ${left} ${left>1?'dagen':'dag'} steepen`])});
 inventory.filter(i=>i.ml<=thr(i)).forEach(i=>al.push(['bw',`⚠️ ${esc(i.name)}: bijna op (${i.ml} ml)`]));bases.filter(b=>b.ml<=LOW[b.kind]).forEach(b=>al.push(['bw',`⚠️ ${esc(b.name)}: bijna op (${b.ml} ml)`]));
 if(Date.now()-load('vape_lastbackup',0)>7*864e5)al.push(['ba','💾 Je laatste backup is ouder dan 7 dagen (of er is er nog geen). Exporteer er een in de tab Backup.']);
 {const ready=liquids.reduce((a,l)=>a+(l.ml||0),0),d=price.day;if(d>0){const days=ready/d,end=new Date(Date.now()+days*864e5),st=recSteep||7,start=new Date(end.getTime()-st*864e5),f=x=>x.toLocaleDateString('nl-BE',{day:'numeric',month:'short'});$('dRun').innerHTML=`Je hebt <b>${ready.toFixed(0)} ml</b> gemengde liquid: genoeg voor ±<b>${Math.floor(days)} dagen</b> (tot ${f(end)}). ${start<=Date.now()?'Start je volgende batch <b>nu</b>':'Start je volgende batch uiterlijk op <b>'+f(start)+'</b>'}, rekening houdend met ±${st} dagen steepen.`;if(days<st+3)al.push(['bw','⏳ Je liquid raakt binnenkort op: start een nieuwe batch.'])}else $('dRun').textContent='Vul je dagverbruik in om te zien hoelang je voorraad reikt.'}
 $('dAlerts').innerHTML=al.map(a=>`<div class="it"><span class="bg ${a[0]}" style="margin:0;font-size:.75rem">${a[1]}</span></div>`).join('')||'<p class="note">Alles in orde 🎉</p>';
 $('dSave').textContent=t?`Je hebt ongeveer €${(t/10*price.shop-c).toFixed(2)} bespaard ten opzichte van kant-en-klare liquid (${t} ml à €${price.shop}/10 ml). Dit is een schatting.`:'Mix een batch om je besparing te zien.';renderSave2();
}
const enc=r=>'ELAB1:'+btoa(unescape(encodeURIComponent(JSON.stringify({n:r.name,ml:r.targetMl,nic:r.targetNic,vg:r.targetVg,t:r.nicType,f:r.flavors.map(f=>[f.name,f.pct])}))));
function shareRecipe(i){$('shareCode').value=enc(saved[i]);$('shareCode').select();toast('📤 Deelcode staat klaar');try{if(navigator.share&&matchMedia('(pointer:coarse)').matches)navigator.share({title:saved[i].name,text:$('shareCode').value}).catch(()=>{})}catch{}}
function copyCode(){const v=$('shareCode').value;v?copy(v,'📋 Code gekopieerd'):toast('Geen code om te kopiëren')}
function importCode(){
 try{const v=$('shareCode').value.trim();if(!v.startsWith('ELAB1:'))throw 0;const d=JSON.parse(decodeURIComponent(escape(atob(v.slice(6)))));if(!d.n||!Array.isArray(d.f))throw 0;
  saved.push({id:Date.now(),name:String(d.n).slice(0,60),targetMl:+d.ml||60,targetNic:+d.nic||0,targetVg:+d.vg||70,nicType:d.t==='salts'?'salts':'freebase',flavors:d.f.slice(0,20).map(([n,q])=>({name:String(n).slice(0,60),pct:+q||0}))});
  sv();$('shareCode').value='';toast('✅ Recept geïmporteerd')}catch{toast('❌ Ongeldige deelcode')}}

function renderRecent(){$('recent').innerHTML=saved.map((r,i)=>[r,i]).sort((a,b)=>b[0].id-a[0].id).slice(0,4).map(([r,i])=>`<span class="chip" onclick="loadSaved(${i})">⚡ ${esc(r.name)}</span>`).join('')}
function drawBottle(){
 const c=calc(),seg=[[c.vgMl,'--ok'],[c.pgMl,'--ac'],[c.mixMl,'--tl'],[c.bMl,'--pk'],[c.flMl,'--am'],[c.nicMl,'--pu']],tot=seg.reduce((a,x)=>a+(x[0]||0),0)||1;let y=138;
 const rects=seg.map(([v,col])=>{const h=v/tot*96;y-=h;return`<rect x="20" y="${y.toFixed(1)}" width="80" height="${h.toFixed(1)}" style="fill:var(${col})"/>`}).join('');
 $('bottle').innerHTML=`<svg viewBox="0 0 120 150" width="150" style="filter:drop-shadow(0 8px 18px rgba(0,0,0,.35))"><defs><clipPath id="bc"><rect x="20" y="42" width="80" height="96" rx="14"/></clipPath></defs><rect x="46" y="14" width="28" height="30" rx="4" fill="none" stroke="var(--mu)" stroke-width="2"/><rect x="42" y="4" width="36" height="12" rx="4" style="fill:var(--ac)"/><g clip-path="url(#bc)"><rect x="20" y="42" width="80" height="96" fill="rgba(148,163,184,.12)"/>${rects}<rect x="26" y="42" width="8" height="96" fill="#fff" opacity=".18"/></g><rect x="20" y="42" width="80" height="96" rx="14" fill="none" stroke="var(--mu)" stroke-width="2"/><text x="60" y="96" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" style="paint-order:stroke;stroke:rgba(0,0,0,.55);stroke-width:3px">${c.ml} ml</text></svg>`}

/* Autocomplete */
const COMMON=['Capella - Sweet Strawberry','Capella - Vanilla Custard V2','Capella - Golden Pineapple','Capella - Juicy Peach','Capella - Double Apple','Capella - Blueberry Extra','Capella - Watermelon','Capella - Cool Mint','Capella - French Vanilla V2','Capella - Sugar Cookie V2','Capella - Raspberry','Capella - Lemon Sicily','TPA - Bavarian Cream','TPA - Peppermint','TPA - Vanilla Swirl','TPA - Strawberry Ripe','TPA - Marshmallow','TPA - Cheesecake Graham Crust','TPA - Banana Cream','TPA - Vanilla Bean Ice Cream','TPA - Menthol Arctic','Inawera - Custard'];
const acEl=$('ac');let acL=[],acI=0,acPick=null;
const acHide=()=>{acEl.style.display='none';acL=[]};
function acPaint(){acEl.innerHTML=acL.map((x,i)=>`<div class="${i===acI?'on':''}" data-i="${i}"><span>${esc(x.n)}</span><small>${esc(x.m||'')}</small></div>`).join('')}
function acSrc(t){
 if(t.closest?.('#flavors')&&t.type==='text'){const row=t.closest('.fr'),i=[...document.querySelectorAll('#flavors .fr')].indexOf(row),have=new Set(inventory.map(x=>x.name));
  return{items:[...inventory.map(x=>({n:x.name,m:`${x.rec?x.rec+'% · ':''}${x.ml} ml`})),...COMMON.filter(n=>!have.has(n)).map(n=>({n,m:'nieuw'}))],pick:n=>{t.value=n;updFlavor(i,'name',n)}}}
 if(t.id==='invName'){const have=new Set(inventory.map(x=>x.name));return{items:COMMON.filter(n=>!have.has(n)).map(n=>({n,m:'suggestie'})),pick:n=>{t.value=n}}}
 if(t.id==='recipeName')return{items:saved.map((r,i)=>({n:r.name,m:'📖 laden',i})),pick:(n,x)=>{applyR(saved[x.i])}};
 if(t.id==='steepName')return{items:[...saved.map(r=>({n:r.name,m:'recept'})),...presets.map(r=>({n:r.name,m:'idee'}))],pick:n=>{t.value=n}};
 return null}
function acRun(t){
 const src=acSrc(t);if(!src)return acHide();
 const q=t.value.toLowerCase().split(/\s+/).filter(Boolean);
 acL=src.items.map(it=>{const n=it.n.toLowerCase();let sc=0;for(const w of q){const p=n.indexOf(w);if(p<0)return null;sc+=p}return{...it,sc}}).filter(Boolean).sort((a,b)=>a.sc-b.sc).slice(0,8);
 if(!acL.length||(acL.length===1&&acL[0].n.toLowerCase()===t.value.trim().toLowerCase()))return acHide();
 const r=t.getBoundingClientRect();Object.assign(acEl.style,{display:'block',left:r.left+'px',top:r.bottom+4+'px',width:Math.max(r.width,250)+'px'});
 acI=0;acPick=src.pick;acPaint()}
const acChoose=i=>{const x=acL[i];if(!x)return;acPick(x.n,x);acHide()};
document.addEventListener('input',e=>acRun(e.target));
document.addEventListener('focusin',e=>{if(!e.target.value)acRun(e.target)});
document.addEventListener('focusout',()=>setTimeout(acHide,150));
document.addEventListener('scroll',acHide,true);
acEl.addEventListener('mousedown',e=>{e.preventDefault();const d=e.target.closest('[data-i]');if(d)acChoose(+d.dataset.i)});
document.addEventListener('keydown',e=>{
 if(acEl.style.display!=='block')return;
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();acI=(acI+(e.key==='ArrowDown'?1:-1)+acL.length)%acL.length;acPaint()}
 else if(e.key==='Enter'){e.preventDefault();acChoose(acI)}else if(e.key==='Escape')acHide()});

let bases=load('vape_bases',[{id:11,kind:'vg',name:'VG (glycerine)',ml:500},{id:12,kind:'pg',name:'PG (propyleenglycol)',ml:500},{id:13,kind:'mix',name:'Base 70VG/30PG',ml:250,vg:70},{id:14,kind:'nic',name:'Nic shot 20mg 50VG/50PG',ml:100,vg:50,mg:20,nt:'freebase'}]),bNt='freebase';
const KIND={vg:['🟢','Pure VG'],pg:['🔵','Pure PG'],mix:['🧪','Voorgemengd'],nic:['💜','Nicotine']},LOW={vg:100,pg:100,mix:100,nic:20};
['nicBaseMg','nicBaseVg'].forEach(id=>$(id).addEventListener('input',()=>{$('nicSel').value=''}));
function bKindUI(){const k=$('bKind').value;$('bVg').style.display=k==='mix'||k==='nic'?'':'none';$('bMg').style.display=k==='nic'?'':'none';$('bNt').style.display=k==='nic'?'':'none'}
function bSetNt(t){bNt=t;$('bnf').className=t==='freebase'?'fb':'';$('bns').className=t==='salts'?'salt':''}
function addBase(){
 const k=$('bKind').value,ml=parseFloat($('bMl').value)||0,vg=parseFloat($('bVg').value),mg=parseFloat($('bMg').value);let name=$('bName').value.trim();
 if((k==='mix'||k==='nic')&&!(vg>=0&&vg<=100))return toast('⚠️ Vul een VG-percentage in (0–100)');
 if(k==='nic'&&!(mg>0))return toast('⚠️ Vul de nicotinesterkte in (mg/ml)');
 if(!name)name=k==='nic'?`Nic ${mg}mg ${vg}VG/${100-vg}PG`:k==='mix'?`Base ${vg}VG/${100-vg}PG`:k==='vg'?'VG':'PG';
 bases.push({id:Date.now(),kind:k,name,ml,...(k==='mix'||k==='nic'?{vg}:{}),...(k==='nic'?{mg,nt:bNt}:{})});
 ['bName','bMl','bVg','bMg'].forEach(i=>$(i).value='');renderBases();toast('✅ Toegevoegd aan basisvoorraad')}
const updBase=(i,v)=>{bases[i].ml=parseFloat(v)||0;renderBases()};
const rmBase=i=>{undoPush('Basis verwijderd');bases.splice(i,1);renderBases()};
function renderBases(){
 store('vape_bases',bases);$('baseCount').textContent=`${bases.length} items`;
 const mx=Math.max(1,...bases.map(b=>b.ml));
 $('bases').innerHTML=bases.map((b,i)=>{
  const[ic,l]=KIND[b.kind],det=b.kind==='nic'?` · ${b.mg} mg/ml · ${b.vg}VG/${100-b.vg}PG · ${b.nt==='salts'?'salt':'freebase'}`:b.kind==='mix'?` · ${b.vg}VG/${100-b.vg}PG`:'',low=b.ml<=LOW[b.kind];
  return`<div class="it" style="flex-wrap:wrap"><div style="flex:1;min-width:0"><b style="font-size:.86rem">${ic} ${esc(b.name)}</b><div class="sub">${l}${det}</div><div class="bar" style="height:6px;margin:6px 0 0"><div style="width:${b.ml/mx*100}%;background:${low?'var(--no)':'var(--ok)'}"></div></div>${low?'<span class="bg bw">⚠️ Bijna op</span>':''}</div><div style="display:flex;align-items:center;gap:6px"><input type="number" value="${b.ml}" onchange="updBase(${i},this.value)" style="width:76px;text-align:center"><span class="sub">ml</span><button class="x" onclick="rmBase(${i})">✕</button></div></div>`}).join('')||'<p class="note">Nog geen basisvoorraad.</p>';
 const opt=(k,cur,first)=>`<option value="">${first}</option>`+bases.filter(b=>b.kind===k).map(b=>`<option value="${b.id}"${String(b.id)===cur?' selected':''}>${esc(b.name)} (${b.ml} ml)</option>`).join('');
 const ns=$('nicSel').value,ms=$('mixSel').value;$('nicSel').innerHTML=opt('nic',ns,'Handmatig (geen voorraad)');$('mixSel').innerHTML=opt('mix',ms,'Geen (pure VG/PG)');
 calculate()}
function pickNic(){const b=bases.find(x=>String(x.id)===$('nicSel').value);if(!b)return calculate();$('nicBaseMg').value=b.mg;$('nicBaseVg').value=b.vg;setNicType(b.nt||'freebase')}
function showAfter(){
 const c=calc(),p=[];
 [['vg',c.vgMl,'VG'],['pg',c.pgMl,'PG']].forEach(([k,v,l])=>{const s=bases.filter(b=>b.kind===k);if(s.length)p.push(`${l} ${Math.max(0,s.reduce((a,b)=>a+b.ml,0)-v).toFixed(0)} ml`)});
 const px=bases.find(b=>b.kind==='mix'&&String(b.id)===$('mixSel').value);if(px)p.push(`premix ${Math.max(0,px.ml-c.mixMl).toFixed(0)} ml`);
 const nb=bases.find(b=>b.kind==='nic'&&String(b.id)===$('nicSel').value);if(nb)p.push(`nic ${Math.max(0,nb.ml-c.nicMl).toFixed(0)} ml`);
 $('afterMix').innerHTML=p.length?`🧴 Voorraad na dit mengsel: ${p.join(' · ')}`:''}
function takeKind(kind,ml,label,miss){
 if(!bases.some(x=>x.kind===kind))return;let need=ml;
 for(const b of bases.filter(x=>x.kind===kind&&x.ml>0)){const t=Math.min(b.ml,need);b.ml=+(b.ml-t).toFixed(2);need-=t;if(need<=1e-9)break}
 if(need>.05)miss.push(`${label} (${need.toFixed(1)} ml tekort)`)}
function useBases(miss,ov){blend.forEach(x=>{const L=liq(x.id),q=ov&&ov.liq&&ov.liq[x.id]!=null?ov.liq[x.id]:x.ml;if(!L||!(q>0))return;if(L.ml<q)miss.push(`${L.name} (${(q-L.ml).toFixed(1)} ml tekort)`);L.ml=Math.max(0,+(L.ml-q).toFixed(2))});store('vape_liquids',liquids);
 const c=calc(),nb=bases.find(b=>b.kind==='nic'&&String(b.id)===$('nicSel').value),px=bases.find(b=>b.kind==='mix'&&String(b.id)===$('mixSel').value);if(ov){c.nicMl=ov.nic;c.mixMl=ov.mix;c.vgMl=ov.vg;c.pgMl=ov.pg}
 if(nb&&c.nicMl>0){const t=Math.min(nb.ml,c.nicMl);nb.ml=+(nb.ml-t).toFixed(2);if(c.nicMl-t>.05)miss.push(`${nb.name} (${(c.nicMl-t).toFixed(1)} ml tekort)`)}
 if(px&&c.mixMl>0)px.ml=Math.max(0,+(px.ml-c.mixMl).toFixed(2));
 takeKind('vg',c.vgMl,'VG',miss);takeKind('pg',c.pgMl,'PG',miss);renderBases()}

let liquids=load('vape_liquids',[{id:21,name:'Strawberry Bavarian Custard (voorbeeld)',ml:40,nic:3,vg:70,nt:'freebase',flavors:[{name:'Capella - Sweet Strawberry',pct:6},{name:'TPA - Bavarian Cream',pct:3}],note:'Voorbeeldliquid: pas aan of verwijder',date:today(),cpm:0.12}]),blend=[],editLiqId=null,lNt='freebase';
const liq=id=>liquids.find(l=>String(l.id)===String(id)),svLiq=()=>store('vape_liquids',liquids);
const parseFl=t=>t.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^(.*?)[,:;\s]+(\d+(?:[.,]\d+)?)\s*%?$/);return m?{name:m[1].trim(),pct:parseFloat(m[2].replace(',','.'))}:{name:x,pct:0}});
function aromaProfile(){const c=calc(),m={};blend.forEach(x=>{const L=liq(x.id);if(L&&x.ml>0)L.flavors.forEach(f=>{m[f.name]=(m[f.name]||0)+x.ml*f.pct/100})});flavors.forEach(f=>{if(f.name)m[f.name]=(m[f.name]||0)+c.ml*(+f.pct||0)/100});return Object.entries(m).map(([name,v])=>({name,pct:+(v/c.ml*100).toFixed(2)}))}
function lSetNt(t){lNt=t;$('lnf').className=t==='freebase'?'fb':'';$('lns').className=t==='salts'?'salt':''}
function renderBlend(){$('blend').innerHTML=blend.map((x,i)=>`<div class="fr"><select style="flex:2" onchange="setBlend(${i},'id',this.value)">${liquids.map(l=>`<option value="${l.id}"${String(l.id)===String(x.id)?' selected':''}>${esc(l.name)} (${l.ml} ml)</option>`).join('')}</select><input type="number" value="${x.ml}" min="0" step="1" oninput="setBlend(${i},'ml',parseFloat(this.value)||0)"><span class="sub">ml</span><button class="x" onclick="rmBlend(${i})">✕</button></div>`).join('')||'<p class="note">Nog geen liquids toegevoegd.</p>'}
function addBlend(){if(!liquids.length)return toast('⚠️ Voeg eerst liquids toe in de tab Liquids');blend.push({id:liquids[0].id,ml:10});renderBlend();calculate()}
const setBlend=(i,k,v)=>{blend[i][k]=k==='id'?+v:v;calculate()};
const rmBlend=i=>{blend.splice(i,1);renderBlend();calculate()};
function renderLiquids(){
 const q=($('lq').value||'').toLowerCase();$('liqCount').textContent=`${liquids.length} liquids · ${liquids.reduce((a,l)=>a+l.ml,0).toFixed(0)} ml`;
 $('liqs').innerHTML=liquids.map((l,i)=>[l,i]).filter(([l])=>!q||(l.name+' '+l.flavors.map(f=>f.name).join(' ')).toLowerCase().includes(q)).map(([l,i])=>`<div class="it" style="flex-wrap:wrap"><div style="flex:1;min-width:0"><b style="font-size:.88rem">${esc(l.name)}</b><div class="sub">${l.kind?(l.kind==='short'?'🧴 Shortfill ':'🧪 Longfill ')+l.ml+'/'+(l.bottle||l.ml)+' ml · ':''}${l.nic} mg/ml · ${l.vg}VG/${100-l.vg}PG · ${l.nt==='salts'?'salt':'freebase'} · ${esc(l.date||'')}</div><div class="sub" style="color:var(--am)">${l.flavors.map(f=>`${esc(f.name)} ${f.pct}%`).join(' · ')||"geen aroma's"}</div>${l.note?`<div class="sub">📝 ${esc(l.note)}</div>`:''}</div><div style="display:flex;align-items:center;gap:6px"><input type="number" value="${l.ml}" onchange="updLiq(${i},this.value)" style="width:76px;text-align:center"><span class="sub">ml</span></div><div style="flex-basis:100%;display:flex;gap:6px;margin-top:8px"><button class="b2 sm" style="flex:1" onclick="liqToRecipe(${i})">✏️ Laden als recept</button><button class="b2 sm" style="flex:1" onclick="liqToBlend(${i})">🍶 In mix</button><button class="b2 sm" onclick="liqEdit(${i})">⚙️</button><button class="x" onclick="rmLiq(${i})">✕</button></div></div>`).join('')||'<p class="note">Geen liquids gevonden.</p>'}
const updLiq=(i,v)=>{liquids[i].ml=parseFloat(v)||0;svLiq();renderLiquids();renderBlend();calculate()};
function rmLiq(i){undoPush('Liquid verwijderd');const id=liquids[i].id;liquids.splice(i,1);blend=blend.filter(b=>String(b.id)!==String(id));svLiq();renderLiquids();renderBlend();calculate()}
function liqToRecipe(i){const l=liquids[i];applyR({name:l.name+' v2',targetMl:l.ml||60,targetNic:l.nic,targetVg:l.vg,nicType:l.nt,flavors:structuredClone(l.flavors),blend:[]});toast('✏️ Liquid geladen als nieuw recept')}
function liqToBlend(i){const l=liquids[i];blend.push({id:l.id,ml:Math.min(l.ml,20)||10});renderBlend();calculate();switchTab('calc');toast(`🍶 ${l.name} toegevoegd aan de mix`)}
function liqFromRecipe(){const c=calc();$('lName2').value=$('recipeName').value;$('lMl').value=c.ml;$('lNic').value=c.nic;$('lVg').value=c.vg;lSetNt(nicType);$('lFl').value=aromaProfile().map(f=>`${f.name}, ${f.pct}`).join('\n')}
function liqEdit(i){const l=liquids[i];editLiqId=l.id;$('lName2').value=l.name;$('lMl').value=l.ml;$('lNic').value=l.nic;$('lVg').value=l.vg;lSetNt(l.nt||'freebase');$('lFl').value=l.flavors.map(f=>`${f.name}, ${f.pct}`).join('\n');$('lNote').value=l.note||'';$('lAdd').textContent='💾 Wijzigingen opslaan';scrollTo({top:0,behavior:'smooth'})}
function addLiquid(){
 const name=$('lName2').value.trim();if(!name)return toast('⚠️ Geef de liquid een naam');
 const o={name,ml:parseFloat($('lMl').value)||0,nic:parseFloat($('lNic').value)||0,vg:Math.min(100,Math.max(0,parseFloat($('lVg').value)||0)),nt:lNt,flavors:parseFl($('lFl').value),note:$('lNote').value.trim()};
 if(editLiqId){const l=liq(editLiqId);if(l)Object.assign(l,o)}else liquids.unshift({id:Date.now(),date:today(),cpm:0,...o});
 editLiqId=null;['lName2','lMl','lFl','lNote'].forEach(i=>$(i).value='');$('lNic').value=0;$('lVg').value=70;$('lAdd').textContent='+ Toevoegen aan database';
 svLiq();renderLiquids();renderBlend();calculate();toast('✅ Opgeslagen in database')}
function addLiquidFromBatch(){const ml=num('targetMl');liquids.unshift({id:Date.now()+2,name:$('recipeName').value||'Batch',ml,nic:num('targetNic'),vg:num('targetVg'),nt:nicType,flavors:aromaProfile(),note:'',date:today(),cpm:ml?lastCost/ml:0});svLiq();renderLiquids();renderBlend()}

let bottles=load('vape_bottles',[]);
const f1=v=>isFinite(v)?v.toFixed(1):'–';
function renderBottle(){
 const keep=id=>$(id).value;const p=keep('fPre'),sr=keep('fSrc'),lq=keep('fLiq');
 $('fPre').innerHTML='<option value="">Nieuw / handmatig</option>'+bottles.map(b=>`<option value="${b.id}"${String(b.id)===p?' selected':''}>${esc(b.name)}</option>`).join('');
 $('fSrc').innerHTML='<option value="man">VG % handmatig</option><option value="rec">Huidig recept</option>'+liquids.map(l=>`<option value="L${l.id}"${'L'+l.id===sr?' selected':''}>${esc(l.name)}</option>`).join('');
 if(sr&&[...$('fSrc').options].some(o=>o.value===sr))$('fSrc').value=sr;
 $('fLiq').innerHTML='<option value="">Kies liquid...</option>'+liquids.map(l=>`<option value="${l.id}"${String(l.id)===lq?' selected':''}>${esc(l.name)} (${l.ml} ml)</option>`).join('');
 fCalc()}
function fSave(){
 const name=$('fName').value.trim()||($('fPre').selectedOptions[0]?.text);if(!name||$('fPre').value===''&&!$('fName').value.trim())return toast('⚠️ Geef het flesje een naam');
 const o={name,C:num('fC'),W:num('fW'),B:num('fB'),T:num('fT'),Mx:num('fMax'),Kv:num('fKv'),Kh:num('fKh')},ex=bottles.find(b=>String(b.id)===$('fPre').value&&b.name===name);
 if(ex)Object.assign(ex,o);else bottles.push({id:Date.now(),...o});
 store('vape_bottles',bottles);renderBottle();toast('✅ Flesje opgeslagen')}
function fLoad(){const b=bottles.find(x=>String(x.id)===$('fPre').value);if(!b)return;$('fName').value=b.name;$('fC').value=b.C||'';$('fD').value=b.C?(b.C/Math.PI).toFixed(1):'';$('fW').value=b.W;$('fB').value=b.B;$('fT').value=b.T||'';$('fMax').value=b.Mx||'';$('fKv').value=b.Kv||'';$('fKh').value=b.Kh||'';fCalc()}
function fDel(){const i=bottles.findIndex(x=>String(x.id)===$('fPre').value);if(i<0)return toast('Kies eerst een opgeslagen flesje');undoPush('Flesje verwijderd');bottles.splice(i,1);store('vape_bottles',bottles);renderBottle()}
function fVgPct(){const sr=$('fSrc').value;let vg=num('fVg',70);if(sr==='rec')vg=num('targetVg');else if(sr.startsWith('L')){const l=liq(sr.slice(1));if(l)vg=l.vg}$('fVg').value=vg;$('fVg').disabled=sr!=='man';return vg}
let fEst=0;
function fCalc(){
 const C=num('fC'),H=num('fH'),W=num('fW'),B=num('fB'),G=num('fG'),T=num('fT'),Kv=num('fKv'),Kh=num('fKh'),Mx=num('fMax'),Tg=num('fTarget'),Pv=num('fPrev');
 const vg=fVgPct(),dens=vg/100*D.VG+(1-vg/100)*D.PG,he=Math.max(0,H-B),ri=Math.max(0,C/(2*Math.PI)-W),m=[];
 if(C>0&&H>0)m.push(['📐 Geometrie (cilinder)',Math.PI*ri*ri*he/1000]);
 if(Kv>0&&Kh>B&&H>0)m.push(['🎯 Kalibratie (lineair)',Kv*he/(Kh-B)]);
 if(G>0&&T>0&&G>T)m.push(['⚖️ Gewicht (netto ÷ dichtheid)',(G-T)/dens]);
 const vals=m.map(x=>x[1]),est=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;fEst=est;
 const spread=vals.length>1?(Math.max(...vals)-Math.min(...vals))/est:0,pi=Math.PI*ri*ri/1000;
 $('fStats').innerHTML=[[est?f1(est)+' ml':'–','geschat'],[est?f1(est*dens)+' g':'–','netto'],[dens.toFixed(3),'g/ml'],[pi?pi.toFixed(2):'–','ml per mm']].map(([v,l])=>`<div class="st"><b>${v}</b><span>${l}</span></div>`).join('');
 let h=m.map(([l,v])=>`<div class="rr"><span>${l}</span><span class="rv">${f1(v)} ml</span></div>`).join('')||'<p class="note" style="padding-top:8px">Vul omtrek + hoogte, een kalibratie of bruto- en leeggewicht in.</p>';
 if(est&&Mx>0)h+=`<div class="rr"><span>Vulling</span><span class="rv">${Math.min(100,est/Mx*100).toFixed(0)}% van ${Mx} ml</span></div><div class="rr"><span>Ruimte over</span><span class="rv">${f1(Math.max(0,Mx-est))} ml</span></div>`;
 if(est&&Tg>est){const add=Tg-est;h+=`<div class="rr"><span>Aanvullen tot ${Tg} ml</span><span class="rv" style="color:var(--ok)">+${f1(add)} ml / ${f1(add*dens)} g</span></div>`;if(G>0)h+=`<div class="rr"><span>Wegen tot brutogewicht</span><span class="rv">${(G+add*dens).toFixed(2)} g</span></div>`}
 if(Pv>G&&G>0)h+=`<div class="rr"><span>Verbruikt sinds vorige weging</span><span class="rv">${f1((Pv-G)/dens)} ml / ${(Pv-G).toFixed(2)} g</span></div>`;
 $('fRes').innerHTML=h;fTable(ri,Mx,B);
 const w=[];if(spread>.1)w.push(`⚠️ De methodes wijken ${(spread*100).toFixed(0)}% van elkaar af: controleer glasdikte, bodemdikte, tarra en of het flesje cilindrisch is. Kalibreren helpt.`);
 if(Mx>0&&est>Mx*1.02)w.push('⚠️ Het geschatte volume is groter dan het maximum van het flesje.');
 $('fWarn').innerHTML=w.map(x=>`<div>${x}</div>`).join('');
 const fr=Mx>0&&est?Math.min(1,est/Mx):null;
 $('fViz').innerHTML=fr==null?'':`<svg viewBox="0 0 80 130" width="90" style="margin-bottom:10px;filter:drop-shadow(0 8px 16px rgba(0,0,0,.3))"><defs><clipPath id="fc"><rect x="12" y="34" width="56" height="90" rx="10"/></clipPath></defs><rect x="30" y="8" width="20" height="28" rx="3" fill="none" stroke="var(--mu)" stroke-width="2"/><rect x="28" y="2" width="24" height="9" rx="3" style="fill:var(--ac)"/><g clip-path="url(#fc)"><rect x="12" y="${124-90*fr}" width="56" height="${90*fr}" style="fill:var(--pk)" opacity=".85"/></g><rect x="12" y="34" width="56" height="90" rx="10" fill="none" stroke="var(--mu)" stroke-width="2"/><text x="40" y="84" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" style="paint-order:stroke;stroke:rgba(0,0,0,.55);stroke-width:3px">${f1(est)} ml</text></svg>`}
function fSync(){const l=liq($('fLiq').value);if(!l)return toast('⚠️ Kies eerst een liquid');if(!fEst)return toast('⚠️ Er is nog geen schatting');l.ml=+fEst.toFixed(1);svLiq();renderLiquids();renderBlend();renderBottle();calculate();toast(`💾 ${l.name}: ${l.ml} ml opgeslagen`)}

let gemImg=null,lraf=0;
const TT={art:'DIY E-LIQUID LAB',tech:'** DIY LAB TECH **',vintage:'~ APOTHECARY DIY ~',inverted:'DIY E-LIQUID LAB',grid:'[ DIY LAB SPECIFICATION ]',standard:'PREMIUM DIY LAB'},B4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const CRC=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return b=>{let c=-1;for(const v of b)c=t[(c^v)&255]^(c>>>8);return(c^-1)>>>0}})();
async function pngDpi(blob){const u=new Uint8Array(await blob.arrayBuffer()),ch=new Uint8Array(21),dv=new DataView(ch.buffer);dv.setUint32(0,9);ch.set([112,72,89,115],4);dv.setUint32(8,11811);dv.setUint32(12,11811);ch[16]=1;dv.setUint32(17,CRC(ch.subarray(4,17)));const o=new Uint8Array(u.length+21);o.set(u.subarray(0,33));o.set(ch,33);o.set(u.subarray(33),54);return new Blob([o],{type:'image/png'})}
function labelSpec(){const z=$('lblSize').value;let mw,mh;if(z==='custom'){mw=Math.min(200,Math.max(10,num('lblW',50)));mh=Math.min(200,Math.max(10,num('lblH',50)))}else[mw,mh]=z.split('x').map(Number);return{mw,mh,W:Math.round(mw/25.4*300),H:Math.round(mh/25.4*300)}}
function post(cv,mode){
 if(mode==='color')return cv;const x=cv.getContext('2d'),d=x.getImageData(0,0,cv.width,cv.height),a=d.data,W=cv.width;
 for(let i=0;i<a.length;i+=4){let l=.299*a[i]+.587*a[i+1]+.114*a[i+2];if(mode==='bw'){const p=i>>2,t=(B4[((Math.floor(p/W)&3)<<2)+((p%W)&3)]+.5)/16*255;l=l>t?255:0}a[i]=a[i+1]=a[i+2]=l}
 x.putImageData(d,0,0);return cv}
function drawLabel(W,H,mode){
 const th=$('bgTheme').value,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
 if(gemImg){const k=Math.max(W/gemImg.width,H/gemImg.height),dw=gemImg.width*k,dh=gemImg.height*k;x.fillStyle='#fff';x.fillRect(0,0,W,H);x.drawImage(gemImg,(W-dw)/2,(H-dh)/2,dw,dh);return post(cv,mode)}
 const s=Math.min(W,H)/600*(H<W?1.3:1),m=Math.round(Math.min(W,H)*.045),c=calc(),art=th==='art',pr=blend.length?aromaProfile():flavors.filter(f=>f.name).map(f=>({name:f.name,pct:f.pct}));
 const nic=num('targetNic'),pct=(nic/10).toLocaleString('nl-BE',{maximumFractionDigits:2}),name=($('recipeName').value||'Custom DIY').toUpperCase(),o=$('lblOwner').value.trim(),bt=$('lblBatch').value.trim(),warn=$('lblWarn').checked&&nic>0&&H>=300;
 if(art)x.drawImage(bgSource(W,H),0,0);else{x.fillStyle='#fff';x.fillRect(0,0,W,H)}
 x.strokeStyle='#000';x.textBaseline='alphabetic';
 const F=px=>{x.font=`bold ${Math.max(8,Math.round(px*s))}px "Courier New",monospace`};
 const T=(t,px,y,al='center',col='#000')=>{F(px);x.fillStyle=col;x.textAlign=al;x.fillText(t,al==='left'?m*1.7:al==='right'?W-m*1.7:W/2,y)};
 const fit=(t,px,mw)=>{let p=px;F(p);while(p>10&&x.measureText(t).width>mw){p--;F(p)}return p};
 const panel=(y,h,fill)=>{x.fillStyle=fill||(art?'rgba(255,255,255,.9)':'#fff');x.beginPath();x.roundRect(m,y,W-2*m,Math.max(4,h),art?14*s:0);x.fill();x.lineWidth=3*s;x.stroke()};
 if(!art){x.lineWidth=(th==='grid'?4:6)*s;x.strokeRect(m/2,m/2,W-m,H-m);if(th==='vintage'){x.lineWidth=2*s;x.strokeRect(m,m,W-2*m,H-2*m)}}
 let y=Math.round(m*1.1);const hh=118*s,hc=th==='inverted'?'#fff':'#000';
 panel(y,hh,th==='inverted'?'#000':null);T(TT[th],19,y+34*s,'center',hc);T(name,fit(name,34,W-4*m),y+86*s,'center',hc);
 const wh=warn?64*s:0,fh=(o||bt?88:58)*s,wy=H-Math.round(m*1.1)-wh,fy=(warn?wy-8*s:H-Math.round(m*1.1))-fh,my=y+hh+8*s;
 panel(my,fy-8*s-my);let yy=my+42*s;
 T(nic>0?`${nic} MG/ML  (${pct}%)`:'NICOTINEVRIJ 0 MG/ML',30,yy);yy+=32*s;
 T(`${c.vg}VG / ${c.pg}PG  |  ${c.ml} ML  |  ${nicType==='salts'?'NIC SALT':'FREEBASE'}`,16,yy);yy+=14*s;
 x.lineWidth=2*s;x.beginPath();x.moveTo(m*1.7,yy);x.lineTo(W-m*1.7,yy);x.stroke();yy+=26*s;
 pr.forEach(f=>{if(yy>fy-18*s)return;T('• '+f.name,15,yy,'left');T(f.pct+'%',15,yy,'right');yy+=24*s});
 panel(fy,fh);T(`DATUM ${today()}  |  STEEP ${$('lblSteep').value||0}D`,15,fy+34*s);
 if(o||bt)T([o&&'VOOR: '+o.toUpperCase(),bt&&bt.toUpperCase()].filter(Boolean).join('  |  '),13,fy+66*s);
 if(warn){
  x.fillStyle='#000';x.fillRect(m,wy,W-2*m,wh);const tx=m+14*s,ty=wy+wh/2;
  x.fillStyle='#fff';x.beginPath();x.moveTo(tx+19*s,ty-20*s);x.lineTo(tx+39*s,ty+16*s);x.lineTo(tx-1*s,ty+16*s);x.closePath();x.fill();
  x.fillStyle='#000';x.fillRect(tx+17*s,ty-8*s,4*s,15*s);x.fillRect(tx+17*s,ty+9*s,4*s,4*s);
  x.fillStyle='#fff';x.textAlign='left';const lw=W-2*m-62*s;
  [['BEVAT NICOTINE - ZEER VERSLAVEND',.4],['18+  -  BUITEN BEREIK VAN KINDEREN',.8]].forEach(([t,f])=>{F(fit(t,14,lw));x.fillText(t,m+54*s,wy+wh*f)})}
 return post(cv,mode)}
function renderLabel(){
 const sp=labelSpec(),cv=$('lblCanvas'),src=drawLabel(sp.W,sp.H,$('lblMode').value);
 $('lblCust').style.display=$('lblSize').value==='custom'?'':'none';
 cv.width=sp.W;cv.height=sp.H;cv.getContext('2d').drawImage(src,0,0);cv.style.width=Math.min(sp.W*.7,560)+'px';
 const rt=gemImg?Math.abs(gemImg.width/gemImg.height/(sp.mw/sp.mh)-1):0;
 $('lblInfo').textContent=`${sp.mw} × ${sp.mh} mm · ${sp.W} × ${sp.H} px (300 dpi)`+(gemImg?(rt>.05?' · geïmporteerd etiket wordt bijgesneden: vraag Gemini om exact deze verhouding':' · geïmporteerd etiket'):'');
 $('gPrompt').value=gemPrompt()}
function updateLabel(){if(!$('tab-saved').classList.contains('on'))return;cancelAnimationFrame(lraf);lraf=requestAnimationFrame(renderLabel)}
function gemPrompt(){
 const{mw,mh,W,H}=labelSpec(),c=calc(),pr=blend.length?aromaProfile():flavors.filter(f=>f.name).map(f=>({name:f.name,pct:f.pct})),nic=num('targetNic'),pct=(nic/10).toLocaleString('nl-BE',{maximumFractionDigits:2});
 const name=$('recipeName').value||'Custom DIY',o=$('lblOwner').value.trim(),bt=$('lblBatch').value.trim(),warn=$('lblWarn').checked&&nic>0,full=$('gMode').value==='full',st=$('gArt').value;
 const tn={tobacco:'tabak, rook en hout',fruit:'sappig fruit en bessen',cream:'romige custard, room en vanille',frost:'ijs, menthol en frisse kristallen',drinks:'drankjes, koffiebonen en bubbels',toxic:'futuristische laboratoriumsfeer'}[artThemes()[0]];
 const names=pr.map(f=>f.name.replace(/^[\w.]+\s*-\s*/,'')).join(', ')||'zoete smaken',or=mw>mh?'liggend':mw<mh?'staand':'vierkant';
 const dim=[`- Fysiek formaat: ${mw} x ${mh} mm (${or}), beeldverhouding ${mw}:${mh}.`,`- Resolutie: ${W} x ${H} pixels (300 dpi). Lever exact deze verhouding, zonder witte rand, zonder mockup, zonder flesje en zonder schaduw.`];
 const kl=['- Uitsluitend grijstinten (zwart, wit en grijs), geen enkele kleur.','- Hoog contrast, geschikt voor een zwart-wit of thermische etikettenprinter. Gebruik duidelijke vlakken en lijnen en vermijd zeer fijne verlopen.'];
 const beeld=`- Maak een originele ${st} in grijstinten die past bij de smaak (${tn}; aroma's: ${names}).`;
 const tekst=[`- Naam (groot): ${name}`,nic>0?`- Nicotine (zeer prominent): ${nic} mg/ml (${pct}% nicotine), type ${nicType==='salts'?'nic salt':'freebase'}`:'- Nicotinevrij: 0 mg/ml',`- Verhouding: ${c.vg}VG / ${c.pg}PG`,`- Inhoud: ${c.ml} ml`,`- Aroma's: ${pr.map(f=>`${f.name} ${f.pct}%`).join(', ')||'geen'}`,`- Steep: ${$('lblSteep').value||0} dagen`,`- Datum: ${today()}`];
 if(o)tekst.push('- Voor: '+o);if(bt)tekst.push('- Batch: '+bt);
 if(warn)tekst.push('- Waarschuwing in een zwart vlak onderaan, met een wit gevarendriehoekje met uitroepteken: "Bevat nicotine. Zeer verslavend. Niet voor personen onder 18. Buiten bereik van kinderen."');
 if(!full)return['Maak een achtergrondafbeelding voor een etiket van een zelfgemaakt e-liquid flesje. Lever een enkele PNG.','','AFMETINGEN',...dim,'','KLEUR',...kl,'','BEELD',beeld,'- Houd het midden van het beeld rustig en laag in contrast (ruim 60% van het oppervlak), zodat daar later tekst overheen kan.','- GEEN tekst, GEEN letters, GEEN cijfers, geen logo\'s, geen personen en geen merknamen in het beeld.'].join('\n');
 return['Ontwerp een etiket voor een zelfgemaakt e-liquid flesje en lever het als een enkele PNG.','','AFMETINGEN',...dim,'- Houd 2 mm (ca. '+Math.round(2/25.4*300)+' px) veilige marge vrij van tekst.','','KLEUR',...kl,'','TEKST (letterlijk overnemen, niets toevoegen of verzinnen, elk cijfer controleren)',...tekst,'','BEELD',beeld,'- Gebruik het beeld als achtergrond of in een afgebakend vlak zodat alle tekst goed leesbaar blijft (donkere tekst op lichte vlakken of omgekeerd).','- Geen merklogo\'s, geen echte merknamen, geen personen en geen extra tekst in het beeld.','','LAYOUT','- Bovenaan de naam, daaronder de nicotinesterkte groot met het percentage, in het midden de aroma\'s, onderaan inhoud, VG/PG, datum en steep'+(warn?', en helemaal onderaan de waarschuwing.':'.'),'- Minimale tekstgrootte ca. 6 pt (ca. 25 px bij 300 dpi).','','Controleer ten slotte of alle tekst en cijfers exact overeenkomen met de gegevens hierboven.'].join('\n')}
function copyPrompt(){copy($('gPrompt').value,'📋 Instructie gekopieerd')}
function loadGem(e){const f=e.target.files[0];if(!f)return;const i=new Image(),r=new FileReader();i.onload=()=>{gemImg=i;updateLabel();toast('📥 Etiket geïmporteerd')};r.onload=()=>{i.src=r.result};r.readAsDataURL(f)}
const clearGem=()=>{gemImg=null;updateLabel();toast('Import verwijderd')};
function exportCanvas(cv,name){cv.toBlob(async b=>{if(!b)return toast('❌ Afbeelding maken mislukt');b=await pngDpi(b).catch(()=>b);if(typeof saveFile==='function')saveFile(name,b);else outFile(name,b)},'image/png')}
function downloadPNG(){bump('labels');const sp=labelSpec();exportCanvas(drawLabel(sp.W,sp.H,$('lblMode').value),`label_${($('recipeName').value||'liquid').replace(/\W+/g,'_')}_${sp.mw}x${sp.mh}mm.png`)}
async function printLabel(){
 const sp=labelSpec(),u=drawLabel(sp.W,sp.H,$('lblMode').value).toDataURL('image/png');
 let st=$('pgStyle');if(!st){st=document.createElement('style');st.id='pgStyle';document.head.appendChild(st)}
 st.textContent=`@page{size:${sp.mw}mm ${sp.mh}mm;margin:0}`;
 let pa=$('pa');if(!pa){pa=document.createElement('div');pa.id='pa';document.body.appendChild(pa)}
 pa.innerHTML=`<img src="${u}" style="width:${sp.mw}mm;height:${sp.mh}mm;display:block">`;
 await pa.firstChild.decode().catch(()=>{});
 try{window.print()}catch{toast('⚠️ Printen is hier niet beschikbaar: download de PNG en print die op 100%')}}

/* ===== v3.9 extra's ===== */
function markBackup(){store('vape_lastbackup',Date.now())}
let instEv=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();instEv=e;['inst','inst2'].forEach(i=>{const b=$(i);if(b)b.style.display=''})});
addEventListener('appinstalled',()=>{instEv=null;['inst','inst2'].forEach(i=>{const b=$(i);if(b)b.style.display='none'});toast('✅ App geïnstalleerd')});
async function doInstall(){if(!instEv)return toast('Gebruik het browsermenu: Toevoegen aan startscherm');instEv.prompt();try{await instEv.userChoice}catch{}instEv=null;['inst','inst2'].forEach(i=>{const b=$(i);if(b)b.style.display='none'})}
async function outFile(name,blob){
 try{const f=new File([blob],name,{type:blob.type});if(navigator.canShare?.({files:[f]})&&matchMedia('(pointer:coarse)').matches){await navigator.share({files:[f],title:name});return}}catch(e){if(e&&e.name==='AbortError')return}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}

/* Verras me */
const ADJ=['Gouden','Mistige','Elektrische','Stille','Wilde','Zijden','Arctische','Zonnige','Fluwelen','Nachtelijke','Zachte','Gloeiende'],NOUN=['Dageraad','Wolk','Droom','Storm','Zomer','Fluistering','Cascade','Echo','Oase','Nevel','Symfonie','Rimpeling'];
let lastSur=null;
const pick=a=>a[Math.floor(Math.random()*a.length)],short=n=>String(n).replace(/^[\w.]+\s*-\s*/,'');
function surprise(){bump('dice');
 const pool=inventory.filter(i=>i.ml>=3);if(pool.length<2)return $('surpr').innerHTML='<p class="note">Voeg minstens twee aroma\'s met voorraad toe in de tab Voorraad.</p>';
 const k=Math.min(pool.length,2+Math.floor(Math.random()*3)),ch=[...pool].sort(()=>Math.random()-.5).slice(0,k);
 let fl=ch.map(L=>({name:L.name,pct:L.rec||3,L}));const tot=fl.reduce((a,f)=>a+f.pct,0);if(tot>14)fl.forEach(f=>f.pct=f.pct*14/tot);
 fl=fl.map(f=>({name:f.name,pct:Math.max(.5,Math.round(f.pct*2)/2),L:f.L}));
 const vg=pick([50,60,70,80]),st=Math.max(0,...fl.map(f=>f.L.steep||0)),name=`${pick(ADJ)} ${pick(NOUN)}`;
 lastSur={name,targetMl:num('targetMl',60),targetNic:num('targetNic'),targetVg:vg,nicType,flavors:fl.map(f=>({name:f.name,pct:f.pct})),blend:[]};
 $('surpr').innerHTML=`<div class="it" style="flex-direction:column;align-items:stretch;gap:6px"><b style="font-size:.95rem">✨ ${esc(name)}</b><div class="sub">${vg}VG / ${100-vg}PG · ${fl.reduce((a,f)=>a+f.pct,0)}% aroma${st?` · steep ±${st} dagen`:''}</div><div class="sub" style="color:var(--am)">${fl.map(f=>`${esc(short(f.name))} ${f.pct}%`).join(' · ')}</div><div class="g2" style="margin-top:6px"><button class="b2" onclick="surprise()">🎲 Opnieuw</button><button class="b1" onclick="applyR(lastSur)">✏️ Laad in calculator</button></div></div>`}

/* Receptvergelijker */
function recCost(r){
 const ml=r.targetMl||60,bm=num('nicBaseMg',20)||20,nicMl=ml*(r.targetNic||0)/bm,flMl=r.flavors.reduce((a,f)=>a+ml*(+f.pct||0)/100,0),rest=Math.max(0,ml-nicMl-flMl),v=(r.targetVg||0)/100;
 let c=nicMl*price.nic/10+rest*(v*price.vg+(1-v)*price.pg)/1000;
 r.flavors.forEach(f=>{const L=findInv(f.name);c+=ml*(+f.pct||0)/100*(L&&L.price&&L.size?L.price/L.size:P.fl)});return c}
function renderCmp(){
 const o=saved.map((r,i)=>`<option value="${i}">${esc(r.name)}</option>`).join('');
 [['cmpA',0],['cmpB',1]].forEach(([id,d])=>{const e=$(id),v=e.value;e.innerHTML=o;e.value=v!==''&&saved[v]?v:String(Math.min(d,saved.length-1))});
 const a=saved[+$('cmpA').value],b=saved[+$('cmpB').value];if(!a||!b||saved.length<2){$('cmpOut').innerHTML='<p class="note">Sla minstens twee recepten op om ze te vergelijken.</p>';return}
 const sum=r=>r.flavors.reduce((x,f)=>x+(+f.pct||0),0),ca=recCost(a),cb=recCost(b),ra=[],names=[...new Set([...a.flavors,...b.flavors].map(f=>f.name).filter(Boolean))];
 const row=(l,x,y,d)=>`<div class="rr"><span>${l}</span><span class="rv">${x} <small style="color:var(--mu)">→</small> ${y}${d?` <small style="color:${d>0?'var(--am)':'var(--ac)'}">${d>0?'+':''}${+d.toFixed(2)}</small>`:''}</span></div>`;
 const g=(r,n)=>(r.flavors.find(f=>f.name===n)||{pct:0}).pct;
 $('cmpOut').innerHTML=`<div class="rc">${row('Nicotine (mg)',a.targetNic,b.targetNic,b.targetNic-a.targetNic)}${row('VG %',a.targetVg,b.targetVg,b.targetVg-a.targetVg)}${row('Volume (ml)',a.targetMl,b.targetMl,b.targetMl-a.targetMl)}${row('Aroma totaal %',+sum(a).toFixed(1),+sum(b).toFixed(1),sum(b)-sum(a))}${row('≈ € per ml',ca/(a.targetMl||1)>0?(ca/a.targetMl).toFixed(3):'0',cb/(b.targetMl||1)>0?(cb/b.targetMl).toFixed(3):'0',cb/b.targetMl-ca/a.targetMl)}${names.map(n=>row(esc(short(n)),g(a,n)+'%',g(b,n)+'%',g(b,n)-g(a,n))).join('')}</div><div class="g2" style="margin-top:10px"><button class="b2" onclick="loadSaved(+$('cmpA').value)">✏️ Laad A</button><button class="b2" onclick="loadSaved(+$('cmpB').value)">✏️ Laad B</button></div>`}

/* ===== v4.0: radar, matcher, lab-modus, prestaties, wrapped ===== */
let labOpen=false,wrOpen=false,wrI=0,wrTimer=0,wrRaf=0,wrData=null;
const cnt=load('vape_cnt',{}),badgeSt=load('vape_badges',{});
function bump(k){cnt[k]=(cnt[k]||0)+1;store('vape_cnt',cnt);checkBadges()}

/* Confetti + geluid */
let cfP=[],cfRaf=0;
function confetti(n=140){
 try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return}catch{}
 const cv=$('cf');cv.width=innerWidth;cv.height=innerHeight;const cols=['#22d3ee','#c084fc','#fbbf24','#34d399','#fb7185','#f472b6'];
 for(let i=0;i<n;i++)cfP.push({x:innerWidth/2+(Math.random()-.5)*innerWidth*.3,y:innerHeight*.45,vx:(Math.random()-.5)*14,vy:-Math.random()*16-4,r:Math.random()*7+5,c:cols[i%cols.length],a:Math.random()*6,va:(Math.random()-.5)*.4,l:1});
 if(!cfRaf)cfRaf=requestAnimationFrame(cfStep)}
function cfStep(){
 const cv=$('cf'),x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);cfP=cfP.filter(p=>p.l>0&&p.y<cv.height+30);
 cfP.forEach(p=>{p.vy+=.45;p.vx*=.992;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;p.l-=.007;x.save();x.globalAlpha=Math.max(0,Math.min(1,p.l*1.6));x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/3,p.r,p.r*.6);x.restore()});
 cfRaf=cfP.length?requestAnimationFrame(cfStep):0;if(!cfP.length)x.clearRect(0,0,cv.width,cv.height)}
function beep(){try{const a=new(window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=880;g.gain.setValueAtTime(.2,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.6);o.start();o.stop(a.currentTime+.6)}catch{}}

/* Smaakcategorieën */
const CATS=[['fruit','Fruit','🍓'],['romig','Romig','🍦'],['bakkerij','Bakkerij','🥐'],['zoet','Zoet','🍬'],['fris','Fris','🧊'],['tabak','Tabak','🍂'],['drank','Drank','☕']],CN=Object.fromEntries(CATS.map(([k,n])=>[k,n]));
const KWS=Object.fromEntries(Object.entries({
 fruit:'strawberry,blueberry,raspberry,blackberry,cranberry,watermelon,pineapple,berry,berries,fruit,apple,mango,peach,grape,cherry,lemon,melon,banana,orange,citrus,lime,pear,kiwi,passion,guava,papaya,lychee,plum,apricot,coconut,currant,tropical,juicy,aardbei,framboos,appel,peer,citroen,ananas,banaan,sinaasappel,bosbes,kers,perzik,druif',
 romig:'custard,cream,bavarian,vanilla,butter,milk,yogurt,yoghurt,cheesecake,mascarpone,condensed,pudding,flan,tiramisu,gelato,dairy,whipped,eclair,romig,vanille,melk,bavarois',
 bakkerij:'cake,cookie,donut,doughnut,waffle,pie,bread,biscuit,graham,pastry,cinnamon,brownie,muffin,croissant,pancake,crust,cracker,dough,bakery,cheesecake:.7,koek,taart,wafel,brood,gebak,speculaas,stroopwafel,crumble,biscotti,churro',
 zoet:'caramel,honey,sugar,sweet:.4,candy,toffee,syrup,marshmallow,chocolate,fudge,sweetener,sucralose,bubblegum,gummy,jelly,lollipop,snoep,suiker,honing,chocolade,nougat,praline,cotton,butterscotch,maple,molasses,dulce,jam',
 fris:'menthol,mint,peppermint,spearmint,koolada,ice,cool,cooling,frost,arctic,eucalyptus,fresh,freeze,polar,glacier,menthe,munt,ijs,winter,chill,breeze,frozen',
 tabak:'tobacco,tabak,tobak,ry4,cigar,cuban,virginia,burley,havana,pipe,leaf,rustic,cavendish,latakia,oriental,kentucky',
 drank:'coffee,espresso,cola,soda,tea,lemonade,energy,latte,cappuccino,beer,wine,whisk,rum,cocktail,juice,drink,mojito,koffie,thee,limonade,cider,vodka,gin,mocha,frappe,smoothie,milkshake,punch,mocktail,kombucha'}).map(([c,s])=>[c,s.split(',').map(t=>{const[k,w]=t.split(':');return[new RegExp(k.length<=4?`\\b${k}\\b`:`\\b${k}`),w?+w:1]})]));
function catOf(name){
 const L=findInv(name);if(L&&L.kind==='add'&&!L.cmix&&!L.cat)return L.addType==='zoetstof'?{zoet:1}:L.addType==='koeling'?{fris:1}:null;if(L&&L.cmix){const w={};let t=0;for(const k in L.cmix){const v=+L.cmix[k]||0;if(v>0&&KWS[k]){w[k]=v;t+=v}}if(t){for(const k in w)w[k]/=t;return w}}if(L&&L.cat&&KWS[L.cat])return{[L.cat]:1};
 const n=String(name||'').toLowerCase().replace(/ice[\s-]?cream/g,'gelato'),w={};let t=0;
 for(const c in KWS){let m=0;for(const[re,wt]of KWS[c])if(re.test(n))m=Math.max(m,wt);if(m){w[c]=m;t+=m}}
 if(!t)return null;for(const c in w)w[c]/=t;return w}
function catProfile(list){const s={};let tot=0;list.forEach(f=>{const w=catOf(f.name),p=+f.pct||0;if(!w||p<=0)return;for(const c in w){s[c]=(s[c]||0)+p*w[c];tot+=p*w[c]}});if(!tot)return null;const r={};CATS.forEach(([k])=>r[k]=(s[k]||0)/tot);return r}
const SOLO={fruit:'Fruitig',romig:'Romig',bakkerij:'Bakkerij-achtig',zoet:'Zoet',fris:'IJskoud fris',tabak:'Tabaksprofiel',drank:'Drankachtig'};
const DUO={'fruit|romig':'Fruitig dessert','bakkerij|romig':'Bakkerij-dessert','fruit|zoet':'Zoet fruitsnoepje','fris|fruit':'IJskoude fruitmix','bakkerij|fruit':'Fruittaart','romig|zoet':'Karamelromig','bakkerij|zoet':'Zoet gebak','drank|romig':'Dessert-drank','drank|fris':'Frisse drank','drank|fruit':'Fruitige drank','romig|tabak':'Romige tabak','tabak|zoet':'Zoete tabak','fris|tabak':'Frisse tabak','bakkerij|tabak':'Gebakken tabak','bakkerij|drank':'Koffiehuis-gebak','drank|zoet':'Zoete drank','fris|romig':'Romige frisheid','bakkerij|fris':'Frisse bakkerij','fris|zoet':'Frisse zoetigheid','fruit|tabak':'Fruitige tabak'};
const sortedCats=p=>CATS.map(([k])=>[k,p[k]]).sort((a,b)=>b[1]-a[1]);
function typer(p){if(!p)return null;const s=sortedCats(p);if(s[1][1]<.25*s[0][1]||s[1][1]<.1)return SOLO[s[0][0]];return DUO[[s[0][0],s[1][0]].sort().join('|')]||`${CN[s[0][0]]}-${CN[s[1][0]].toLowerCase()} mix`}
const curList=()=>blend.length?aromaProfile():flavors.filter(f=>f.name).map(f=>({name:f.name,pct:f.pct}));

/* Smaakradar */
let radT=load('vape_radT',null),radMode=false,radDrag=false;
const RAD={cx:150,cy:128,R:92};
const radPt=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/7;return[RAD.cx+Math.cos(a)*r,RAD.cy+Math.sin(a)*r]};
const DEFP={fruit:5,romig:3,bakkerij:3,zoet:1.5,fris:1,tabak:6,drank:4};
const aNote=it=>(it.str?` · sterkte ${it.str}`:'')+(it.note?` · 📝 ${esc(it.note)}`:'');
function comboWarn(list){
 const s={};let tot=0,hi=0;
 list.forEach(f=>{const p=+f.pct||0;if(p<=0)return;tot+=p;const it=findInv(f.name);if(it&&it.str==='hoog'&&p>=1.5)hi++;const w=catOf(f.name);if(!w)return;for(const c in w)s[c]=(s[c]||0)+p*w[c]});
 const o=[],fx=v=>v.toFixed(1);
 if((s.fris||0)>4)o.push(`🧊 Veel koelend aroma (${fx(s.fris)}%): kan scherp of verdovend worden.`);
 if((s.zoet||0)>6)o.push(`🍬 Veel zoet (${fx(s.zoet)}%): overstemt de rest en vervuilt je coil sneller.`);
 if((s.tabak||0)>14)o.push(`🍂 Zware tabaksmix (${fx(s.tabak)}%): overweeg minder of een lichter accent.`);
 if((s.romig||0)>8)o.push(`🍦 Veel romige aroma's (${fx(s.romig)}%): kan zwaar en vettig worden.`);
 if((s.tabak||0)>4&&(s.fris||0)>2)o.push('🍂🧊 Tabak met menthol: houd het koele aroma onder 2% zodat de tabak niet verdoofd wordt.');
 if(hi>=3)o.push('💪 Drie of meer sterke aroma\'s tegelijk: begin lager en proef na het steepen.');
 if(tot>20)o.push(`⚠️ Totaal aroma ${fx(tot)}%: dat is erg hoog.`);
 list.forEach(f=>{const it=findInv(f.name);if(it&&it.ingr){const g=ingrCheck(it.ingr);if(g.length)o.push('🧪 '+f.name+': '+g.map(x=>x.name).join(', ')+' (volgens je ingrediëntenlijst)')}});
 return o}
function renderRadCtl(){const el=$('radCtl');if(el)el.innerHTML=`<button class="${radMode?'b1':'b2'} sm" onclick="radToggle()">🎯 ${radMode?'Klaar':'Doel instellen'}</button><button class="b2 sm" onclick="radClear()" ${radT?'':'disabled'}>Wis doel</button>`}
function radToggle(){radMode=!radMode;if(radMode&&!radT)radT=[.5,.5,.5,.5,.5,.5,.5];store('vape_radT',radT);drawRadar()}
function radClear(){radT=null;radMode=false;store('vape_radT',radT);drawRadar()}
function radSet(x,y){
 const svg=$('radar').querySelector('svg');if(!svg||!radT)return;const m=svg.getScreenCTM();if(!m)return;
 const pt=svg.createSVGPoint();pt.x=x;pt.y=y;const q=pt.matrixTransform(m.inverse()),dx=q.x-RAD.cx,dy=q.y-RAD.cy;
 let a=Math.atan2(dy,dx)+Math.PI/2;if(a<0)a+=2*Math.PI;const i=Math.round(a/(2*Math.PI/7))%7;
 radT[i]=Math.max(0,Math.min(1,Math.round(Math.hypot(dx,dy)/RAD.R*20)/20));store('vape_radT',radT);drawRadar()}
{const rd=$('radar');
 rd.addEventListener('pointerdown',e=>{if(!radMode)return;radDrag=true;try{rd.setPointerCapture(e.pointerId)}catch{}radSet(e.clientX,e.clientY)});
 rd.addEventListener('pointermove',e=>{if(radDrag)radSet(e.clientX,e.clientY)});
 rd.addEventListener('pointerup',()=>{radDrag=false});rd.addEventListener('pointercancel',()=>{radDrag=false})}
function radAdd(ix,pct){const L=inventory[ix];if(!L)return;flavors.push({name:L.name,pct});renderFlavors();calculate();toast(`➕ ${L.name} (${pct}%)`)}
function radGoalRender(list,p){
 const el=$('radGoal');if(!el)return;if(!radT){el.innerHTML='';return}
 const s=radT.reduce((a,b)=>a+b,0);if(s<=0){el.innerHTML='<p class="note">Teken een doelprofiel op de radar.</p>';return}
 const tn=radT.map(v=>v/s),zeros=Object.fromEntries(CATS.map(([k])=>[k,0])),base=p||zeros,L1=a=>CATS.reduce((t,[k],i)=>t+Math.abs(a[k]-tn[i]),0),d0=L1(base);
 const tp=Object.fromEntries(CATS.map(([k],i)=>[k,tn[i]])),used=new Set(list.map(f=>f.name.toLowerCase()));
 const res=inventory.map((it,ix)=>({it,ix})).filter(({it})=>it.ml>0&&!used.has(it.name.toLowerCase())).map(({it,ix})=>{const w=catOf(it.name);if(!w)return null;const dom=Object.keys(w).sort((a,b)=>w[b]-w[a])[0],pct=Math.min(5,it.rec>0?it.rec:DEFP[dom]),p1=catProfile(list.concat([{name:it.name,pct}]));if(!p1)return null;const d1=L1(p1);return{it,ix,pct,gain:d0-d1,match:Math.round((1-d1/2)*100)}}).filter(x=>x&&x.gain>.005).sort((a,b)=>b.gain-a.gain).slice(0,3);
 el.innerHTML=`<div class="sub" style="margin:10px 0 6px">${radMode?'Tik of sleep op de radar om het doel te tekenen. ':''}Doelprofiel: <b style="color:var(--am)">${typer(tp)||'–'}</b>${p?` · huidige match ${Math.round((1-d0/2)*100)}%`:''}</div>`+(res.map(r=>`<div class="it"><div style="flex:1;min-width:0"><b style="font-size:.86rem">${esc(r.it.name)}</b><div class="sub">${r.it.ml} ml op voorraad${aNote(r.it)}</div></div><div style="text-align:center"><b style="color:var(--ok)">${r.match}%</b><div class="sub">doelmatch</div></div><button class="b2 sm" onclick="radAdd(${r.ix},${r.pct})">+ ${r.pct}%</button></div>`).join('')||'<p class="note">Geen aroma\'s in je voorraad die dichter bij dit doel brengen.</p>')}
function drawRadar(){
 if(!$('radar'))return;const list=curList(),p=catProfile(list),R=RAD.R,cx=RAD.cx,cy=RAD.cy,pt=radPt;
 const unk=list.filter(f=>!catOf(f.name)).map(f=>f.name);
 $('radNote').textContent=unk.length?`Niet herkend: ${unk.join(', ')}. Stel een categorie of smaakmix in via Voorraad ✎.`:'';
 renderRadCtl();$('radWarn').innerHTML=comboWarn(list).map(w=>`<p class="note" style="color:#fbbf24;margin:6px 0 0">${w}</p>`).join('');
 $('radar').style.touchAction=radMode?'none':'auto';
 if(!p&&!radT){$('radTy').textContent='';$('radar').innerHTML='<p class="note" style="text-align:center">Voeg een herkenbaar aroma toe om het smaakprofiel te zien.</p>';$('radGoal').innerHTML='';return}
 const pp=p||Object.fromEntries(CATS.map(([k])=>[k,0])),mx=Math.max(...CATS.map(([k])=>pp[k]),.0001),poly=r=>CATS.map((_,i)=>pt(i,r).map(v=>v.toFixed(1)).join(',')).join(' ');
 $('radTy').textContent=p?typer(p):'';
 const val=CATS.map(([k],i)=>pt(i,Math.max(p?5:0,R*pp[k]/mx)).map(v=>v.toFixed(1)).join(',')).join(' ');
 const tv=radT?CATS.map((_,i)=>pt(i,Math.max(3,R*radT[i])).map(v=>v.toFixed(1)).join(',')).join(' '):'';
 $('radar').innerHTML=`<svg viewBox="-40 0 380 262" style="width:100%;max-width:340px;display:block;margin:0 auto${radMode?';touch-action:none':''}"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".55"/><stop offset="1" stop-color="#c084fc" stop-opacity=".55"/></linearGradient></defs>${[.25,.5,.75,1].map(f=>`<polygon points="${poly(R*f)}" fill="none" style="stroke:var(--bd)" stroke-width="1"/>`).join('')}${CATS.map((_,i)=>`<line x1="${cx}" y1="${cy}" x2="${pt(i,R)[0].toFixed(1)}" y2="${pt(i,R)[1].toFixed(1)}" style="stroke:var(--bd)"/>`).join('')}${p?`<polygon points="${val}" fill="url(#rg)" style="stroke:var(--ac)" stroke-width="2"/>`:''}${radT?`<polygon points="${tv}" fill="rgba(251,191,36,.12)" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5 4"/>`+(radMode?CATS.map((_,i)=>`<circle cx="${pt(i,Math.max(3,R*radT[i]))[0].toFixed(1)}" cy="${pt(i,Math.max(3,R*radT[i]))[1].toFixed(1)}" r="5" fill="#fbbf24"/>`).join(''):''):''}${CATS.map(([k,nm,em],i)=>{const[a,b]=pt(i,R+26),an=a<cx-8?'end':a>cx+8?'start':'middle';return`<text x="${a.toFixed(1)}" y="${(b+3).toFixed(1)}" text-anchor="${an}" font-size="11" font-weight="700" style="fill:var(--tx)">${em} ${nm}</text><text x="${a.toFixed(1)}" y="${(b+15).toFixed(1)}" text-anchor="${an}" font-size="10" style="fill:var(--mu)">${Math.round(pp[k]*100)}%</text>`}).join('')}</svg>`;
 radGoalRender(list,p)}

/* Smaakmatcher */
const AFFT={'fruit|fruit':.65,'fruit|romig':.95,'bakkerij|fruit':.8,'fruit|zoet':.75,'fris|fruit':.8,'fruit|tabak':.3,'drank|fruit':.7,'romig|romig':.6,'bakkerij|romig':.95,'romig|zoet':.9,'fris|romig':.45,'romig|tabak':.75,'drank|romig':.8,'bakkerij|bakkerij':.6,'bakkerij|zoet':.85,'bakkerij|fris':.3,'bakkerij|tabak':.6,'bakkerij|drank':.75,'zoet|zoet':.4,'fris|zoet':.55,'tabak|zoet':.7,'drank|zoet':.65,'fris|fris':.5,'fris|tabak':.45,'drank|fris':.7,'tabak|tabak':.65,'drank|tabak':.65,'drank|drank':.55};
const aff=(a,b)=>AFFT[[a,b].sort().join('|')]??.5;
function renderMatcher(){
 if(!$('matcher'))return;const list=curList(),p=catProfile(list),used=new Set(list.map(f=>f.name.toLowerCase()));
 if(!p){$('matcher').innerHTML='<p class="note">Voeg eerst een herkenbaar aroma toe aan je recept (tab Calc), dan stel ik passende aroma\'s uit je voorraad voor.</p>';return}
 const top=sortedCats(p)[0];
 const res=inventory.filter(i=>i.ml>0&&!used.has(i.name.toLowerCase())).map(i=>{const w=catOf(i.name);if(!w)return null;if(tasteSel.size&&![...tasteSel].some(c=>(w[c]||0)>=.4))return null;let sc=0;for(const k in w)for(const j in p)sc+=w[k]*p[j]*aff(k,j);const dom=Object.entries(w).sort((a,b)=>b[1]-a[1])[0][0];if(dom===top[0]&&top[1]>.5)sc*=.85;return{i,dom,pct:Math.max(20,Math.min(99,Math.round(sc*100)))}}).filter(Boolean).sort((a,b)=>b.pct-a.pct).slice(0,6);
 $('matcher').innerHTML=`<div class="sub" style="margin-bottom:8px">Huidig profiel: <b style="color:var(--am)">${typer(p)}</b></div>`+(res.map(r=>`<div class="it"><div style="flex:1;min-width:0"><b style="font-size:.86rem">${esc(r.i.name)}</b><div class="sub">${(CATS.find(c=>c[0]===r.dom)||[])[2]||''} ${CN[r.dom]} · ${r.i.ml} ml op voorraad${r.i.rec?` · aanb. ${r.i.rec}%`:''}${aNote(r.i)}</div><div class="mt"><i style="width:${r.pct}%"></i></div></div><div style="text-align:center"><b style="font-size:1.05rem;color:var(--ok)">${r.pct}%</b><div class="sub">match</div></div><button class="b2 sm" onclick="matchAdd(${inventory.indexOf(r.i)})">+ Toevoegen</button></div>`).join('')||'<p class="note">Geen andere herkenbare aroma\'s met voorraad om voor te stellen.</p>')}
function matchAdd(i){const L=inventory[i];if(!L)return;flavors.push({name:L.name,pct:L.rec||3});renderFlavors();calculate();toast(`🤝 ${L.name} toegevoegd (${L.rec||3}%)`);bump('match');renderMatcher()}

/* Lab-modus */
const LB={i:0,steps:[],unit:'ml',shown:0,raf:0,deducted:false,t0:0,tm:0,wl:null,tx:0,tot:0,off:0,baseG:0,custom:null,fix:null,su:{},fixed:false};
const rk=l=>l==='PG'?0:/^Premix/.test(l)?1:2;
function mixList(){
 const c=calc(),o=[],bv=num('nicBaseVg')/100;
 blend.forEach(x=>{const L=liq(x.id);if(L&&x.ml>0){const v=L.vg/100;o.push({k:'liq',lid:L.id,vgf:v,col:'var(--pk)',name:'🍶 '+L.name,ml:x.ml,d:D.VG*v+D.PG*(1-v)})}});
 if(c.nicMl>0)o.push({k:'nic',vgf:bv,mg:c.bm,col:'var(--pu)',name:`Nicotine ${nicType==='salts'?'Salt':'Freebase'} ${c.bm} mg`,ml:c.nicMl,d:D.NIC});
 flavors.forEach(f=>{const m=c.ml*(+f.pct||0)/100;if(m>0)o.push({k:'aroma',nm:f.name||'',vgf:findInv(f.name)?.base==='VG'?1:0,col:'var(--am)',name:f.name||'Aroma',ml:m,d:D.FL})});
 const b=[];if(c.mixMl>0)b.push({k:'mix',vgf:c.mixVgPct/100,col:'var(--tl)',name:`Premix ${c.mixVgPct}VG/${100-c.mixVgPct}PG`,ml:c.mixMl,d:D.VG*c.mixVgPct/100+D.PG*(1-c.mixVgPct/100)});
 b.push({k:'pg',vgf:0,col:'var(--ac)',name:'PG',ml:c.pgMl,d:D.PG},{k:'vg',vgf:1,col:'var(--ok)',name:'VG',ml:c.vgMl,d:D.VG});b.sort((p,q)=>rk(p.name)-rk(q.name));b.forEach(x=>x.f=1);
 return o.concat(b).filter(s=>s.ml>.004)}
async function labWake(){try{LB.wl=await navigator.wakeLock?.request('screen')}catch{}}
addEventListener('visibilitychange',()=>{if(labOpen&&document.visibilityState==='visible')labWake()});
function labRecalc(){let cm=LB.off||0,cg=LB.baseG||0;LB.steps.forEach(s=>{s.g=s.ml*s.d;cm+=s.ml;cg+=s.g;s.cumMl=cm;s.cumG=cg});LB.tot=cm;LB.totG=cg}
function labLaunch(st,o={}){
 Object.assign(LB,{steps:st,i:0,unit:mode==='g'?'g':'ml',shown:0,deducted:false,off:o.off||0,baseG:o.baseG||0,custom:o.custom||null,fix:null,su:{},fixed:false});labRecalc();
 labOpen=true;$('labOv').classList.add('on');document.body.style.overflow='hidden';labWake();
 try{$('labOv').requestFullscreen?.({navigationUI:'hide'})?.catch(()=>{})}catch{}
 labRender()}
function labStart(){const st=mixList();if(!st.length)return toast('⚠️ Er is niets te mixen: vul eerst een recept in');labLaunch(st)}
function labClose(){labOpen=false;$('labOv').classList.remove('on');document.body.style.overflow='';clearInterval(LB.tm);LB.tm=0;cancelAnimationFrame(LB.raf);try{LB.wl?.release()}catch{}LB.wl=null;try{if(document.fullscreenElement)document.exitFullscreen()}catch{}}
const labUnit=u=>{LB.unit=u;LB.su={};labRender()};
function labGo(d){const n=LB.steps.length,ni=Math.max(0,Math.min(n,LB.i+d));if(ni===LB.i)return;LB.i=ni;try{navigator.vibrate?.(15)}catch{}labRender();if(ni===n){confetti(200);navigator.vibrate?.([60,40,60])}}
function labBottle(fr){
 const s=LB.steps,tot=LB.tot||1,off=LB.off||0,Y=m=>138-m/tot*96;let h='';
 if(off>0){const t=Math.max(0,Math.min(off,fr*tot));h+=`<rect x="20" y="${Y(t).toFixed(1)}" width="80" height="${(t/tot*96+.4).toFixed(1)}" fill="#94a3b8" opacity=".55"/>`}
 s.forEach((x,k)=>{const a=k?s[k-1].cumMl:off,b=x.cumMl,top=Math.min(b,fr*tot);
  if(top>a)h+=`<rect x="20" y="${Y(top).toFixed(1)}" width="80" height="${((top-a)/tot*96+.4).toFixed(1)}" style="fill:${x.col}"/>`;
  if(k===LB.i&&b>top)h+=`<rect x="20" y="${Y(b).toFixed(1)}" width="80" height="${((b-Math.max(a,top))/tot*96).toFixed(1)}" style="fill:${x.col}" class="pv"/>`});
 const el=$('labBot');if(!el)return;
 el.innerHTML=`<svg viewBox="0 0 120 150" style="height:clamp(130px,26vh,230px);filter:drop-shadow(0 10px 22px rgba(0,0,0,.4))"><defs><clipPath id="lbc"><rect x="20" y="42" width="80" height="96" rx="14"/></clipPath></defs><rect x="46" y="14" width="28" height="30" rx="4" fill="none" stroke-width="2" style="stroke:var(--mu)"/><rect x="42" y="4" width="36" height="12" rx="4" style="fill:var(--ac)"/><g clip-path="url(#lbc)"><rect x="20" y="42" width="80" height="96" fill="rgba(148,163,184,.12)"/>${h}<rect x="26" y="42" width="8" height="96" fill="#fff" opacity=".16"/></g><rect x="20" y="42" width="80" height="96" rx="14" fill="none" stroke-width="2" style="stroke:var(--mu)"/></svg>`}
function labAnim(to){cancelAnimationFrame(LB.raf);const from=LB.shown,t0=performance.now(),dur=to>from?650:200;const f=now=>{const k=Math.max(0,Math.min(1,(now-t0)/dur));LB.shown=from+(to-from)*(1-Math.pow(1-k,3));labBottle(LB.shown);if(k<1)LB.raf=requestAnimationFrame(f)};LB.raf=requestAnimationFrame(f)}
function labRender(){
 const s=LB.steps,n=s.length,i=LB.i,done=i>=n,U=LB.su[i]||LB.unit,g=U==='g',dr=U==='d',c=calc(),cu=LB.custom;
 const hd=`<div class="lhd"><button class="x" onclick="labClose()" aria-label="Sluiten">✕</button><b>${done?'🎉 Klaar':`Stap ${i+1} / ${n}`}</b><div class="tg lu"><button class="${LB.unit==='ml'?'fb':''}" onclick="labUnit('ml')">ml</button><button class="${LB.unit==='g'?'salt':''}" onclick="labUnit('g')">gram</button><button class="${LB.unit==='d'?'salt':''}" onclick="labUnit('d')" aria-label="druppels">💧</button></div></div><div class="lseg">${s.map((x,k)=>`<i class="${k<i?'d':k===i?'c':''}" style="--c:${x.col}"></i>`).join('')}</div><div id="labBot"></div>`;
 let body;
 if(!done){const x=s[i],v=dr?Math.round(x.ml*DPM()):g?x.g:x.ml;
  body=`<div class="lname" style="color:${x.col}">${esc(x.name)}</div><div class="lbig" onclick="labCycle()" title="Tik om van eenheid te wisselen">${dr?v:v.toFixed(2)}<small>${dr?'druppels':g?'g':'ml'}</small></div><div class="lsub">${g?`<span class="pill">⚖️ Weegschaal toont: <b>${x.cumG.toFixed(2)} g</b></span><span class="sub">${cu&&!LB.baseG?'tarreer eerst op het flesje':'niet tarreren'} · +${x.g.toFixed(2)} g · ≈ ${x.ml.toFixed(2)} ml</span>`:dr?`<span class="sub">≈ ${x.ml.toFixed(2)} ml · ${x.g.toFixed(2)} g</span><span class="sub">druppels per ml: <input type="number" min="5" max="60" value="${DPM()}" onchange="setDpm(this.value)" style="width:56px;text-align:center"></span>`:`<span class="sub">= ${x.g.toFixed(2)} g · tot nu toe ${x.cumMl.toFixed(2)} ml</span>`}</div><div class="lnav"><button class="b2" onclick="labGo(-1)" ${i?'':'disabled'}>◀ Vorige</button><button class="b1" onclick="labGo(1)">${i===n-1?'Klaar ✓':'Volgende ▶'}</button></div><button class="b2 sm" style="align-self:center" onclick="labFixToggle()">⚠️ Te veel toegevoegd?</button><div id="labFix"></div><div class="note" style="text-align:center;margin:0">Tik op het getal om de eenheid te wisselen · swipe of ← → · scherm blijft aan</div>`}
 else if(cu)body=`<div class="lname">Aangevuld!</div><div class="sub" style="text-align:center">${esc(cu.title)}</div><div class="lnav" style="grid-template-columns:1fr;margin-top:auto"><button class="b1" id="ldeduct" onclick="labDeduct()">💾 Volume bijwerken &amp; meting loggen</button><button class="b2" onclick="labGo(-1)">◀ Terug naar laatste stap</button><button class="b2" onclick="labClose()">Sluiten</button></div>`;
 else body=`<div class="lname">Alles gemengd!</div><div class="sub" style="text-align:center">${c.ml} ml · ${c.vg}VG / ${c.pg}PG · ${c.nic} mg/ml</div><div style="text-align:center"><div class="ring2" id="lring"><span id="ltime">60</span></div><button class="b1" id="lshake" onclick="labShake()">🥤 Start schudden (60 s)</button></div><div class="lnav" style="grid-template-columns:1fr;margin-top:auto"><button class="b2" id="ldeduct" onclick="labDeduct()">📉 Trek voorraad af &amp; sla batch op</button><button class="b2" onclick="labGo(-1)">◀ Terug naar laatste stap</button><button class="b2" onclick="labClose()">Sluiten</button></div>`;
 $('labBody').innerHTML=hd+body;labAnim(done?1:((i?s[i-1].cumMl:LB.off)/LB.tot));if(LB.fix)labFixRender()}
/* Foutherstel */
const labComp=st=>{const T=st.reduce((a,x)=>a+x.ml,0)||1;return{T,nic:st.reduce((a,x)=>a+(x.k==='nic'?x.ml*(x.mg||0):0),0)/T,ar:st.reduce((a,x)=>a+(x.k==='aroma'?x.ml:0),0)/T*100,vg:st.reduce((a,x)=>a+x.ml*(x.vgf||0),0)/T*100}};
function labPlanA(i,a){
 const s=LB.steps.map(x=>({...x}));let left=a-s[i].ml;s[i].ml=a;
 s.map((x,k)=>k).filter(k=>k>i&&s[k].f).sort((p,q)=>rk(s[p].name)-rk(s[q].name)).forEach(k=>{const t=Math.min(Math.max(left,0),s[k].ml);s[k].ml-=t;left-=t});
 return{ok:left<=.004,s:s.filter((x,k)=>k<=i||x.ml>.004)}}
function labPlanB(i,a){
 const s=LB.steps.map(x=>({...x})),sc=a/s[i].ml,ex=[];
 for(let k=0;k<i;k++){const m=s[k].ml*(sc-1);if(m>.004)ex.push({...s[k],name:'➕ Bijvoegen: '+s[k].name.replace(/^➕ Bijvoegen: /,''),ml:m,f:0})}
 s[i].ml=a;for(let k=i+1;k<s.length;k++)s[k].ml*=sc;
 return{ok:true,s:s.slice(0,i+1).concat(ex,s.slice(i+1))}}
function labFixToggle(){LB.fix=LB.fix?null:{v:''};labFixRender()}
function labFixRender(){
 const el=$('labFix');if(!el)return;if(!LB.fix){el.innerHTML='';return}
 const i=LB.i,x=LB.steps[i],U=LB.su[i]||LB.unit,g=U==='g',dr=U==='d',u=dr?'druppels':g?'g':'ml',f=dr?DPM():g?x.d:1,a=(+LB.fix.v||0)/f,dl=a-x.ml,from=labComp(LB.steps);
 let h=`<div class="fixp"><div class="fg"><label>Echt toegevoegd (${u})</label><input type="number" step="0.01" min="0" value="${LB.fix.v}" oninput="LB.fix.v=this.value" onchange="labFixRender()"></div>`;
 const fmt=c=>`${c.nic.toFixed(2)} mg · ${c.ar.toFixed(1)}% aroma · ${c.vg.toFixed(0)}VG · ${c.T.toFixed(1)} ml`;
 if(!(a>0))h+='<p class="note">Vul in hoeveel je werkelijk hebt toegevoegd.</p>';
 else if(dl<-.004)h+=`<p class="note">Je zit nog onder het doel: voeg gewoon nog <b>${(-dl*f).toFixed(dr?0:2)} ${u}</b> toe.</p>`;
 else if(dl<=.004)h+='<p class="note">Dat klopt met het doel. Ga gewoon verder.</p>';
 else{const A=labPlanA(i,a),B=labPlanB(i,a);
  h+=`<p class="note">Doel: ${fmt(from)}</p>
  <div class="it" style="display:block"><b>A. Zelfde volume</b><div class="sub">${A.ok?'De vulstoffen na deze stap worden verlaagd: '+fmt(labComp(A.s)):'⛔ Niet genoeg PG/VG over om het te compenseren.'}</div>${A.ok?`<button class="b2 sm" style="margin-top:6px" onclick="labFixApply('A')">Kies A</button>`:''}</div>
  <div class="it" style="display:block"><b>B. Batch vergroten</b><div class="sub">Zelfde smaak en sterkte, ${(labComp(B.s).T-from.T).toFixed(1)} ml extra: ${fmt(labComp(B.s))}. Eerdere ingrediënten worden bijgevuld. Check of het in je flesje past.</div><button class="b2 sm" style="margin-top:6px" onclick="labFixApply('B')">Kies B</button></div>
  <p class="note">De voorraad wordt achteraf volgens het oorspronkelijke recept afgetrokken. Pas die zo nodig zelf aan.</p>`}
 el.innerHTML=h+'</div>'}
function labFixApply(w){
 const i=LB.i,x=LB.steps[i],U=LB.su[i]||LB.unit,a=(+LB.fix.v||0)/(U==='d'?DPM():U==='g'?x.d:1);if(!(a>0))return;
 const P=w==='A'?labPlanA(i,a):labPlanB(i,a);if(!P.ok)return;const oldT=LB.tot;
 LB.fixed=true;LB.steps=P.s;labRecalc();LB.shown=Math.min(1,LB.shown*oldT/LB.tot);LB.i=Math.min(i+1,LB.steps.length);LB.fix=null;labRender();toast(w==='A'?'🛠️ Rest aangepast':'🛠️ Batch vergroot: volg de extra stappen')}
const DPM=()=>load('vape_dpm',20)||20;
const setDpm=v=>{store('vape_dpm',Math.max(5,Math.min(60,+v||20)));labRender()};
const labCycle=()=>{if(LB.i>=LB.steps.length)return;LB.su[LB.i]={ml:'g',g:'d',d:'ml'}[LB.su[LB.i]||LB.unit];labRender()};
function labOv(){const ov={liq:{},ar:{},nic:0,mix:0,vg:0,pg:0,total:0};LB.steps.forEach(x=>{ov.total+=x.ml;if(x.k==='aroma'){const k=(x.nm||'').toLowerCase();ov.ar[k]=(ov.ar[k]||0)+x.ml}else if(x.k==='liq')ov.liq[x.lid]=(ov.liq[x.lid]||0)+x.ml;else if(x.k==='nic')ov.nic+=x.ml;else if(x.k==='mix')ov.mix+=x.ml;else if(x.k==='vg')ov.vg+=x.ml;else if(x.k==='pg')ov.pg+=x.ml});return ov}
function labShake(){
 if(LB.tm)return;LB.t0=Date.now();$('lshake').disabled=true;
 LB.tm=setInterval(()=>{const t=$('ltime');if(!t){clearInterval(LB.tm);LB.tm=0;return}const left=Math.max(0,60-(Date.now()-LB.t0)/1000);t.textContent=Math.ceil(left);$('lring').style.background=`conic-gradient(var(--ok) ${(1-left/60)*100}%,var(--bd) 0)`;
  if(left<=0){clearInterval(LB.tm);LB.tm=0;const b=$('lshake');b.textContent='✅ Klaar: laat steepen'+(recSteep?` (±${recSteep} d)`:'');b.disabled=false;beep();try{navigator.vibrate?.([200,100,200])}catch{}confetti(120)}},200)}
function labDeduct(){if(LB.deducted)return;LB.deducted=true;if(LB.custom)LB.custom.onDone();else{if(LB.fixed){const ov=labOv();$('targetMl').value=+ov.total.toFixed(1);deductInventory(ov)}else deductInventory();bump('lab')}const b=$('ldeduct');if(b){b.textContent=LB.custom?'✅ Opgeslagen':'✅ Voorraad afgetrokken';b.disabled=true}confetti(160)}
$('labOv').addEventListener('touchstart',e=>{LB.tx=e.touches[0].clientX},{passive:true});
$('labOv').addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-LB.tx;if(Math.abs(dx)>60)labGo(dx<0?1:-1)},{passive:true});
document.addEventListener('keydown',e=>{
 if(labOpen){if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();labGo(1)}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();labGo(-1)}else if(e.key==='Escape')labClose()}
 else if(wrOpen){if(e.key==='ArrowRight')wrGo(wrI+1);else if(e.key==='ArrowLeft')wrGo(wrI-1);else if(e.key==='Escape')wrClose()}});

/* Prestaties */
const saveAmt=()=>log.reduce((a,l)=>a+l.ml,0)/10*price.shop-log.reduce((a,l)=>a+l.cost,0),hrs=l=>new Date(l.t).getHours();
const BADGES=[
 ['drop','💧','Eerste druppel','Meng je eerste batch',()=>[log.length,1]],
 ['dozen','📦','Dozijn','Meng 12 batches',()=>[log.length,12]],
 ['liter','🧪','Literlab','Meng samen 1 liter',()=>[log.reduce((a,l)=>a+l.ml,0),1000]],
 ['night','🌙','Nachtmixer','Meng een batch tussen 00:00 en 05:00',()=>[log.some(l=>hrs(l)<5)?1:0,1]],
 ['early','🌅','Vroege vogel','Meng een batch tussen 05:00 en 08:00',()=>[log.some(l=>hrs(l)>=5&&hrs(l)<8)?1:0,1]],
 ['piggy','🐷','Spaarpot','Bespaar €50 ten opzichte van winkelliquid',()=>[Math.max(0,saveAmt()),50]],
 ['lib','📚','Bibliothecaris','Sla 10 recepten op',()=>[saved.length,10]],
 ['collector','🌿','Aromaverzamelaar',"Heb 15 aroma's in je voorraad",()=>[inventory.length,15]],
 ['patient','⏳','Geduldig','Laat een batch minstens 14 dagen steepen',()=>[steep.some(b=>b.days>=14&&(Date.now()-(b.start||b.id))/864e5>=b.days)?1:0,1]],
 ['five','⭐','Vijfsterren','Geef een batch 5 sterren',()=>[steep.some(b=>b.rating===5)?1:0,1]],
 ['scale','⚖️','Weegschaalheld','Meng 5 batches op gewicht',()=>[log.filter(l=>l.g).length,5]],
 ['remix','🍶','Remixer','Gebruik eigen liquid in 3 batches',()=>[log.filter(l=>(l.r.blend||[]).length).length,3]],
 ['dice','🎲','Gokker','Gebruik Verras me 10 keer',()=>[cnt.dice||0,10]],
 ['lab','🧑‍🔬','Lab-assistent','Rond een batch af in lab-modus',()=>[cnt.lab||0,1]],
 ['art','🏷️','Etiketkunstenaar','Download 5 etiketten',()=>[cnt.labels||0,5]],
 ['match','🤝','Smaakmaker',"Voeg 5 aroma's toe via de Smaakmatcher",()=>[cnt.match||0,5]]];
function checkBadges(silent){
 const nw=[];BADGES.forEach(([id,ic,n,d,f])=>{if(badgeSt[id])return;const[v,m]=f();if(v>=m){badgeSt[id]=Date.now();nw.push([ic,n])}});
 if(!nw.length)return;store('vape_badges',badgeSt);
 if(!silent)setTimeout(()=>{toast('🏆 Nieuwe prestatie: '+nw.map(b=>b[0]+' '+b[1]).join(', '));confetti(160);try{navigator.vibrate?.(120)}catch{}},700);
 if($('tab-dash').classList.contains('on'))renderBadges()}
function renderBadges(){
 const got=BADGES.filter(b=>badgeSt[b[0]]).length;$('badgeCount').textContent=`${got}/${BADGES.length}`;
 $('badges').innerHTML=BADGES.map(([id,ic,n,d,f])=>{const[v,m]=f(),ok=!!badgeSt[id];return`<div class="bd${ok?' ok':''}"><div class="bi">${ok?ic:'🔒'}</div><b>${n}</b><span>${d}</span>${ok?`<em>${new Date(badgeSt[id]).toLocaleDateString('nl-BE')}</em>`:`<div class="bp"><i style="width:${Math.min(1,v/m)*100}%"></i></div><em>${Math.floor(Math.min(v,m))}/${m}</em>`}</div>`}).join('')}

/* Lab Wrapped */
const NLM=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'],PERSONA={fruit:'De Fruitfanaat',romig:'De Roommeester',bakkerij:'De Bakkerij-alchemist',zoet:'De Suikerstorm',fris:'De IJsbreker',tabak:'De Tabaksprofessor',drank:'De Barista-brouwer'};
function wrapData(){
 const yr=new Date().getFullYear(),ys=log.filter(l=>new Date(l.t).getFullYear()===yr),L=ys.length?ys:log,ar={},months=Array(12).fill(0),fl=[];
 const ml=L.reduce((a,l)=>a+l.ml,0),cost=L.reduce((a,l)=>a+l.cost,0);
 L.forEach(l=>{months[new Date(l.t).getMonth()]+=l.ml;const add=(nm,m)=>{if(!nm||!(m>0))return;(ar[nm]??={ml:0,n:0}).ml+=m;ar[nm].n++;fl.push({name:nm,pct:m})};
  (l.r.flavors||[]).forEach(f=>add(f.name,l.ml*(+f.pct||0)/100));(l.r.blend||[]).forEach(b=>{const q=liq(b.id);if(q)q.flavors.forEach(f=>add(f.name,b.ml*(+f.pct||0)/100))})});
 const top=Object.entries(ar).sort((a,b)=>b[1].ml-a[1].ml).slice(0,3).map(([name,v])=>({name,ml:v.ml,n:v.n})),prof=catProfile(fl),mx=Math.max(...months),first=L.length?Math.min(...L.map(l=>l.t)):Date.now();
 return{per:ys.length||!log.length?String(yr):'Totaal',n:L.length,ml,cost,top,prof,ty:typer(prof),persona:prof?PERSONA[sortedCats(prof)[0][0]]:'De Beginner',months,mi:mx>0?months.indexOf(mx):-1,
  rated:steep.filter(b=>b.rating>0).sort((a,b)=>b.rating-a.rating||b.id-a.id)[0]||null,saved:ml/10*price.shop-cost,shop:ml/10*price.shop,every:L.length?Math.max(1,(Date.now()-first)/864e5)/L.length:0,badges:BADGES.filter(b=>badgeSt[b[0]]).length}}
function wrRadar(x,cx,cy,R,p,e){
 const n=7,pt=(i,r)=>[cx+Math.cos(-Math.PI/2+i*2*Math.PI/n)*r,cy+Math.sin(-Math.PI/2+i*2*Math.PI/n)*r],F='system-ui,-apple-system,"Segoe UI",sans-serif';
 x.strokeStyle='rgba(255,255,255,.3)';x.lineWidth=3;[.25,.5,.75,1].forEach(f=>{x.beginPath();for(let i=0;i<=n;i++){const[a,b]=pt(i%n,R*f);i?x.lineTo(a,b):x.moveTo(a,b)}x.stroke()});
 for(let i=0;i<n;i++){const[a,b]=pt(i,R);x.beginPath();x.moveTo(cx,cy);x.lineTo(a,b);x.stroke()}
 const mx=Math.max(...CATS.map(([k])=>p[k]),.001);x.beginPath();CATS.forEach(([k],i)=>{const[a,b]=pt(i,R*Math.max(.06,p[k]/mx)*e);i?x.lineTo(a,b):x.moveTo(a,b)});x.closePath();x.fillStyle='rgba(253,230,138,.45)';x.fill();x.strokeStyle='#fde68a';x.lineWidth=6;x.stroke();
 x.fillStyle='#fff';x.textAlign='center';CATS.forEach(([k,nm,em],i)=>{const[a,b]=pt(i,R+78);x.font=`700 48px ${F}`;x.fillText(em,a,b);x.font=`600 30px ${F}`;x.fillText(nm,a,b+40)})}
function wrDraw(cv,i,t){
 const W=1080,H=1920,x=cv.getContext('2d'),d=wrData,e=1-Math.pow(1-t,3),cx=W/2,F='system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',nl=v=>String(v).replace('.',','),eur=v=>'€'+nl(Math.max(0,v).toFixed(2));
 const BG=[['#0e7490','#7c3aed'],['#4c1d95','#be185d'],['#064e3b','#0e7490'],['#7c2d12','#be123c'],['#312e81','#0e7490'],['#14532d','#a16207'],['#1e1b4b','#c026d3'],['#831843','#d97706'],['#0f172a','#4c1d95']][i];
 const g=x.createLinearGradient(0,0,W*.6,H);g.addColorStop(0,BG[0]);g.addColorStop(1,BG[1]);x.fillStyle=g;x.fillRect(0,0,W,H);
 x.globalAlpha=.1;x.fillStyle='#fff';[[900,300,380],[120,1500,460],[960,1700,220]].forEach(([a,b,r])=>{x.beginPath();x.arc(a,b,r,0,7);x.fill()});x.globalAlpha=1;
 const T=(s,px,py,sz,w='800',col='#fff',al='center',mw=940)=>{let z=sz;x.font=`${w} ${z}px ${F}`;s=String(s);while(z>24&&x.measureText(s).width>mw){z-=2;x.font=`${w} ${z}px ${F}`}x.fillStyle=col;x.textAlign=al;x.textBaseline='alphabetic';x.fillText(s,px,py)};
 const wrapT=(s,px,py,sz,lh,mw,mx)=>{x.font=`600 ${sz}px ${F}`;const ws=String(s).split(/\s+/);let ln='',l=0;for(const w of ws){const tt=ln?ln+' '+w:w;if(x.measureText(tt).width>mw&&ln){T(ln,px,py+l*lh,sz,'600','rgba(255,255,255,.9)','center',mw);l++;ln=w;if(l>=mx)break}else ln=tt}if(l<mx)T(ln,px,py+l*lh,sz,'600','rgba(255,255,255,.9)','center',mw)};
 const bar=(y,lab,v,mx,col)=>{T(lab,90,y,40,'700','rgba(255,255,255,.85)','left',560);T(eur(v),990,y,44,'800','#fff','right',380);x.fillStyle='rgba(255,255,255,.2)';x.beginPath();x.roundRect(90,y+22,900,56,28);x.fill();x.fillStyle=col;x.beginPath();x.roundRect(90,y+22,Math.max(28,900*(mx?v/mx:0)*e),56,28);x.fill()};
 T('LAB WRAPPED · '+String(d.per).toUpperCase(),cx,140,38,'700','rgba(255,255,255,.7)');
 if(i===0){T('🧪',cx,660,280);T('Jouw jaar',cx,940,130);T('in de lab',cx,1080,130,'900');T(d.per,cx,1360,240,'900','#fde68a');T('Tik om door te gaan',cx,1780,36,'600','rgba(255,255,255,.6)')}
 else if(i===1){T('Je mixte',cx,640,84,'600');T(Math.round(d.n*e),cx,1030,380,'900','#fde68a');T(d.n===1?'batch':'batches',cx,1160,120);T(d.n?`Gemiddeld één batch per ${Math.max(1,Math.round(d.every))} dagen`:'Tijd om je eerste batch te mixen!',cx,1420,52,'600','rgba(255,255,255,.85)')}
 else if(i===2){const l=d.ml*e/1000;T('Samen goed voor',cx,640,84,'600');T(nl(l.toFixed(l<10?2:1)),cx,1030,340,'900','#fde68a');T('liter e-liquid',cx,1160,110);T(`= ${Math.round(d.ml/60)} flesjes van 60 ml`,cx,1400,56,'700','rgba(255,255,255,.9)');T(d.ml?`Kostprijs ± €${nl((d.cost/d.ml*1000).toFixed(2))} per liter`:'',cx,1490,44,'600','rgba(255,255,255,.7)')}
 else if(i===3){T('Je trouwste aroma',cx,520,80,'600');const a=d.top[0];if(a){T(short(a.name),cx,800,130,'900','#fde68a');T(`${a.ml.toFixed(0)} ml in ${a.n} ${a.n===1?'batch':'batches'}`,cx,910,54,'600','rgba(255,255,255,.9)');d.top.forEach((o,k)=>{const y=1180+k*190;T(`${k+1}. ${short(o.name)}`,90,y,46,'700','#fff','left',640);T(`${o.ml.toFixed(0)} ml`,990,y,46,'700','#fff','right',240);x.fillStyle='rgba(255,255,255,.2)';x.beginPath();x.roundRect(90,y+28,900,44,22);x.fill();x.fillStyle=k?'rgba(255,255,255,.75)':'#fde68a';x.beginPath();x.roundRect(90,y+28,Math.max(22,900*o.ml/a.ml*e),44,22);x.fill()})}else T('Nog geen aroma\'s gemixt',cx,900,70,'700')}
 else if(i===4){T('Jouw smaakpersoonlijkheid',cx,430,66,'600');T(d.persona,cx,620,130,'900','#fde68a');T(d.ty||'Mix een batch met herkenbare aroma\'s',cx,720,64,'700');if(d.prof)wrRadar(x,cx,1230,330,d.prof,e)}
 else if(i===5){T(d.saved>0?'Je bespaarde':'Je uitgaven',cx,640,84,'600');T(eur(d.saved>0?d.saved*e:d.cost*e).replace('.',','),cx,1000,260,'900','#fde68a');T(d.saved>0?`t.o.v. winkelliquid (€${price.shop.toFixed(2)} per 10 ml)`:'Mix meer om te besparen',cx,1120,48,'600','rgba(255,255,255,.85)');const mx=Math.max(d.cost,d.shop,1);bar(1380,'Zelf gemaakt',d.cost,mx,'#34d399');bar(1560,'In de winkel',d.shop,mx,'#fb7185')}
 else if(i===6){T('Je drukste maand',cx,520,80,'600');if(d.mi<0)T('Nog geen data',cx,900,100,'800');else{const nm=NLM[d.mi];T(nm[0].toUpperCase()+nm.slice(1),cx,820,170,'900','#fde68a');T(`${d.months[d.mi].toFixed(0)} ml gemixt`,cx,930,60,'600','rgba(255,255,255,.9)');const mx=Math.max(...d.months),bw=56,gp=17,sx=(W-(12*bw+11*gp))/2;d.months.forEach((v,k)=>{const h=Math.max(8,480*(v/mx)*e);x.fillStyle=k===d.mi?'#fde68a':'rgba(255,255,255,.55)';x.beginPath();x.roundRect(sx+k*(bw+gp),1560-h,bw,h,14);x.fill();T('JFMAMJJASOND'[k],sx+k*(bw+gp)+bw/2,1620,36,'700','rgba(255,255,255,.8)')})}}
 else if(i===7){T('Best beoordeelde batch',cx,520,76,'600');const r=d.rated;if(r){T(r.name,cx,830,120,'900','#fde68a');T('★'.repeat(r.rating)+'☆'.repeat(5-r.rating),cx,1030,130,'800','#fff');if(r.notes)wrapT('“'+String(r.notes).slice(0,110)+'”',cx,1250,56,76,860,3)}else{T('Nog geen beoordeling',cx,880,90,'800');T('Geef een batch sterren in de Steep-tab',cx,990,48,'600','rgba(255,255,255,.8)')}}
 else{T('Mijn Lab Wrapped',cx,300,100,'900');const rows=[['Batches',d.n],['Volume',nl((d.ml/1000).toFixed(2))+' liter'],['Trouwste aroma',d.top[0]?short(d.top[0].name):'–'],['Smaakprofiel',d.ty||'–'],['Persoonlijkheid',d.persona],['Bespaard',eur(d.saved)],['Drukste maand',d.mi>=0?NLM[d.mi][0].toUpperCase()+NLM[d.mi].slice(1):'–'],[d.rated?`Beste batch (${d.rated.rating}★)`:'Beste batch',d.rated?d.rated.name:'–'],['Prestaties',`${d.badges}/${BADGES.length}`]];
  rows.forEach(([a,b],k)=>{const y=480+k*160;x.fillStyle='rgba(255,255,255,.12)';x.beginPath();x.roundRect(60,y-70,960,130,28);x.fill();T(a,100,y+8,38,'600','rgba(255,255,255,.7)','left',360);T(b,980,y+12,54,'800','#fff','right',520)});T('E-Liquid Lab',cx,1860,40,'700','rgba(255,255,255,.55)')}}
function wrSegs(){$('wSeg').innerHTML=Array.from({length:9},(_,k)=>`<i class="${k<wrI?'d':k===wrI?(k<8?'c':'d'):''}"><b></b></i>`).join('')}
function wrGo(i){
 if(i>8)return;i=Math.max(0,i);wrI=i;wrSegs();clearTimeout(wrTimer);cancelAnimationFrame(wrRaf);const cv=$('wrC'),t0=performance.now();
 const f=now=>{const t=Math.min(1,(now-t0)/1100);wrDraw(cv,i,t);if(t<1)wrRaf=requestAnimationFrame(f)};wrRaf=requestAnimationFrame(f);
 if(i<8)wrTimer=setTimeout(()=>wrGo(i+1),6000)}
function wrOpenUI(){wrData=wrapData();wrOpen=true;$('wrOv').classList.add('on');document.body.style.overflow='hidden';wrGo(0)}
function wrClose(){wrOpen=false;clearTimeout(wrTimer);cancelAnimationFrame(wrRaf);$('wrOv').classList.remove('on');document.body.style.overflow=''}
$('wSt').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();wrGo(e.clientX-r.left<r.width*.35?wrI-1:wrI+1)});
function wrShare(all){const c=document.createElement('canvas');c.width=1080;c.height=1920;wrDraw(c,all?8:wrI,1);exportCanvas(c,`lab-wrapped-${wrData.per}${all?'':'-slide'+(wrI+1)}.png`)}

/* ===== DTL → MTL ===== */
const MT={vg:50,nic:0,boost:25,extra:[]};
function mtlPlan(){
 const c=calc(),salts=nicType==='salts',old=c.nic,nic=MT.nic>0?MT.nic:Math.round(Math.min(salts?20:18,Math.max(salts?10:6,old*(salts?4:3)))*2)/2;
 const all=flavors.filter(f=>f.name).map(f=>({name:f.name,old:+f.pct||0,pct:Math.round((+f.pct||0)*(1+MT.boost/100)*10)/10})).concat(MT.extra.map(e=>({name:e.name,old:0,pct:e.pct,extra:1})));
 const tot=all.reduce((a,f)=>a+f.pct,0),ml=c.ml,bm=c.bm,bv=num('nicBaseVg'),nicMl=ml*nic/bm,nVg=nicMl*bv/100,nPg=nicMl-nVg,flMl=ml*tot/100,flVg=all.reduce((a,f)=>a+(findInv(f.name)?.base==='VG'?f.pct:0),0)*ml/100;
 return{c,old,nic,all,tot,oldTot:c.flPct,ml,bm,shot:nicMl/ml*100,vN:ml*MT.vg/100-nVg-flVg,pN:ml*(100-MT.vg)/100-nPg-(flMl-flVg),nicMl,salts}}
function mtlSugg(){
 const list=all=>all.filter(f=>f.name).map(f=>({name:f.name,pct:f.pct})),p=mtlPlan(),prof=catProfile(list(p.all));if(!prof)return[];
 const used=new Set(p.all.map(f=>f.name.toLowerCase()));
 return inventory.map((i,ix)=>({i,ix})).filter(({i})=>i.ml>0&&!used.has(i.name.toLowerCase())).map(({i,ix})=>{const w=catOf(i.name);if(!w)return null;let sc=0;for(const k in w)for(const j in prof)sc+=w[k]*prof[j]*aff(k,j);return{i,ix,sc,dom:Object.keys(w).sort((a,b)=>w[b]-w[a])[0]}}).filter(Boolean).sort((a,b)=>b.sc-a.sc).slice(0,3)}
function renderMtl(){
 const el=$('mtl');if(!el)return;
 if(blend.length){el.innerHTML='<p class="note">Deze tool werkt met recepten van losse aroma\'s. Verwijder eerst gemengde liquids uit het recept.</p>';return}
 if(!flavors.some(f=>f.name)){el.innerHTML='<p class="note">Vul eerst je DTL-recept in (aroma\'s met percentages). Hier verschijnt dan de MTL-versie.</p>';return}
 const p=mtlPlan(),w=[],t=[],st=p.tot<8?['laag','var(--am)']:p.tot>18?['hoog','#fb7185']:['goed','var(--ok)'];
 if(p.vN<-.01||p.pN<-.01)w.push('⛔ Past niet: aroma en nicotine nemen meer PG/VG in dan beschikbaar. Verlaag de nicotine of het aroma-percentage, of verhoog PG.');
 if(p.nic>20)w.push('⚠️ Boven 20 mg/ml: dit is de EU-limiet voor verkochte liquids en wordt snel scherp.');
 if(p.shot>40)w.push(`⚠️ De nicotineshot neemt ${p.shot.toFixed(0)}% van het volume in. De rest wordt zo dun dat aroma's relatief verdund aanvoelen. Gebruik een sterkere shot (nu ${p.bm} mg/ml) of kies een lagere sterkte.`);
 if(p.tot<8)t.push(`Je totale aroma (${p.tot.toFixed(1)}%) is laag voor MTL. Op een kleine coil bij lage wattage komt weinig smaak door. Streef naar 8 tot 18%.`);
 if(p.tot>18)t.push('Boven 18% aroma kan het bitter of chemisch worden en de coil sneller vervuilen.');
 if(p.nic>=12&&!p.salts)t.push('Bij 12 mg of meer is nicotinezout vaak zachter in de keel dan freebase.');
 const sug=p.tot<10?mtlSugg():[];
 el.innerHTML=`<div class="sub" style="margin-bottom:10px">Uitgangspunt: <b>${p.old} mg</b>, <b>${p.c.vg}VG/${p.c.pg}PG</b>, <b>${p.oldTot.toFixed(1)}%</b> aroma (${p.ml} ml). MTL werkt het best met meer PG en meer nicotine.</div>
 <div class="g2" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px">${[[50,50],[40,60],[30,70]].map(([v,g])=>`<button class="${MT.vg===v?'b1':'b2'} sm" onclick="MT.vg=${v};renderMtl()">${v}VG/${g}PG</button>`).join('')}</div>
 <div class="g2" style="margin-bottom:10px"><div class="fg"><label>Nicotine (mg/ml)</label><input type="number" step="0.5" min="0" value="${p.nic}" onchange="MT.nic=+this.value||0;renderMtl()"></div><div class="fg"><label>Aroma-boost</label><select onchange="MT.boost=+this.value;renderMtl()">${[0,15,25,40].map(v=>`<option value="${v}"${MT.boost===v?' selected':''}>+${v}%</option>`).join('')}</select></div></div>
 <div class="it" style="display:block"><b>MTL-versie: ${p.nic} mg · ${MT.vg}VG/${100-MT.vg}PG</b><div class="sub" style="margin:4px 0 8px">Totaal aroma <b style="color:${st[1]}">${p.tot.toFixed(1)}% (${st[0]})</b></div>${p.all.map(f=>`<div class="sub" style="display:flex;justify-content:space-between;gap:8px"><span>${f.extra?'➕ ':''}${esc(f.name)}</span><b>${f.extra?'':f.old+'% → '}${f.pct}%</b></div>`).join('')}</div>
 ${w.map(x=>`<p class="note" style="color:#fb7185">${x}</p>`).join('')}${t.map(x=>`<p class="note">💡 ${x}</p>`).join('')}
 ${sug.length?`<div class="sub" style="margin:10px 0 6px">Aroma's uit je voorraad die kunnen helpen:</div>`+sug.map(s=>`<div class="it"><div style="flex:1;min-width:0"><b style="font-size:.86rem">${esc(s.i.name)}</b><div class="sub">${CN[s.dom]} · ${s.i.ml} ml op voorraad${aNote(s.i)}</div></div><button class="b2 sm" onclick="mtlAdd(${s.ix})">+ ${Math.min(3,s.i.rec||2)}%</button></div>`).join(''):''}
 ${MT.extra.length?`<button class="b2 sm" style="margin-top:8px" onclick="MT.extra=[];renderMtl()">Extra aroma's wissen</button>`:''}
 <button class="b1" style="margin-top:12px;width:100%" onclick="mtlLoad()">Laad MTL-versie in calculator</button>
 <p class="note">Dit vervangt je huidige recept. Sla je DTL-versie eerst op als je die wilt bewaren. Streef na mixen naar minstens 1 tot 2 weken steepen.</p>`}
function mtlAdd(ix){const L=inventory[ix];if(!L)return;MT.extra.push({name:L.name,pct:Math.min(3,L.rec||2)});renderMtl()}
function mtlLoad(){const p=mtlPlan();applyR({name:($('recipeName').value||'Recept').replace(/\s*\(MTL\)$/,'')+' (MTL)',targetMl:p.ml,targetNic:p.nic,targetVg:MT.vg,nicType,flavors:p.all.map(f=>({name:f.name,pct:f.pct})),blend:[]});MT.extra=[];MT.nic=0;toast('🎯 MTL-versie geladen')}

/* ===== Fles: diameter + Chubby Gorilla-standaarden ===== */
const CGP=[['cg30','Chubby Gorilla 30 ml Stubby',30.2,30,1],['cg60','Chubby Gorilla 60 ml V3 Unicorn',30.2,60,1],['cg120','Chubby Gorilla 120 ml V3 Unicorn',42,120,1]];
let fSyncing=false;
function fFromD(){if(fSyncing)return;fSyncing=true;const d=num('fD');$('fC').value=d>0?(Math.PI*d).toFixed(1):'';fSyncing=false;fCalc()}
function fFromC(){if(fSyncing)return;fSyncing=true;const c=num('fC');$('fD').value=c>0?(c/Math.PI).toFixed(1):'';fSyncing=false;fCalc()}
function fCG(){const p=CGP.find(x=>x[0]===$('fCG').value);if(!p)return;
 $('fPre').value='';$('fName').value=p[1];$('fD').value=p[2];$('fW').value=p[4];$('fB').value=4;$('fMax').value=p[3];['fKv','fKh','fH','fG','fT'].forEach(i=>$(i).value='');fFromD();toast('📏 '+p[1]+' geladen: pas gerust aan')}
function fTable(ri,Mx,B){
 const el=$('fTab');if(!el)return;if(!(ri>0&&Mx>0)){el.innerHTML='';return}
 const st=Mx<=35?5:10,a=Math.PI*ri*ri/1000,rows=[];for(let v=st;v<=Mx+.01;v+=st)rows.push(`<span class="pill" style="margin:3px">${v} ml: <b>${(v/a+B).toFixed(1)} mm</b></span>`);
 el.innerHTML=`<div class="sub" style="margin:12px 0 4px">Vloeistofhoogte vanaf de buitenkant van de bodem:</div><div>${rows.join('')}</div>`}

/* ===== Flesniveau: verbruik, doelmaat, aanvullen ===== */
const meas=load('vape_meas',[]);
const CGOV={cg30:34.6,cg120:127.7};
const flesList=()=>CGP.map(p=>({id:p[0],name:p[1],Mx:p[3],Ov:CGOV[p[0]]||0})).concat(bottles.filter(b=>b.Mx>0).map(b=>({id:'b'+b.id,name:b.name,Mx:b.Mx,Ov:0})));
function renderCalcBottle(){
 const el=$('cbSel');if(!el)return;const keep=el.value;
 el.innerHTML='<option value="">Geen flesje</option>'+flesList().map(b=>`<option value="${b.id}"${b.id===keep?' selected':''}>${esc(b.name)} (${b.Mx} ml)</option>`).join('');cbApply(true)}
function cbApply(quiet){
 const b=flesList().find(x=>x.id===$('cbSel').value),pc=+$('cbFill').value||100,note=$('cbNote');
 if(!b){note.textContent='';return}
 const ml=Math.round(b.Mx*pc)/100;if(!quiet){$('targetMl').value=ml;calculate()}
 note.textContent=`Vult ${ml} ml in een flesje van ${b.Mx} ml (${pc}%)`+(b.Ov?`. Ruimte tot de rand: ${(b.Ov-ml).toFixed(1)} ml.`:'.')}
{const o=renderBottle;renderBottle=function(){o.apply(this,arguments);renderCalcBottle();renderUse()}}
function measKey(){const l=liq($('fLiq').value);return l?['L'+l.id,l.name]:['B'+($('fName').value.trim()||'flesje'),$('fName').value.trim()||'Flesje']}
function measAdd(ml,refill){const[key,name]=measKey();if(!(ml>0))return toast('⚠️ Er is nog geen schatting');meas.push({t:Date.now(),key,name,ml:+ml.toFixed(1),r:refill?1:0});if(meas.length>600)meas.splice(0,meas.length-600);store('vape_meas',meas);renderUse()}
const measLog=()=>{measAdd(fEst);toast('📝 Meting gelogd')};
function measDel(key){const k=meas.map(m=>m.key).lastIndexOf(key);if(k>=0){meas.splice(k,1);store('vape_meas',meas);renderUse()}}
function renderUse(){
 const el=$('fUse');if(!el)return;const keys=[...new Set(meas.map(m=>m.key))];
 if(!keys.length){el.innerHTML='<p class="note">Log na elke meting het niveau. Vanaf twee metingen berekent de app je verbruik per dag en hoe lang het flesje nog meegaat.</p>';return}
 el.innerHTML=keys.map(key=>{
  const M=meas.filter(m=>m.key===key).sort((a,b)=>a.t-b.t);let used=0,days=0;
  for(let k=1;k<M.length;k++){if(M[k].r)continue;const d=M[k-1].ml-M[k].ml;if(d>0){used+=d;days+=(M[k].t-M[k-1].t)/864e5}}
  const avg=days>.04?used/days:0,last=M[M.length-1],left=avg>0?last.ml/avg:0;
  const w=240,h=46,t0=M[0].t,tr=Math.max(1,last.t-t0),mx=Math.max(...M.map(m=>m.ml),1);
  const pts=M.map(m=>`${(M.length>1?(m.t-t0)/tr*(w-8)+4:w/2).toFixed(1)},${(h-4-m.ml/mx*(h-10)).toFixed(1)}`).join(' ');
  return`<div class="it" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:.88rem">${esc(M[0].name)}</b><button class="b2 sm" onclick="measDel('${esc(key)}')">↩︎ laatste weg</button></div>
  <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;margin:6px 0"><polyline points="${pts}" fill="none" style="stroke:var(--ac)" stroke-width="2.5" stroke-linejoin="round"/>${pts.split(' ').map(p=>`<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3" style="fill:var(--ac)"/>`).join('')}</svg>
  <div class="sub">${M.length} metingen · nu ${last.ml} ml (${new Date(last.t).toLocaleDateString('nl-BE')})${avg?` · verbruik <b>${avg.toFixed(1)} ml/dag</b> (${(avg*7).toFixed(0)} ml/week) · nog ±<b>${left.toFixed(0)} dagen</b>`:' · nog geen verbruik te berekenen'}</div></div>`}).join('')}
function fTopUp(){
 if(!fEst)return toast('⚠️ Meet eerst het niveau');const tg=num('fTarget');if(!(tg>fEst))return toast('⚠️ Vul een doelvolume in dat hoger is dan het huidige niveau');
 const vg=fVgPct(),d=vg/100*D.VG+(1-vg/100)*D.PG,add=tg-fEst,l=liq($('fLiq').value),nm=l?l.name:`e-liquid ${vg}VG`,G=num('fG');
 labLaunch([{k:'top',vgf:vg/100,col:'var(--pk)',name:'Aanvullen: '+nm,ml:add,d}],{off:fEst,baseG:G>0?G:0,custom:{title:`${nm}: van ${fEst.toFixed(1)} naar ${tg} ml`,onDone(){if(l){l.ml=+tg.toFixed(1);svLiq();renderLiquids();renderBlend()}measAdd(tg,true);renderBottle();toast(`💾 ${tg} ml opgeslagen en gelogd`)}}})}

/* ===== Meerdere flesjes per aroma ===== */
const bf=n=>Math.round(n*10)/10;
function invToFl(it){if(!it.fl||!it.fl.length)it.fl=it.ml>0?[{id:Date.now()-1,size:it.size>=it.ml?it.size:it.ml,ml:it.ml,price:it.price>0&&it.size>0?it.price:0}]:[]}
function invSync(it){
 if(!it.fl||!it.fl.length)return;it.ml=+it.fl.reduce((a,b)=>a+(+b.ml||0),0).toFixed(2);
 const pr=it.fl.filter(b=>b.price>0&&b.size>0),w=pr.reduce((a,b)=>a+(+b.ml||0),0);
 const cpm=pr.length?(w>0?pr.reduce((a,b)=>a+b.ml*b.price/b.size,0)/w:pr.reduce((a,b)=>a+b.price/b.size,0)/pr.length):0;
 if(cpm>0){it.size=100;it.price=+(cpm*100).toFixed(4)}}
function invTake(it,need){
 if(!it.fl||!it.fl.length){it.ml=Math.max(0,+(it.ml-need).toFixed(2));return}
 const op=b=>b.ml<b.size-.004,ord=[...it.fl].sort((a,b)=>(op(b)-op(a))||(op(a)?a.ml-b.ml:a.size-b.size));
 let left=need;for(const b of ord){const t=Math.min(b.ml,left);b.ml=+(b.ml-t).toFixed(2);left-=t;if(left<=1e-9)break}
 it.fl=it.fl.filter(b=>b.ml>.004);if(it.fl.length)invSync(it);else it.ml=0}
const takeOv=(ov,n)=>{const k=String(n||'').toLowerCase(),v=ov.ar[k]||0;ov.ar[k]=0;return v};
function invFlHTML(it,i){
 const rows=(it.fl||[]).map((b,k)=>`<div class="g3" style="grid-template-columns:1fr 1fr 1fr auto;align-items:end;margin-bottom:6px"><div class="fg"><label>Grootte (ml)</label><input type="number" min="0" value="${b.size}" onchange="flSet(${i},${k},'size',this.value)"></div><div class="fg"><label>Over (ml)</label><input type="number" min="0" step="0.1" value="${b.ml}" onchange="flSet(${i},${k},'ml',this.value)"></div><div class="fg"><label>Prijs (€)</label><input type="number" min="0" step="0.01" value="${b.price||''}" onchange="flSet(${i},${k},'price',this.value)"></div><button class="x" onclick="flDel(${i},${k})">✕</button></div>`).join('');
 return`<div style="flex-basis:100%;margin-top:12px"><div class="sub" style="margin-bottom:6px"><b>🍶 Flesjes</b> ${it.fl&&it.fl.length?'(het totaal wordt automatisch berekend; bij gebruik raakt eerst een aangebroken flesje op)':'(nog niet opgesplitst: voeg een flesje toe)'}</div>${rows}<div class="g3" style="grid-template-columns:1fr 1fr 1fr auto;align-items:end"><div class="fg"><label>Nieuw (ml)</label><input type="number" id="flS${i}" min="0" list="flSizes" placeholder="30"></div><div class="fg"><label>Over (ml)</label><input type="number" id="flM${i}" min="0" step="0.1" placeholder="vol"></div><div class="fg"><label>Prijs (€)</label><input type="number" id="flP${i}" min="0" step="0.01"></div><button class="b2 sm" onclick="flAdd(${i})">+</button></div></div>`}
function flAdd(i){const it=inventory[i];if(!it)return;let size=num('flS'+i),ml=num('flM'+i);if(!(ml>0))ml=size;if(!(size>0))size=ml;if(!(size>0))return toast('⚠️ Vul de grootte van het flesje in');
 invToFl(it);it.fl.push({id:Date.now(),size,ml:Math.min(ml,size),price:num('flP'+i)});invSync(it);renderInventory();renderFlavors();calculate();toast(`🍶 ${it.name}: ${it.fl.length} flesjes, ${it.ml} ml`)}
function flSet(i,k,key,v){const it=inventory[i];if(!it||!it.fl[k])return;it.fl[k][key]=parseFloat(v)||0;invSync(it);renderInventory();renderFlavors();calculate()}
function flDel(i,k){const it=inventory[i];if(!it||!it.fl)return;undoPush('Flesje verwijderd');it.fl.splice(k,1);if(it.fl.length)invSync(it);else it.ml=0;renderInventory();renderFlavors();calculate()}
function addInv(){
 const n=$('invName').value.trim();if(!n)return;const ml=parseFloat($('invMl').value)||0,size=parseFloat($('invSize').value)||0,price=parseFloat($('invPrice').value)||0,ex=findInv(n);
 if(ex){invToFl(ex);ex.fl.push({id:Date.now(),size:size||ml,ml,price});invSync(ex);toast(`➕ Extra flesje bij ${ex.name}: nu ${ex.fl.length} flesjes, ${ex.ml} ml`)}
 else{const ks=$('invKindSel')?$('invKindSel').value:'',g=addGuess(n);inventory.push({id:Date.now(),name:n,ml,size,price,...((ks==='add'||g)?{kind:'add',addType:g||'overig'}:{})})}
 ['invName','invMl','invSize','invPrice'].forEach(x=>$(x).value='');renderInventory();renderFlavors();checkBadges()}

/* ===== Zoeken in alles ===== */
const srN=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function srOpen(){$('srOv').classList.add('on');document.body.style.overflow='hidden';$('srQ').value='';srRun('');setTimeout(()=>$('srQ').focus(),60)}
function srClose(){$('srOv').classList.remove('on');document.body.style.overflow=''}
function srRun(q){
 const T=srN(q).split(/\s+/).filter(Boolean),el=$('srRes');
 if(!T.length){el.innerHTML='<p class="note">Zoek op recept, aroma, liquid, batch of steep. Bijvoorbeeld "custard", "tpa" of "peppermint".</p>';return}
 const hit=h=>{h=srN(h);return T.every(t=>h.includes(t))},fn=a=>(a||[]).map(f=>f.name).join(' ');
 const G=[['📖 Recepten',saved.map((r,i)=>({t:r.name,s:(r.flavors||[]).map(f=>`${f.name} ${f.pct}%`).join(', '),h:r.name+' '+fn(r.flavors),go:`srGo('rec',${i})`}))],
  ['🌿 Aroma\'s',inventory.map((a,i)=>({t:a.name,s:`${a.ml} ml`+(a.fl&&a.fl.length>1?` · ${a.fl.length} flesjes`:''),h:a.name,go:`srGo('inv',${i})`}))],
  ['🍶 Liquids',liquids.map((l,i)=>({t:l.name,s:`${l.ml} ml · ${l.nic} mg · ${l.vg}VG`,h:l.name+' '+fn(l.flavors)+' '+(l.note||''),go:`srGo('liq',${i})`}))],
  ['⏳ Steep',steep.map((b,i)=>({t:b.name,s:`${b.days} dagen${b.rating?' · '+'★'.repeat(b.rating):''}`,h:b.name+' '+(b.notes||''),go:`srGo('steep',${i})`}))],
  ['🧾 Gemengd',log.map((l,i)=>({t:l.r.name,s:`${new Date(l.t).toLocaleDateString('nl-BE')} · ${l.ml} ml`,h:l.r.name+' '+fn(l.r.flavors),go:`srGo('log',${i})`}))]];
 const out=G.map(([h,a])=>{const r=a.filter(x=>hit(x.h)).slice(0,6);return r.length?`<div class="sub" style="margin:12px 0 6px"><b>${h}</b></div>`+r.map(x=>`<div class="it" style="cursor:pointer" onclick="${x.go}"><div style="min-width:0"><b style="font-size:.86rem">${esc(x.t)}</b><div class="sub">${esc(x.s)}</div></div><span class="sub">›</span></div>`).join(''):''}).join('');
 el.innerHTML=out||'<p class="note">Niets gevonden.</p>'}
function srGo(t,i){srClose();
 if(t==='rec')return applyR(saved[i]);if(t==='log')return applyR(log[i].r);
 if(t==='inv'){switchTab('inv');editIdx=i;renderInventory();setTimeout(()=>{const e=$('inv').children[i];e&&e.scrollIntoView({block:'center'})},80);return}
 if(t==='liq'){switchTab('liq');$('lq').value=liquids[i].name;renderLiquids();return}
 switchTab('steep')}
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!labOpen&&!wrOpen){e.preventDefault();srOpen()}else if(e.key==='Escape'&&$('srOv').classList.contains('on'))srClose()});

/* ===== Voorraadfilter + Wat kan ik nu mixen? ===== */
let invFilter='all',cookF='all',brandF='',refI=-1,cntMode=false,cntStep=1,stGr=-1,tsEd=-1,devs=load('vape_devs',[]),recDev={id:'',w:0},ncF=3,twRes=null,undoSt=[];
const invOk=it=>(!brandF||brandOf(it)===brandF)&&(!invKind||(invKind==='add'?it.kind==='add':it.kind!=='add'))&&(invFilter==='all'||(invFilter==='out'?it.ml<=0:invFilter==='min'?it.ml<=thr(it):invFilter==='low5'?it.ml<=5:invFilter==='low15'?it.ml<=15:it.ml>15));
function setInvFilter(v){invFilter=v;renderInventory()}
function renderInvF(){
 const el=$('invF');if(!el)return;const n=f=>inventory.filter(it=>f==='all'||(f==='out'?it.ml<=0:f==='min'?it.ml<=thr(it):f==='low5'?it.ml<=5:f==='low15'?it.ml<=15:it.ml>15)).length;
 el.innerHTML=[['all','Alles'],['out','❌ Op'],['min','🔔 Eigen drempel'],['low5','🛒 ≤5 ml'],['low15','🟡 ≤15 ml'],['ok','✅ Op voorraad']].map(([k,l])=>`<span class="chip${invFilter===k?' on':''}" onclick="setInvFilter('${k}')">${l} (${n(k)})</span>`).join('')+brandSel()+extraChips();renderInvVal();dlFill();catRender()}
function cookRows(){
 return saved.map((r,i)=>({r,src:'rec',i})).concat(presets.map((r,i)=>({r,src:'pre',i}))).map(({r,src,i})=>{
  const ml=r.targetMl||60,miss=[];let mx=Infinity;
  (r.flavors||[]).forEach((f,fi)=>{if(!f.name||!(+f.pct>0))return;const L=findInv(f.name),need=ml*f.pct/100;
   if(!L){miss.push({n:f.name,t:'geen',need,fi});mx=0}else{if(L.ml<need-.004)miss.push({n:f.name,t:'tekort',need:need-L.ml,fi});mx=Math.min(mx,L.ml/(f.pct/100))}});
  (r.blend||[]).forEach(b=>{const L=liq(b.id);if(!L){mx=0;miss.push({n:'gemengde liquid',t:'geen',need:b.ml});return}if(L.ml<b.ml-.004)miss.push({n:L.name,t:'tekort',need:b.ml-L.ml})});
  return{r,src,i,ml,miss,mx:isFinite(mx)?Math.floor(mx):0}}).filter(x=>(x.r.flavors||[]).some(f=>f.name)||(x.r.blend||[]).length).filter(x=>recOk(x.r)).sort((a,b)=>a.miss.length-b.miss.length||tasteScore(b.r.flavors)-tasteScore(a.r.flavors)||b.mx-a.mx)}
function setCook(v){cookF=v;renderCook()}
function cookShown(){const all=cookRows();return{all,rows:all.filter(x=>cookF==='all'||(cookF==='now'?!x.miss.length:cookF==='one'?x.miss.length===1:x.miss.length>=2))}}
function renderCook(){
 const el=$('cook');if(!el)return;const{all,rows}=cookShown(),n=f=>all.filter(x=>f==='now'?!x.miss.length:f==='one'?x.miss.length===1:x.miss.length>=2).length;
 const ch=[['all','Alles',all.length],['now','✅ Kan nu',n('now')],['one','Mist 1',n('one')],['two','Mist 2+',n('two')]].map(([k,l,c])=>`<span class="chip${cookF===k?' on':''}" onclick="setCook('${k}')">${l} (${c})</span>`).join('');
 const list=rows.slice(0,10).map(x=>{const ok=!x.miss.length;
  return`<div class="it" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div style="min-width:0"><b style="font-size:.88rem">${esc(x.r.name)}</b>${x.src==='pre'?' <span class="sub">(voorbeeld)</span>':''}<div class="sub">${recTy(x.r.flavors)?'🧭 '+recTy(x.r.flavors)+' · ':''}${x.ml} ml · ${(x.r.flavors||[]).map(f=>esc(f.name)).join(', ')}</div></div><button class="b2 sm" onclick="cookLoad('${x.src}',${x.i})">Laden</button></div>
  ${ok?`<span class="bg bk">✅ Kan nu: tot ${x.mx} ml</span>`:`<span class="bg bw">⚠️ Mist ${x.miss.length}</span><div class="sub" style="margin-top:4px">${x.miss.map(m=>m.t==='geen'?`${esc(m.n)}: niet in voorraad`:`${esc(m.n)}: nog ${m.need.toFixed(1)} ml nodig`).join(' · ')}${x.mx>0?` · met je voorraad kun je ${x.mx} ml maken`:''}</div>${subHTML(x)}`}</div>`}).join('');
 el.innerHTML=`<div class="chips">${ch}</div>${list||'<p class="note">Geen recepten in deze categorie.</p>'}<div class="g2" style="margin-top:8px"><button class="b2" onclick="cookDice()">🎲 Verras me</button><button class="b2" onclick="cookCopy()">🛒 Kopieer ontbrekende</button></div>`}
function cookLoad(src,i){if(src==='rec')applyR(saved[i]);else loadPreset(i)}
function cookCopy(){const m=new Map();cookShown().rows.slice(0,10).forEach(x=>x.miss.forEach(a=>{const k=a.n.toLowerCase();if(!m.has(k)||m.get(k).need<a.need)m.set(k,a)}));
 if(!m.size)return toast('✅ Niets te kopen voor deze selectie');copy('🛒 Bijkopen:\n'+[...m.values()].map(a=>`• ${a.n}${a.t==='tekort'?` (nog ${a.need.toFixed(1)} ml)`:''}`).join('\n'),'🛒 Lijst gekopieerd')}

/* ===== Smaakprofiel-filter voor suggesties ===== */
const tasteSel=new Set(load('vape_taste',[]));
const recProf=fl=>catProfile((fl||[]).map(f=>({name:f.name,pct:f.pct}))),recTy=fl=>{const p=recProf(fl);return p?typer(p):''};
const tasteOk=fl=>{if(!tasteSel.size)return true;const p=recProf(fl);return !!p&&[...tasteSel].every(c=>p[c]>=.2)};
const tasteScore=fl=>{const p=recProf(fl);return p?[...tasteSel].reduce((a,c)=>a+p[c],0):0};
function tasteTog(k){k==='*'?(tasteSel.clear(),tagSel.clear(),store('vape_tagsel',[])):tasteSel.has(k)?tasteSel.delete(k):tasteSel.add(k);store('vape_taste',[...tasteSel]);renderTaste();renderSuggestions();renderMatcher();renderCook()}
function renderTaste(){const el=$('taste');if(!el)return;el.innerHTML=CATS.map(([k,n,e])=>`<span class="chip${tasteSel.has(k)?' on':''}" onclick="tasteTog('${k}')">${e} ${n}</span>`).join('')+'<div style="flex-basis:100%"></div>'+TAGS.map(([k,e,n])=>`<span class="chip${tagSel.has(k)?' on':''}" onclick="tagTog('${k}')">${e} ${n}</span>`).join('')+((tasteSel.size||tagSel.size)?`<span class="chip" onclick="tasteTog('*')">✕ Wis</span>`:'')}

/* ===== Smaakmix per aroma, tags, generator, smaakgeschiedenis, aankoopadvies ===== */
function invMixHTML(it,i){
 const cm=it.cmix||{};
 return`<div style="flex-basis:100%;margin-top:12px"><div class="sub" style="margin-bottom:6px"><b>🎨 Eigen smaakmix</b> (% per categorie, optioneel; vervangt de automatische herkenning)</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${CATS.map(([k,n,e])=>`<div class="fg"><label>${e} ${n}</label><input type="number" min="0" max="100" step="5" value="${cm[k]||''}" onchange="setCmix(${i},'${k}',this.value)"></div>`).join('')}</div>
 <div class="fg" style="margin-top:8px"><label>Merk</label><input type="text" value="${esc(it.brand||'')}" placeholder="${esc(brandOf({name:it.name})||'bijv. Capella')}" onchange="setInvF(${i},'brand',this.value)"></div><div class="g2" style="margin-top:8px;align-items:end"><div class="fg"><label>Barcode</label><input type="text" value="${esc(it.barcode||'')}" onchange="setInvF(${i},'barcode',this.value)"></div><button class="b2" onclick="scanOpen('link',${i})">📷 Scan</button></div><div class="fg" style="margin-top:8px"><label>Ingrediënten of veiligheidsinfo (plak de lijst)</label><input type="text" value="${esc(it.ingr||'')}" placeholder="bijv. propylene glycol, ethyl maltol" onchange="setInvF(${i},'ingr',this.value)"></div><div class="g2" style="margin-top:8px"><div class="fg"><label>Smaaknotitie</label><input type="text" value="${esc(it.note||'')}" placeholder="bijv. droge room, ietwat chemisch" onchange="setInvF(${i},'note',this.value)"></div><div class="fg"><label>Sterkte</label><select onchange="setInvF(${i},'str',this.value)"><option value="">–</option>${['laag','middel','hoog'].map(v=>`<option value="${v}"${it.str===v?' selected':''}>${v}</option>`).join('')}</select></div></div></div>`}
function setCmix(i,k,v){const it=inventory[i];if(!it)return;it.cmix=it.cmix||{};const n=parseFloat(v)||0;if(n>0)it.cmix[k]=n;else delete it.cmix[k];if(!Object.keys(it.cmix).length)delete it.cmix;renderInventory();calculate()}
const TAGS=[['winter','❄️','Winter'],['zomer','☀️','Zomer'],['ontbijt','🥐','Ontbijt'],['dessert','🍰','Dessert'],['avond','🌙','Avond']];
const tagSel=new Set(load('vape_tagsel',[]));let tagEd=-1;
function autoTags(r){
 if(r.tags&&r.tags.length)return r.tags.filter(t=>t!=='_');const p=recProf(r.flavors);if(!p)return[];const t=[];
 if(p.fris>=.2||p.fruit>=.4)t.push('zomer');if(p.bakkerij>=.2||p.tabak>=.2||p.romig>=.3||p.drank>=.3)t.push('winter');
 if(p.bakkerij>=.2||p.drank>=.3)t.push('ontbijt');if(p.romig+Math.max(p.bakkerij,p.zoet)>=.5)t.push('dessert');if(p.tabak>=.2||p.romig>=.3)t.push('avond');return t}
const tagOk=r=>!tagSel.size||[...tagSel].some(t=>autoTags(r).includes(t));
const recOk=r=>tasteOk(r.flavors)&&tagOk(r);
function tagTog(k){tagSel.has(k)?tagSel.delete(k):tagSel.add(k);store('vape_tagsel',[...tagSel]);renderTaste();renderSuggestions();renderMatcher();renderCook()}
function recTagHTML(r,i){
 const cur=autoTags(r),auto=!(r.tags&&r.tags.length);
 return`<div class="sub" style="margin-top:2px">🏷️ ${cur.length?cur.map(t=>(TAGS.find(x=>x[0]===t)||[])[2]||t).join(' · ')+(auto?' (automatisch)':''):'geen tags'}</div>`+(tagEd===i?`<div class="chips" style="margin:6px 0 0">${TAGS.map(([k,e,n])=>`<span class="chip${cur.includes(k)?' on':''}" onclick="recTagTog(${i},'${k}')">${e} ${n}</span>`).join('')}</div>`:'')}
function recTagTog(i,k){const r=saved[i];if(!r)return;const t=new Set(autoTags(r));t.has(k)?t.delete(k):t.add(k);r.tags=[...t];if(!r.tags.length)r.tags=['_'];sv()}
let genN=0,genRes=null;
function genRecipe(){
 const cats=[...tasteSel];if(!cats.length)return{err:'Kies eerst een of meer smaakprofielen. Het eerste is je hoofdprofiel, de rest zijn accenten.'};
 const picks=[],used=new Set();
 cats.forEach((c,idx)=>{
  const cand=inventory.filter(i=>i.ml>0&&!used.has(i.name)).map(i=>({i,w:catOf(i.name)})).filter(x=>x.w&&(x.w[c]||0)>=.5).sort((a,b)=>((b.i.rec>0)-(a.i.rec>0))||b.i.ml-a.i.ml);
  if(!cand.length)return;const off=cand.length?genN%cand.length:0,rot=cand.slice(off).concat(cand.slice(0,off)),n=idx===0?2:1;
  rot.slice(0,n).forEach(x=>{used.add(x.i.name);picks.push({name:x.i.name,pct:(x.i.rec>0?x.i.rec:DEFP[c])*(idx===0?1:.6),it:x.i,cat:c})})});
 if(!picks.length)return{err:'Geen aroma\'s met voorraad in dit profiel. Voeg ze toe bij Voorraad of geef ze een categorie.'};
 const tot=picks.reduce((a,p)=>a+p.pct,0),sc=tot>12?12/tot:tot<7?Math.min(1.6,8/tot):1;
 picks.forEach(p=>{let v=p.pct*sc;if(p.it.max>0)v=Math.min(v,p.it.max);p.pct=Math.max(.5,Math.round(v*2)/2)});
 return{picks,cats,list:picks.map(p=>({name:p.name,pct:p.pct}))}}
function genGo(v){if(v)genN++;else genN=0;genRes=genRecipe();const el=$('gen');
 if(genRes.err){el.innerHTML=`<p class="note">${genRes.err}</p>`;return}
 const tot=genRes.list.reduce((a,f)=>a+f.pct,0),ty=recTy(genRes.list);
 el.innerHTML=`<div class="it" style="display:block;margin-top:10px"><b>Startrecept: ${ty?esc(ty):genRes.cats.map(c=>CN[c]).join(' + ')}</b><div class="sub" style="margin:4px 0 6px">Totaal ${tot.toFixed(1)}% aroma</div>${genRes.picks.map(p=>`<div class="sub" style="display:flex;justify-content:space-between;gap:8px"><span>${esc(p.name)}${aNote(p.it)}</span><b>${p.pct}%</b></div>`).join('')}<button class="b1" style="margin-top:10px;width:100%" onclick="genLoad()">Laad in calculator</button></div>`}
function genLoad(){if(!genRes||!genRes.list)return;const ty=recTy(genRes.list);applyR({name:'Startrecept '+(ty||genRes.cats.map(c=>CN[c]).join(' + ')),targetMl:num('targetMl',60),targetNic:num('targetNic',3),targetVg:num('targetVg',70),nicType,flavors:structuredClone(genRes.list),blend:[]})}
function myTasteData(){
 const sum={},wt={};let n=0;
 steep.filter(b=>b.rating>0).forEach(b=>{const l=log.find(x=>x.r&&x.r.name===b.name),r=l?l.r:saved.find(x=>x.name===b.name),p=r&&recProf(r.flavors);if(!p)return;n++;CATS.forEach(([k])=>{sum[k]=(sum[k]||0)+b.rating*p[k];wt[k]=(wt[k]||0)+p[k]})});
 return{n,wt,avg:Object.fromEntries(CATS.map(([k])=>[k,wt[k]>.05?sum[k]/wt[k]:0]))}}
function renderMyTaste(){
 const el=$('myTaste');if(!el)return;const d=myTasteData();
 if(d.n<2){el.innerHTML='<p class="note">Geef minstens twee batches sterren in de Steep-tab (en mix ze via de calculator). Daarna zie je hier welke smaken je het hoogst waardeert.</p>';return}
 const cs=CATS.filter(([k])=>d.wt[k]>=.3).sort((a,b)=>d.avg[b[0]]-d.avg[a[0]]);
 const rec=saved.map((r,i)=>({r,src:'rec',i})).concat(presets.map((r,i)=>({r,src:'pre',i}))).map(x=>{const p=recProf(x.r.flavors);if(!p)return null;let a=0,b=0;CATS.forEach(([k])=>{if(d.avg[k]>0){a+=p[k]*d.avg[k];b+=p[k]}});return b>.3?{...x,exp:a/b}:null}).filter(Boolean).sort((a,b)=>b.exp-a.exp).slice(0,3);
 el.innerHTML=`<div class="sub" style="margin-bottom:8px">Gebaseerd op ${d.n} beoordeelde batches</div>`+cs.map(([k,n,e])=>`<div class="rr"><span>${e} ${n}</span><span class="rv">${'★'.repeat(Math.round(d.avg[k]))}${'☆'.repeat(5-Math.round(d.avg[k]))} ${d.avg[k].toFixed(1)}</span></div>`).join('')+(rec.length?`<div class="sub" style="margin:10px 0 6px">Recepten die waarschijnlijk bij je passen:</div>`+rec.map(x=>`<div class="it"><div style="min-width:0"><b style="font-size:.86rem">${esc(x.r.name)}</b><div class="sub">${recTy(x.r.flavors)||''} · verwacht ± ${x.exp.toFixed(1)} ★</div></div><button class="b2 sm" onclick="cookLoad('${x.src}',${x.i})">Laden</button></div>`).join(''):'')}
function buyData(){
 if(!log.length)return null;const first=Math.min(...log.map(l=>l.t)),days=Math.max(30,(Date.now()-first)/864e5),use={},cu={},cs={};let tot=0;
 log.forEach(l=>(l.r.flavors||[]).forEach(f=>{const m=l.ml*(+f.pct||0)/100;if(m>0&&f.name)use[f.name]=(use[f.name]||0)+m}));
 Object.entries(use).forEach(([n,m])=>{const w=catOf(n);if(!w)return;for(const c in w){cu[c]=(cu[c]||0)+m*w[c];tot+=m*w[c]}});
 inventory.forEach(i=>{const w=catOf(i.name);if(!w)return;for(const c in w)cs[c]=(cs[c]||0)+i.ml*w[c]});
 const rows=Object.entries(use).map(([n,m])=>{const it=findInv(n),rate=m/days,stock=it?it.ml:0;return{n,m,rate,stock,left:rate>0?stock/rate:Infinity,have:!!it}}).sort((a,b)=>a.left-b.left);
 return{days,tot,cu,cs,rows}}
function renderBuy(){
 const el=$('buyAdv');if(!el)return;const d=buyData();
 if(!d||d.tot<=0){el.innerHTML='<p class="note">Zodra je batches hebt gemixt, zie je hier welke smaken je vaak gebruikt en waarvoor je voorraad opraakt.</p>';return}
 const top=CATS.filter(([k])=>d.cu[k]>0).sort((a,b)=>d.cu[b[0]]-d.cu[a[0]]).slice(0,3),low=d.rows.filter(r=>r.left<30&&r.m>=2).slice(0,6);
 el.innerHTML=`<div class="sub" style="margin-bottom:6px">Je mixt vooral:</div>`+top.map(([k,n,e])=>{const rate=d.cu[k]/d.days,left=rate>0?(d.cs[k]||0)/rate:Infinity;return`<div class="rr"><span>${e} ${n} (${Math.round(d.cu[k]/d.tot*100)}%)</span><span class="rv" style="color:${left<30?'#fb7185':'var(--ok)'}">${isFinite(left)?'voorraad ± '+Math.round(left)+' dagen':'–'}</span></div>`}).join('')+(low.length?`<div class="sub" style="margin:10px 0 6px">Bijkopen, op volgorde van urgentie:</div>`+low.map(r=>`<div class="rr"><span>${esc(r.n)}${r.have?'':' <span class="sub">(niet in voorraad)</span>'}</span><span class="rv">${r.stock<=0?'op':'± '+Math.round(r.left)+' d'} · ${(r.rate*30).toFixed(1)} ml/maand</span></div>`).join('')+`<button class="b2" style="margin-top:8px" onclick="buyCopy()">🛒 Kopieer lijst</button>`:'<p class="note">✅ Je favoriete aroma\'s zijn voorlopig ruim op voorraad.</p>')}
function buyCopy(){const d=buyData();if(!d)return;const l=d.rows.filter(r=>r.left<30&&r.m>=2).slice(0,6);if(!l.length)return toast('✅ Niets te kopen');copy('🛒 Bijkopen:\n'+l.map(r=>`• ${r.n} (${(r.rate*30).toFixed(1)} ml/maand)`).join('\n'),'🛒 Lijst gekopieerd')}
function cookDice(){const r=cookRows().filter(x=>!x.miss.length);if(!r.length)return toast('Geen recept binnen je filters dat je nu kunt mixen');const x=r[Math.floor(Math.random()*r.length)];bump('dice');cookLoad(x.src,x.i);toast('🎲 '+x.r.name)}

/* ===== v4.8: steep-herinneringen, recept schalen, aroma-vervanger ===== */
const steepEnd=b=>(b.start||b.id)+b.days*864e5;
(function(){if(!load('vape_ntfinit',0)){steep.forEach(b=>{if(steepEnd(b)<=Date.now())b.notified=true});store('vape_ntfinit',1);store('vape_steep_master',steep)}})();
function steepCheck(){
 const due=steep.filter(b=>!b.notified&&steepEnd(b)<=Date.now());if(!due.length)return;
 due.forEach(b=>b.notified=true);store('vape_steep_master',steep);
 const nm=due.map(b=>b.name).join(', ');toast('⏳ Klaar om te proeven: '+nm);try{navigator.vibrate?.([120,60,120])}catch{}
 try{if('Notification' in window&&Notification.permission==='granted'){const t='⏳ Steep klaar',o={body:nm,tag:'steep'},p=navigator.serviceWorker&&navigator.serviceWorker.getRegistration?navigator.serviceWorker.getRegistration():null;(p?p.then(r=>r?r.showNotification(t,o):new Notification(t,o)):Promise.resolve(new Notification(t,o))).catch(()=>{})}}catch{}
 if($('tab-liq')&&$('tab-liq').classList.contains('on')&&liqSecCur==='steep')renderSteep()}
setTimeout(steepCheck,1500);setInterval(steepCheck,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)steepCheck()});
function ntfRender(){const el=$('steepNtf'),bt=$('ntfBtn');if(!el)return;const ok='Notification' in window,pm=ok?Notification.permission:'';
 el.textContent=!ok?'Meldingen worden hier niet ondersteund. De agenda-knop werkt wel.':pm==='granted'?'🔔 Meldingen staan aan. Je krijgt een melding zodra een batch klaar is, zolang de app open staat of op de achtergrond actief is.':pm==='denied'?'🔕 Meldingen zijn geblokkeerd in je browser. Zet ze aan in de site-instellingen, of gebruik de agenda-knop.':'Krijg een melding zodra een batch klaar is. Een gesloten webapp kan geen echte pushmelding sturen; voor dat geval kun je de batches in je agenda zetten.';
 if(bt)bt.style.display=ok&&pm==='default'?'':'none'}
function ntfAsk(){if(!('Notification' in window))return toast('Niet ondersteund');try{Promise.resolve(Notification.requestPermission()).then(()=>{ntfRender();if(Notification.permission==='granted')toast('🔔 Meldingen aan')})}catch{}}
const icsEsc=t=>String(t).replace(/[\;,]/g,m=>'\\'+m).replace(/\n/g,' ');
const icsD=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
function icsEv(b){const e=new Date(steepEnd(b));return['BEGIN:VEVENT','UID:steep-'+b.id+'@eliquid-lab','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,''),'DTSTART:'+icsD(e)+'T090000','DTEND:'+icsD(e)+'T091500','SUMMARY:'+icsEsc('⏳ Steep klaar: '+b.name),'DESCRIPTION:'+icsEsc('Batch gestart op '+b.date+', '+b.days+' dagen steep. Tijd om te proeven!'),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Steep klaar','TRIGGER:PT0S','END:VALARM','END:VEVENT']}
function icsOut(list,name){const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//E-Liquid Lab//NL','CALSCALE:GREGORIAN'];list.forEach(b=>L.push(...icsEv(b)));L.push('END:VCALENDAR');outFile(name,new Blob([L.join('\r\n')],{type:'text/calendar'}))}
const icsOne=i=>{if(steep[i])icsOut([steep[i]],'steep_'+String(steep[i].name).replace(/\W+/g,'_')+'.ics')};
function icsAll(){const l=steep.filter(b=>steepEnd(b)>Date.now());if(!l.length)return toast('Geen lopende batches');icsOut(l,'steep_batches.ics')}

let scEd=-1,scMl=60;
function scaleBody(r){
 const ml=scMl||0;if(ml<=0)return'<p class="note">Vul een hoeveelheid in.</p>';
 const rows=(r.flavors||[]).filter(f=>f.name&&+f.pct>0).map(f=>{const need=ml*f.pct/100,L=findInv(f.name),st=!L?'<span class="bg bw">niet in voorraad</span>':L.ml<need-.004?`<span class="bg bw">tekort ${(need-L.ml).toFixed(1)} ml</span>`:'<span class="bg bk">✓</span>';
  return`<div class="rr"><span>${esc(f.name)} <span class="sub">${f.pct}%</span></span><span class="rv">${need.toFixed(2)} ml ${st}</span></div>`}).join('');
 const bm=num('nicBaseMg',20)||20,nic=ml*(r.targetNic||0)/bm,mx=maxBatch(r.flavors||[]);
 return rows+`<div class="rr"><span>Nicotinebasis (${bm} mg)</span><span class="rv">${nic.toFixed(2)} ml</span></div>`+(mx!=null?`<div class="sub" style="margin-top:6px">📦 Max met je voorraad: ${mx} ml</div>`:'')}
const scalePanel=(r,i)=>`<div class="it" style="display:block"><div class="sub" style="margin-bottom:6px">⚖️ Schalen: <b>${esc(r.name)}</b> (nu ${r.targetMl||60} ml)</div><div class="chips" style="margin-bottom:8px">${[10,30,50,60,100,120,250].map(v=>`<span class="chip${scMl===v?' on':''}" onclick="scSet(${v},${i},1)">${v} ml</span>`).join('')}</div><div class="fg"><label>Eigen hoeveelheid (ml)</label><input type="number" id="scIn" value="${scMl}" min="1" step="1" oninput="scSet(this.value,${i})"></div><div id="scBody" style="margin-top:8px">${scaleBody(r)}</div><div class="g2" style="margin-top:10px"><button class="b1" onclick="scLoad(${i})">Laden</button><button class="b2" onclick="scSave(${i})">💾 Opslaan als kopie</button></div></div>`;
function scaleTog(i){scEd=scEd===i?-1:i;if(scEd===i)scMl=saved[i].targetMl||60;renderSaved()}
function scSet(v,i,full){scMl=Math.max(0,parseFloat(v)||0);if(full){renderSaved();return}const b=$('scBody');if(b&&saved[i])b.innerHTML=scaleBody(saved[i])}
function scaled(i){const r=structuredClone(saved[i]),f=scMl/(r.targetMl||60);r.targetMl=scMl;r.blend=(r.blend||[]).map(b=>({...b,ml:+(b.ml*f).toFixed(2)}));return r}
function scLoad(i){if(!saved[i]||scMl<=0)return;applyR(scaled(i))}
function scSave(i){if(!saved[i]||scMl<=0)return;const r=scaled(i);r.id=Date.now();r.name=saved[i].name+' ('+scMl+' ml)';r.fav=false;saved.push(r);sv();toast('💾 Opgeslagen als '+r.name)}

const cosW=(a,b)=>{let d=0,x=0,y=0;CATS.forEach(([k])=>{const p=a[k]||0,q=b[k]||0;d+=p*q;x+=p*p;y+=q*q});return x&&y?d/Math.sqrt(x*y):0};
function subPct(f,it){const src=findInv(f.name);let p=+f.pct||0;if(src&&src.rec>0&&it.rec>0)p=p*it.rec/src.rec;if(it.max>0)p=Math.min(p,it.max);return Math.round(p*10)/10}
function subsFor(f,ml,excl,lim){
 const w=catOf(f.name);if(!w)return[];
 return inventory.map((it,ix)=>({it,ix})).filter(({it})=>it.ml>0&&it.name.toLowerCase()!==f.name.toLowerCase()&&!excl.has(it.name.toLowerCase())).map(({it,ix})=>{const w2=catOf(it.name);if(!w2)return null;const sim=cosW(w,w2),pct=subPct(f,it);return{it,ix,sim,pct,ok:it.ml>=ml*pct/100-.004}}).filter(x=>x&&x.sim>=.6).sort((a,b)=>(b.ok-a.ok)||b.sim-a.sim).slice(0,lim||2)}
const subLinks=(s,fn)=>s.map(v=>`<a href="#" style="color:var(--ac)" onclick="${fn(v)};return false">${esc(v.it.name)}</a> (${Math.round(v.sim*100)}% match, ${v.pct}%${v.ok?'':', te weinig'})`).join(' of ');
function subHTML(x){const ex=new Set((x.r.flavors||[]).map(f=>String(f.name).toLowerCase())),out=[];
 x.miss.forEach(m=>{if(m.fi==null)return;const f=x.r.flavors[m.fi];if(!f)return;const s=subsFor(f,x.ml*f.pct/100,ex);if(s.length)out.push(`<div class="sub" style="margin-top:4px">🔁 Vervang <b>${esc(f.name)}</b>: ${subLinks(s,v=>`cookSub('${x.src}',${x.i},${m.fi},${v.ix})`)}</div>`)});return out.join('')}
function cookSub(src,i,fi,ix){const r=structuredClone(src==='rec'?saved[i]:presets[i]);if(!r)return;const f=r.flavors[fi],it=inventory[ix];if(!f||!it)return;const p=subPct(f,it);r.flavors[fi]={name:it.name,pct:p};r.name=r.name+' (met '+it.name.split(' - ').pop()+')';applyR(r);toast('🔁 '+f.name+' → '+it.name+' ('+p+'%)')}
function subHint(){const ml=num('targetMl'),ex=new Set(flavors.map(f=>String(f.name).toLowerCase())),out=[];
 flavors.forEach((f,fi)=>{if(!f.name||!(+f.pct>0))return;const L=findInv(f.name),need=ml*f.pct/100;if(L&&L.ml>=need-.004)return;const s=subsFor(f,need,ex);if(s.length)out.push(`<div style="margin-top:6px">🔁 <b>${esc(f.name)}</b> ${L?'is te weinig':'niet in voorraad'}: ${subLinks(s,v=>`calcSub(${fi},${v.ix})`)}</div>`)});return out.join('')}
function calcSub(fi,ix){const f=flavors[fi],it=inventory[ix];if(!f||!it)return;flavors[fi]={name:it.name,pct:subPct(f,it)};renderFlavors();calculate();toast('🔁 '+it.name)}

/* ===== v4.9: merk, naslag, werkelijke dosering, reverse engineering ===== */
const brandOf=it=>(it.brand||'').trim()||(/ - /.test(it.name)?it.name.split(' - ')[0].trim():'');
function brandSel(){const b=[...new Set(inventory.map(brandOf).filter(Boolean))].sort();if(b.length<2)return'';return`<select style="width:auto;margin-left:6px" onchange="setBrandF(this.value)"><option value="">Alle merken</option>${b.map(x=>`<option value="${esc(x)}"${brandF===x?' selected':''}>${esc(x)}</option>`).join('')}</select>`}
function setBrandF(v){brandF=v;renderInventory()}
function aromaUse(name){const n=String(name).toLowerCase(),u=[];
 log.forEach(l=>{const f=((l.r&&l.r.flavors)||[]).find(x=>String(x.name).toLowerCase()===n&&+x.pct>0);if(f){const b=steep.find(s=>s.name===l.r.name&&s.rating>0);u.push({pct:+f.pct,ml:l.ml*f.pct/100,rating:b?b.rating:0})}});return u}
function refPanel(it,i){
 const u=aromaUse(it.name),n=u.length,w=catOf(it.name),prof=w?Object.entries(w).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${CN[k]||k} ${Math.round(v*100)}%`).join(' · '):'onbekend',
  avg=n?u.reduce((a,x)=>a+x.pct,0)/n:0,tot=u.reduce((a,x)=>a+x.ml,0),rated=u.filter(x=>x.rating>0),best=rated.length?Math.max(...rated.map(x=>x.rating)):0,top=rated.filter(x=>x.rating===best),sweet=top.length&&rated.length>=2?top.reduce((a,x)=>a+x.pct,0)/top.length:0,
  recs=saved.map(r=>({r,f:(r.flavors||[]).find(f=>String(f.name).toLowerCase()===it.name.toLowerCase())})).filter(x=>x.f).map(x=>{const b=steep.filter(s=>s.name===x.r.name&&s.rating>0).sort((a,c)=>c.rating-a.rating)[0];return esc(x.r.name)+' ('+x.f.pct+'%'+(b?' · '+'★'.repeat(b.rating):'')+')'}),
  pm=it.fl&&it.fl.length?null:(it.price&&it.size?it.price/it.size:null),row=(a,b)=>`<div class="rr"><span>${a}</span><span class="rv" style="text-align:right">${b}</span></div>`;
 return`<div style="flex-basis:100%;margin-top:8px;padding-top:6px;border-top:1px solid var(--bd)"><div class="sub" style="margin-bottom:4px"><b>📖 Naslag</b></div>`+
  row('Merk',esc(brandOf(it)||'–'))+row('Smaakprofiel',prof)+row('Richtlijn',[it.rec&&'aanb. '+it.rec+'%',it.max&&'max '+it.max+'%',it.steep&&'steep '+it.steep+' d'].filter(Boolean).join(' · ')||'–')+
  row('Voorraad',it.ml+' ml'+(pm?` · €${pm.toFixed(2)}/ml`:''))+row('Gemixt',n?`${n}× · ${tot.toFixed(1)} ml · gem. ${avg.toFixed(1)}%`:'nog niet')+
  (sweet?row('Hoogst beoordeeld',`★${best} bij ± ${sweet.toFixed(1)}%`+(Math.abs(sweet-(it.rec||0))>=.3?` <button class="b2 sm" onclick="refUse(${i},${+sweet.toFixed(1)})">Als aanbeveling</button>`:'')):'')+
  (it.str||it.note?row('Notitie',[it.str&&'sterkte '+it.str,it.note&&esc(it.note)].filter(Boolean).join(' · ')):'')+
  row('Ingrediënten',it.ingr?ingrHTML(it.ingr):'niet ingevuld')+row('In recepten',recs.length?recs.join('<br>'):'geen opgeslagen recepten')+'</div>'}
function refUse(i,v){if(!inventory[i])return;inventory[i].rec=v;renderInventory();toast('✅ Aanbevolen dosering: '+v+'%')}

const SYN=[
['aardbei|strawberr|fraise',['strawberr'],'fruit'],['framboos|raspberr',['raspberr'],'fruit'],['bosbes|blauwe bes|blueberr',['blueberr'],'fruit'],['braam|blackberr',['blackberr'],'fruit'],
['kers|cherr',['cherr'],'fruit'],['appel|apple',['apple'],'fruit'],['peer\\b|pear',['pear'],'fruit'],['perzik|peach|nectarine',['peach','nectarine'],'fruit'],['banaan|banana',['banana'],'fruit'],
['mango',['mango'],'fruit'],['ananas|pineapple',['pineapple'],'fruit'],['kokos|coconut',['coconut'],'fruit'],['citroen|lemon',['lemon'],'fruit'],['limoen|\\blime',['lime'],'fruit'],
['sinaasappel|orange|mandarijn|tangerine',['orange','tangerine','mandarin'],'fruit'],['pompelmoes|grapefruit',['grapefruit'],'fruit'],['druif|grape',['grape'],'fruit'],
['watermeloen|meloen|melon',['watermelon','melon','cantaloupe','honeydew'],'fruit'],['kiwi',['kiwi'],'fruit'],['passie|passion',['passion'],'fruit'],
['vanille|vanilla',['vanilla'],'romig'],['room|cream|custard|\\bvla\\b',['cream','custard'],'romig'],['\\bijs\\b|ice cream|roomijs',['ice cream','vanilla','cream'],'romig'],['yoghurt|yogurt',['yogurt','yoghurt'],'romig'],
['koekje|cookie|biscuit|speculoos|graham',['cookie','biscuit','graham','speculoos'],'bakkerij'],['taart|cake|cheesecake',['cheesecake','cake'],'bakkerij'],['donut|doughnut',['donut','doughnut'],'bakkerij'],
['brood|croissant|gebak|pastry|bread',['bread','croissant','pastry','danish'],'bakkerij'],['chocolade|chocolate|cacao|cocoa',['chocolate','cocoa','cacao'],'zoet'],['karamel|caramel',['caramel'],'zoet'],
['boter|butter',['butter'],'romig'],['hazelnoot|hazelnut',['hazelnut'],'zoet'],['amandel|almond',['almond','marzipan'],'zoet'],['honing|honey',['honey'],'zoet'],['snoep|candy|gummy',['candy','gummy','cotton'],'zoet'],
['koffie|coffee|espresso|cappuccino',['coffee','espresso','cappuccino','mocha'],'drank'],['thee|\\btea\\b',['tea'],'drank'],['cola',['cola'],'drank'],['whisky|whiskey|bourbon|\\brum\\b|cognac',['whisk','bourbon','rum','cognac'],'drank'],
['tabak|tobacco',['tobacco','ry4','cigar','virginia','burley'],'tabak'],['munt|mint|menthol',['mint','menthol'],'fris'],['koel|koud|\\bcool\\b|frisheid',['cool','koolada','menthol'],'fris'],
['fruitig|fruity|\\bfruit\\b',[],'fruit'],['romig|creamy',[],'romig'],['bakkerij|bakery',[],'bakkerij'],['zoet|\\bsweet\\b',[],'zoet'],['\\bfris|fresh',[],'fris'],['drankje|beverage',[],'drank']];
const revLow=it=>(it.name+' '+(it.note||'')).toLowerCase(),revSort=(a,b)=>((b.rec>0)-(a.rec>0))||b.ml-a.ml;
function revPick(w,used){
 const stems=w[1],cat=w[2];let c=[];
 if(stems.length)c=inventory.filter(it=>!used.has(it.name)).map(it=>({it,h:stems.reduce((a,st)=>a+(revLow(it).includes(st)?1:0),0)})).filter(x=>x.h>0);
 const st=c.filter(x=>x.it.ml>0).sort((a,b)=>b.h-a.h||revSort(a.it,b.it));
 if(st.length)return{it:st[0].it,t:'exact'};
 const alt=inventory.filter(it=>it.ml>0&&!used.has(it.name)).filter(it=>{const x=catOf(it.name);return x&&(x[cat]||0)>=.5}).sort(revSort);
 if(alt.length)return{it:alt[0],t:stems.length?'alt':'exact',op:c.length>0};
 return{t:'none',op:c.length>0}}
let revRes=null;
function revGo(){
 const txt=($('revIn').value||'').trim().toLowerCase(),el=$('rev');revRes=null;
 if(!txt){el.innerHTML='<p class="note">Typ een smaak, bijvoorbeeld "aardbei banaan ijs".</p>';return}
 const ws=[];SYN.forEach(w=>{const m=new RegExp(w[0]).exec(txt);if(m)ws.push({w,at:m.index,lbl:m[0]})});ws.sort((a,b)=>a.at-b.at);
 if(!ws.length){el.innerHTML='<p class="note">Ik herken hier geen smaken in. Probeer woorden als aardbei, vanille, ijs, koekje, karamel, tabak, koffie of munt.</p>';return}
 const used=new Set(),picks=[],lines=[];
 ws.forEach(x=>{const r=revPick(x.w,used);
  if(r.t==='none')lines.push(`<div class="sub">❌ <b>${esc(x.lbl)}</b>: ${r.op?'dat aroma is op en er is geen alternatief':'niets passends in je voorraad'}</div>`);
  else{used.add(r.it.name);picks.push({it:r.it,cat:x.w[2]});lines.push(r.t==='exact'?`<div class="sub">✅ <b>${esc(x.lbl)}</b> → ${esc(r.it.name)}</div>`:`<div class="sub">🔁 <b>${esc(x.lbl)}</b>: ${r.op?'dat aroma is op':'geen aroma met die naam'}, alternatief uit ${CN[x.w[2]]||x.w[2]} → ${esc(r.it.name)}</div>`)}});
 const ex=ws.filter(x=>x.w[1].length),sim=saved.map((r,i)=>({r,src:'rec',i})).concat(presets.map((r,i)=>({r,src:'pre',i}))).map(o=>{const h=(o.r.name+' '+(o.r.flavors||[]).map(f=>f.name).join(' ')).toLowerCase();return{...o,sc:ex.filter(x=>x.w[1].some(s=>h.includes(s))).length}}).filter(o=>o.sc>0).sort((a,b)=>b.sc-a.sc).slice(0,2),
  simH=sim.length?`<div class="sub" style="margin:10px 0 4px">Bestaande recepten die hierop lijken:</div>`+sim.map(o=>`<div class="it"><div style="min-width:0"><b style="font-size:.86rem">${esc(o.r.name)}</b><div class="sub">${o.sc} van ${ex.length} smaken herkend</div></div><button class="b2 sm" onclick="cookLoad('${o.src}',${o.i})">Laden</button></div>`).join(''):'';
 if(!picks.length){el.innerHTML=lines.join('')+simH;return}
 picks.forEach((p,idx)=>{const w=catOf(p.it.name),dom=w?Object.keys(w).sort((a,b)=>w[b]-w[a])[0]:p.cat;p.pct=(p.it.rec>0?p.it.rec:DEFP[dom]||3)*(idx===0?1:.6)});
 const tot=picks.reduce((a,p)=>a+p.pct,0),sc=tot>12?12/tot:tot<7?Math.min(1.6,8/tot):1;
 picks.forEach(p=>{let v=p.pct*sc;if(p.it.max>0)v=Math.min(v,p.it.max);p.pct=Math.max(.5,Math.round(v*2)/2)});
 revRes={name:'Startrecept '+txt.slice(0,30),list:picks.map(p=>({name:p.it.name,pct:p.pct}))};
 const t2=revRes.list.reduce((a,f)=>a+f.pct,0);
 el.innerHTML=`<div class="it" style="display:block;margin-top:10px"><b>Startrecept</b><div class="sub" style="margin:4px 0 6px">Totaal ${t2.toFixed(1)}% aroma</div>${picks.map(p=>`<div class="sub" style="display:flex;justify-content:space-between;gap:8px"><span>${esc(p.it.name)}</span><b>${p.pct}%</b></div>`).join('')}<div style="margin-top:8px">${lines.join('')}</div><button class="b1" style="margin-top:10px;width:100%" onclick="revLoad()">Laad in calculator</button></div>`+simH}
function revLoad(){if(!revRes)return;applyR({name:revRes.name,targetMl:num('targetMl',60),targetNic:num('targetNic',3),targetVg:num('targetVg',70),nicType,flavors:structuredClone(revRes.list),blend:[]})}

/* ===== v5.0: ingredienten-check en doel-kostprijs ===== */
const ING=[
['diacetyl|butanedione|butaandion','hoog','diacetyl','Diacetyl (2,3-butaandion) wordt bij inademing in verband gebracht met ernstige longziekte bij werknemers in de voedingsindustrie.'],
['pentanedione|pentaandion|acetyl propionyl|hexanedione|heptanedione','hoog','2,3-pentaandion e.d.','2,3-pentaandion en verwante diketonen zijn chemisch verwant aan diacetyl, met vergelijkbare zorgen.'],
['acetoin|acetoine|acetoïne','middel','acetoïne','Acetoïne is minder giftig, maar kan in e-liquid diacetyl vormen.'],
['cinnamaldehyde|kaneelaldehyde|cinnamic aldehyde','middel','cinnamaldehyde','Cinnamaldehyde (kaneel) wordt in studies in verband gebracht met irritatie van de luchtwegen.'],
['benzaldehyde','laag','benzaldehyde','Benzaldehyde (kers of amandel) komt vaak voor en kan bij hoge concentraties irriterend zijn.']];
function ingrCheck(t){
 const x=String(t||'').toLowerCase(),out=[];
 ING.forEach(([re,lvl,name,msg])=>{const m=new RegExp(re).exec(x);if(!m)return;
  const pre=x.slice(Math.max(0,m.index-22),m.index),post=x.slice(m.index+m[0].length,m.index+m[0].length+10);
  const neg=/(vrij|free|zonder|geen|\bno\b|without|niet)\s*(van\s|of\s)?$/.test(pre)||/^\s*[-\s]?(vrij|free|negatief)/.test(post);
  if(!neg)out.push({lvl,name,msg})});return out}
const ingCls=l=>l==='hoog'?'bw':'ba';
const ingrHTML=t=>{const g=ingrCheck(t);return g.length?g.map(f=>`<span class="bg ${ingCls(f.lvl)}">${esc(f.name)}</span>`).join(' '):'<span class="bg bk">geen aandachtsstoffen genoemd</span>'};
const ingrTag=it=>{if(!it.ingr)return'';const g=ingrCheck(it.ingr);return g.length?'⚠️ '+g.map(f=>f.name).join(', '):'🧪 ingrediënten genoteerd'};
function ingGo(){const t=$('ingIn').value,el=$('ingOut');if(!t.trim()){el.innerHTML='';return}
 const g=ingrCheck(t);
 el.innerHTML=g.length?g.map(f=>`<div class="it" style="display:block;margin-top:8px"><span class="bg ${ingCls(f.lvl)}">${f.lvl==='hoog'?'⚠️ aandachtspunt':'ℹ️ let op'}</span> <b style="font-size:.86rem">${esc(f.name)}</b><div class="sub" style="margin-top:4px">${f.msg}</div></div>`).join(''):'<p class="note">Geen van de bekende aandachtsstoffen wordt in deze tekst genoemd. Dat betekent niet dat het aroma veilig is: alleen dat deze stoffen er niet in staan.</p>'}
function ingFill(){const s=$('ingSel');if(!s)return;const v=s.value;s.innerHTML='<option value="">Kies aroma om op te slaan</option>'+inventory.map((it,i)=>`<option value="${i}">${esc(it.name)}</option>`).join('');s.value=v}
function ingSave(){const i=parseInt($('ingSel').value);if(isNaN(i)||!inventory[i])return toast('Kies eerst een aroma');if(!$('ingIn').value.trim())return toast('Plak eerst een tekst');inventory[i].ingr=$('ingIn').value.trim();renderInventory();toast('🧪 Bewaard bij '+inventory[i].name)}

let cg=parseFloat(load('vape_cgoal',0))||0;
if($('cgIn'))$('cgIn').value=cg||'';
function cgSet(v){cg=Math.max(0,parseFloat(v)||0);store('vape_cgoal',cg);calculate()}
const ppmOf=L=>L&&L.price&&L.size?L.price/L.size:P.fl;
function costGoalRender(c,cost){
 const el=$('costGoal');if(!el)return;if(!(cg>0)||!(c.ml>0)){el.innerHTML='';return}
 const cur=cost/c.ml,diff=(cur/cg-1)*100;
 if(cur<=cg){el.innerHTML=`<div class="note" style="color:var(--ok)">✅ €${cur.toFixed(3)}/ml: ${Math.abs(diff).toFixed(0)}% onder je doel van €${cg.toFixed(2)}/ml.</div>`;return}
 const fl=flavors.filter(f=>f.name&&+f.pct>0).map((f,k)=>{const L=findInv(f.name);return{f,L,fi:flavors.indexOf(f),cost:c.ml*f.pct/100*ppmOf(L),est:!(L&&L.price&&L.size)}}).sort((a,b)=>b.cost-a.cost);
 const ex=new Set(flavors.map(f=>String(f.name).toLowerCase())),sw=[];
 fl.forEach(x=>{const need=c.ml*x.f.pct/100;subsFor(x.f,need,ex,6).forEach(s=>{const nc=c.ml*s.pct/100*ppmOf(s.it),sv=x.cost-nc;if(sv>.005)sw.push({x,s,sv})})});
 sw.sort((a,b)=>b.sv-a.sv);const seen=new Set(),best=sw.filter(w=>{if(seen.has(w.x.fi))return false;seen.add(w.x.fi);return true}).slice(0,3);
 const top=fl.slice(0,3).map(x=>`${esc(x.f.name)}: €${x.cost.toFixed(2)}${x.est?' (geschat, geen prijs)':''}`).join(' · ');
 el.innerHTML=`<div class="note" style="color:#fbbf24">⚠️ €${cur.toFixed(3)}/ml is ${diff.toFixed(0)}% boven je doel van €${cg.toFixed(2)}/ml (€${(cur*c.ml-cg*c.ml).toFixed(2)} te veel voor ${c.ml} ml).</div>`+
  (top?`<div class="sub" style="margin-top:4px">Duurste aroma's in dit recept: ${top}</div>`:'')+
  (best.length?best.map(w=>`<div class="sub" style="margin-top:6px">🔁 Vervang <b>${esc(w.x.f.name)}</b> door <a href="#" style="color:var(--ac)" onclick="calcSub(${w.x.fi},${w.s.ix});return false">${esc(w.s.it.name)}</a> (${Math.round(w.s.sim*100)}% match, ${w.s.pct}%): bespaart ± €${w.sv.toFixed(2)} per batch</div>`).join(''):'<div class="sub" style="margin-top:6px">Geen goedkopere aroma\'s uit je voorraad die goed genoeg passen. Kijk naar een kleinere batch, minder aroma of een goedkopere nicotinebasis.</div>')}

/* ===== v5.1 ===== */
const thr=it=>it.min>0?it.min:5;
/* 2. weegschaal-nauwkeurigheid */
let scRes=parseFloat(load('vape_res',0.01))||0.01;
const scDec=()=>scRes>=1?0:scRes>=.1?1:2,gf=x=>(+x).toFixed(scDec());
if($('resSel'))$('resSel').value=String(scRes);
function resSet(v){scRes=parseFloat(v)||0.01;store('vape_res',scRes);calculate()}
function resRender(c){
 const el=$('resNote');if(!el)return;if(mode!=='g'||!(c.ml>0)){el.innerHTML='';return}
 const st=[];if(c.nicMl>0)st.push({n:'Nicotine',g:c.nicMl*D.NIC,pct:0});
 flavors.forEach(f=>{if(f.name&&+f.pct>0)st.push({n:f.name,g:c.ml*f.pct/100*D.FL,pct:+f.pct})});
 const bad=st.filter(x=>x.g>0&&scRes/x.g>.08).sort((a,b)=>a.g-b.g),lbl=String(scRes).replace('.',',');
 if(!bad.length){el.innerHTML=`<div class="note" style="color:var(--ok)">⚖️ Alle stappen zijn goed te wegen op ${lbl} g.</div>`;return}
 const sm=bad.filter(x=>x.pct),mn=sm.length?Math.min(...sm.map(x=>x.pct)):0,sugg=mn?Math.ceil(scRes*12.5/(mn/100*D.FL)):0;
 el.innerHTML=`<div class="note" style="color:#fbbf24">⚖️ Op ${lbl} g nauwkeurig zijn deze stappen lastig te wegen:</div>`+bad.slice(0,4).map(x=>`<div class="sub">• ${esc(x.n)}: ${x.g.toFixed(2)} g, tot ±${Math.round(scRes/x.g*100)}% afwijking</div>`).join('')+(sugg>c.ml&&sugg<=1000?`<button class="b2 sm" style="margin-top:6px" onclick="$('targetMl').value=${sugg};calculate()">Batch vergroten naar ${sugg} ml</button>`:'')}

/* 15, 9, 13. smaakopbouw, wat ontbreekt, steep-verloop */
const NOTE={fruit:0,fris:0,zoet:1,bakkerij:1,drank:1,romig:2,tabak:2},NOTEN=[['🍓','Topnoot','eerste indruk'],['🎼','Hartnoot','karakter'],['🍂','Basisnoot','nasmaak']];
function noteData(list){const sh=[0,0,0],names=[[],[],[]];let tot=0;
 list.forEach(f=>{const w=catOf(f.name),p=+f.pct||0;if(!w)return;const part=[0,0,0];for(const k in w){const n=NOTE[k];if(n!=null)part[n]+=w[k]}
  let best=-1,bv=0;part.forEach((v,n)=>{sh[n]+=v*p;if(v>bv){bv=v;best=n}});tot+=p;if(best>=0)names[best].push(esc(f.name)+' '+p+'%')});
 return{sh,names,tot}}
function missingFor(p,n){
 const o=[],a=(c,why)=>o.push({c,why});const d=Object.keys(p).sort((x,y)=>p[y]-p[x])[0],sh=p[d]||0;
 if(n<2)a(null,'Slechts één aroma: een tweede aroma maakt de smaak complexer.');
 if(sh>=.4){
  if(d==='fruit'){if(p.romig<.1)a('romig','Weinig body: een romig aroma geeft een rondere nasmaak.');if(sh>=.6&&p.fris<.05)a('fris','Een licht koel aroma kan de fruitige finish scherper maken.')}
  else if(d==='romig'){if(p.fruit+p.bakkerij+p.zoet<.15)a('fruit','Weinig topnoot: voeg fruit of een zoet accent toe.')}
  else if(d==='bakkerij'){if(p.romig<.1)a('romig','Bakkerij zonder room voelt vaak droog: probeer een romig aroma.');if(p.zoet<.05)a('zoet','Een zoet accent (karamel of honing) rondt af.')}
  else if(d==='tabak'){if(p.zoet<.08)a('zoet','Tabak krijgt meer diepte met een zoet accent (karamel, vanille).')}
  else if(d==='drank'){if(p.romig+p.zoet<.15)a('romig','Dranksmaken winnen met een romig of zoet accent.')}
  else if(d==='fris'){if(p.fruit<.2)a('fruit','Fris zonder fruit is vlak: een fruitaroma geeft smaak onder de koelte.')}
  else if(d==='zoet'){if(p.fris+p.fruit<.15)a('fris','Alleen zoet wordt snel zwaar: een fruit- of koel aroma brengt balans.')}}
 return o}
function missSugg(c,list){const used=new Set(list.map(f=>String(f.name).toLowerCase()));
 return inventory.map((it,ix)=>({it,ix,w:catOf(it.name)})).filter(x=>x.it.ml>0&&!used.has(x.it.name.toLowerCase())&&x.w&&(x.w[c]||0)>=.5).sort((a,b)=>revSort(a.it,b.it)).slice(0,2).map(x=>({ix:x.ix,it:x.it,pct:Math.max(.5,Math.round(Math.min(x.it.rec>0?x.it.rec:(DEFP[c]||2),3)*2)/2)}))}
const SPK={fruit:5,fris:2,zoet:7,drank:10,romig:14,bakkerij:14,tabak:21},SDC={fruit:.35,fris:.45,zoet:.2,drank:.2,romig:.1,bakkerij:.1,tabak:.05},SCOL=['#22d3ee','#c084fc','#fbbf24','#34d399','#fb7185','#60a5fa'];
function steepProf(f){const it=findInv(f.name),w=catOf(f.name)||{};let pk=0,dc=0,t=0;for(const k in w){pk+=w[k]*(SPK[k]||7);dc+=w[k]*(SDC[k]||.2);t+=w[k]}if(!t){pk=7;dc=.2}else{pk/=t;dc/=t}if(it&&it.steep>0)pk=it.steep;return{pk,dc}}
const steepY=(d,pr)=>d<=pr.pk?.4+.6*Math.pow(d/pr.pk,.8):1-pr.dc*Math.min(1,(d-pr.pk)/30);
function steepChart(list,mark){
 const L=(list||[]).filter(f=>f.name&&+f.pct>0).slice(0,6);if(!L.length)return'';
 const X=d=>30+d/28*260,Y=v=>120-(v-.3)/.75*100,pr=L.map(steepProf);
 const lines=L.map((f,i)=>{const pts=[];for(let d=0;d<=28;d++)pts.push(X(d).toFixed(1)+','+Y(Math.min(1.05,steepY(d,pr[i]))).toFixed(1));return`<polyline points="${pts.join(' ')}" fill="none" stroke="${SCOL[i]}" stroke-width="2"/>`}).join('');
 const grid=[0,7,14,21,28].map(d=>`<line x1="${X(d)}" y1="20" x2="${X(d)}" y2="120" style="stroke:var(--bd)"/><text x="${X(d)}" y="134" text-anchor="middle" font-size="9" style="fill:var(--mu)">${d}d</text>`).join('');
 const mx=mark!=null&&mark>=0?Math.min(28,mark):-1,mk=mx>=0?`<line x1="${X(mx)}" y1="14" x2="${X(mx)}" y2="120" stroke="#fbbf24" stroke-dasharray="4 3"/><text x="${X(mx)}" y="10" text-anchor="middle" font-size="9" fill="#fbbf24">nu</text>`:'';
 return`<svg viewBox="0 0 300 142" style="width:100%">${grid}<text x="26" y="28" text-anchor="end" font-size="9" style="fill:var(--mu)">top</text>${lines}${mk}</svg><div style="display:flex;flex-wrap:wrap;gap:4px 12px">${L.map((f,i)=>`<span class="sub"><i style="display:inline-block;width:10px;height:3px;background:${SCOL[i]};margin-right:4px;vertical-align:middle"></i>${esc(f.name)} (piek ± dag ${Math.round(pr[i].pk)})</span>`).join('')}</div><div class="sub" style="margin-top:6px">Schatting op basis van de smaakcategorie en je steeptijd per aroma. Geen meting.</div>`}
function stChart(b){const r=(log.find(l=>l.r&&l.r.name===b.name)||{}).r||saved.find(x=>x.name===b.name);if(!r)return'<div class="sub" style="margin-top:6px">Geen recept gevonden voor deze batch.</div>';return`<div style="margin-top:6px">${steepChart(r.flavors||[],(Date.now()-(b.start||b.id))/864e5)}</div>`}
const stGrTog=i=>{stGr=stGr===i?-1:i;renderSteep()};
function renderBuild(){
 const nb=$('noteBox');if(!nb)return;const list=curList().filter(f=>f.name&&+f.pct>0);
 if(!list.length){nb.innerHTML='<p class="note">Voeg aroma\'s toe om de smaakopbouw te zien.</p>';$('radMiss').innerHTML='';$('stCh').innerHTML='';return}
 const d=noteData(list),p=catProfile(list);
 nb.innerHTML=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${NOTEN.map(([e,t,s],n)=>`<div style="background:var(--in);border:1px solid var(--bd);border-radius:12px;padding:8px"><div style="font-weight:700;font-size:.8rem">${e} ${t}</div><div class="sub">${s}</div><div style="font-size:1.1rem;font-weight:800;color:var(--ac);margin:4px 0">${d.tot?Math.round(d.sh[n]/d.tot*100):0}%</div>${d.names[n].map(x=>`<div class="sub">${x}</div>`).join('')||'<div class="sub">–</div>'}</div>`).join('')}</div>`;
 let mh='';
 if(p){const mi=missingFor(p,list.length);
  mh=`<div class="sub" style="margin:12px 0 4px"><b>🔎 Wat ontbreekt?</b> <span style="opacity:.7">(vuistregels)</span></div>`+(mi.length?mi.map(m=>{const s=m.c?missSugg(m.c,list):[];return`<div class="sub" style="margin-top:6px">💡 ${m.why}</div>`+s.map(x=>`<button class="b2 sm" style="margin:4px 6px 0 0" onclick="radAdd(${x.ix},${x.pct})">+ ${esc(x.it.name)} ${x.pct}%</button>`).join('')}).join(''):'<div class="sub">✅ Dit recept is mooi gebalanceerd volgens de basisregels.</div>')}
 $('radMiss').innerHTML=mh;
 $('stCh').innerHTML=`<div class="sub" style="margin:12px 0 6px"><b>📈 Steep-verloop</b></div>`+steepChart(list)}

/* 10. voorraadkaart */
function renderInvMap(){
 const el=$('invMap');if(!el)return;const st={},c2={};CATS.forEach(([k])=>{st[k]=0;c2[k]=0});let tot=0;
 inventory.forEach(it=>{if(!(it.ml>0))return;const w=catOf(it.name);if(!w)return;let dk=null,dv=0;for(const k in w){if(st[k]==null)continue;st[k]+=it.ml*w[k];tot+=it.ml*w[k];if(w[k]>dv){dv=w[k];dk=k}}if(dk)c2[dk]++});
 if(tot<=0){el.innerHTML='<p class="note">Voeg aroma\'s met voorraad toe om de kaart te zien.</p>';return}
 const mx=Math.max(...CATS.map(([k])=>st[k])),bd=buyData(),us=bd&&bd.tot>0?bd.cu:null;
 const tiles=CATS.map(([k,n,e])=>{const a=st[k]/mx;return`<div style="background:rgba(34,211,238,${(.08+a*.5).toFixed(2)});border:1px solid var(--bd);border-radius:12px;padding:8px;text-align:center"><div style="font-size:1.2rem">${e}</div><div style="font-weight:700;font-size:.78rem">${n}</div><div class="sub">${c2[k]} aroma${c2[k]===1?'':'s'} · ${Math.round(st[k])} ml</div></div>`}).join('');
 const gaps=CATS.filter(([k])=>c2[k]===0).map(([k,n,e])=>e+' '+n),thin=us?CATS.filter(([k])=>us[k]/bd.tot>=.15&&st[k]/tot<us[k]/bd.tot*.5&&c2[k]>0).map(([k,n,e])=>e+' '+n):[];
 el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${tiles}</div>`+(gaps.length?`<div class="sub" style="margin-top:10px">🕳️ Geen aroma's in: <b>${gaps.join(', ')}</b></div>`:'<div class="sub" style="margin-top:10px">✅ Je hebt aroma\'s in alle categorieën.</div>')+(thin.length?`<div class="sub" style="margin-top:4px">📉 Je gebruikt veel meer dan je op voorraad hebt van: <b>${thin.join(', ')}</b></div>`:'')}

/* 17. telmodus */
const extraChips=()=>kindChips()+`<span class="chip${cntMode?' on':''}" onclick="cntTog()">🔢 Telmodus</span><span class="chip" onclick="scanOpen('find')">📷 Scan</span>`;
function cntTog(){cntMode=!cntMode;renderInventory()}
function cntAdj(i,d){const it=inventory[i];if(!it||!d)return;undoPush('Voorraad geteld',1);
 if(d<0)invTake(it,-d);
 else if(it.fl&&it.fl.length){const b=it.fl.find(b=>b.ml<b.size-.004)||it.fl[it.fl.length-1];b.ml=+(b.ml+d).toFixed(2);if(b.ml>b.size)b.size=Math.ceil(b.ml);invSync(it)}
 else it.ml=+(it.ml+d).toFixed(2);
 renderInventory();calculate()}
function renderCount(){
 $('invCount').textContent=inventory.length+' items';
 const sc=[1,5,10].map(v=>`<span class="chip${cntStep===v?' on':''}" onclick="cntStep=${v};renderInventory()">±${v} ml</span>`).join('');
 $('inv').innerHTML=`<div class="note" style="margin-top:0">🔢 Telmodus: tik op − of + of typ de hoeveelheid. Het filter hierboven blijft actief.</div><div class="chips">${sc}</div>`+inventory.map((it,i)=>{if(!invOk(it))return'';const fl=it.fl&&it.fl.length;
  return`<div class="it"><div style="min-width:0;flex:1"><b style="font-size:.86rem">${esc(it.name)}</b>${fl?`<div class="sub">${it.fl.length} flesje${it.fl.length>1?'s':''}</div>`:''}</div><div style="display:flex;align-items:center;gap:6px"><button class="b2 sm" onclick="cntAdj(${i},-cntStep)">−</button><input type="number" value="${it.ml}" ${fl?'readonly':''} onchange="updInv(${i},this.value)" style="width:72px;text-align:center"><button class="b2 sm" onclick="cntAdj(${i},cntStep)">+</button></div></div>`}).join('')}

/* 20. barcode */
let scanSt=null,scanStream=null,scanTimer=0;
function scanOpen(mode,idx){scanSt={mode,idx};$('scanOv').style.display='flex';$('scanMsg').textContent='';$('scanManual').value='';$('scanPick').innerHTML='';scanStart()}
async function scanStart(){
 const v=$('scanVid');
 if(!('BarcodeDetector' in window)||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$('scanMsg').textContent='Camera-scan wordt hier niet ondersteund. Typ de code, of scan hem met een barcodelezer en druk op Enter.';v.style.display='none';return}
 try{scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});v.style.display='';v.srcObject=scanStream;await v.play();
  const det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']});$('scanMsg').textContent='Richt de camera op de barcode.';
  const tick=async()=>{if(!scanStream)return;try{const r=await det.detect(v);if(r.length){scanDone(r[0].rawValue);return}}catch{}scanTimer=setTimeout(tick,300)};tick()}
 catch(e){$('scanMsg').textContent='Geen toegang tot de camera ('+((e&&e.name)||'fout')+'). Typ de code hieronder in.';v.style.display='none'}}
function scanStop(){clearTimeout(scanTimer);if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}const v=$('scanVid');if(v)v.srcObject=null}
function scanClose(){scanStop();$('scanOv').style.display='none';scanSt=null}
function scanManualGo(){const c=$('scanManual').value.trim();if(c)scanDone(c)}
function scanShow(i){invFilter='all';brandF='';cntMode=false;refI=i;switchTab('inv');renderInventory();setTimeout(()=>{const e=$('inv-'+i);if(e)e.scrollIntoView({block:'center',behavior:'smooth'})},150);toast('📖 '+inventory[i].name)}
function scanDone(code){
 scanStop();code=String(code).trim();if(!scanSt||!code)return;const idx=inventory.findIndex(x=>x.barcode===code);
 if(scanSt.mode==='link'){const i=scanSt.idx;if(idx>=0&&idx!==i){toast('Code verplaatst van '+inventory[idx].name);delete inventory[idx].barcode}if(inventory[i])inventory[i].barcode=code;scanClose();renderInventory();toast('✅ Barcode gekoppeld');return}
 if(idx>=0){scanClose();scanShow(idx);return}
 $('scanMsg').textContent='Onbekende code '+code+'. Koppel hem aan een aroma:';
 $('scanPick').innerHTML=`<select id="scanSel">${inventory.map((it,i)=>`<option value="${i}">${esc(it.name)}</option>`).join('')}</select><button class="b1" style="margin-top:8px;width:100%" onclick="scanLink('${esc(code)}')">Koppel en open</button>`}
function scanLink(code){const i=parseInt($('scanSel').value);if(!inventory[i])return;inventory.forEach(x=>{if(x.barcode===code)delete x.barcode});inventory[i].barcode=code;scanClose();scanShow(i)}

/* 29. csv */
function csvEsc(v){let s=typeof v==='number'?String(v).replace('.',','):String(v==null?'':v);if(/[;"\n\r]/.test(s))s='"'+s.replace(/"/g,'""')+'"';return s}
function csvOut(k){
 let h,rows,n;const fl=r=>((r&&r.flavors)||[]).map(f=>f.name+' '+f.pct+'%').join(' + ');
 if(k==='inv'){h=['Aroma','Merk','Voorraad ml','Aanbevolen %','Max %','Steep dagen','Herbestel bij ml','Prijs per ml','Categorie','Barcode','Notitie'];rows=inventory.map(i=>[i.name,brandOf(i),i.ml,i.rec||'',i.max||'',i.steep||'',i.min||'',i.price&&i.size?+(i.price/i.size).toFixed(3):'',i.cat||'',i.barcode||'',i.note||'']);n='voorraad'}
 else if(k==='log'){h=['Datum','Recept','ml','Kost','Kost per ml','Aromas'];rows=log.map(l=>[new Date(l.t).toLocaleDateString('nl-BE'),(l.r&&l.r.name)||'',l.ml,+(+l.cost||0).toFixed(2),l.ml?+((+l.cost||0)/l.ml).toFixed(3):'',fl(l.r)]);n='mixlog'}
 else if(k==='rec'){h=['Naam','ml','Nicotine mg','VG %','Type','Aromas','Favoriet'];rows=saved.map(r=>[r.name,r.targetMl,r.targetNic,r.targetVg,r.nicType||'',fl(r),r.fav?'ja':'']);n='recepten'}
 else{h=['Naam','Start','Dagen','Klaar op','Sterren','Notities'];rows=steep.map(b=>[b.name,b.date||'',b.days,new Date(steepEnd(b)).toLocaleDateString('nl-BE'),b.rating||'',b.notes||'']);n='steep'}
 outFile('eliquid_'+n+'_'+new Date().toISOString().slice(0,10)+'.csv',new Blob(['﻿'+[h].concat(rows).map(r=>r.map(csvEsc).join(';')).join('\r\n')],{type:'text/csv'}));toast('📄 '+rows.length+' rijen geëxporteerd')}

/* 27. besparing per maand */
const cg0=load('vape_cig',{pack:0,day:0});
if($('cgPack')){$('cgPack').value=cg0.pack||'';$('cgDay').value=cg0.day||''}
function cigSet(){cg0.pack=parseFloat($('cgPack').value)||0;cg0.day=parseFloat($('cgDay').value)||0;store('vape_cig',cg0);renderSave2()}
function renderSave2(){
 const el=$('dSaveCh');if(!el)return;if(!log.length){el.innerHTML='';return}
 const now=new Date(),ms=[...Array(6)].map((_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return{k:d.getFullYear()*12+d.getMonth(),l:d.toLocaleDateString('nl-BE',{month:'short'}),y:d.getFullYear(),m:d.getMonth(),ml:0,c:0}});
 log.forEach(l=>{const d=new Date(l.t),m=ms.find(x=>x.k===d.getFullYear()*12+d.getMonth());if(m){m.ml+=l.ml;m.c+=+l.cost||0}});
 const first=Math.min(...log.map(l=>l.t)),sh=price.shop>0,cg1=cg0.pack>0&&cg0.day>0;
 ms.forEach(m=>{m.sh=sh?m.ml/10*price.shop-m.c:null;const st=new Date(m.y,m.m,1).getTime(),en=Math.min(Date.now(),new Date(m.y,m.m+1,0,23,59).getTime()),days=Math.max(0,(en-Math.max(st,first))/864e5);m.cg=cg1?days*cg0.day*cg0.pack-m.c:null});
 const sum=k=>ms.reduce((a,m)=>a+(m[k]||0),0),f=v=>v==null?'–':(v>=0?'+':'−')+'€'+Math.abs(v).toFixed(2),col=v=>v==null?'':v>=0?'var(--ok)':'#fb7185';
 el.innerHTML=`<div class="sub" style="margin:12px 0 4px"><b>Per maand</b></div><div class="rr"><span class="sub">Maand</span><span class="rv sub">Kosten · vs winkel${cg1?' · vs sigaretten':''}</span></div>`+ms.map(m=>`<div class="rr"><span>${m.l}</span><span class="rv">€${m.c.toFixed(2)} · <span style="color:${col(m.sh)}">${f(m.sh)}</span>${cg1?` · <span style="color:${col(m.cg)}">${f(m.cg)}</span>`:''}</span></div>`).join('')+`<div class="rr"><b>Totaal 6 maanden</b><span class="rv">€${sum('c').toFixed(2)} · <b style="color:${col(sh?sum('sh'):null)}">${sh?f(sum('sh')):'–'}</b>${cg1?` · <b style="color:${col(sum('cg'))}">${f(sum('cg'))}</b>`:''}</span></div><div class="sub" style="margin-top:6px">Alleen de kosten van je gemixte batches tellen mee, geen hardware, coils of stroom. De sigarettenvergelijking gaat uit van je ingevulde pakjes per dag sinds je eerste batch.</div>`}

/* 35. snelkoppelingen via ?a= */
(function(){try{const a=new URLSearchParams(location.search).get('a'),m={mix:'calc',inv:'inv',steep:'steep',saved:'saved',ideas:'suggest',today:'today',import:'saved'};if(a&&m[a])setTimeout(()=>{switchTab(m[a]);try{history.replaceState(null,'',location.pathname)}catch{}},150)}catch{}})();

/* 36. back-up herinnering */
function bkCheck(){const b=$('bkBar');if(!b)return;if(!(log.length||saved.length))return;if(Date.now()-load('vape_lastbackup',0)<=7*864e5||load('vape_bksnooze',0)>Date.now())return;
 b.innerHTML='<span style="flex:1">💾 Tijd voor een back-up (laatste is ouder dan 7 dagen).</span><button class="b1 sm" onclick="bkNow()">Back-up delen</button><button class="x" onclick="bkSnooze()">✕</button>';b.style.display='flex'}
function bkNow(){$('bkBar').style.display='none';exportBackup()}
function bkSnooze(){$('bkBar').style.display='none';store('vape_bksnooze',Date.now()+2*864e5)}
setTimeout(bkCheck,2500);


/* ===== v5.5.4 backup-bewaking en blijvende opslag ===== */
function chgN(){return +localStorage.getItem('vape_chg')||0}
(function(){const m=markBackup;window.markBackup=function(){m();try{localStorage.setItem('vape_chg','0')}catch{}}})();
function bkCheck(){const b=$('bkBar');if(!b)return;if(!(log.length||saved.length))return;if(b.style.display==='flex')return;
 const age=Date.now()-load('vape_lastbackup',0),old=age>7*864e5,many=chgN()>=8&&age>864e5;
 if(!(old||many)||load('vape_bksnooze',0)>Date.now())return;
 const why=old?'de laatste is ouder dan 7 dagen':chgN()+' wijzigingen sinds je laatste backup';
 b.innerHTML='<span style="flex:1">💾 Tijd voor een back-up ('+why+').</span><button class="b1 sm" onclick="bkNow()">Back-up delen</button><button class="x" onclick="bkSnooze()">✕</button>';b.style.display='flex'}
setInterval(bkCheck,30*60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(bkCheck,800)});
async function persistAsk(manual){let ok=null;try{if(navigator.storage&&navigator.storage.persist){ok=await navigator.storage.persisted();if(!ok)ok=await navigator.storage.persist()}}catch{}
 stRefresh(ok,manual)}
async function stRefresh(ok,manual){const e=$('stSt');if(!e)return;let txt='';try{if(ok==null&&navigator.storage&&navigator.storage.persisted)ok=await navigator.storage.persisted();
 if(navigator.storage&&navigator.storage.estimate){const q=await navigator.storage.estimate();txt=' · '+(q.usage/1048576).toFixed(1)+' MB in gebruik'}}catch{}
 e.innerHTML=ok===true?'🔒 Opslag beveiligd: de browser wist je gegevens niet zomaar'+txt:ok===false?'⚠️ Opslag niet beveiligd: de browser mag je gegevens wissen bij ruimtegebrek'+txt+(manual?'. Je browser heeft dit nu geweigerd; installeer de app of gebruik hem vaker, dan lukt het vaak wel.':''):'ℹ️ Je browser kan dit niet aangeven'+txt}
setTimeout(()=>persistAsk(false),3000);
/* ===== v5.2 ===== */
/* 31. ongedaan maken */
const undoSnap=()=>JSON.stringify({inventory,steep,saved,log,liquids,bases,bottles,devs});
let undoTm=0;
function undoPush(label,co){
 const now=Date.now(),l=undoSt[undoSt.length-1];
 if(!(co&&l&&l.l===label&&now-l.t<8000)){undoSt.push({l:label,t:now,s:undoSnap()});if(undoSt.length>10)undoSt.shift()}
 const b=$('undoBar');if(!b)return;b.innerHTML='<span style="flex:1">'+esc(label)+'</span><button class="b1 sm" onclick="undoDo()">↩️ Ongedaan maken</button>';b.style.display='flex';clearTimeout(undoTm);undoTm=setTimeout(()=>{b.style.display='none'},8000)}
function undoDo(){
 const u=undoSt.pop();if(!u)return toast('Niets om ongedaan te maken');
 const d=JSON.parse(u.s);inventory=d.inventory;steep=d.steep;saved=d.saved;log=d.log;liquids=d.liquids;bases=d.bases;bottles=d.bottles;devs=d.devs||[];
 blend=blend.filter(x=>liq(x.id));
 store('vape_inv_master',inventory);store('vape_steep_master',steep);store('vape_saved_recipes',saved);store('vape_log',log);store('vape_liquids',liquids);store('vape_bases',bases);store('vape_bottles',bottles);store('vape_devs',devs);
 renderInventory();renderSteep();renderSaved();renderLog();renderLiquids();renderBlend();renderBases();renderBottle();renderFlavors();renderDev();calculate();
 const t=(document.querySelector('.pane.on')||{}).id;if(t&&R[t.replace('tab-','')])R[t.replace('tab-','')]();
 const b=$('undoBar');if(b)b.style.display='none';toast('↩️ Ongedaan gemaakt: '+u.l)}

/* 19. apparaten */
const devOf=id=>devs.find(d=>String(d.id)===String(id));
const devSub=r=>{if(!r.dev&&!r.watt)return'';const d=devOf(r.dev);return`<div class="sub">⚙️ ${d?esc(d.name):'apparaat'}${r.watt?' · '+r.watt+' W':''}</div>`};
function renderDev(){const el=$('devBox');if(!el)return;const d=devOf(recDev.id);
 el.innerHTML=`<div class="g2"><div class="fg"><label>Apparaat voor dit recept</label><select onchange="devPick(this.value)"><option value="">–</option>${devs.map(x=>`<option value="${x.id}"${String(x.id)===String(recDev.id)?' selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="fg"><label>Vermogen (W)</label><input type="number" min="0" step="0.5" value="${recDev.w||''}" placeholder="${d&&d.w?d.w:''}" oninput="devW(this.value)"></div></div>`+(d?`<div class="sub" style="margin-top:6px">${esc(d.type||'')}${d.ohm?' · '+d.ohm+' Ω':''}${d.w?' · standaard '+d.w+' W':''}</div>`:'')+
 `<div class="sub" style="margin:12px 0 6px"><b>Mijn apparaten</b></div>`+(devs.map((x,i)=>`<div class="it"><div style="min-width:0"><b style="font-size:.86rem">${esc(x.name)}</b><div class="sub">${esc(x.type||'')}${x.ohm?' · '+x.ohm+' Ω':''}${x.w?' · '+x.w+' W':''}</div></div><button class="x" onclick="devDel(${i})">✕</button></div>`).join('')||'<p class="note">Nog geen apparaten.</p>')+
 `<div class="g2" style="margin-top:8px"><input id="dvName" placeholder="Naam (bijv. Pod X)"><select id="dvType"><option>MTL</option><option>RDL</option><option>DTL</option><option>Pod</option></select></div><div class="g2" style="margin-top:8px"><input id="dvW" type="number" placeholder="Standaard W" step="0.5"><input id="dvO" type="number" placeholder="Weerstand Ω" step="0.01"></div><button class="b2" style="margin-top:8px;width:100%" onclick="devAdd()">+ Apparaat toevoegen</button>`}
function devPick(v){recDev.id=v;const d=devOf(v);if(d&&d.w&&!recDev.w)recDev.w=d.w;renderDev()}
function devW(v){recDev.w=parseFloat(v)||0}
function devAdd(){const n=($('dvName').value||'').trim();if(!n)return toast('Geef het apparaat een naam');devs.push({id:Date.now(),name:n,type:$('dvType').value,w:parseFloat($('dvW').value)||0,ohm:parseFloat($('dvO').value)||0});store('vape_devs',devs);renderDev();toast('⚙️ Toegevoegd: '+n)}
function devDel(i){undoPush('Apparaat verwijderd');const id=devs[i].id;devs.splice(i,1);if(String(recDev.id)===String(id))recDev={id:'',w:0};store('vape_devs',devs);renderDev()}

/* 3. freebase en nic salt */
function renderNicConv(){
 const el=$('nicConv');if(!el)return;const mg=num('targetNic',3),vg=num('targetVg',70),salt=nicType==='salts';let toMg,toVg,notes=[],cap=false;
 if(!salt){toMg=Math.round(mg*ncF*2)/2;if(toMg>20){toMg=20;cap=true}toVg=Math.max(30,Math.min(vg,50));notes.push('Nic salt voelt bij dezelfde mg zachter aan, daarom is een hogere mg gebruikelijk. De omrekenfactor is een vuistregel van mij, geen exacte waarde.','Salts werken meestal beter bij 50VG/50PG en een lager vermogen.');if(cap)notes.push('Begrensd op 20 mg: hoger is bij salts niet gebruikelijk.');if(mg<=0)notes.push('Je recept heeft geen nicotine.')}
 else{toMg=Math.round(mg/ncF*2)/2;toVg=vg<60?70:vg;notes.push('Freebase geeft bij dezelfde mg een scherpere throat hit, dus de mg is lager. Begin liever te laag dan te hoog.','Freebase draait meestal prima op 70VG/30PG.')}
 notes.push('Controleer je nicotinebasis (type en mg) in de calculator. Dit is geen medisch advies.');
 const ch=[2.5,3,4].map(v=>`<span class="chip${ncF===v?' on':''}" onclick="ncSet(${v})">×${String(v).replace('.',',')}</span>`).join('');
 el.innerHTML=`<div class="sub">Nu: <b>${salt?'Nic salt':'Freebase'} · ${mg} mg · ${vg}VG/${100-vg}PG</b></div><div class="sub" style="margin:8px 0 4px">Omrekenfactor</div><div class="chips">${ch}</div><div class="it" style="display:block;margin-top:6px"><div class="sub">Wordt</div><b>${salt?'Freebase':'Nic salt'} · ${toMg} mg · ${toVg}VG/${100-toVg}PG</b>${notes.map(n=>`<div class="sub" style="margin-top:4px">• ${n}</div>`).join('')}<button class="b1" style="margin-top:10px;width:100%" onclick="ncApply(${toMg},${toVg})">Toepassen in calculator</button></div>`}
const ncSet=v=>{ncF=v;renderNicConv()};
function ncApply(mg,vg){setNicType(nicType==='salts'?'freebase':'salts');$('targetNic').value=mg;$('targetVg').value=vg;calculate();toast('🔁 '+(nicType==='salts'?'Nic salt':'Freebase')+' · '+mg+' mg')}

/* 6. tegenhanger */
const TWN=[['fris','🧊','Frisser'],['romig','🍦','Romiger'],['zoet','🍬','Zoeter'],['fruit','🍓','Fruitiger'],['bakkerij','🥐','Bakkeriger'],['tabak','🍂','Tabakkiger'],['drank','☕','Drankiger']];
function twinGo(c){
 const list=curList().filter(f=>f.name&&+f.pct>0),el=$('twin'),lab=(TWN.find(t=>t[0]===c)||[])[2]||c;
 if(!list.length){el.innerHTML='<p class="note">Voeg eerst aroma\'s toe aan je recept.</p>';return}
 const dom=f=>{const w=catOf(f.name);return w?Object.keys(w).sort((a,b)=>w[b]-w[a])[0]:null};
 const nl=list.map(f=>({name:f.name,old:+f.pct,pct:+f.pct,d:dom(f)}));
 nl.forEach(x=>{if(x.d!==c)x.pct=Math.max(.5,Math.round(x.pct*.75*2)/2)});
 const add=missSugg(c,list);
 if(add.length)nl.push({name:add[0].it.name,old:0,pct:add[0].pct,d:c});
 else if(nl.some(x=>x.d===c))nl.forEach(x=>{if(x.d===c){const it=findInv(x.name);let v=Math.round(x.pct*1.4*2)/2;if(it&&it.max>0)v=Math.min(v,it.max);x.pct=v}});
 else{el.innerHTML='<p class="note">Je voorraad heeft geen aroma dat die kant op gaat.</p>';return}
 nl.forEach(x=>{const it=findInv(x.name);if(it&&it.max>0)x.pct=Math.min(x.pct,it.max)});
 const tot=nl.reduce((a,x)=>a+x.pct,0);if(tot>15){const k=15/tot;nl.forEach(x=>x.pct=Math.max(.5,Math.round(x.pct*k*2)/2))}
 twRes={c,label:lab,list:nl.map(x=>({name:x.name,pct:x.pct}))};
 el.innerHTML=`<div class="it" style="display:block;margin-top:10px"><b>${lab}e variant${recTy(twRes.list)?' · '+esc(recTy(twRes.list)):''}</b><div class="sub" style="margin:4px 0 6px">Totaal ${twRes.list.reduce((a,f)=>a+f.pct,0).toFixed(1)}% aroma</div>`+nl.map(x=>`<div class="sub" style="display:flex;justify-content:space-between;gap:8px"><span>${esc(x.name)}${x.old?'':' <b>(nieuw)</b>'}</span><b>${x.old?x.old+'% → ':''}${x.pct}%</b></div>`).join('')+`<button class="b1" style="margin-top:10px;width:100%" onclick="twinLoad()">Laad variant in calculator</button></div>`}
function twinLoad(){if(!twRes)return;flavors=structuredClone(twRes.list);$('recipeName').value=($('recipeName').value||'Recept')+' ('+twRes.label.toLowerCase()+')';renderFlavors();calculate();toast('🔀 '+twRes.label+'e variant geladen')}

/* 8. proefkaart */
const TSA=[['zoet','Zoetheid'],['body','Body'],['throat','Throat hit'],['damp','Dampdikte'],['smaak','Smaakintensiteit']];
function tsPanel(b,i){const t=b.tc||{};return`<div style="margin-top:8px;padding:10px;background:var(--in);border:1px solid var(--bd);border-radius:12px"><div class="sub" style="margin-bottom:6px"><b>📝 Proefkaart</b> (1 = laag, 5 = hoog; beweeg een schuif om te bewaren)</div>`+TSA.map(([k,n])=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="sub" style="width:120px">${n}</span><input type="range" min="1" max="5" step="1" value="${t[k]||3}" oninput="tsSet(${i},'${k}',this.value)" style="flex:1;padding:0"><b id="ts-${i}-${k}" style="width:18px;text-align:center">${t[k]||'–'}</b></div>`).join('')+`</div>`}
function tsSet(i,k,v){const b=steep[i];if(!b)return;b.tc=b.tc||{};b.tc[k]=+v;store('vape_steep_master',steep);const e=$('ts-'+i+'-'+k);if(e)e.textContent=v}
const tsSum=b=>b.tc?`<div class="sub" style="margin-top:6px">${TSA.filter(([k])=>b.tc[k]).map(([k,n])=>n+' '+b.tc[k]).join(' · ')}</div>`:'';
const tsTog=i=>{tsEd=tsEd===i?-1:i;renderSteep()};

/* 23. bestelling binnen */
function ordParse(){
 const rows=[],bad=[];
 ($('ordIn').value||'').split('\n').forEach(l=>{l=l.trim();if(!l)return;const p=(/[;\t]/.test(l)?l.split(/[;\t]/):l.split(',')).map(x=>x.trim()),n=p[0],f=x=>parseFloat(String(x||'').replace(',','.')),size=f(p[1]),price=f(p[2]),qty=Math.max(1,parseInt(p[3])||1);
  if(!n||!(size>0)||!(price>=0)||isNaN(price)){bad.push(l);return}rows.push({name:n,size,price,qty})});
 const ship=Math.max(0,parseFloat($('ordShip').value)||0),tp=rows.reduce((a,r)=>a+r.price*r.qty,0),nb=rows.reduce((a,r)=>a+r.qty,0);
 rows.forEach(r=>{r.p2=+(r.price+(tp>0?ship*r.price/tp:(nb?ship/nb:0))).toFixed(3);r.known=!!findInv(r.name)});
 return{rows,bad,ship,tp,nb}}
function ordPrev(){const el=$('ordPrev'),o=ordParse();
 if(!o.rows.length&&!o.bad.length){el.innerHTML='';return}
 el.innerHTML=o.rows.map(r=>`<div class="sub" style="display:flex;justify-content:space-between;gap:8px;margin-top:4px"><span>${r.known?'➕':'🆕'} ${esc(r.name)} · ${r.qty}× ${r.size} ml</span><b>€${r.p2.toFixed(2)}/fles</b></div>`).join('')+o.bad.map(l=>`<div class="sub" style="color:#fb7185;margin-top:4px">⚠️ Niet begrepen: ${esc(l)}</div>`).join('')+(o.rows.length?`<div class="sub" style="margin-top:6px">${o.nb} flesjes · €${(o.tp+o.ship).toFixed(2)} totaal${o.ship?' (incl. verzending verdeeld over de flesjes)':''}</div>`:'')}
function ordAdd(){
 const o=ordParse();if(!o.rows.length)return toast('Geen geldige regels');
 undoPush('Bestelling toegevoegd');let k=0;
 o.rows.forEach(r=>{for(let q=0;q<r.qty;q++){const ex=findInv(r.name),id=Date.now()+(k++);
  if(ex){invToFl(ex);ex.fl.push({id,size:r.size,ml:r.size,price:r.p2});invSync(ex)}else inventory.push({id,name:r.name,ml:r.size,size:r.size,price:r.p2})}});
 $('ordIn').value='';$('ordShip').value='';$('ordPrev').innerHTML='';renderInventory();renderFlavors();calculate();checkBadges();toast('📦 '+o.nb+' flesjes toegevoegd')}

/* 26. voorraadwaarde */
function invValue(){let tot=0,noP=0;const rows=[];
 inventory.forEach(it=>{let v=0,has=false;
  if(it.fl&&it.fl.length)it.fl.forEach(b=>{if(b.price>0&&b.size>0){v+=b.ml*b.price/b.size;has=true}});
  else if(it.price>0&&it.size>0&&it.ml>0){v=it.ml*it.price/it.size;has=true}
  if(it.ml>0&&!has)noP++;tot+=v;rows.push({n:it.name,v})});
 rows.sort((a,b)=>b.v-a.v);return{tot,noP,rows,ml:inventory.reduce((a,i)=>a+(+i.ml||0),0)}}
function renderInvVal(){const el=$('invVal');if(!el)return;const d=invValue();
 el.innerHTML=`💶 Waarde van je aroma's: <b>€${d.tot.toFixed(2)}</b> · ${Math.round(d.ml)} ml`+(d.rows[0]&&d.rows[0].v>0?' · meest waard: '+d.rows.slice(0,3).filter(r=>r.v>0).map(r=>esc(r.n)+' (€'+r.v.toFixed(2)+')').join(', '):'')+(d.noP?` · ${d.noP} zonder prijs`:'')}

/* 37. vandaag */
function renderToday(){
 const el=$('today');if(!el)return;if($('todayD'))$('todayD').textContent=new Date().toLocaleDateString('nl-BE',{weekday:'long',day:'numeric',month:'long'});
 const ready=steep.filter(b=>steepEnd(b)<=Date.now()),soon=steep.filter(b=>{const l=(steepEnd(b)-Date.now())/864e5;return l>0&&l<=2}),low=inventory.filter(i=>i.ml<=thr(i)&&!(i.wish&&!i.ml)).slice(0,5);
 const can=saved.map((r,i)=>({r,i})).filter(({r})=>{const ml=r.targetMl||60;return(r.flavors||[]).length&&(r.flavors||[]).every(f=>{if(!f.name||!(+f.pct>0))return true;const L=findInv(f.name);return L&&L.ml>=ml*f.pct/100-.004})}).sort((a,b)=>(b.r.fav?1:0)-(a.r.fav?1:0)).slice(0,3);
 const row=(e,t)=>`<div class="sub" style="margin-top:6px">${e} ${t}</div>`,out=[];
 if(ready.length)out.push(row('✅','Klaar om te proeven: <b>'+ready.map(b=>esc(b.name)).join(', ')+'</b>'));
 if(soon.length)out.push(row('⏳','Bijna klaar: '+soon.map(b=>esc(b.name)+' ('+Math.ceil((steepEnd(b)-Date.now())/864e5)+' d)').join(', ')));
 {const ex=inventory.filter(i=>i.exp&&i.ml>0&&(new Date(i.exp)-Date.now())/864e5<=30);if(ex.length)out.push(row('⌛','Houdbaarheid: '+ex.map(i=>esc(i.name)+' ('+(new Date(i.exp)<Date.now()?'verlopen':Math.ceil((new Date(i.exp)-Date.now())/864e5)+' d')+')').join(', ')))}if(low.length)out.push(row('🛒','Bijna op: '+low.map(i=>esc(i.name)+' ('+i.ml+' ml)').join(', ')));
 {const rd=liquids.reduce((a,l)=>a+(l.ml||0),0),d=price.day;if(d>0)out.push(row('💧','Je gemengde liquid (±'+rd.toFixed(0)+' ml) gaat nog ±'+Math.floor(rd/d)+' dagen mee.'))}
 let h=out.join('')||'<p class="note" style="margin:0">Alles rustig. 🎉</p>';
 if(can.length)h+=`<div class="sub" style="margin:12px 0 4px"><b>🍳 Je kunt nu mixen</b></div>`+can.map(x=>`<div class="it"><div style="min-width:0"><b style="font-size:.86rem">${x.r.fav?'⭐ ':''}${esc(x.r.name)}</b><div class="sub">${x.r.targetMl||60} ml · ${recTy(x.r.flavors)||''}</div></div><button class="b2 sm" onclick="loadSaved(${x.i})">Laden</button></div>`).join('');
 if(undoSt.length)h+=`<button class="b2" style="margin-top:10px;width:100%" onclick="undoDo()">↩️ Ongedaan maken: ${esc(undoSt[undoSt.length-1].l)}</button>`;
 el.innerHTML=h}

renderDev();

/* ===== v5.3: recept plakken + aromacatalogus ===== */
var VC={TPA:'TPA',TFA:'TPA',CAP:'CAP',FA:'FA',FLV:'FLV',FW:'FW',INW:'INW',HS:'HS',RF:'RF',JF:'JF',WF:'WF',LB:'LB',VT:'VT',OOO:'OOO',LA:'LA'};
var VD={TPA:'TPA',CAP:'Capella',FA:'Flavour Art',FLV:'Flavorah',FW:'Flavor West',INW:'Inawera',HS:'Hangsen',RF:'Real Flavors',JF:'Jungle Flavors',WF:'Wonder Flavours',LB:'LB',VT:'VT',OOO:'OOO',LA:'LA',X:'Overig'};
var VFN={capella:'CAP',flavorah:'FLV','flavour art':'FA',flavourart:'FA','flavor art':'FA',flavorart:'FA','flavor west':'FW',inawera:'INW',hangsen:'HS','real flavors':'RF','jungle flavors':'JF','wonder flavours':'WF','wonder flavors':'WF',tpa:'TPA',tfa:'TPA'};
var CATRAW=`TPA|fruit|Acai Berry;Apple (Fuji);Apricot;Banana Cream;Blackberry;Blackcurrant;Blueberry (Wild);Boysenberry;Cantaloupe;Cherry;Dragonfruit;Grapefruit;Guava;Honeydew;Honeysuckle;Kiwi (Double);Lemon (Sicily);Lime;Lychee;Mango;Papaya;Passion Fruit;Peach (Juicy);Pear;Pineapple;Pomegranate;Raspberry;Raspberry (Sweet);Strawberry (Candy);Strawberry (Ripe);Strawberries and Cream;Tangerine;Watermelon;Wild Berry
TPA|romig|Bavarian Cream;Buttercream;Cheesecake (Graham Crust);Cheesecake (New York);Dairy (Milk);Egg Nog;Marshmallow;Orange Cream;Sweet Cream;Vanilla Bean Ice Cream;Vanilla Swirl;Whipped Cream
TPA|bakkerij|Almond;Apple Pie;Banana Nut Bread;Cinnamon Danish Swirl;Glazed Doughnut;Graham Cracker (Clear);Hazelnut;Peanut Butter;Pecan;Pie Crust;Sugar Cookie;Yellow Cake
TPA|zoet|Brown Sugar;Bubblegum;Butterscotch;Caramel (Original);Caramel Candy;Chocolate;Cotton Candy;Honey
TPA|zoet:zoetstof|Sweetener (Sucralose)
TPA|fris|Menthol;Peppermint;Spearmint;Wintergreen
TPA|drank|Absinthe;Amaretto;Cappuccino;Cola;Dr. Pop
TPA|tabak|RY4 Double;Tobacco (Cuban Cigar)
CAP|fruit|Dragon Fruit;Golden Pineapple;Green Apple;Juicy Peach;Kiwi;Sweet Strawberry;Watermelon
CAP|romig|French Vanilla;Vanilla Custard V1;Vanilla Custard V2;Vanilla Whipped Cream
CAP|bakkerij|Butter Pecan;Cinnamon Danish Swirl V2;Sugar Cookie V2;Vanilla Cupcake V2
CAP|zoet:zoetstof|Super Sweet
CAP|fris|Cool Mint
FA|fruit|Juicy Strawberry;Red Touch;Fuji;Lemon Sicily;Pineapple;Peach;Pear;Raspberry;Mango;Watermelon;Banana;Cassis
FA|romig|Cream Fresh;Custard;Meringue;Vienna Cream;Vanilla Classic;Cheesecake
FA|bakkerij|Biscuit;Cookie;Hazelnut;Pistachio;Tiramisu
FLV|romig|Cream;Marshmallow Vanilla
FLV|fruit|Alpine Strawberry
FLV|zoet:zoetstof|Sweetness
FW|fruit|Watermelon;Honeydew
FW|zoet|Butterscotch Ripple
FW|fris|Menthol
INW|romig|Custard;Vanilla;Cream
INW|fruit|Strawberry;Peach;Pear;Raspberry;Blueberry;Pineapple;Mango;Cherry;Lemon
INW|bakkerij|Biscuit;Tiramisu
INW|fris|Menthol;Mint
HS|tabak|Virginia Tobacco;Burley Tobacco
X|zoet:versterker|Ethyl Maltol;Vanillin;Ethyl Vanillin;Furaneol
X|zoet:zoetstof|Sucralose
X|tabak:versterker|Acetyl Pyrazine
X|fris:koeling|Koolada;WS-3;WS-23;Menthol Crystals
X|fruit:zuur|Malic Acid;Citric Acid;Tartaric Acid`;
var CATL=null,CATM=null,dlSig='',catQ='',catV='',imp=null;
const akey=n=>String(n||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');
function vSplit(raw){
 let s=String(raw||'').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim(),v='',m;
 m=s.match(/^[(\[]([A-Z]{2,4})[)\]]\s*[-:]?\s*(.+)$/);
 if(m&&VC[m[1]]){v=VC[m[1]];s=m[2]}
 else if((m=s.match(/^([A-Z]{2,4})\s*[-:|]?\s+(.+)$/))&&VC[m[1]]){v=VC[m[1]];s=m[2]}
 else if((m=s.match(/^(.+?)\s*[(\[]([A-Z]{2,4})[)\]]$/))&&VC[m[2]]){v=VC[m[2]];s=m[1]}
 else if((m=s.match(/^(capella|flavorah|flavou?r ?art|flavor west|inawera|hangsen|real flavors|jungle flavors|wonder flavou?rs|tpa|tfa)\s*[-:]?\s+(.+)$/i))){v=VFN[m[1].toLowerCase().replace(/\s+/g,' ')]||'';s=m[2]}
 s=s.replace(/^[\s\-:|]+|[\s\-:|@=]+$/g,'');
 return{v,n:s}}
function catData(){
 if(CATL)return CATL;CATL=[];CATM={};
 CATRAW.split('\n').forEach(l=>{const[v,cc,list]=l.split('|'),[c,a]=cc.split(':');list.split(';').forEach(n=>{const e={v,c,a,n,k:akey(n),d:(v==='X'?'':VD[v]+' - ')+n};CATL.push(e);CATM[v+'|'+e.k]=e})});
 return CATL}
function catFind(v,k){catData();if(v&&CATM[v+'|'+k])return CATM[v+'|'+k];if(v)return null;const a=CATL.filter(e=>e.k===k);return a.length===1?a[0]:null}
function invFind2(v,k){
 const a=inventory.filter(it=>vSplit(it.name).n&&akey(vSplit(it.name).n)===k);
 if(!a.length)return-1;
 const same=a.filter(it=>vSplit(it.name).v===v);if(same.length)return inventory.indexOf(same[0]);
 const loose=a.filter(it=>!vSplit(it.name).v||!v);return loose.length?inventory.indexOf(loose[0]):-1}
function dlFill(){const el=$('aromaDL');if(!el)return;const sig=inventory.map(i=>i.name).join('|');if(sig===dlSig)return;dlSig=sig;
 const seen={},o=[];inventory.concat(catData().map(e=>({name:e.d}))).forEach(i=>{if(!seen[i.name]){seen[i.name]=1;o.push('<option value="'+esc(i.name)+'">')}});el.innerHTML=o.join('')}

/* --- parser --- */
const IMP_SKIP=/^(ingredient|ml|drops?|grams?|g|%|total|totals|total base|total flavou?ring|nicotine|pg dilutant|vg dilutant|water|vodka|pga|vg|pg|vg\/pg|pg\/vg|strength|flavou?r total|drops per|steep|best vg|created|vendor|conditioning|upgrade|formulations|supporter|gravatar|flavoring ingredients|add comment|rate|share|print|©|#\d)(?![a-z0-9])/i;
const IMP_BASE=/^(pg|vg|nic|nicotine|water|vodka|pga|propylene|glycerin|glycerol|base|dilutant|alcohol)\b/i;
const numCell=c=>/^[\d.,]+\s*(%|ml|g)?$/i.test(c);
function impSettings(t){
 const o={};let m;
 if(m=t.match(/strength:?\s*(\d+(?:[.,]\d+)?)\s*mg/i))o.mg=parseFloat(m[1].replace(',','.'));
 if(m=t.match(/pg\s*\/\s*vg(?:[- ]ratio)?:?\s*(\d+)\s*\/\s*(\d+)/i))o.vg=+m[2];
 else if(m=t.match(/vg\s*\/\s*pg(?:[- ]ratio)?:?\s*(\d+)\s*\/\s*(\d+)/i))o.vg=+m[1];
 else if(m=t.match(/(\d+)\s*%?\s*vg\s*[\/,]?\s*(\d+)\s*%?\s*pg/i))o.vg=+m[1];
 else if(m=t.match(/(\d+)\s*%?\s*pg\s*[\/,]?\s*(\d+)\s*%?\s*vg/i))o.vg=+m[2];
 else if(m=t.match(/(\d+)\s*\/\s*(\d+)\s*pg\s*\/\s*vg/i))o.vg=+m[2];
 else if(m=t.match(/(\d+)\s*\/\s*(\d+)\s*vg\s*\/\s*pg/i))o.vg=+m[1];
 else if(m=t.match(/best vg:?\s*(\d+)/i)){if(+m[1]>0)o.vg=+m[1]}
 if(m=t.match(/steep(?:\s*days)?:?\s*(\d+)/i))o.steep=+m[1];
 else if(m=t.match(/conditioning time:?\s*(\d+)/i))o.steep=+m[1];
 return o}
function impLine(l){
 const f=x=>parseFloat(String(x).replace(',','.'));
 if(/[\t|]/.test(l)){
  const cells=l.split(/[\t|]/).map(x=>x.trim()).filter(Boolean),nm=[],nums=[];
  cells.forEach(c=>{if(numCell(c))nums.push(c);else if(!nums.length)nm.push(c)});
  if(!nm.length||!nums.length)return nm.length&&!nums.length&&vSplit(nm.join(' ')).v?[{name:nm.join(' '),pct:0}]:null;
  const pc=nums.filter(c=>/%/.test(c)),plain=nums.filter(c=>!/(ml|g)$/i.test(c)),pick=pc.length?pc[pc.length-1]:(plain.length?plain[plain.length-1]:nums[nums.length-1]);
  return[{name:nm.join(' '),pct:f(pick.replace(/[^\d.,]/g,''))}]}
 let m;
 if(m=l.match(/^(.+?)\s*[-@:=]?\s*[\d.,]+\s*ml\s*\(?\s*(\d*[.,]?\d+)\s*%\s*\)?\s*$/i))return[{name:m[1],pct:f(m[2])}];
 if((l.match(/%/g)||[]).length===1&&(m=l.match(/^(\d*[.,]?\d+)\s*%\s*(?:of\s+)?(.+)$/i)))return[{name:m[2],pct:f(m[1])}];
 if(l.includes('%')){const out=[];for(const g of l.matchAll(/([^%]+?)\s*[-@:=]?\s*(\d+[.,]?\d*|[.,]\d+)\s*%/g)){const n=g[1].replace(/^[\s,;]+/,'').trim();if(n)out.push({name:n,pct:f(g[2])})}return out.length?out:null}
 if((m=l.match(/^(.+?)\s*[-@:=]\s*(\d+[.,]?\d*|[.,]\d+)$/))&&/[a-z]/i.test(m[1])&&f(m[2])<=40)return[{name:m[1],pct:f(m[2])}];
 if((m=l.match(/^(.+?)\s+(\d+[.,]?\d*)$/))&&vSplit(m[1]).v&&f(m[2])<=40)return[{name:m[1],pct:f(m[2])}];
 if(vSplit(l).v&&l.length<60&&!/:/.test(l))return[{name:l,pct:0}];
 return null}
function impParse(text){
 let lines=String(text||'').replace(/\r/g,'').split('\n').map(x=>x.trim());
 const set=impSettings(text);
 // cel-per-regel kopieën samenvoegen: naam gevolgd door losse getallen
 const mg=[];for(let i=0;i<lines.length;i++){let l=lines[i];if(!l)continue;
  if(/[a-z]/i.test(l)&&!numCell(l)){let j=i+1;const cells=[];while(j<lines.length&&numCell(lines[j])&&cells.length<5){cells.push(lines[j]);j++}if(cells.length>=1&&!/^(ingredient|ml|drops|grams)/i.test(l)){l=l+'\t'+cells.join('\t');i=j-1}}
  mg.push(l)}
 const rows=[],skipped=[];let title='',stop=false;
 for(const l of mg){
  if(/^(notes?|comments?)\b/i.test(l)&&rows.length){stop=true}
  if(stop)break;
  if(!l)continue;
  const head=l.split(/[\t|]/)[0].trim();
  if(IMP_SKIP.test(head)||/^(strength|pg\/vg|vg\/pg|flavou?r total|drops per|steep days|total flavou?ring|conditioning time)/i.test(l)||/^\d+\s*\/\s*\d+/.test(l))continue;
  let dl=null;const l2=l.replace(DILRX,(m,a,c)=>{dl={d:parseFloat(String(a).replace(',','.')),c:dilCar(c)};return''});const r=impLine(l2);if(r&&dl&&r[0]){r[0].dil=dl.d;r[0].carrier=dl.c;r[0].name=r[0].name+' '+dl.d+'%'}
  if(r){r.forEach(x=>{if(x.name&&!IMP_BASE.test(x.name)&&/[a-z]/i.test(x.name)&&x.pct<=40&&x.pct>=0&&!isNaN(x.pct))rows.push(x)});if(r.some(x=>IMP_BASE.test(x.name)))continue;continue}
  if(!title&&/[a-z]/i.test(l)&&l.length<=80&&!/:/.test(l)&&!/^https?:/i.test(l))title=l.replace(/\s+by\s+.+$/i,'').replace(/\s*\(\s*\)\s*$/,'').trim();
  else skipped.push(l)}
 const seen={},out=[];
 rows.forEach(x=>{const sp=vSplit(x.name),k=akey(sp.n);if(!k)return;const id=sp.v+'|'+k;if(seen[id]){seen[id].pct=+(seen[id].pct+x.pct).toFixed(2);return}
  const r={raw:x.name,v:sp.v,n:sp.n,k,pct:x.pct,mi:invFind2(sp.v,k),add:true,dil:x.dil,carrier:x.carrier};
  const e=catFind(sp.v,k);r.disp=r.mi>=0?inventory[r.mi].name:(e?e.d:(sp.v?VD[sp.v]+' - '+sp.n:sp.n));
  r.cat=e?e.c:null;r.addT=r.mi<0?(e&&e.a?e.a:addGuess(sp.n)):'';if(!r.cat&&r.mi<0){const w=catOf(r.disp);if(w)r.cat=Object.keys(w).sort((a,b)=>w[b]-w[a])[0]}
  r.known=!!e;seen[id]=r;out.push(r)});
 return{name:title,mg:set.mg,vg:set.vg,steep:set.steep,rows:out,skipped}}
function impGo(){
 const t=$('impIn').value;if(!t.trim()){imp=null;$('impOut').innerHTML='';return}
 imp=impParse(t);imp.meta=metaPick(impMeta(t,imp.name));imp.keep=true;impShow()}
function impShow(){
 const el=$('impOut');if(!imp)return;
 if(!imp.rows.length){el.innerHTML='<p class="note" style="margin-top:10px">Geen aroma\'s herkend. Plak de ingrediëntenlijst met percentages, bijvoorbeeld <i>TPA Bavarian Cream 3%</i> of een tabel met naam en %.</p>';return}
 const tot=imp.rows.reduce((a,r)=>a+(+r.pct||0),0),nw=imp.rows.filter(r=>r.mi<0).length;
 el.innerHTML=`<div class="fg" style="margin-top:12px"><label>Receptnaam</label><input id="impName" value="${esc(imp.name||'')}" placeholder="Geïmporteerd recept" oninput="imp.name=this.value"></div>`+
 `<div class="sub" style="margin:6px 0 8px">${imp.mg!=null?imp.mg+' mg':'mg niet gevonden'} · ${imp.vg!=null?imp.vg+'VG/'+(100-imp.vg)+'PG':'VG/PG niet gevonden'}${imp.steep?' · steep '+imp.steep+' dagen':''}</div>`+
 imp.rows.map((r,i)=>`<div class="it" style="display:block"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:0"><b style="font-size:.86rem">${esc(r.disp)}</b><div class="sub">${r.mi>=0?'✅ staat al in je lijst':'🆕 wordt toegevoegd'}${r.cat?' · '+(CATS.find(c=>c[0]===r.cat)||[0,r.cat,''])[2]+' '+esc(CN[r.cat]||r.cat):''}${r.known&&r.mi<0?' · 📚 uit catalogus':''}</div></div><input type="number" step="0.1" min="0" value="${r.pct||''}" placeholder="%" style="width:72px" oninput="imp.rows[${i}].pct=parseFloat(this.value)||0;impTot()"><span class="sub">%</span><button class="x" onclick="impDrop(${i})">✕</button></div></div>`).join('')+
 impMetaHTML()+`<div class="sub" id="impTot" style="margin-top:8px">Totaal ${tot.toFixed(2)}% aroma · ${nw} nieuw voor je lijst${imp.rows.some(r=>!r.pct)?' · <b>vul de ontbrekende percentages in</b>':''}${imp.skipped.length?' · '+imp.skipped.length+' regels genegeerd':''}</div>`+
 `<button class="b1" style="margin-top:10px;width:100%" onclick="impApply('calc')">Laad in calculator</button><div class="g2" style="margin-top:8px"><button class="b2" onclick="impApply('save')">💾 Opslaan als recept</button><button class="b2" onclick="impApply('add')">➕ Alleen aroma's toevoegen</button></div>`}
function impTot(){const el=$('impTot');if(!el||!imp)return;const tot=imp.rows.reduce((a,r)=>a+(+r.pct||0),0);el.innerHTML=`Totaal ${tot.toFixed(2)}% aroma · ${imp.rows.filter(r=>r.mi<0).length} nieuw voor je lijst`}
function impDrop(i){imp.rows.splice(i,1);impShow()}
function impClear(){$('impIn').value='';imp=null;$('impOut').innerHTML=''}
async function impPaste(){try{const t=await navigator.clipboard.readText();if(!t)return toast('Klembord is leeg');$('impIn').value=t;impGo()}catch(e){toast('Klembord lezen mislukt: plak de tekst zelf in het vak')}}
function impApply(mode){
 if(!imp||!imp.rows.length)return;
 undoPush(mode==='add'?'Aroma\'s toegevoegd':'Recept geïmporteerd');let added=0;
 imp.rows.forEach(r=>{let it=r.mi>=0?inventory[r.mi]:invFind2(r.v,r.k)>=0?inventory[invFind2(r.v,r.k)]:null;
  if(!it){it={id:Date.now()+added,name:r.disp,ml:0,size:0,price:0,wish:true};if(r.cat)it.cat=r.cat;if(r.addT){it.kind='add';it.addType=r.addT}if(r.dil){it.dil=r.dil;if(r.carrier)it.carrier=r.carrier}inventory.push(it);added++}
  r.name=it.name});
 store('vape_inv_master',inventory);
 const nm=(imp.name||'').trim()||'Geïmporteerd recept';
 if(mode==='add'){renderInventory();renderFlavors();toast('➕ '+added+' nieuwe aroma\'s in je lijst')}
 else if(mode==='save'){const rec={id:Date.now(),name:nm,targetMl:num('targetMl',60),targetNic:imp.mg!=null?imp.mg:num('targetNic',3),targetVg:imp.vg!=null?imp.vg:num('targetVg',70),nicType:'freebase',flavors:imp.rows.map(r=>({name:r.name,pct:+r.pct||0})),blend:[],...(imp.keep&&imp.meta?imp.meta:{})};saved.push(rec);store('vape_saved_recipes',saved);renderInventory();renderSaved();checkBadges();toast('💾 "'+nm+'" opgeslagen, '+added+' nieuwe aroma\'s')}
 else{recMeta=imp.keep&&imp.meta?imp.meta:null;$('recipeName').value=nm;if(imp.mg!=null)$('targetNic').value=imp.mg;if(imp.vg!=null)$('targetVg').value=imp.vg;flavors=imp.rows.map(r=>({name:r.name,pct:+r.pct||0}));renderInventory();renderFlavors();switchTab('calc');calculate();toast('📥 Geladen: '+nm+(added?' · '+added+' nieuwe aroma\'s':''))}
 imp=null;$('impIn').value='';$('impOut').innerHTML=''}

/* --- catalogus --- */
function catRender(){
 const el=$('catBox');if(!el)return;const L=catData(),q=akey(catQ),vs=[...new Set(L.map(e=>e.v))];
 const have=new Set(inventory.map(i=>{const s=vSplit(i.name);return s.v+'|'+akey(s.n)}));
 const f=L.map((e,i)=>({e,i})).filter(({e})=>(!catV||e.v===catV)&&(!q||akey(e.d).includes(q)));
 el.innerHTML=`<input id="catQ" value="${esc(catQ)}" placeholder="🔍 Zoek in ${L.length} aroma's…" oninput="catQ=this.value;catRender();$('catQ').focus()" style="margin-bottom:8px"><div class="chips">${['',...vs].map(v=>`<span class="chip${catV===v?' on':''}" onclick="catV='${v}';catRender()">${v?VD[v]:'Alle'}</span>`).join('')}</div><div class="sub" style="margin:8px 0">${f.length} resultaten${f.length>40?' (eerste 40)':''}</div>`+
 f.slice(0,40).map(({e,i})=>{const h=have.has(e.v+'|'+e.k);return`<div class="it"><div style="min-width:0"><b style="font-size:.84rem">${esc(e.d)}</b><div class="sub">${(CATS.find(c=>c[0]===e.c)||[0,e.c,''])[2]} ${esc(CN[e.c]||e.c)}${e.a?' · 🧂 '+ADDT[e.a]:''}</div></div>${h?'<span class="sub">✅</span>':`<button class="b2 sm" onclick="catAdd(${i})">➕</button>`}</div>`}).join('')}
function catAdd(i){const e=catData()[i];if(!e)return;if(invFind2(e.v==='X'?'':e.v,e.k)>=0)return toast('Staat al in je lijst');undoPush('Aroma toegevoegd');inventory.push({id:Date.now(),name:e.d,ml:0,size:0,price:0,wish:true,cat:e.c,...(e.a?{kind:'add',addType:e.a}:{})});store('vape_inv_master',inventory);renderInventory();renderFlavors();catRender();toast('➕ '+e.d)}
dlFill();

/* ===== v5.4: tabbladen, short-/longfills, import-metadata ===== */
var TAB_ALIAS={steep:['liq','steep'],fles:['liq','fles'],label:['saved','label'],correct:['calc','correct'],backup:['dash','backup']},liqSecCur='liq',recMeta=null,metaOpen=-1,sfKind='short';
function liqSec(sec,noRender){
 liqSecCur=sec;['liq','steep','fles'].forEach(k=>{const e=$('sec-'+k);if(e)e.style.display=k===sec?'flex':'none'});
 const b=$('liqSecBar');if(b)b.innerHTML=[['liq','🍶 Liquids'],['steep','⏳ Steep'],['fles','📏 Flesjes']].map(([k,l])=>`<span class="chip${k===sec?' on':''}" onclick="liqSec('${k}')">${l}</span>`).join('');
 if(!noRender){if(sec==='liq')renderLiquids();else if(sec==='steep')renderSteep();else renderBottle()}}
function switchTab(id){
 const orig=id,al=TAB_ALIAS[id];let sec='';if(al){id=al[0];sec=al[1]}
 document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.id==='tab-'+id));
 document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===id));
 if(id==='liq'&&(sec==='steep'||sec==='fles'))liqSecCur=sec;
 R[id]?.();if(al&&R[orig])R[orig]();
 if(id==='liq')liqSec(liqSecCur,1);
 if(al&&sec&&id!=='liq'){const el=$('sec-'+sec);if(el){setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),60);return}}
 scrollTo({top:0,behavior:'smooth'})}
try{const lb=$('sec-label');if(lb&&window.IntersectionObserver)new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){try{updateLabel();autoAI()}catch{}}},{threshold:.1}).observe(lb)}catch{}

/* --- short-/longfill --- */
const nv=(id,d)=>{const v=parseFloat($(id).value);return isNaN(v)?d:v};
function sfType(k){sfKind=k;$('sfS').className=k==='short'?'fb':'';$('sfL').className=k==='long'?'fb':'';$('sfLf').style.display=k==='long'?'':'none';sfCalc()}
function sfCalc(){
 const el=$('sfOut');if(!el)return;
 const c=nv('sfC',0),B=nv('sfB',0),tg=nv('sfTg',3),sm=nv('sfSm',10),sg=nv('sfSg',20),sv=nv('sfSv',50),vg=nv('sfVg',70),P=nv('sfP',0),fl=nv('sfFl',0),L=[];let ok=true;
 if(!(c>0)||!(B>=c)){el.innerHTML='<p class="note">Vul de inhoud en de flesgrootte in (de fles moet minstens zo groot zijn als de inhoud).</p>';return}
 if(sfKind==='short'){
  if(tg>0&&sg<=tg){el.innerHTML='<p class="note">De nicshot moet sterker zijn dan je doel.</p>';return}
  const exact=tg>0?tg*c/(sm*(sg-tg)):0,n=Math.round(exact),T=c+n*sm,mg=T>0?n*sm*sg/T:0,nMax=Math.floor((B-c)/sm),fit=T<=B+1e-9,vgf=(c*vg+n*sm*sv)/T;
  L.push(`<b>${n} nicshot${n===1?'':'s'}</b> van ${sm} ml en ${sg} mg → <b>${mg.toFixed(1)} mg/ml</b> (doel ${tg})`);
  L.push(`Eindvolume ${T} ml · ${Math.round(vgf)}VG/${100-Math.round(vgf)}PG`);
  L.push(`Plaats in de fles: ${(B-c).toFixed(0)} ml, dus maximaal ${nMax} shot${nMax===1?'':'s'}`+(fit?'':' · <span style="color:#fb7185">⚠️ dit past niet: kies een lager doel of een grotere fles</span>'));
  if(tg>0&&Math.abs(mg-tg)>.5)L.push('Met hele shots kom je niet exact op je doel; de tabel hierboven toont wat je werkelijk krijgt.');
  if(P>0)L.push(`Kosten: €${(P/T).toFixed(3)}/ml na de shots (zonder de prijs van de shots)`)}
 else{
  const V=nv('sfV',B),tv=nv('sfTv',70),nic=sg>0?tg*V/sg:0,rest=V-c-nic,vgNeed=V*tv/100-c*vg/100-nic*sv/100,addVg=vgNeed,addPg=rest-vgNeed;
  if(rest<0){el.innerHTML='<p class="note">⚠️ Het concentraat en de nicshots passen niet in het eindvolume.</p>';return}
  L.push(`Doel: <b>${V} ml</b> · ${tg} mg · ${tv}VG/${100-tv}PG`);
  L.push(`Voeg toe: <b>${nic.toFixed(1)} ml nicshot</b> (${sg} mg, ≈ ${(nic/sm).toFixed(1)} shots van ${sm} ml)`);
  L.push(`<b>${Math.max(0,addVg).toFixed(1)} ml VG</b> en <b>${Math.max(0,addPg).toFixed(1)} ml PG</b>`+(addVg<0||addPg<0?' · <span style="color:#fb7185">⚠️ de VG/PG-verhouding is niet haalbaar, kies een andere doel-VG</span>':''));
  if(fl>0)L.push(`Smaakgehalte in de eindmix ≈ ${(c*fl/V).toFixed(1)}%`);
  if(P>0)L.push(`Kosten: €${(P/V).toFixed(3)}/ml voor het product (zonder VG, PG en shots)`)}
 el.innerHTML='<div class="it" style="display:block;margin-top:10px">'+L.map(x=>'<div class="sub" style="margin-top:4px;color:var(--tx)">'+x+'</div>').join('')+'</div>'}
function sfAdd(){
 const name=($('sfName').value||'').trim();if(!name)return toast('⚠️ Geef het product een naam');
 const c=nv('sfC',0),B=nv('sfB',0),P=nv('sfP',0),fl=nv('sfFl',0),vg=Math.min(100,Math.max(0,nv('sfVg',70)));if(!(c>0))return toast('⚠️ Vul de inhoud in');
 undoPush('Liquid toegevoegd');
 const l={id:Date.now(),date:today(),name,ml:c,nic:0,vg,nt:'freebase',flavors:[{name,pct:fl||0}],note:sfKind==='short'?'Shortfill: voeg nicshots toe':'Longfill: aanvullen met VG, PG en nicshot',cpm:P>0?+(P/c).toFixed(4):0,kind:sfKind,bottle:B||c,price:P};
 liquids.unshift(l);svLiq();renderLiquids();renderBlend();calculate();toast('✅ '+(sfKind==='short'?'Shortfill':'Longfill')+' toegevoegd aan Liquids')}

/* --- import: score, omschrijving, reacties --- */
function impMeta(t,title){
 t=String(t||'');const L=t.replace(/\r/g,'').split('\n').map(x=>x.trim()),m={};let x;
 if((x=t.match(/(\d(?:[.,]\d+)?)\s*(?:\/|of|van|out of)\s*5\b(?:\s*\(?\s*(\d+)\s*(?:reviews?|ratings?|votes?|stemmen|beoordelingen)\)?)?/i))&&(parseFloat(x[1].replace(',','.'))>0)){m.score=parseFloat(x[1].replace(',','.'));if(x[2])m.votes=+x[2]}
 else if((x=t.match(/(?:rating|score|beoordeling)\s*[:=]?\s*(\d(?:[.,]\d+)?)(?![\d%])/i))&&parseFloat(x[1].replace(',','.'))>0&&parseFloat(x[1].replace(',','.'))<=5)m.score=parseFloat(x[1].replace(',','.'));
 else if(x=t.match(/(★{1,5})/))m.score=x[1].length;
 for(const l of L.slice(0,8)){if(/^#\d/.test(l))continue;const a=l.match(/(?:^|\s)by\s+([^,]+?)(?:,\s*[A-Z][a-z]{2,8}\b.*)?$/);if(a&&a[1].length<=40){m.author=a[1].trim();break}}
 const u=t.match(/https?:\/\/(?:www\.)?(?:e-liquid-recipes\.com|alltheflavors\.com)\S*/i);if(u)m.url=u[0].replace(/[)\].,]+$/,'');
 const iN=L.findIndex(l=>/^notes?\s*:?$/i.test(l)),iC=L.findIndex(l=>/^comments?\s*:?$/i.test(l));
 const ing=L.findIndex(l=>{if(!l||IMP_SKIP.test(l.split(/[\t|]/)[0].trim()))return false;const r=impLine(l);return r&&r.length&&!IMP_BASE.test(r[0].name)});
 const pre=L.slice(0,ing<0?0:ing).filter(l=>l.length>25&&!/\t/.test(l)&&!/^(created|upgrade|gravatar|supporter|strength|pg\/vg|ingredient|https?:)/i.test(l)&&!/^\S.*\sby\s\S+$/.test(l)&&!(title&&l.startsWith(title)));
 const notes=iN>=0?L.slice(iN+1,iC>iN?iC:L.length).filter(l=>l&&!/^(add comment|rate)/i.test(l)):[];
 const desc=pre.concat(notes).join('\n').trim();if(desc)m.desc=desc.slice(0,1500);
 if(iC>=0){const cm=[];let cur=null;for(const l of L.slice(iC+1)){const h=l.match(/^#\d+\s+by\s+(.+?),\s*(.+)$/i);if(h){cur={by:h[1].trim(),date:h[2].trim(),text:''};cm.push(cur)}else if(cur&&l&&!/^(add comment|reply|©)/i.test(l))cur.text=(cur.text?cur.text+' ':'')+l}
  const ok=cm.filter(c=>c.text).slice(0,30).map(c=>({by:c.by.slice(0,40),date:c.date.slice(0,40),text:c.text.slice(0,500)}));if(ok.length)m.comments=ok}
 return m}
function metaPick(o){const r={};['score','votes','author','desc','comments','url'].forEach(k=>{if(o&&o[k]!=null&&o[k]!==''&&!(Array.isArray(o[k])&&!o[k].length))r[k]=o[k]});return Object.keys(r).length?r:null}
function metaHTML(r,i){
 const has=r.score||r.author||r.desc||(r.comments&&r.comments.length);if(!has)return'';
 const bits=[r.score?'⭐ '+r.score+'/5'+(r.votes?' ('+r.votes+')':''):'',r.author?'✍️ '+esc(r.author):'',r.comments&&r.comments.length?'💬 '+r.comments.length:''].filter(Boolean);
 let h=`<div class="sub" style="margin-top:4px">${bits.join(' · ')}${(r.desc||(r.comments&&r.comments.length))?` · <a style="color:var(--ac);cursor:pointer" onclick="metaOpen=metaOpen===${i}?-1:${i};renderSaved()">${metaOpen===i?'verberg':'details'}</a>`:''}</div>`;
 if(metaOpen===i){if(r.desc)h+=`<div class="sub" style="margin-top:6px;white-space:pre-wrap;color:var(--tx)">${esc(r.desc)}</div>`;
  if(r.comments&&r.comments.length)h+='<div class="sub" style="margin-top:8px"><b>Reacties</b></div>'+r.comments.map(c=>`<div class="sub" style="margin-top:4px"><b>${esc(c.by)}</b> · ${esc(c.date)}<br>${esc(c.text)}</div>`).join('');
  if(r.url)h+=`<div class="sub" style="margin-top:6px"><a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:var(--ac)">Bron openen</a></div>`}
 return h}

function impMetaHTML(){const m=imp&&imp.meta;if(!m)return'';const bits=[m.score?'⭐ '+m.score+'/5'+(m.votes?' ('+m.votes+')':''):'',m.author?'✍️ '+esc(m.author):'',m.comments?'💬 '+m.comments.length+' reacties':'',m.desc?'📝 omschrijving':''].filter(Boolean);
 return `<div class="it" style="display:block;margin-top:10px"><div class="sub">${bits.join(' · ')}</div>${m.desc?'<div class="sub" style="margin-top:4px;white-space:pre-wrap">'+esc(m.desc.slice(0,220))+(m.desc.length>220?'…':'')+'</div>':''}<label class="sub" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" ${imp.keep?'checked':''} onchange="imp.keep=this.checked" style="width:auto"> Bewaar dit bij het recept</label></div>`}
liqSec('liq',1);

/* ===== v5.5: uitgebreide aroma-database, additieven, import van gegevens ===== */
var invKind='',detIdx=-1,ai=null,csvRows=null;
const ADDT={zoetstof:'Zoetstof',koeling:'Koeling',zuur:'Zuur',versterker:'Smaakversterker',mondgevoel:'Mondgevoel',overig:'Overig additief'};
function addGuess(n){n=String(n||'').toLowerCase();
 if(/sucralose|sweeten|super sweet|sweetness|stevia|aspartaam|aspartame/.test(n))return'zoetstof';
 if(/koolada|\bws-?(3|5|12|23)\b|cooling agent|menthol crystal|koelmiddel/.test(n))return'koeling';
 if(/malic|citric|tartaric|\bacid\b|\bzuur\b/.test(n))return'zuur';
 if(/ethyl ?maltol|\bmaltol\b|vanillin|furaneol|acetyl pyrazine|versterker|enhancer/.test(n))return'versterker';
 if(/mouthfeel|body booster|mondgevoel/.test(n))return'mondgevoel';
 return''}
const kindTag=it=>it.kind==='add'?'<span class="bg ba">🧂 '+(ADDT[it.addType]||'Additief')+'</span>':'';
const ITF=[
 ['kind','Soort','s','Identiteit',[['','Aroma'],['add','Additief']]],
 ['addType','Type additief','s','Identiteit',[['','–'],...Object.entries(ADDT)]],
 ['brand','Merk','t','Identiteit'],['line','Productlijn','t','Identiteit'],['sku','Artikelnummer','t','Identiteit'],['barcode','Barcode','t','Identiteit'],['cas','CAS-nummer','t','Identiteit'],['shop','Winkel of leverancier','t','Identiteit'],['url','Productlink','t','Identiteit'],
 ['recLo','Aanbevolen vanaf (%)','n','Gebruik'],['rec','Aanbevolen tot (%)','n','Gebruik'],['max','Maximum (%)','n','Gebruik'],['steep','Steep (dagen)','n','Gebruik'],['use','Geschikt voor','s','Gebruik',[['','Onbekend'],['MTL','MTL'],['DTL','DTL'],['beide','Beide']]],['str','Sterkte','t','Gebruik'],
 ['carrier','Dragerstof','s','Samenstelling',[['','Onbekend'],['PG','PG'],['VG','VG'],['ETOH','Ethanol'],['H2O','Water'],['TRI','Triacetine'],['PUUR','Puur of poeder']]],['dil','Verdunning (% product in drager, 100 = onverdund)','n','Samenstelling'],['dens','Dichtheid (g/ml)','n','Samenstelling'],['dk','Diketonen','s','Samenstelling',[['','Onbekend'],['vrij','Vrij'],['bevat','Bevat']]],['ingr','Ingrediënten of veiligheidsinfo','a','Samenstelling'],
 ['desc','Smaakbeschrijving','a','Smaak'],['pair','Past goed bij','t','Smaak'],['avoid','Liever niet met','t','Smaak'],['note','Smaaknotitie','t','Smaak'],['rate','Eigen score (1 tot 5)','n','Smaak'],['cat','Categorie','s','Smaak',null],
 ['ml','Voorraad (ml)','n','Voorraad en inkoop'],['size','Flesje (ml)','n','Voorraad en inkoop'],['price','Prijs flesje (€)','n','Voorraad en inkoop'],['min','Herbestel bij (ml)','n','Voorraad en inkoop'],['buy','Gekocht op','d','Voorraad en inkoop'],['opened','Geopend op','d','Voorraad en inkoop'],['exp','Houdbaar tot','d','Voorraad en inkoop'],['loc','Bewaarplaats','t','Voorraad en inkoop'],['lot','Batchnummer','t','Voorraad en inkoop'],
 ['memo','Overige notities','a','Overig']];
const ITFM=Object.fromEntries(ITF.map(f=>[f[0],f]));
const itfOpts=f=>f[0]==='cat'?[['','Automatisch'],...CATS.map(([k,n])=>[k,n])]:f[4];
function setInvX(i,k,v){const it=inventory[i],f=ITFM[k];if(!it||!f)return;
 if(f[2]==='n'){const x=parseFloat(String(v).replace(',','.'));if(v===''||isNaN(x))delete it[k];else it[k]=x}
 else{v=String(v).trim();if(v==='')delete it[k];else it[k]=v}
 if(k==='kind'&&it.kind!=='add')delete it.addType;
 if(k==='kind'&&it.kind==='add'&&!it.addType)it.addType=addGuess(it.name)||'overig';
 renderInventory();renderFlavors();calculate()}
function usedIn(it){const n=it.name.toLowerCase(),a=[];saved.forEach(r=>{const f=(r.flavors||[]).find(x=>String(x.name).toLowerCase()===n&&+x.pct>0);if(f)a.push({r:r.name,p:+f.pct})});return a}
function useRange(i){const it=inventory[i],a=usedIn(it);if(!a.length)return;undoPush('Aanbevolen % ingesteld');const p=a.map(x=>x.p);it.recLo=Math.min(...p);it.rec=Math.max(...p);renderInventory()}
function detPanel(it,i){
 const fl=it.fl&&it.fl.length,add=it.kind==='add',G=[...new Set(ITF.map(f=>f[3]))];
 const inp=f=>{const[k,l,t]=f;if(k==='ml'||(k==='addType'&&!add)||(fl&&(k==='size'||k==='price')))return'';const v=it[k]==null?'':it[k],oc=`onchange="setInvX(${i},'${k}',this.value)"`;
  if(t==='s')return`<div class="fg"><label>${l}</label><select ${oc}>${itfOpts(f).map(([a,b])=>`<option value="${a}"${String(v)===String(a)?' selected':''}>${esc(b)}</option>`).join('')}</select></div>`;
  if(t==='a')return`<div class="fg" style="grid-column:1/-1"><label>${l}</label><textarea rows="2" ${oc}>${esc(v)}</textarea></div>`;
  return`<div class="fg"><label>${l}</label><input type="${t==='n'?'number':t==='d'?'date':'text'}" ${t==='n'?'step="any" min="0"':''} value="${esc(v)}" ${oc}></div>`};
 const a=usedIn(it);let top='';
 if(a.length){const p=a.map(x=>x.p),avg=p.reduce((s,x)=>s+x,0)/p.length;top=`<div class="it" style="display:block;margin-bottom:8px"><div class="sub">Uit je ${a.length} recept${a.length>1?'en':''}: <b>${Math.min(...p)}% tot ${Math.max(...p)}%</b> (gemiddeld ${avg.toFixed(1)}%)</div><button class="b2 sm" style="margin-top:6px" onclick="useRange(${i})">Gebruik als aanbevolen bereik</button></div>`}
 if(it.dil>0&&it.dil<100)top+=`<div class="sub" style="margin-bottom:8px">Verdund product: 1% in je recept is ongeveer ${(it.dil/100).toFixed(2)}% zuivere stof.</div>`;
 return`<div style="flex-basis:100%;min-width:0;max-width:100%;margin-top:10px">${top}`+G.map(g=>{const h=ITF.filter(f=>f[3]===g).map(inp).join('');return h?`<div class="sub" style="margin:10px 0 6px"><b>${g}</b></div><div class="g2" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">${h}</div>`:''}).join('')+'</div>'}

/* --- aromagegevens plakken --- */
function aiParse(t){
 t=String(t||'').replace(/\r/g,'');const L=t.split('\n').map(x=>x.trim()).filter(Boolean),o={},f=s=>parseFloat(String(s).replace(',','.'));let m;
 const first=L.find(l=>l.length<=90&&!/^(https?:|price|prijs|recommended|steep|max|density|size|ingredients?|vendor|brand|merk)/i.test(l));
 if(first){const sp=vSplit(first.replace(/\s*[|\-–]\s*(flavou?r|concentrate|aroma)\b.*$/i,''));o._name=(sp.v?VD[sp.v]+' - ':'')+sp.n.replace(/\s+(?:flavou?r(?:ing)?\s+)?concentrate$/i,'').replace(/\s+flavou?r(?:ing)?$/i,'').trim();if(sp.v)o.brand=VD[sp.v]}
 if(m=t.match(/(?:vendor|brand|merk|manufacturer|fabrikant)\s*[:=]\s*([^\n]+)/i))o.brand=m[1].trim().slice(0,40);
 if(m=t.match(/(?:recommended|aanbevolen|suggested|advised)[^\n\d]{0,30}?(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to|tot)\s*(\d+(?:[.,]\d+)?))?\s*%/i)){if(m[2]){o.recLo=f(m[1]);o.rec=f(m[2])}else o.rec=f(m[1])}
 if(m=t.match(/(?:max(?:imum)?|hoogstens)[^\n\d]{0,25}?(\d+(?:[.,]\d+)?)\s*%/i))o.max=f(m[1]);
 if(m=t.match(/steep(?:ing)?[^\n\d]{0,25}?(\d+)(?:\s*(?:-|–|to|tot)\s*(\d+))?\s*(?:days?|dagen|d\b)/i))o.steep=+(m[2]||m[1]);
 if((m=t.match(/(?:density|dichtheid|specific gravity|\bsg\b)[^\n\d]{0,12}(\d\.\d{1,4})/i))||(m=t.match(/(\d\.\d{1,4})\s*g\s*\/\s*(?:ml|cm)/i)))o.dens=f(m[1]);
 if((m=t.match(/\b(pg|vg|propylene glycol|glycerin(?:e)?|ethanol|alcohol|water|triacetin)\s*[- ]?\s*(?:based|base|carrier)\b/i))||(m=t.match(/(?:base|carrier|drager|dragerstof)\s*[:=]\s*(pg|vg|propylene glycol|glycerin|ethanol|alcohol|water|triacetin)/i))){const b=m[1].toLowerCase();o.carrier=/^pg|propylene/.test(b)?'PG':/^vg|glycerin/.test(b)?'VG':/ethanol|alcohol/.test(b)?'ETOH':/water/.test(b)?'H2O':'TRI'}
 if(m=t.match(/(?:size|inhoud|volume|maat)\s*[:=]?\s*(\d+)\s*ml/i)||t.match(/\b(\d{1,4})\s*ml\b/i))o.size=+m[1];
 if(m=t.match(/[€$£]\s*(\d+[.,]\d{1,2})/)||t.match(/(\d+[.,]\d{2})\s*(?:€|eur)/i))o.price=f(m[1]);
 if(/(?:diacetyl|diketone|diketon)[- ]?(?:free|vrij)|zonder diacetyl|no diacetyl/i.test(t))o.dk='vrij';else if(/(?:contains|bevat)\s+(?:diacetyl|diketone|acetyl propionyl)/i.test(t))o.dk='bevat';
 if(m=t.match(/ingredi[eë]nt(?:en|s)?\s*[:=]\s*([^\n]+)/i))o.ingr=m[1].trim().slice(0,400);
 const mt=/\bmtl\b/i.test(t),dt=/\bdtl\b/i.test(t);if(mt&&dt)o.use='beide';else if(mt)o.use='MTL';else if(dt)o.use='DTL';
 if(m=t.match(/CAS\s*(?:no\.?|number|nr\.?|#)?\s*[:#]?\s*(\d{2,7}-\d{2}-\d)/i))o.cas=m[1];
 if(m=t.match(/\b(\d{12,13})\b/))o.barcode=m[1];
 if(m=t.match(/https?:\/\/\S+/))o.url=m[0].replace(/[)\].,]+$/,'');
 const d=L.find(l=>l.length>50&&l!==first&&!/^(https?:|price|prijs|recommended|steep|max|density|ingredients?)/i.test(l));if(d)o.desc=d.slice(0,500);
 const nm=o._name||'',g=addGuess(nm);if(g){o.kind='add';o.addType=g}else if(nm){const w=catOf(nm);if(w)o.cat=Object.keys(w).sort((a,b)=>w[b]-w[a])[0]}
 return o}
function aiGo(){const t=$('aiIn').value;if(!t.trim()){ai=null;$('aiOut').innerHTML='';return}ai=aiParse(t);aiShow()}
function aiShow(){
 const el=$('aiOut');if(!ai)return;const keys=Object.keys(ai).filter(k=>k[0]!=='_');
 const val=(k,v)=>{const f=ITFM[k];if(f&&f[2]==='s'){const o=(itfOpts(f)||[]).find(x=>String(x[0])===String(v));return o?o[1]:v}return v};
 if(!keys.length&&!ai._name){el.innerHTML='<p class="note" style="margin-top:10px">Ik herken hier geen gegevens in. Plak de tekst van een productpagina met bijvoorbeeld aanbevolen percentage, steeptijd of ingrediënten.</p>';return}
 el.innerHTML=`<div class="fg" style="margin-top:12px"><label>Voor welk aroma?</label><select id="aiTgt" onchange="$('aiNameBox').style.display=this.value===''?'':'none'"><option value="">➕ Nieuw aroma of additief</option>${inventory.map((it,i)=>`<option value="${i}"${findInv(ai._name)===it?' selected':''}>${esc(it.name)}</option>`).join('')}</select></div><div class="fg" id="aiNameBox" style="${findInv(ai._name)?'display:none':''}"><label>Naam voor het nieuwe item</label><input id="aiName" value="${esc(ai._name||'')}"></div>`+
 `<div class="it" style="display:block;margin-top:6px">`+(keys.map(k=>`<div class="sub" style="display:flex;justify-content:space-between;gap:8px;margin-top:3px"><span>${esc((ITFM[k]||[0,k])[1])}</span><b style="text-align:right">${esc(String(val(k,ai[k])).slice(0,60))}</b></div>`).join('')||'<div class="sub">Alleen een naam gevonden.</div>')+`</div><label class="sub" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="aiOw" style="width:auto"> Bestaande waarden overschrijven</label><button class="b1" style="margin-top:10px;width:100%" onclick="aiApply()">Toepassen</button>`}
function aiApply(){
 if(!ai)return;const tg=$('aiTgt').value;let it;
 undoPush('Aromagegevens toegepast');
 if(tg===''){const name=($('aiName').value||'').trim();if(!name)return toast('⚠️ Geef een naam op');it=findInv(name);if(!it){it={id:Date.now(),name,ml:0,size:0,price:0,wish:true};inventory.push(it)}}
 else it=inventory[+tg];
 const ow=$('aiOw').checked,fl=it.fl&&it.fl.length;
 Object.keys(ai).forEach(k=>{if(k[0]==='_'||(fl&&(k==='size'||k==='price')))return;if(ow||it[k]==null||it[k]===''||it[k]===0)it[k]=ai[k]});
 renderInventory();renderFlavors();dlFill();toast('📋 Gegevens toegepast op '+it.name);ai=null;$('aiIn').value='';$('aiOut').innerHTML=''}

/* --- CSV met alle velden --- */
function csvAll(){
 const cols=[['name','Naam'],...ITF.map(f=>[f[0],f[1]])],lab=(f,v)=>{if(f&&f[2]==='s'){const o=(itfOpts(f)||[]).find(x=>String(x[0])===String(v));return o?o[1]:v}return v};
 const rows=inventory.map(it=>cols.map(([k])=>{const v=k==='name'?it.name:it[k];return v==null?'':lab(ITFM[k],v)}));
 outFile('eliquid_alle_gegevens_'+new Date().toISOString().slice(0,10)+'.csv',new Blob(['﻿'+[cols.map(c=>c[1])].concat(rows).map(r=>r.map(csvEsc).join(';')).join('\r\n')],{type:'text/csv'}));toast('📄 '+rows.length+' rijen geëxporteerd')}
function csvParse(t){
 t=String(t||'').replace(/^﻿/,'').replace(/\r/g,'');const l0=t.split('\n')[0]||'',d=(l0.match(/;/g)||[]).length?';':(l0.match(/\t/g)||[]).length?'\t':',';
 const rows=[];let r=[],c='',q=false;
 for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
  else if(ch==='"')q=true;else if(ch===d){r.push(c);c=''}else if(ch==='\n'){r.push(c);rows.push(r);r=[];c=''}else c+=ch}
 if(c!==''||r.length){r.push(c);rows.push(r)}return rows.filter(x=>x.some(y=>String(y).trim()))}
const HALIAS={aroma:'name',naam:'name',name:'name',voorraad:'ml','voorraad ml':'ml','aanbevolen %':'rec','max %':'max','steep dagen':'steep','herbestel bij ml':'min','categorie':'cat','notitie':'note','prijs':'price','prijs flesje':'price'};
function csvMap(h){const m={};ITF.forEach(f=>{m[akey(f[1])]=f[0];m[akey(f[0])]=f[0]});Object.entries(HALIAS).forEach(([a,k])=>m[akey(a)]=k);m[akey('Naam')]='name';return m[akey(h)]||null}
function csvConv(k,v){const f=ITFM[k];v=String(v).trim();if(v==='')return undefined;
 if(f&&f[2]==='n'){const x=parseFloat(v.replace(',','.'));return isNaN(x)?undefined:x}
 if(f&&f[2]==='s'){const o=(itfOpts(f)||[]).find(x=>akey(x[1])===akey(v)||akey(x[0])===akey(v));if(o)return o[0];if(k==='kind'&&/add/i.test(v))return'add';return undefined}
 return v}
function csvIn(text){
 const rows=csvParse(text);if(rows.length<2){csvRows=null;$("csvPrev").innerHTML='<p class="note" style="margin-top:10px">Geen gegevens gevonden. De eerste regel moet de kolomnamen bevatten.</p>';return}
 const keys=rows[0].map(csvMap);if(!keys.includes('name')){csvRows=null;$("csvPrev").innerHTML='<p class="note" style="margin-top:10px">Ik mis een kolom "Naam" of "Aroma".</p>';return}
 csvRows=rows.slice(1).map(r=>{const o={};keys.forEach((k,i)=>{if(k&&k!=='name'||k==='name'){const v=csvConv(k,r[i]==null?'':r[i]);if(v!==undefined)o[k]=v}});return o}).filter(o=>o.name);
 const nw=csvRows.filter(o=>!findInv(o.name)).length,un=keys.filter((k,i)=>!k).length;
 $("csvPrev").innerHTML=`<div class="it" style="display:block;margin-top:10px"><div class="sub"><b>${csvRows.length}</b> rijen · ${nw} nieuw · ${csvRows.length-nw} bijwerken${un?' · '+un+' onbekende kolommen genegeerd':''}</div><label class="sub" style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" id="csvOw" checked style="width:auto"> Bestaande waarden overschrijven</label><button class="b1" style="margin-top:8px;width:100%" onclick="csvApply()">Importeren</button></div>`}
function csvApply(){
 if(!csvRows||!csvRows.length)return;undoPush('CSV geïmporteerd');const ow=$('csvOw').checked;let nw=0,up=0;
 csvRows.forEach(o=>{let it=findInv(o.name);if(!it){it={id:Date.now()+nw+up,name:o.name,ml:0,size:0,price:0};inventory.push(it);nw++;if(!(o.ml>0))it.wish=true}else up++;
  const fl=it.fl&&it.fl.length;Object.keys(o).forEach(k=>{if(k==='name'||(fl&&(k==='ml'||k==='size'||k==='price')))return;if(ow||it[k]==null||it[k]===''||it[k]===0)it[k]=o[k]});
  if(it.kind==='add'&&!it.addType)it.addType=addGuess(it.name)||'overig';if(it.ml>0)delete it.wish});
 renderInventory();renderFlavors();dlFill();toast('📊 '+nw+' nieuw, '+up+' bijgewerkt');csvRows=null;$("csvPrev").innerHTML='';$('csvPaste').value=''}
function csvFileIn(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('csvPaste').value=r.result;csvIn(r.result)};r.readAsText(f);e.target.value=''}

var DILRX=/\s*\(?\b(\d+(?:[.,]\d+)?)\s*%\s*(?:in|solution in|opl(?:ossing)? in)\s+(pg|vg|water|ethanol|alcohol|pga)\b\)?/i;
const dilCar=c=>({pg:'PG',pga:'PG',vg:'VG',water:'H2O',ethanol:'ETOH',alcohol:'ETOH'})[String(c).toLowerCase()]||'';
/* --- filters, vandaag --- */
function kindChips(){const n=k=>inventory.filter(i=>k==='add'?i.kind==='add':i.kind!=='add').length;return`<span class="chip${invKind===''?' on':''}" onclick="setKind('')">Alles</span><span class="chip${invKind==='aroma'?' on':''}" onclick="setKind('aroma')">🍓 Aroma's (${n('aroma')})</span><span class="chip${invKind==='add'?' on':''}" onclick="setKind('add')">🧂 Additieven (${n('add')})</span>`}
function setKind(k){invKind=k;renderInventory()}
inventory.forEach(it=>{if(it.kind===undefined){const t=addGuess(it.name);if(t){it.kind='add';it.addType=t}}});
const SETK=['vape_cfg','vape_cgoal','vape_cig','vape_res','vape_radT','vape_tagsel','vape_taste','vape_dpm'];
function backupSettings(){const o={};SETK.forEach(k=>{const v=load(k,null);if(v!==null&&v!==undefined)o[k]=v});if(o.vape_cfg)o.vape_cfg={...o.vape_cfg,key:''};return o}
function restoreSettings(s){let n=0;SETK.forEach(k=>{if(!(k in s)||s[k]===null)return;let v=s[k];if(k==='vape_cfg'&&v&&typeof v==='object'){const cur=load('vape_cfg',{});v={...v,key:cur.key||''}}store(k,v);n++});return n>0}
function exportBackup(){markBackup();outFile(`vape_lab_backup_${new Date().toISOString().slice(0,10)}.json`,new Blob([JSON.stringify({inventory,steepBatches:steep,savedRecipes:saved,mixLog:log,prices:price,bases,liquids,bottles,devices:devs,settings:backupSettings(),badges:badgeSt,counters:cnt,meas,version:'5.5',exportDate:new Date().toISOString()},null,2)],{type:'application/json'}))}
function importBackup(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);undoPush('Backup geïmporteerd');if(Array.isArray(d.inventory))inventory=d.inventory;if(Array.isArray(d.steepBatches))steep=d.steepBatches;if(Array.isArray(d.savedRecipes))saved=d.savedRecipes;if(d.badges&&typeof d.badges==='object'){Object.assign(badgeSt,d.badges);store('vape_badges',badgeSt)}if(d.counters&&typeof d.counters==='object'){Object.assign(cnt,d.counters);store('vape_cnt',cnt)}if(Array.isArray(d.meas)){meas.length=0;meas.push(...d.meas);store('vape_meas',meas)}if(Array.isArray(d.devices)){devs=d.devices;store('vape_devs',devs);renderDev()}if(Array.isArray(d.bottles)){bottles=d.bottles;store('vape_bottles',bottles);renderBottle()}if(Array.isArray(d.liquids)){liquids=d.liquids;store('vape_liquids',liquids);renderLiquids();renderBlend()}if(Array.isArray(d.bases)){bases=d.bases;store('vape_bases',bases);renderBases()}if(d.prices){Object.assign(price,d.prices);store('vape_prices',price);initCfg()}if(Array.isArray(d.mixLog)){log=d.mixLog;store('vape_log',log);renderLog()}let rs=false;if(d.settings&&typeof d.settings==='object')rs=restoreSettings(d.settings);store('vape_saved_recipes',saved);renderInventory();renderSteep();renderSaved();renderFlavors();toast('✅ Backup geïmporteerd'+(rs?' · instellingen worden herladen':''));if(rs)setTimeout(()=>location.reload(),1200)}catch{toast('❌ Ongeldig JSON-bestand')}};r.readAsText(f)}

renderFlavors();renderInventory();renderSteep();renderSaved();renderSuggestions();try{navigator.storage?.persist?.()}catch{}renderLiquids();renderBlend();renderBottle();renderBases();calcCorrection();initCfg();renderLog();checkBadges(true);drawRadar();renderMtl();renderCalcBottle();renderUse();
/* PWA-updates: zoek bij start en bij terugkeren naar de app, toon een balk als er iets nieuws klaarstaat */
let swReg=null,swReload=false;
function updBar(){const b=$('bkBar');if(!b)return;b.innerHTML='<span style="flex:1">🔄 Nieuwe versie van de app beschikbaar.</span><button class="b1 sm" onclick="updApply()">Vernieuwen</button><button class="x" onclick="this.parentNode.style.display=\'none\'">✕</button>';b.style.display='flex'}
function updApply(){swReload=true;if(swReg&&swReg.waiting)swReg.waiting.postMessage('skip');else location.reload()}
async function updCheck(manual){if(!swReg){if(manual)toast('Updates werken alleen in de geïnstalleerde app');return}
 try{await swReg.update();if(manual){setTimeout(()=>{if(!(swReg.waiting||swReg.installing))toast('✅ Je hebt de nieuwste versie')},1500)}}catch{if(manual)toast('Geen verbinding om te controleren')}}
if('serviceWorker' in navigator&&location.protocol!=='file:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{swReg=r;
  if(r.waiting&&navigator.serviceWorker.controller)updBar();
  r.addEventListener('updatefound',()=>{const w=r.installing;if(w)w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)updBar()})});
  updCheck(false)}).catch(()=>{}));
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(swReload)location.reload()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)updCheck(false)});
 setInterval(()=>updCheck(false),60*60000)}

