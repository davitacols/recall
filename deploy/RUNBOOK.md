# Running Knoledgr day to day

`README.md` covers the box: what runs, why it is split that way, and how it
stays out of solakuti's way. This covers the jobs you actually do — shipping a
change, connecting a repository, catching the record up, and working out why
nothing appeared.

Everything here runs **on the VPS**, over SSH. None of it works from a
PowerShell prompt on Windows: `deploy.sh` is a shell script, and the compose
file at the repo root is a different stack that has no `backend` service.

## The prefix

Every command below assumes these two lines first. Set them once per session.

```sh
cd ~/recall
DC="docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml"
```

`.env.prod`, not `.env` — Docker Compose only auto-loads the latter, which is
why a bare `docker compose` complains that `POSTGRES_PASSWORD` is missing.

## Shipping a change

```sh
./deploy/deploy.sh              # the branch this checkout tracks
./deploy/deploy.sh <sha|branch> # something specific
```

It backs up `.env.prod`, fetches, moves to the ref, rebuilds, restarts, waits,
then prints service status and hits `/api/health/`. Watch for `deployed <sha>`
at the end and check it is the sha you expected.

Three things worth knowing:

- It runs `git reset --hard`. On the server the tree is clean so that is fine.
  **Never run it on your own machine** — it would destroy uncommitted work.
- With no argument it deploys the tracked upstream, falling back to
  `origin/main`. If the branch ever loses its upstream, a bare run would roll
  the server back. `git rev-parse --abbrev-ref --symbolic-full-name @{u}`
  tells you what it would pick.
- Run it inside `tmux new -s deploy`. A dropped SSH session partway through a
  rebuild leaves half the stack on new code and half on old.

## Changing which repositories are connected

Two sides, and both are needed.

**On GitHub** — github.com/settings/installations, find Knoledgr, *Configure*,
then change *Repository access*. This is the only place a repository can be
added or removed; nothing in Knoledgr can grant itself access.

**In Knoledgr** — Integrations → GitHub → **Resync repos**.

Resync writes repository metadata only. It deliberately never touches which
workspace a repo belongs to: it runs on every webhook as well, and including
the workspace would drag a deliberately-reassigned repo back on a schedule.

A repository the installation loses access to is **disabled, not deleted**, so
past decision links still resolve. It will reappear enabled if access is
granted again.

Resync also refreshes the stored permission set. If you accept a new permission
on GitHub and a feature stays dormant, resync — a webhook that arrived during a
deploy is gone for good.

## Saying what a repository is the code for

Integrations → GitHub → the dropdown on the repo row → **+ New project…** →
type a name → Enter.

One repository, one project. A decision reached through that repo then inherits
the project without anyone remembering to say so. The name should be what the
team calls the work, not what the repo is called.

You are asked for a name and nothing else. There is no key, lead or
description to fill in — Knoledgr is not a tracker, and a project here is only
the namespace that stops one repo's decisions blurring into another's.

## The three catch-ups

All three take `--dry-run`. **Always dry-run first**; two of them write to live
records.

| Command | Reads | Needs API credit | Re-runnable |
|---|---|---|---|
| `backfill_pr_capture` | merged PRs → conversations | no | yes |
| `backfill_rationale` | a decision's sources → its missing why | **yes** | yes |
| `backfill_decision_projects` | decision→PR links → project | no | yes |

```sh
$DC exec backend python manage.py backfill_pr_capture --dry-run
$DC exec backend python manage.py backfill_pr_capture --repo owner/name

$DC exec backend python manage.py backfill_rationale --dry-run
$DC exec backend python manage.py backfill_rationale

$DC exec backend python manage.py backfill_decision_projects --dry-run
$DC exec backend python manage.py backfill_decision_projects
```

Useful flags: `--org <id>` to confine a run to one workspace, `--limit` to cap
it, `--repo owner/name` for capture.

None of them overwrite anything. `backfill_rationale` only ever fills a
rationale that is currently empty, and when a source states no reason it leaves
the field blank rather than inventing one.

## Checking it worked

Capture lands in `/conversations` within seconds of a merge. If nothing
appears, work down this list.

**Did the event reach us?**

```sh
$DC exec backend python manage.py shell -c "
from apps.integrations.github_app_models import GitHubAppDelivery as D
print(list(D.objects.order_by('-created_at')[:10].values(
    'event','action','signature_valid','summary')))"
```

- Nothing at all — events are not reaching the host, or the App is not
  installed on that repository.
- Rows with `signature_valid: False` — the webhook secret does not match.
  Nothing will ever be processed.
- Rows arriving and nothing captured — this is the **normal** case. The
  substance filter did its job.

**Is the installation still there?**

```sh
$DC exec backend python manage.py shell -c "
from apps.integrations.github_app_models import GitHubAppInstallation as I
print(list(I.objects.values('installation_id','account_login','revoked_at')))"
```

An empty result while GitHub still shows the App installed means the connection
is gone from our side. Reconnect through Integrations. This has happened once
with no explanation, and the webhook receiver answers 200 for unknown
installations, so it goes silently inert.

## What the messages mean

| Output | Meaning |
|---|---|
| `0 merged PR(s)` | That repository has never merged a pull request. Capture cannot work there at all — see preconditions below |
| `Nothing met the bar` | Merges exist, but none carried enough discussion. Normal and expected |
| `STOPPED: the extractor could not be reached` | An API or credit failure. **It says nothing about your records** — those decisions were never examined |
| `N have no readable source at all and need a person` | No conversation, description or context to read. A human has to write the why |
| `would attribute 0 … still have no project` | No decisions are linked to a PR in a repo that has a project yet. There is deliberately no title or date guessing |
| `no such service: backend` | You are on Windows, not the server, or in the wrong directory |
| `Unknown command` | That code is not deployed yet |

## Preconditions worth remembering

These are properties of the design, not bugs, and no amount of configuration
changes them.

- **Capture needs pull requests.** Work pushed straight to `main` produces
  nothing to read. No PRs means no conversations, no links, no file
  attribution and no context comments, ever.
- **A merged PR earns a conversation only if people argued in it**: at least
  two substantive comments from humans, 240 characters total, 40 per comment.
  Bots and rubber stamps are discarded. Most merges are skipped by design.
- **File attribution skips any PR touching more than 50 meaningful files.** A
  231-file branch cannot tell you why any single file is the way it is, so the
  PR context comment stays quiet on repositories whose history is large
  branches.
- **Rationale is never invented.** When a source contains no reasoning the
  field stays empty, because a blank invites someone to fill it in and a
  plausible invention gets trusted and cited.

## What needs a person, not a command

- **Anthropic credit.** Without it rationale extraction and Ask Recall are
  both dead, and any decision converted meanwhile lands with a blank why.
- **Writing a why where no source states one.** The backfill names these; it
  cannot fix them.
- **Deciding whether a record is actually a decision.** Several existing rows
  are titled things like `Introduction` and `code implementation`. Those are
  conversations that got converted because the button was there, and they
  drag the "carry their why" percentage down for no reason.
- **Off-site backups.** Currently on the same disk as the database, which is
  the largest single operational risk on this box.
