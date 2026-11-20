


/* فريقنا 2.0 — استقبال إشعارات Web Push في النسخة التجريبية. */
'use strict';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let message = {};
  if (event.data) {
    try {
      message = event.data.json();
    } catch (_) {
      message = { body: event.data.text() };
    }
  }

  const title = typeof message.title === 'string' && message.title.trim()
    ? message.title.slice(0, 100)
    : '🔔 فريقنا 2.0';
  const body = typeof message.body === 'string'
    ? message.body.slice(0, 300)
    : 'لديك تحديث جديد في فريقنا.';
  const tag = typeof message.tag === 'string'
    ? message.tag.slice(0, 100)
    : 'fariqna-update';

  // دمج إشعارات المحادثة يعتمد على إرسال نفس tag وعدّاد الرسائل من الخادم.
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag,
    renotify: false,
    data: { path: typeof message.path === 'string' ? message.path : '' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const home = new URL(self.registration.scope);
    let target = home;
    const path = event.notification.data && event.notification.data.path;

    if (typeof path === 'string' && path) {
      try {
        const proposed = new URL(path, home);
        if (proposed.origin === home.origin && proposed.pathname.startsWith(home.pathname)) {
          target = proposed;
        }
      } catch (_) { /* استخدم الصفحة الرئيسية */ }
    }

    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((windowClient) =>
      windowClient.url.startsWith(home.origin + home.pathname));

    if (existing) {
      if (typeof existing.navigate === 'function' && existing.url !== target.href) {
        try { await existing.navigate(target.href); } catch (_) { /* متابعة التركيز */ }
      }
      return existing.focus();
    }
    return self.clients.openWindow(target.href);
  })());
});




