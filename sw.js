/* Dominó da Galera — Service Worker v2
   - documento (index.html): REDE primeiro, cache como reserva
   - estáticos (manifesto, ícones): cache primeiro, atualiza por baixo
   - Firebase e cross-origin: NÃO intercepta (multiplayer intacto)
   - notificações locais: clique foca o app
   - update: novo SW fica em espera; o app avisa e ativa quando o jogador tocar */
const CACHE = 'domino-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './av/zefa.webp', './av/nino.webp', './av/rosinha.webp', './av/beto.webp', './av/tiao.webp',
  './av/bibi.webp', './av/neide.webp', './av/valdo.webp', './av/neno.webp', './av/pipo.webp'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* o app manda 'skipWaiting' quando o jogador toca em "atualizar" */
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

/* toque na notificação: volta pro jogo */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./');
    })
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isDoc = req.mode === 'navigate' ||
                url.pathname.endsWith('/') ||
                url.pathname.endsWith('index.html');

  if (isDoc) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
