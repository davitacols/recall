# Knoledgr cutover runbook

State as of staging: the full stack is built and running on the VPS with a
**copy** of production data, verified end to end. Neon, Upstash, Render and
Vercel are all still live and serving real traffic. Nothing has been cut over.

## Two things to decide first

**1. TLS before or after the DNS flip.** This determines whether the cutover has
a visible error window.

- *DNS-01 (zero downtime, recommended).* Certbot proves control of the domain by
  a TXT record, so the certificate can be issued **while Vercel is still
  serving**. The full HTTPS config is then verified against the VPS by IP, and
  DNS flips last — users move to a stack already known good.
- *HTTP-01 (simpler, has a gap).* The challenge needs `knoledgr.com` already
  pointing at the VPS, so the order is forced: flip DNS → request cert → install
  config. Between the flip and the cert being installed, HTTPS requests hit
  solakuti's certificate and users see a browser warning. Minutes, but ugly.

**2. The Render `SECRET_KEY`.** See "Required input" below.

## Required input

`render.yaml` declares `SECRET_KEY` as `generateValue: true`, so Render
generated it and the value in the local `.env` is almost certainly **not** the
production one. The staged stack is currently running with the local value.

If the real key is not carried across, then at cutover Django will not validate
anything signed with the old one:

- every logged-in user is signed out (SimpleJWT signs with `SECRET_KEY`)
- outstanding password-reset and invite links stop working

None of that is data loss and all of it is survivable, but it should be a
decision rather than a surprise. Copy the value from the Render dashboard
(`recall-backend` → Environment) into `deploy/.env.prod` before cutover, or
accept the mass logout deliberately.

## Sequence (DNS-01 variant)

Lower the TTL on the `knoledgr.com` records to 60s at least an hour ahead, so
the flip propagates quickly and can be reverted quickly.

**1. Issue the certificate while Vercel still serves.**

```sh
docker run --rm -it \
  -v /home/deploy/solakuti/deploy/certbot/conf:/etc/letsencrypt \
  certbot/certbot certonly --manual --preferred-challenges dns \
  --email <you@example.com> --agree-tos --no-eff-email \
  -d knoledgr.com -d www.knoledgr.com -d api.knoledgr.com
```

Certbot prints a TXT record to add at the registrar; wait for it to resolve
before continuing. The certificate lands in the directory solakuti's nginx
already mounts, so the existing monthly renewal cron picks it up with no second
cron job and no second failure mode to watch.

**2. Install the edge config and validate.**

```sh
cat ~/recall/deploy/edge-knoledgr.conf >> ~/solakuti/deploy/nginx.conf
cd ~/solakuti
DC="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"
$DC exec -T nginx nginx -t      # must pass before the next line
$DC exec -T nginx nginx -s reload
```

`nginx -t` is the safety net: if it fails, the running config keeps serving
solakuti and nothing has changed. Do not reload on a failed test.

**3. Verify against the VPS by IP, before any user is sent there.**

```sh
curl -sv --resolve knoledgr.com:443:188.245.60.155 https://knoledgr.com/ -o /dev/null
curl -s  --resolve knoledgr.com:443:188.245.60.155 https://knoledgr.com/api/health/
curl -sI --resolve www.knoledgr.com:443:188.245.60.155 https://www.knoledgr.com/ | head -1
```

Confirm solakuti is still fine in the same breath:

```sh
curl -sI https://www.solakuti.com/ | head -1
```

**4. Freeze writes and take the final data copy.**

The database is only 28 MB and restores in seconds, so the window is minutes,
not the 15–30 originally budgeted. Put Render into maintenance (or scale the web
service to zero) so nothing writes to Neon during the copy, then:

```sh
cd ~/recall
DC="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"
$DC stop backend ws worker beat
$DC exec -T db psql -U knoledgr -d postgres -c \
  "DROP DATABASE knoledgr; CREATE DATABASE knoledgr OWNER knoledgr;"
docker run --rm --env-file ~/.neon.env postgres:17-alpine sh -c \
  'pg_dump "$PGURL" --no-owner --no-privileges --no-acl' \
  | $DC exec -T db psql -U knoledgr -d knoledgr
$DC up -d
```

**5. Flip DNS.** `knoledgr.com`, `www`, and `api` A records → `188.245.60.155`.
Remove the Vercel records. Watch `docker compose logs -f backend` and
`docker stats`.

**6. Only after a clean soak:** decommission Render, Neon and Upstash. Keep them
paused rather than deleted for a few days — they are the rollback.

## Rollback

Before DNS is flipped, there is nothing to roll back: production is untouched.

After the flip, point the A records back at Vercel and un-pause Render. Neon
still holds everything written up to the freeze in step 4. This is why step 6
waits.

## Traps

- **Do not start `beat` until cutover.** With production credentials and a copy
  of real data, the schedule fires real side effects — `send-scheduled-marketing-campaigns`
  every 10 minutes, `webhook-retry-sweep` every 2 — duplicating what Render is
  already doing to real users. `beat` is currently stopped for this reason.
- **`docker compose up -d` on solakuti drops the edge link.** The
  `docker network connect` that lets solakuti's nginx reach Knoledgr was applied
  live and is not in solakuti's compose file, so recreating that container
  silently 502s knoledgr.com. To make it durable, add to the `nginx` service in
  `~/solakuti/deploy/docker-compose.prod.yml`:

  ```yaml
      networks:
        - default
        - recall_edge
  ```

  and at the file's top level:

  ```yaml
  networks:
    recall_edge:
      external: true
  ```

  Left as a deliberate choice rather than applied, since it edits solakuti's
  tracked config.
- **Memory limits on solakuti were applied with `docker update`**, which is also
  live-only and reverts on recreate. Same fix: put them in that compose file.

## After cutover

Add the backup cron (separate from solakuti's, so neither can break the other):

```sh
crontab -e
# 15 3 * * * /home/deploy/recall/deploy/backup.sh >> /home/deploy/knoledgr-backup.log 2>&1
```

Then delete the staged Neon credentials, which are no longer needed:

```sh
rm -f ~/.neon.env ~/.last_dump_stamp
```
