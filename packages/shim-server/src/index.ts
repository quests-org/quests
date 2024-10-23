import * as Sentry from "@sentry/node";

const APP_BASE_URL = process.env.APP_BASE_URL;

if (!APP_BASE_URL) {
  throw new Error("APP_BASE_URL is not set");
}

Sentry.init({
  dsn: "https://1@2.ingest.sentry.io/3",
  integrations: [Sentry.consoleIntegration()],
  profilesSampleRate: 0,
  sampleRate: 1,
  tracesSampleRate: 0,
  tunnel: `${APP_BASE_URL}/_quests/envelope`,
});
