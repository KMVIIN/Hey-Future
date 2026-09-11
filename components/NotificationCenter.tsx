'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { canUseNotifications, registerFutureServiceWorker, requestNotificationPermission, showRawNotification } from '@/lib/notifications';
import { speakFuture } from '@/lib/speech';

const text = {
  en: { title:'Free reminders + voice', on:'Browser notifications are enabled.', off:'Turn on notifications so Future can alert you.', denied:'Notifications are blocked in your browser settings.', unsupported:'This browser does not support Future notifications.', enable:'Enable notifications', test:'Test notification + voice', testTitle:'Future · Test', testBody:'Notifications are working on this device.', spoken:'Future test. Notifications are ready.', sent:'Test sent. If no Windows popup appears, check Windows Notifications / Do not disturb.' },
  fr: { title:'Rappels + voix gratuits', on:'Les notifications du navigateur sont activées.', off:'Activez les notifications pour que Future puisse vous alerter.', denied:'Les notifications sont bloquées dans les paramètres du navigateur.', unsupported:'Ce navigateur ne prend pas en charge les notifications Future.', enable:'Activer les notifications', test:'Tester notification + voix', testTitle:'Future · Test', testBody:'Les notifications fonctionnent sur cet appareil.', spoken:'Test Future. Les notifications sont prêtes.', sent:'Test envoyé. Si aucune fenêtre Windows n’apparaît, vérifiez Notifications / Ne pas déranger.' },
  th: { title:'แจ้งเตือน + เสียงพูด ฟรี', on:'เปิดการแจ้งเตือนของเบราว์เซอร์แล้ว', off:'เปิดการแจ้งเตือนเพื่อให้ Future เตือนคุณ', denied:'เบราว์เซอร์บล็อกการแจ้งเตือนอยู่', unsupported:'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนของ Future', enable:'เปิดการแจ้งเตือน', test:'ทดสอบ notification + เสียง', testTitle:'Future · ทดสอบ', testBody:'การแจ้งเตือนบนอุปกรณ์นี้ทำงานแล้ว', spoken:'ทดสอบ Future ระบบแจ้งเตือนพร้อมแล้ว', sent:'ส่งการทดสอบแล้ว ถ้า Windows ไม่เด้ง ให้ตรวจ Notifications และ Do not disturb ของ Windows' },
} as const;

export default function NotificationCenter({ locale }: { locale: Locale }) {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [diagnostic, setDiagnostic] = useState('');
  const t = text[locale];

  useEffect(() => {
    const ok = canUseNotifications();
    setSupported(ok);
    setPermission(ok ? Notification.permission : 'unsupported');
    if (ok) registerFutureServiceWorker();
  }, []);

  async function enable() {
    await registerFutureServiceWorker();
    const next = await requestNotificationPermission();
    setPermission(next);
  }

  async function test() {
    const ok = await showRawNotification(t.testTitle, t.testBody, `future-test-${Date.now()}`);
    speakFuture(t.spoken, locale);
    setDiagnostic(ok ? t.sent : t.denied);
  }

  const message = !supported ? t.unsupported : permission === 'granted' ? t.on : permission === 'denied' ? t.denied : t.off;

  return (
    <section className="notificationPanel">
      <div>
        <strong>{t.title}</strong>
        <div className="notificationMessage">{message}</div>
        {diagnostic && <div className="notificationDiagnostic">{diagnostic}</div>}
      </div>
      <div className="notificationActions">
        {supported && permission !== 'granted' && permission !== 'denied' && <button className="ghost" type="button" onClick={enable}>{t.enable}</button>}
        {supported && permission === 'granted' && <button className="ghost" type="button" onClick={test}>{t.test}</button>}
      </div>
    </section>
  );
}
