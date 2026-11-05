self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Laser Inova', {
      body: data.body || '',
      icon: '/logo_sidebar.png',
      badge: '/logo_sidebar.png',
      tag: data.tag,
      renotify: !!data.tag, // con la misma etiqueta, vuelve a sonar/avisar en vez de reemplazar en silencio
      data: { url: data.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Solo ruta + query: así abre siempre en el mismo origen donde está instalada la PWA, sin importar el dominio configurado en el servidor.
  let url = (event.notification.data && event.notification.data.url) || '/dashboard';
  try { const u = new URL(url, self.location.origin); url = u.pathname + u.search; } catch (e) { url = '/dashboard'; }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          return c.navigate(url).then((w) => (w || c).focus()).catch(() => c.focus());
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
