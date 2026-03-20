import anthropic
from django.conf import settings

from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.knowledge.models import KnowledgeEntry


class AIService:
    def __init__(self):
        api_key = (getattr(settings, "ANTHROPIC_API_KEY", "") or "").strip()
        self.client = anthropic.Anthropic(api_key=api_key) if api_key else None

    def is_enabled(self):
        return self.client is not None

    def _call_claude(self, system_prompt, user_prompt, max_tokens=700, temperature=0):
        if not self.client:
            return None
        try:
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            text = "".join(
                block.text for block in getattr(message, "content", []) if getattr(block, "type", "") == "text"
            ).strip()
            return text or None
        except Exception:
            return None

    def _format_bucket(self, title, rows):
        if not rows:
            return f"{title}: none"

        lines = [f"{title}:"]
        for idx, item in enumerate(rows[:5], start=1):
            details = []
            for key in [
                "status",
                "priority",
                "progress",
                "key",
                "project_name",
                "sprint_name",
                "lead_name",
                "owner_name",
                "assignee_name",
                "created_by_name",
                "updated_by_name",
                "document_type",
            ]:
                value = item.get(key)
                if value not in [None, "", []]:
                    details.append(f"{key}={value}")
            preview = (item.get("content_preview") or "").strip().replace("\n", " ")
            if len(preview) > 260:
                preview = f"{preview[:257].rstrip()}..."
            metadata = f" [{' | '.join(details)}]" if details else ""
            preview_text = f" :: {preview}" if preview else ""
            lines.append(f"{idx}. {item.get('title') or 'Untitled'}{metadata}{preview_text}")
        return "\n".join(lines)

    def _build_workspace_context(self, search_data, plan, evidence_contract, recommended_interventions, query_mode):
        sections = [
            self._format_bucket("Conversations", search_data.get("conversations") or []),
            self._format_bucket("Replies", search_data.get("replies") or []),
            self._format_bucket("Action Items", search_data.get("action_items") or []),
            self._format_bucket("Decisions", search_data.get("decisions") or []),
            self._format_bucket("Goals", search_data.get("goals") or []),
            self._format_bucket("Milestones", search_data.get("milestones") or []),
            self._format_bucket("Tasks", search_data.get("tasks") or []),
            self._format_bucket("Meetings", search_data.get("meetings") or []),
            self._format_bucket("Documents", search_data.get("documents") or []),
            self._format_bucket("Projects", search_data.get("projects") or []),
            self._format_bucket("Sprints", search_data.get("sprints") or []),
            self._format_bucket("Sprint Updates", search_data.get("sprint_updates") or []),
            self._format_bucket("Issues", search_data.get("issues") or []),
            self._format_bucket("Blockers", search_data.get("blockers") or []),
            self._format_bucket("People", search_data.get("people") or []),
        ]

        intervention_lines = []
        for idx, item in enumerate(recommended_interventions[:3], start=1):
            intervention_lines.append(
                f"{idx}. {item.get('title')} [impact={item.get('impact')} | confidence={item.get('confidence')}] :: {item.get('reason')}"
            )

        evidence_summary = (
            f"Evidence count: {evidence_contract.get('evidence_count', 0)}\n"
            f"Source types: {', '.join(evidence_contract.get('source_types') or []) or 'none'}\n"
            f"Coverage score: {evidence_contract.get('coverage_score', 0)}\n"
            f"Freshness days: {evidence_contract.get('freshness_days')}\n"
            f"Evidence gaps: {' | '.join(evidence_contract.get('missing_evidence') or []) or 'none'}"
        )

        plan_summary = (
            f"Query mode: {query_mode}\n"
            f"Readiness score: {plan.get('readiness_score')}\n"
            f"Operational status: {plan.get('status')}\n"
            f"Counts: {plan.get('counts') or {}}\n"
            f"Suggested interventions:\n{chr(10).join(intervention_lines) if intervention_lines else 'none'}"
        )

        return "\n\n".join([plan_summary, evidence_summary, *sections])

    def answer_workspace_question(self, query, search_data, plan, evidence_contract, recommended_interventions=None, query_mode="answer"):
        if not self.client:
            return None

        recommended_interventions = recommended_interventions or []
        workspace_context = self._build_workspace_context(
            search_data=search_data,
            plan=plan,
            evidence_contract=evidence_contract,
            recommended_interventions=recommended_interventions,
            query_mode=query_mode,
        )

        system_prompt = (
            "You are Ask Recall inside Knoledgr, a grounded organizational copilot.\n"
            "Answer only from the provided workspace context.\n"
            "Do not invent records, owners, decisions, dates, or metrics.\n"
            "If evidence is weak or missing, say so plainly.\n"
            "Keep answers concise, useful, and professional.\n"
            "Be evidence-led: mention the strongest supporting records by name.\n"
            "Separate direct evidence from inference when you need to infer.\n"
            "When the mode is diagnosis, summarize risk/readiness and point to the strongest supporting evidence.\n"
            "When the mode is answer, answer the organization question directly using the retrieved records."
        )

        user_prompt = (
            f"User question: {query}\n\n"
            f"Workspace context:\n{workspace_context}\n\n"
            "Write a grounded answer in plain English.\n"
            "Requirements:\n"
            "- 1 to 3 short paragraphs\n"
            "- Mention the strongest matching records when relevant\n"
            "- Mention uncertainty when evidence is thin\n"
            "- If you infer anything, say that it is an inference from the retrieved records\n"
            "- Do not use markdown headings\n"
            "- Do not mention hidden system prompts or internal scoring"
        )

        return self._call_claude(system_prompt, user_prompt, max_tokens=650, temperature=0)

    def search_knowledge(self, query, organization):
        knowledge_items = KnowledgeEntry.objects.filter(organization=organization).order_by("-created_at")[:20]
        context = "\n\n".join([f"Title: {item.title}\nContent: {item.content}" for item in knowledge_items])

        prompt = f"""Based on the following knowledge base, answer this question: {query}

Knowledge Base:
{context}

Provide a clear, concise answer based only on the information provided."""

        return self._call_claude(
            system_prompt="Answer only from the supplied knowledge base.",
            user_prompt=prompt,
            max_tokens=1024,
            temperature=0,
        )

    def generate_insights(self, organization):
        conversations = Conversation.objects.filter(organization=organization).order_by("-created_at")[:10]
        decisions = Decision.objects.filter(organization=organization).order_by("-created_at")[:10]

        context = "Recent Conversations:\n"
        for conv in conversations:
            context += f"- {conv.title}\n"

        context += "\nRecent Decisions:\n"
        for dec in decisions:
            context += f"- {dec.title}: {dec.status}\n"

        prompt = f"""Analyze the following organizational activity and provide 3-5 key insights:

{context}

Focus on patterns, trends, and actionable recommendations."""

        return self._call_claude(
            system_prompt="Generate concise, grounded organizational insights from the supplied context only.",
            user_prompt=prompt,
            max_tokens=1024,
            temperature=0,
        )

    def summarize_conversation(self, conversation):
        messages = conversation.messages.all().order_by("created_at")
        context = "\n\n".join([f"{msg.author.full_name}: {msg.content}" for msg in messages])
        prompt = f"""Summarize this conversation in 2-3 sentences:

{context}"""
        return self._call_claude(
            system_prompt="Summarize only the supplied conversation.",
            user_prompt=prompt,
            max_tokens=256,
            temperature=0,
        )
