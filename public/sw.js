// Required for PWA installability criteria on Android Chrome
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const { title = 'BlueBooks', body = 'Nova notificação', url = '/', tag } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/bluebooks-icon.jpeg',
      badge: '/bluebooks-icon.jpeg',
      tag: tag || 'bluebooks-notif',
      renotify: true,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
