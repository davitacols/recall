"""Live websocket feed for agent runs.

The frontend polls the run while iterations are in flight; this consumer lets
us push step/status updates as they happen instead. The consumer joins a
per-run group `agent_run_<id>` after verifying the user owns the run.

Outbound message shape:
    { "type": "step", "kind": "tool_call" | "tool_result" | "final",
      "payload": {...}, "ts": "..." }
    { "type": "status", "status": "running" | "awaiting_approval" | "completed" | "failed",
      "final_answer": str | None,
      "pending_tool_calls": [...] }
"""

from __future__ import annotations

import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


def _run_group(run_id: int) -> str:
    return f"agent_run_{run_id}"


class AgentRunConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.user = self.scope.get("user")
            if not self.user or isinstance(self.user, AnonymousUser) or not getattr(self.user, "is_authenticated", False):
                await self.close()
                return
            self.run_id = int(self.scope["url_route"]["kwargs"]["run_id"])
            ok = await self._user_can_read(self.user, self.run_id)
            if not ok:
                await self.close()
                return
            self.group_name = _run_group(self.run_id)
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
        except Exception:
            logger.exception("AgentRun websocket connect failed")
            await self.close()

    async def disconnect(self, close_code):
        group = getattr(self, "group_name", None)
        if group:
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive(self, text_data):
        # Clients don't drive the run from the socket — they POST approvals.
        pass

    async def agent_event(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    @database_sync_to_async
    def _user_can_read(self, user, run_id):
        from apps.knowledge.models import AgentRun
        org = getattr(user, "organization", None)
        if not org:
            return False
        return AgentRun.objects.filter(id=run_id, organization=org).exists()


def broadcast_run_event(run_id: int, message: dict) -> None:
    """Best-effort fire-and-forget broadcast to all sockets listening to a run.

    Safe to call from synchronous Django view / Celery task code. If channels
    isn't available or the layer can't be reached, this is a no-op.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        layer = get_channel_layer()
        if not layer:
            return
        async_to_sync(layer.group_send)(
            _run_group(run_id),
            {"type": "agent_event", "message": message},
        )
    except Exception as exc:  # pragma: no cover - defensive
        logger.debug("broadcast_run_event failed for run %s: %s", run_id, exc)
