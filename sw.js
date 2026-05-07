// SolisWeb Service Worker v2.0
const CACHE_NAME = 'solisweb-v2';
const ASSETS = [
  './index.html', './style.css', './app.js', './manifest.json',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      var local = ASSETS.filter(function(a){return a.startsWith('./');});
      var ext   = ASSETS.filter(function(a){return !a.startsWith('./');});
      return cache.addAll(local).then(function(){
        return Promise.allSettled(ext.map(function(u){return cache.add(u).catch(function(){});}));
      });
    }).then(function(){ return self.skipWaiting(); })
  );
});

// Activate
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE_NAME;}).map(function(k){return caches.delete(k);}));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Fetch — Cache First
self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached){
        fetch(e.request).then(function(r){
          if(r&&r.status===200){ var c=r.clone(); caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,c);}); }
        }).catch(function(){});
        return cached;
      }
      return fetch(e.request).then(function(r){
        if(!r||r.status!==200||r.type==='opaque') return r;
        var c=r.clone(); caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,c);});
        return r;
      }).catch(function(){
        if(e.request.mode==='navigate') return caches.match('./index.html');
      });
    })
  );
});

// Push notification
self.addEventListener('push', function(e){
  var data = e.data ? e.data.json() : {title:'SolisWeb',body:'Hora de estudar!'};
  e.waitUntil(
    self.registration.showNotification(data.title||'SolisWeb', {
      body: data.body||'Não esqueça de estudar hoje!',
      icon: './icons/icon-192.png',
      badge: './icons/icon-72.png',
      tag: 'study-reminder',
      renotify: false,
      actions: [{action:'open', title:'Abrir SolisWeb'}]
    })
  );
});

// Notification click
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cls){
      for(var i=0;i<cls.length;i++){ if('focus' in cls[i]) return cls[i].focus(); }
      if(clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});

// Message from app
self.addEventListener('message', function(e){
  if(e.data&&e.data.type==='SKIP_WAITING') self.skipWaiting();
  if(e.data&&e.data.type==='STUDY_REMINDER'){
    self.registration.showNotification('SolisWeb — Lembrete', {
      body: e.data.body||'Você ainda não estudou hoje! 📚',
      icon: './icons/icon-192.png', badge: './icons/icon-72.png',
      tag: 'study-reminder', renotify: false
    });
  }
});
