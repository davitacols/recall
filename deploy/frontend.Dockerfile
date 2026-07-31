# Knoledgr web tier: builds the CRA bundle, then bakes it into an nginx image
# that also fronts the two Django upstreams. Build context is the repo root.
#
# There is no Node process at runtime — CRA emits static assets, and the two
# Vercel serverless functions it used to need (robots.txt, sitemap.xml) are
# already present as real files in frontend/public, so nginx just serves them.

FROM node:20-alpine AS build

WORKDIR /app

# REACT_APP_* are compile-time in CRA — they are inlined into the bundle, so
# they must be build args, not runtime environment.
ARG REACT_APP_API_URL
ARG REACT_APP_SENTRY_DSN
ARG REACT_APP_SENTRY_ENVIRONMENT=production
ARG REACT_APP_SENTRY_TRACES_SAMPLE_RATE=0.1
ARG REACT_APP_TURNSTILE_SITE_KEY
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_SENTRY_DSN=$REACT_APP_SENTRY_DSN \
    REACT_APP_SENTRY_ENVIRONMENT=$REACT_APP_SENTRY_ENVIRONMENT \
    REACT_APP_SENTRY_TRACES_SAMPLE_RATE=$REACT_APP_SENTRY_TRACES_SAMPLE_RATE \
    REACT_APP_TURNSTILE_SITE_KEY=$REACT_APP_TURNSTILE_SITE_KEY \
    GENERATE_SOURCEMAP=false \
    CI=false

COPY frontend/package.json frontend/package-lock.json ./
# `npm install`, not `npm ci`: the committed lock file is out of sync with
# package.json (yaml@2.9.0 is missing from it), so `npm ci` refuses outright.
# Vercel's default install command is `npm install`, so this reproduces how the
# currently-live bundle is actually built rather than re-resolving the tree
# during a migration. Worth regenerating the lock and switching back to `npm ci`
# as its own change, where a dependency shift can be reviewed on its own merits.
RUN npm install --no-audit --no-fund

COPY frontend/ ./
# `npm run build` also prerenders the per-route SEO snapshots.
RUN npm run build


FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
