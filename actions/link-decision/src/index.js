// Knoledgr / Link Decision — GitHub Action.
//
// Runs on pull_request events. Looks for a decision id in any of:
//   marker  — <!-- knoledgr-decision:42 --> anywhere in the PR body
//   branch  — head branch like dec/42-…, decision/42-…, knoledgr/42-…
//   footer  — a commit message footer "Knoledgr-Decision: 42"
//   title   — PR title containing "DEC-42" or "Knoledgr-Decision: 42"
//
// When `required: true` and no id is found, exits non-zero so the check
// fails. Optionally leaves a comment on the PR pointing at the docs.
//
// This action does NOT call the Knoledgr API. The link is created by
// Knoledgr's GitHub App webhook receiver as soon as it sees the marker in
// the PR body. The Action is here to *enforce* the team convention.
//
// Build: `npm install && ncc build src/index.js -o dist --license licenses.txt`
// then commit the dist/ output so action.yml's `main: dist/index.js` works
// without a build step on the consumer side.

const core = require('@actions/core');
const github = require('@actions/github');

const MARKER_RE = /<!--\s*knoledgr-decision\s*:\s*(\d+)\s*-->/gi;
const BRANCH_RE = /^(?:dec|decision|knoledgr)[/_-](\d+)\b/i;
const FOOTER_RE = /^knoledgr-decision\s*:\s*(\d+)\b/im;
const TITLE_RE  = /(?:dec|knoledgr-decision)\s*[-: ]\s*(\d+)/i;

function pickIds(text, regex, { all = false } = {}) {
  if (!text) return [];
  if (!all) {
    const m = regex.exec(text);
    if (!m) return [];
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? [n] : [];
  }
  const out = [];
  let match;
  // Reset state for /g regex
  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    const n = parseInt(match[1], 10);
    if (Number.isFinite(n) && !out.includes(n)) out.push(n);
  }
  return out;
}

async function run() {
  try {
    const required = core.getBooleanInput('required');
    const patternsInput = (core.getInput('patterns') || 'marker,branch,footer')
      .split(',').map((s) => s.trim()).filter(Boolean);
    const commentOnMissing = core.getBooleanInput('comment-on-missing');
    const docsUrl = core.getInput('docs-url');

    const ctx = github.context;
    if (ctx.eventName !== 'pull_request' && ctx.eventName !== 'pull_request_target') {
      core.info(`Skipping: event ${ctx.eventName} is not a pull request`);
      return;
    }

    const pr = ctx.payload.pull_request || {};
    const body = pr.body || '';
    const headRef = (pr.head && pr.head.ref) || '';
    const title = pr.title || '';

    // Commit messages — grab from the latest commits on the PR head SHA.
    const token = process.env.GITHUB_TOKEN;
    let footerText = '';
    if (token && patternsInput.includes('footer')) {
      try {
        const octokit = github.getOctokit(token);
        const { data: commits } = await octokit.rest.pulls.listCommits({
          owner: ctx.repo.owner,
          repo: ctx.repo.repo,
          pull_number: pr.number,
          per_page: 30,
        });
        footerText = commits.map((c) => c.commit && c.commit.message).filter(Boolean).join('\n');
      } catch (err) {
        core.warning(`Could not list commits for footer scan: ${err.message}`);
      }
    }

    // Run each enabled pattern in declared order; first match wins for `source`.
    let foundIds = [];
    let source = null;
    const tryPattern = (name, ids) => {
      if (ids.length && !source) source = name;
      for (const id of ids) if (!foundIds.includes(id)) foundIds.push(id);
    };

    for (const name of patternsInput) {
      if (name === 'marker') tryPattern('marker', pickIds(body, MARKER_RE, { all: true }));
      if (name === 'branch') tryPattern('branch', pickIds(headRef, BRANCH_RE));
      if (name === 'footer') tryPattern('footer', pickIds(footerText, FOOTER_RE));
      if (name === 'title')  tryPattern('title',  pickIds(title, TITLE_RE));
    }

    core.setOutput('decision-ids', foundIds.join(','));
    core.setOutput('source', source || '');

    if (foundIds.length === 0) {
      const message = 'No Knoledgr decision id was found on this PR.';
      core.info(message);
      if (commentOnMissing && token) {
        try {
          const octokit = github.getOctokit(token);
          await octokit.rest.issues.createComment({
            owner: ctx.repo.owner,
            repo: ctx.repo.repo,
            issue_number: pr.number,
            body: [
              ':red_circle: **No Knoledgr decision is linked to this PR.**',
              '',
              'Add **one** of:',
              '- An HTML comment in the PR body: `<!-- knoledgr-decision:42 -->`',
              '- A branch name starting with `dec/42-…` or `decision/42-…`',
              '- A commit footer: `Knoledgr-Decision: 42`',
              '',
              `See ${docsUrl} for the team-wide convention.`,
            ].join('\n'),
          });
        } catch (err) {
          core.warning(`Could not post PR comment: ${err.message}`);
        }
      }
      if (required) {
        core.setFailed(message);
      }
      return;
    }

    core.info(`Found decision id(s) via ${source}: ${foundIds.join(', ')}`);
  } catch (err) {
    core.setFailed(err.message || String(err));
  }
}

run();
