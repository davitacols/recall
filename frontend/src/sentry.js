import * as Sentry from "@sentry/react";

const dsn = (process.env.REACT_APP_SENTRY_DSN || "").trim();
const environment = (process.env.REACT_APP_SENTRY_ENVIRONMENT || "development").trim();
const tracesSampleRate = Number(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || "0");

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
  });
}
