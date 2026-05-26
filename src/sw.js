import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'BlueBooks', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'BlueBooks', {
      body: data.body || '',
      icon: '/bluebooks-icon.jpeg',
      badge: '/bluebooks-icon.jpeg',
      tag: data.tag || 'bluebooks-msg',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/chats' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(event.notification.data?.url || '/chats');
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data?.url || '/chats');
    })
  );
});
