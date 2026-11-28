const V='eliquid-lab-v5.6.0';
const ASSETS=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(ASSETS.map(a=>c.add(new Request(a,{cache:'reload'}))))))});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
/* Eerst het netwerk (altijd de nieuwste versie), met cache als terugval offline of bij trage verbinding. Externe verzoeken (bijv. Gemini) gaan ongemoeid door. */
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(caches.open(V).then(async c=>{
    const fromCache=()=>c.match(r,{ignoreSearch:true}).then(h=>h||(r.mode==='navigate'?c.match('./index.html'):undefined));
    const net=fetch(r,{cache:'no-cache'}).then(res=>{if(res&&res.ok)c.put(r,res.clone());return res});
    try{return await Promise.race([net,new Promise((_,rej)=>setTimeout(rej,4000))])}
    catch{const h=await fromCache();return h||net.catch(()=>Response.error())}
  }));
});
