import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

const dsn = (process.env.REACT_APP_SENTRY_DSN || "").trim();
const environment = (process.env.REACT_APP_SENTRY_ENVIRONMENT || "development").trim();
const tracesSampleRate = Number(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || "0");

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    integrations: [new BrowserTracing()],
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
  });
}

