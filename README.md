# Watson's

Production web app for Watson's Toronto.

## Local Development

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to the Watson's MongoDB connection string.
3. Install dependencies with `npm install`.
4. Run the normalized menu migration with `npm run migrate:menus`.
5. Start the app with `npm run dev`.

## Production / Heroku

Set these Heroku config vars before deploying:

```text
NODE_ENV=production
SITE_URL=https://watsonstoronto.com
MONGODB_URI=<production MongoDB connection string>
MONGODB_DB_NAME=watsons
VITE_PUBLIC_API_BASE_URL=/api
```

The `Procfile` runs `npm run migrate:menus` during Heroku release and `npm start` for the web process. The app serves the Vite build from Express in production.

## Data

The public menu is loaded from normalized MongoDB collections through `/api/menus/watsons/liquor`. Do not add menu item arrays to the React app.

## Menu Description Migration

Run a dry-run with explicit inputs:

```powershell
npm run migrate:menu-descriptions -- --dry-run --file "<path-to-json>" --remove-item-json "{\"name\":\"<name>\",\"description\":\"<description>\",\"price\":\"<price>\"}"
```

The script reads the menu document title from the JSON file by default. Use `--menu-title` only when the JSON file does not include the target document title.
