# Knoledgr on the VPS

Single-box deployment of the whole stack — Postgres, Redis, Django (HTTP +
websockets), Celery worker, Celery beat, and the built SPA — replacing Neon,
Upstash, Render and Vercel.

## The one thing to know first

**This box also runs the unrelated `solakuti` stack, which is live.** Knoledgr is
deliberately isolated from it: its own compose project, network, Postgres,
Redis and volumes. You can `down`/`up` Knoledgr freely.

The single shared resource is the edge. Only one process can bind `:80`/`:443`
and solakuti's nginx already has them, so it also fronts `knoledgr.com` and
proxies to this stack's own nginx. That is why this stack ships its own nginx
rather than adding mounts to solakuti's — it means solakuti's container never
needs recreating.

## Layout

| Service   | Role                                    | Limit |
|-----------|-----------------------------------------|-------|
| `db`      | Postgres 17                             | 1g    |
| `redis`   | Celery broker + channels layer          | 256m  |
| `migrate` | one-shot: migrate + collectstatic       | 768m  |
| `backend` | gunicorn/WSGI — `/api`, `/admin`        | 768m  |
| `ws`      | daphne/ASGI — `/ws/` only               | 512m  |
| `worker`  | Celery worker                           | 768m  |
| `beat`    | Celery beat (schedule in `config/celery.py`) | 256m |
| `web`     | nginx — SPA, static, routes to the two upstreams | 128m |

HTTP and websockets are split on purpose. A single Daphne runs sync DRF views
in a threadpool on one event loop, so a slow query degrades websocket latency
and only one core is ever used. The code needs no changes for this: every
`async def` is inside a websocket consumer, and there are no async views or
streaming endpoints.

Memory limits are not decoration. On a shared box an unbounded Celery worker
gets a *neighbour's* Postgres OOM-killed rather than dying itself. Ceilings
total ~3.7G against 7.6G installed.

## Operating it

```sh
cd ~/recall
DC="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"

$DC up -d --build      # deploy
$DC ps                 # status
$DC logs -f backend    # tail
docker stats --no-stream   # check real usage against the limits
```

Migrations and `collectstatic` run in the `migrate` one-shot, which the other
services wait on via `service_completed_successfully` — so they can never race
each other applying the same migration.

## Edge wiring

Done once, in `deploy/edge-knoledgr.conf`. Both steps are non-disruptive:
`docker network connect` is a live operation needing no restart, and
`nginx -t` validates before `nginx -s reload`, so a malformed block leaves the
running config serving solakuti untouched.

The edge resolves this stack through Docker DNS at request time rather than
caching an IP at startup, so rebuilding Knoledgr does not strand solakuti's
nginx on a dead address.

## Still external

Media remains on Cloudinary/S3 — `settings.py` selects `MediaCloudinaryStorage`
whenever `DEBUG` is off. Moving it here means rewriting stored asset URLs, so
it is its own job. `deploy/backup.sh` therefore covers Postgres only.

## Backups

`deploy/backup.sh`, on its own cron entry and its own retention, separate from
`~/solakuti/backup.sh` so neither can break the other. 14 days, and it exits
non-zero on an empty dump rather than quietly keeping a truncated one.
