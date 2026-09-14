'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { canUseNotifications, currentFuturePushSubscription, registerFutureServiceWorker, requestNotificationPermission, sendFutureTestPush, subscribeFuturePush } from '@/lib/notifications';

const text = {
  en: { title:'Web Push notifications', on:'Notifications are enabled and this device is subscribed.', off:'Enable notifications so Future can alert you even after you close the app.', denied:'Notifications are blocked in your browser settings.', unsupported:'This browser does not support Future notifications.', enable:'Enable notifications', test:'Send test push', subscribing:'Subscribing…', testing:'Sending…', ready:'Device subscribed. You can now close Future and test Web Push.', sent:'Server push sent. Close/minimize Future and watch for the system notification.', iphone:'On iPhone/iPad, install Future to the Home Screen first, then open the installed app and tap Enable notifications.' },
  fr: { title:'Notifications Web Push', on:'Les notifications sont activées et cet appareil est abonné.', off:'Activez les notifications pour que Future puisse vous alerter même après la fermeture.', denied:'Les notifications sont bloquées dans les paramètres du navigateur.', unsupported:'Ce navigateur ne prend pas en charge les notifications Future.', enable:'Activer les notifications', test:'Envoyer un push test', subscribing:'Activation…', testing:'Envoi…', ready:'Appareil abonné. Vous pouvez fermer Future et tester le Web Push.', sent:'Push serveur envoyé. Fermez/réduisez Future et vérifiez la notification système.', iphone:'Sur iPhone/iPad, ajoutez d’abord Future à l’écran d’accueil, ouvrez l’app installée puis touchez Activer les notifications.' },
  th: { title:'Web Push Notification', on:'เปิดการแจ้งเตือนและ Subscribe อุปกรณ์นี้แล้ว', off:'เปิดการแจ้งเตือน เพื่อให้ Future เตือนได้แม้ปิดแอป/หน้าเว็บแล้ว', denied:'เบราว์เซอร์บล็อกการแจ้งเตือนอยู่', unsupported:'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนของ Future', enable:'Enable notifications', test:'ส่ง Test Push', subscribing:'กำลัง Subscribe…', testing:'กำลังส่ง…', ready:'Subscribe อุปกรณ์แล้ว ตอนนี้ปิด Future แล้วทดสอบ Web Push ได้', sent:'ส่ง Push จาก Server แล้ว ปิด/ย่อ Future แล้วดู Notification ของเครื่อง', iphone:'iPhone/iPad: ต้อง Add Future to Home Screen ก่อน จากนั้นเปิด Future จากไอคอนบน Home Screen แล้วกด Enable notifications' },
} as const;

export default function NotificationCenter({ locale }: { locale: Locale }) {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState<'subscribe'|'test'|null>(null);
  const [diagnostic, setDiagnostic] = useState('');
  const [isIOS, setIsIOS] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const t = text[locale];

  useEffect(() => {
    const ok = canUseNotifications();
    setSupported(ok);
    setPermission(ok ? Notification.permission : 'unsupported');
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (ok) registerFutureServiceWorker().then(() => currentFuturePushSubscription()).then((s) => setSubscribed(Boolean(s))).catch(() => {});
  }, []);

  async function enable() {
    setBusy('subscribe'); setDiagnostic('');
    try {
      await registerFutureServiceWorker();
      const next = await requestNotificationPermission();
      setPermission(next);
      if (next !== 'granted') return;
      await subscribeFuturePush();
      setSubscribed(true); setDiagnostic(t.ready);
    } catch (error) { setDiagnostic(error instanceof Error ? error.message : t.denied); }
    finally { setBusy(null); }
  }

  async function test() {
    setBusy('test'); setDiagnostic('');
    try { await sendFutureTestPush(); setDiagnostic(t.sent); }
    catch (error) { setDiagnostic(error instanceof Error ? error.message : 'Test push failed'); }
    finally { setBusy(null); }
  }

  const message = !supported ? t.unsupported : permission === 'denied' ? t.denied : subscribed ? t.on : t.off;
  const iosNeedsInstall = isIOS && !standalone;

  return (
    <section className="notificationPanel">
      <div>
        <strong>{t.title}</strong>
        <div className="notificationMessage">{iosNeedsInstall ? t.iphone : message}</div>
        {diagnostic && <div className="notificationDiagnostic">{diagnostic}</div>}
      </div>
      <div className="notificationActions">
        {supported && !iosNeedsInstall && permission !== 'denied' && !subscribed && <button className="ghost" type="button" disabled={Boolean(busy)} onClick={enable}>{busy === 'subscribe' ? t.subscribing : t.enable}</button>}
        {supported && subscribed && <button className="ghost" type="button" disabled={Boolean(busy)} onClick={test}>{busy === 'test' ? t.testing : t.test}</button>}
      </div>
    </section>
  );
}
