# Logo Pack

The mark: the six court zones as player tokens under the net (front row 4-3-2, back row 5-6-1),
with the setter in zone 1 in yellow — the viewer's default rotation.

Files:
- `assets/logo/vrs-logo-favicon.svg` - tab icon, pixel-fitted for 16px/32px (1px net line, 4px tokens).
- `assets/logo/vrs-logo-mark.svg` - square brand mark with roomier spacing (JSON-LD publisher logo, avatar).
- `assets/logo/vrs-logo-lockup.svg` - mark + "VOLLEYBALL ROTATIONS" wordmark on a graphite panel.
- `/favicon.ico` - 16/32/48px PNG-in-ICO fallback (older Safari, crawlers).
- `/apple-touch-icon.png` - 180px full-bleed home-screen icon (iOS rounds the corners).

In the page `<head>` (all pages):
    <link rel="icon" href="favicon.ico?v=2" sizes="32x32">
    <link rel="icon" type="image/svg+xml" href="assets/logo/vrs-logo-favicon.svg?v=2">
    <link rel="apple-touch-icon" href="apple-touch-icon.png?v=2">
    <meta name="theme-color" content="#101316">

Bump the `?v=` on all pages when an icon changes (Cloudflare and browsers cache icons hard).

Notes:
- Pure SVG, no external assets; the lockup's wordmark is outlined paths (Barlow Semi Condensed Bold).
- Colours from the site tokens: graphite `#101316`, white tokens, setter yellow `#ffc93c`.
