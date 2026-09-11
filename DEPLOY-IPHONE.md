# Future Day 2.2 — Free HTTPS + iPhone

## Goal
Publish Future on a free HTTPS URL, then install it from Safari as a Home Screen web app.

## Recommended €0 path: Vercel Hobby

1. Create a free GitHub account/repository if you do not already have one.
2. Put this project in the repository. Do **not** upload `node_modules`.
3. Sign in to Vercel and choose **Add New → Project**.
4. Import the GitHub repository.
5. Vercel should detect **Next.js** automatically. Keep the default build settings.
6. Click **Deploy**.
7. When deployment finishes, Vercel gives you an HTTPS URL such as `https://future-xxxxx.vercel.app`.
8. Open that URL in **Safari on iPhone**.

## Install on iPhone

1. In Safari, open the HTTPS Future URL.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Keep **Open as Web App** enabled.
5. Tap **Add**.
6. Launch Future from its icon on the Home Screen.

## Microphone

Safari microphone access requires a secure context for normal deployed use. On the HTTPS deployment, tap the microphone and allow access when iPhone asks.

## Notifications

The current Future reminder engine still checks reminders while the web app is open/running. Installing as a Home Screen web app improves the app experience, but reliable reminders after the app is fully closed require a real Web Push backend/scheduler, which is a later step.

## Important privacy note

Day 2.2 still stores Future items locally in the browser (`localStorage`). This means Safari on iPhone and Chrome on your Windows PC have separate data. Account sync comes later when a backend/database is added.
