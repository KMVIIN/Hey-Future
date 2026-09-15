const CACHE='future-shell-v5.2.0';
self.addEventListener('install',(event)=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then((cache)=>cache.addAll(['/','/install','/manifest.webmanifest'])))});
self.addEventListener('activate',(event)=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter((k)=>k!==CACHE).map((k)=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',(event)=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then((cached)=>cached||caches.match('/'))))});
self.addEventListener('push',(event)=>{
  let data={};try{data=event.data?event.data.json():{}}catch{data={body:event.data?event.data.text():''}}
  const title=data.title||'Future';
  const options={body:data.body||'Future has something for you.',icon:'/icon-192.png?v=5.2.0',badge:'/icon-192.png?v=5.2.0',tag:data.tag||'future-alert',renotify:true,data:{url:data.url||'/'}};
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',(event)=>{
  event.notification.close();const url=(event.notification.data&&event.notification.data.url)||'/';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then((clients)=>{for(const client of clients){if('focus' in client){client.navigate(url);return client.focus()}}if(self.clients.openWindow)return self.clients.openWindow(url)}));
});

