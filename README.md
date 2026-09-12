# Stepway frontend

Static HTML/CSS/JavaScript. Node 22 is used only to prepare and check the deployment; there are no runtime npm dependencies. Playwright is a development-only dependency for browser verification.

## Deploy on Render

1. Push this repository to GitHub.
2. Create a Render Blueprint from `render.yaml`, or create a Static Site manually:
   - Build command: `node scripts/build.mjs`
   - Publish directory: `public`
3. Set `STEPWAY_API_BASE_URL` to your backend's public HTTPS **origin**, e.g. `https://stepway-api.up.railway.app`. Do not include `/api`.
4. Deploy. The build generates `public/js/config.js`; it refuses a missing/invalid URL.
5. Set backend `CORS_ALLOWED_ORIGINS` to your Render origin, without a trailing slash, and redeploy the backend.
6. Open `/index.html` to log in with the administrator configured by the backend's bootstrap variables. `/frontPage.html` is the landing page; `/signup3.html` registers students. Password reset links open `/reset-password.html`; email verification links open `/verify-email.html`.

No global URL replacement is needed. Changing the hosting variable requires a new frontend build.
Only the API's public origin belongs here; never put database credentials or JWT secrets in frontend variables.
Set the backend `APP_FRONTEND_URL` to this same Render origin so SMTP verification and password reset emails point back to the deployed frontend.

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


## Revamped learning workspace

The landing page, sign-in, registration, role dashboards, course catalog and student/teacher notice pages now share a responsive visual system. Existing administrative pages receive the shared theme and a return-to-workspace link. Legacy filenames remain usable; `workspace.html` is the shared entry point after sign-in.

New capabilities:

- A persistent personal learning board: planned, in progress and completed goals.
- Skill focus, target dates, overdue indicators and evidence links.
- Progress counters calculated from saved goals, plus browser print / Save as PDF.
- Search across loaded course cards, load-more pagination, enrollment states, assessments and resource links.
- Explicit loading, empty, validation, unavailable and expired-session states.

No new hosting variables are needed. Deploy the updated backend first so `/api/me/goals` is available, then deploy this frontend using the existing build command. If that API is unavailable, the board displays an error; it does not invent progress data. The new `learning_goal` database table is additive.

## Reproducible browser checks

```powershell
npm ci
npx playwright-core install chromium
npm test
npm run test:browser
```

The browser check starts a local static server and intercepts API calls with test fixtures. It checks registration, sign-in, goal creation/deletion/status changes, state after reload, enrollment, course resources, filtering, role controls and mobile overflow. Screenshots are written to ignored `artifacts/`. This is not a live Railway/MySQL integration test. CI installs Chromium and runs both checks.

To use an already installed Chrome instead, set `CHROME_PATH` to its executable path before running the browser check.

For an MS application demonstration, explain the progress-tracking gap in the original report, show the working flow and its ownership tests, and discuss the tradeoffs. The backend repository contains `docs/ENGINEERING_CASE_STUDY.md` with report traceability and limitations. Progress is self-reported and must not be presented as an institution-verified qualification.
