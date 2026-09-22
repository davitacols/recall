"""Attribute a decision to the project its code lives in.

GitHub is the source of the code; Knoledgr is the ground truth for what the
team decided and why. A workspace with several projects needs those two to line
up — otherwise every decision lands in one undifferentiated pool, and "why is
this like this?" gets answered across work that has nothing to do with each
other.

One repository, one project. So when a decision turns out to be about a
repository, the project follows for free: nobody has to remember to set it, and
an association nobody has to maintain is the only kind that stays true.

Never overwrites. A project already chosen by a person beats one inferred from
a link, and a decision that spans projects should keep whichever answer its
author gave.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def adopt_project_from_repo(decision, repo) -> bool:
    """Give a decision the repo's project, if it has none. Returns True if set.

    Never raises: this runs inside webhook handling, where a failure would cost
    the link itself, and an unattributed decision is a much smaller loss than a
    lost one.
    """
    try:
        if decision is None or repo is None:
            return False
        if decision.project_id:
            return False
        project_id = getattr(repo, "project_id", None)
        if not project_id:
            return False
        # A project belongs to a workspace, and so does the decision. They came
        # through the same repo so they should already agree, but a repo that
        # was moved between workspaces could leave a project behind — and
        # attributing a decision to another workspace's project would be a
        # quiet cross-tenant leak in the reporting.
        if repo.project.organization_id != decision.organization_id:
            logger.warning(
                "Refused to attribute decision %s to project %s: different workspace",
                decision.id, project_id,
            )
            return False

        decision.project_id = project_id
        decision.save(update_fields=["project"])
        logger.info(
            "Decision %s attributed to project %s via %s",
            decision.id, project_id, repo.full_name,
        )
        return True
    except Exception:
        logger.exception("Could not attribute decision to a project")
        return False
