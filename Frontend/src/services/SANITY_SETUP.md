# Connecting Sanity CMS to Pathy

## 1 — Install the client
Run this inside your `Frontend/` folder:
```bash
npm install @sanity/client
```

## 2 — Create a free Sanity project
Go to https://sanity.io → "Start for free" → create a project called "pathy"
Note your **Project ID** (looks like `abc1defg`).

## 3 — Add your Project ID to .env
Open `Frontend/.env` and add:
```
EXPO_PUBLIC_SANITY_PROJECT_ID=abc1defg
EXPO_PUBLIC_SANITY_DATASET=production
```

## 4 — Create content in Sanity Studio
Go to https://sanity.io/manage → your project → "Studio" tab.
Create a new **Document type** called `routePost` with these fields:
- `title`       (string)
- `user`        (object: name string)
- `image`       (image)
- `distanceKm`  (number)
- `durationMin` (number)
- `caption`     (text)
- `likes`       (number, default 0)
- `comments`    (number, default 0)
- `createdAt`   (datetime)

Add a few sample route posts and publish them.

## 5 — The feed will update automatically
The HomeScreen calls `fetchRouteFeed()` on mount and pull-to-refresh.
When Sanity returns no data (project not set up yet), it falls back to
the built-in SAMPLE_FEED so the app always looks populated.

## Where the client lives
`Frontend/src/services/sanityClient.ts`
