# Knoledgr pilot readiness

Use this checklist before a customer connects a private repository. A working
demo is not enough: the customer must understand the boundary, know how to
leave, and see evidence that the service can recover.

## 1. Before the discovery call

- Confirm `support@knoledgr.com`, `security@knoledgr.com`,
  `privacy@knoledgr.com`, and `legal@knoledgr.com` all deliver to a monitored
  inbox.
- Open the public pages from a signed-out browser:
  - `/github-data-handling`
  - `/security-annex`
  - `/privacy`
  - `/terms`
- Use a Knoledgr-owned demo workspace. Do not ask the prospect to connect a
  private production repository during the first call.
- Confirm Anthropic credit is available before the demo. Capture still works
  without it, but rationale extraction and Ask Recall do not.
- Confirm the GitHub App installation health is current and the background
  worker and beat services are running.

## 2. Build the demo repository

The demonstration should show one complete path, not a tour of every feature.

1. Create a pull request that presents a real technical choice, two plausible
   alternatives, a trade-off, and the reason for the final choice.
2. Add at least two human comments. Each substantive comment must contain at
   least 40 characters, and the qualifying comments must contain at least 240
   characters in total. Bot comments and rubber stamps such as `LGTM` do not
   count.
3. Merge the pull request.
4. Confirm a GitHub webhook delivery appears and the PR becomes a Conversation.
5. Convert the Conversation into a Decision and confirm the rationale is
   accurate. Correct it manually if the source did not state the reason.
6. Add an expected outcome to the Decision.
7. Ask Recall why the choice was made and open the cited source.

Rehearse this story in under three minutes:

> GitHub discussion -> captured conversation -> decision and rationale ->
> grounded Ask Recall answer -> expected outcome.

## 3. Pilot boundary to confirm in writing

- Customer and workspace name.
- One named customer administrator.
- One selected repository.
- 30-day start and end dates.
- Historical import limit, no more than 300 merged PRs.
- Whether optional GitHub write access is allowed. Read access is enough for
  core capture.
- Whether AI processing is approved for the selected repository.
- Named Knoledgr support and security contacts.
- Weekly review time.
- Export, continuation, or deletion choice at the end of the pilot.
- Backup-retention expectation after live deletion.

Do not add another repository without written approval from the customer
administrator.

## 4. Pilot success measures

Record these weekly for the pilot workspace:

- enabled repositories;
- merged PRs examined;
- substantive discussions captured;
- captured discussions converted to decisions;
- decisions with a clear rationale;
- Ask Recall questions with a useful cited answer;
- weekly active customer users;
- examples where a person found an answer without interrupting a teammate;
- customer willingness to continue or pay.

Raw record counts are not the goal. A small number of useful decisions is
better evidence than a large feed of routine merges.

## 5. Offboarding a pilot

Never purge a workspace from a verbal request. Obtain written confirmation
from an authorized customer contact and record the requested deadline.

1. Ask the workspace administrator to stop new activity.
2. Export the workspace from `/export` and provide the agreed copy securely.
3. Disable each repository in Knoledgr.
4. Disconnect the GitHub App in Knoledgr.
5. Ask the GitHub administrator to uninstall the App or remove the selected
   repository in GitHub settings.
6. Preview the server-side purge:

   ```sh
   cd ~/recall
   DC="docker compose --env-file deploy/.env.prod -f deploy/docker-compose.prod.yml"
   $DC exec backend python manage.py purge_workspace --slug CUSTOMER-SLUG
   ```

7. Compare the preview with the approved customer and workspace.
8. Only after a second-person check, execute with the exact slug repeated:

   ```sh
   $DC exec backend python manage.py purge_workspace \
     --slug CUSTOMER-SLUG \
     --execute \
     --confirm-slug CUSTOMER-SLUG
   ```

9. Confirm the workspace no longer resolves in the application and record the
   date, operator, export location, purge output, and applicable backup expiry.

The purge command deletes the Organization and its cascading database records,
then removes stored files it found in that cascade. It is a dry run unless
`--execute` and an exact `--confirm-slug` are both present. Backup copies are a
separate retention layer and are not removed by this command.

## 6. Verify an off-site backup by restoring it

Run this on the VPS after a successful backup and whenever the backup process
changes. Use a new temporary PostgreSQL container; never test a restore against
the production database.

1. Confirm the latest database and media objects exist in R2:

   ```sh
   /home/deploy/.local/bin/rclone lsl r2:knoledgr-production-backups
   ```

2. Create a dedicated temporary directory and download one matched database
   and media pair:

   ```sh
   RESTORE_TEST_DIR=$(mktemp -d /tmp/knoledgr-restore-test.XXXXXX)
   /home/deploy/.local/bin/rclone copyto \
     r2:knoledgr-production-backups/knoledgr-YYYY-MM-DD_HHMM.sql.gz \
     "$RESTORE_TEST_DIR/database.sql.gz"
   /home/deploy/.local/bin/rclone copyto \
     r2:knoledgr-production-backups/knoledgr-media-YYYY-MM-DD_HHMM.tar.gz \
     "$RESTORE_TEST_DIR/media.tar.gz"
   ```

3. Validate both archives before restoring:

   ```sh
   gzip -t "$RESTORE_TEST_DIR/database.sql.gz"
   tar -tzf "$RESTORE_TEST_DIR/media.tar.gz" >/dev/null
   ```

4. Restore into an isolated disposable PostgreSQL container:

   ```sh
   docker run -d --name knoledgr-restore-test \
     -e POSTGRES_PASSWORD=restore-test-only postgres:17-alpine
   until docker exec knoledgr-restore-test pg_isready -U postgres; do sleep 1; done
   docker exec knoledgr-restore-test createdb -U postgres knoledgr_restore
   gzip -dc "$RESTORE_TEST_DIR/database.sql.gz" | \
     docker exec -i knoledgr-restore-test psql -U postgres -d knoledgr_restore
   ```

5. Prove the restored data is readable:

   ```sh
   docker exec knoledgr-restore-test psql -U postgres -d knoledgr_restore -Atc \
     "select count(*) from organizations;"
   docker exec knoledgr-restore-test psql -U postgres -d knoledgr_restore -Atc \
     "select count(*) from decisions;"
   docker exec knoledgr-restore-test psql -U postgres -d knoledgr_restore -Atc \
     "select count(*) from conversations;"
   ```

6. Record the object names, restore date, duration, row counts, and operator.
   Stop and remove the disposable container after recording the result:

   ```sh
   docker rm -f knoledgr-restore-test
   ```

Do not report backups as verified until this restore has succeeded. Seeing an
object in R2 proves upload, not recovery.
