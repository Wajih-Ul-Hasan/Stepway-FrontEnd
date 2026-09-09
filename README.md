# Stepway frontend

Static HTML/CSS/JavaScript. Node 22 is used only to prepare and check the deployment; there are no npm dependencies.

## Deploy on Render

1. Push this repository to GitHub.
2. Create a Render Blueprint from `render.yaml`, or create a Static Site manually:
   - Build command: `node scripts/build.mjs`
   - Publish directory: `public`
3. Set `STEPWAY_API_BASE_URL` to your backend's public HTTPS **origin**, e.g. `https://stepway-api.up.railway.app`. Do not include `/api`.
4. Deploy. The build generates `public/js/config.js`; it refuses a missing/invalid URL.
5. Set backend `CORS_ALLOWED_ORIGINS` to your Render origin, without a trailing slash, and redeploy the backend.
6. Open `/index.html` to log in with the administrator configured by the backend's bootstrap variables. `/frontPage.html` is the landing page; `/signup3.html` registers students.

No global URL replacement is needed. Changing the hosting variable requires a new frontend build.
Only the API's public origin belongs here; never put database credentials or JWT secrets in frontend variables.

## Local preview

`js/config.js` defaults to `http://localhost:8080`. From this folder:

```powershell
python -m http.server 5500
```

Open http://localhost:5500. Start the backend separately using its README.
The old `stepway.env` file was unused and has been replaced by generated browser configuration.
An `.env` file is not loaded automatically by Node or the browser.

## Verify

```powershell
node scripts/check.mjs
```

This checks JavaScript syntax, configuration order in every root HTML page, API URLs, build validation, and login behavior. It writes an ignored sample build to `public/`; run the deployment build with your actual URL before publishing that folder.

## Demo rehearsal

Log in as admin, create a teacher and student, create a course, log in as the student and enroll, then publish a notice as admin and check it as the student. Check the browser Network panel for failed API calls. Existing template-only pages are not a guarantee of implemented backend functionality.

Reference: https://render.com/docs/static-sites
