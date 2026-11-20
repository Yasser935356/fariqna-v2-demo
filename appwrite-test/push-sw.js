



/* فريقنا 2.0 — استقبال إشعارات Web Push (نسخة تجريبية). */
'use strict';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Windows: إظهار عدد رسائل المحادثة المتتالية في إشعار واحد.
// بقية الأجهزة: الاحتفاظ بالسلوك السابق دون تعديل.
let chatPushSequence = Promise.resolve();

self.addEventListener('push', (event) => {
  let message = {};
  if (event.data) {
    try {
      message = event.data.json();
    } catch (_) {
      message = { body: event.data.text() };
    }
  }
  if (!message || typeof message !== 'object') message = {};

  const title = typeof message.title === 'string' && message.title.trim()
    ? message.title.slice(0, 100)
    : '🔔 فريقنا 2.0';
  const body = typeof message.body === 'string'
    ? message.body.slice(0, 300)
    : 'لديك تحديث جديد في فريقنا.';
  const tag = typeof message.tag === 'string'
    ? message.tag.slice(0, 100)
    : 'fariqna-update';
  const path = typeof message.path === 'string' ? message.path : '';

  const isWindows = /Windows/i.test(self.navigator.userAgent || '');
  const isChat = tag === 'fariqna-chat';

  // إشعارات المهام، وجميع إشعارات iOS وAndroid، تبقى كما كانت.
  if (!isWindows || !isChat) {
    event.waitUntil(self.registration.showNotification(title, {
      body,
      tag,
      renotify: false,
      data: { path }
    }));
    return;
  }

  // getNotifications يسترجع الإشعار المعروض حاليًا.
  // عند استبداله بوسم tag نفسه يحتفظ بالعدد ما دام الإشعار موجودًا.
  // لا نمثّل هذا الرقم على أنه عدد الرسائل غير المقروءة في قاعدة البيانات.
  const updateWindowsChat = async () => {
    let count = 1;
    try {
      const current = await self.registration.getNotifications({ tag });
      const previous = current.find((n) => n.tag === tag);
      const previousCount = Number(previous && previous.data && previous.data.chatCount);
      if (Number.isInteger(previousCount) && previousCount >= 1) {
        count = Math.min(previousCount + 1, 9999);
      } else if (previous) {
        count = 2;
      }
    } catch (_) {
      // إذا تعذّر معرفة العدد، لا نعطّل وصول الإشعار.
    }

    const newTitle = count === 1 ? title : `💬 ${count} رسائل جديدة`;
    const newBody = count === 1 ? body : `وصلتك ${count} رسائل جديدة في محادثات فريقنا.`;
    await self.registration.showNotification(newTitle, {
      body: newBody,
      tag,
      renotify: false,
      data: { path, chatCount: count }
    });
  };

  // منع تداخل إشعارات متتابعة داخل تشغيل عامل الخدمة الواحد.
  const next = chatPushSequence.then(updateWindowsChat, updateWindowsChat);
  chatPushSequence = next.catch(() => {});
  event.waitUntil(next);
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




