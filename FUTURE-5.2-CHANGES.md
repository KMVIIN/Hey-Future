# Future 5.2 — Responsive Search & Maps

## Search & Discover
- Place searches use public map data instead of generic web results, preventing unrelated results such as Windows support pages for restaurant queries.
- Free web search applies stricter relevance filtering and falls back to direct search links instead of presenting low-confidence results as relevant.
- News uses current public news RSS results; general queries may use Wikipedia as a supporting source.
- Search tabs now support All / Places / News / Shopping and optional user location for approximate distance.
- Place result cards can open the Future map workspace or external directions.

## Map & Directions
- Added `/api/places` for place lookup and driving-route calculation.
- Map centers on the selected search result rather than an unrelated default query.
- Users can enable current browser location, calculate driving distance/time, view route steps, and open Google Maps navigation for driving/walking/transit/bicycling.
- No map API key is required for the public-data lookup/route layer.

## Mobile responsive UX
- Desktop sidebar is now an off-canvas hamburger drawer on phones instead of flowing below the page.
- Added a fixed five-item mobile bottom navigation: Home / Tasks / Search / Calendar / More.
- Workspaces and chat use full-screen mobile layouts without horizontal scrolling.
- Search, map, calendar, cards, and legal footer shrink to the viewport width.

## Launch hardening carried forward
- Includes the Supabase server cookie typing fix and Stripe subscription-period typing fix required for the production build.

