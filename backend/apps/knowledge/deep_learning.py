from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple

import json

from django.utils import timezone

from apps.agile.models import Issue, Project
from apps.business.document_models import Document as BusinessDocument
from apps.business.models import Goal, Meeting, Task
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.organizations.enterprise_models import EnterpriseIncident


class DeepKnowledgeTrainer:
    """Train a compact deep model over knowledge embeddings."""

    EMBEDDING_MODEL = "all-MiniLM-L6-v2"

    def __init__(self, organization):
        self.organization = organization
        try:
            from sentence_transformers import SentenceTransformer
        except Exception as exc:
            raise RuntimeError(
                "sentence-transformers is required for deep training. Install sentence-transformers."
            ) from exc
        self.encoder = SentenceTransformer(self.EMBEDDING_MODEL)

    def _build_org_dataset(self, max_samples: int = 1200) -> Tuple[List[str], List[int], Dict[int, str], Dict]:
        # Collect balanced samples across core organization modules for richer context.
        sample_plan = {
            "conversation": max_samples // 8,
            "decision": max_samples // 8,
            "task": max_samples // 8,
            "meeting": max_samples // 8,
            "goal": max_samples // 8,
            "document": max_samples // 8,
            "project": max_samples // 8,
            "issue": max_samples // 8,
            "incident": max_samples // 8,
        }

        bucket_texts: Dict[str, List[str]] = {
            "conversation": [
                f"{row.get('title') or ''} {row.get('content') or ''}".strip()
                for row in Conversation.objects.filter(organization=self.organization)
                .exclude(content__isnull=True)
                .exclude(content__exact="")
                .values("title", "content")[: sample_plan["conversation"]]
            ],
            "decision": [
                f"{row.get('title') or ''} {row.get('description') or ''}".strip()
                for row in Decision.objects.filter(organization=self.organization)
                .exclude(description__isnull=True)
                .exclude(description__exact="")
                .values("title", "description", "impact_level", "status")[: sample_plan["decision"]]
            ],
            "task": [
                f"{row.get('title') or ''} {row.get('description') or ''} status:{row.get('status') or ''} priority:{row.get('priority') or ''}".strip()
                for row in Task.objects.filter(organization=self.organization)
                .values("title", "description", "status", "priority")[: sample_plan["task"]]
            ],
            "meeting": [
                f"{row.get('title') or ''} {row.get('description') or ''} notes:{row.get('notes') or ''}".strip()
                for row in Meeting.objects.filter(organization=self.organization)
                .values("title", "description", "notes")[: sample_plan["meeting"]]
            ],
            "goal": [
                f"{row.get('title') or ''} {row.get('description') or ''} status:{row.get('status') or ''} progress:{row.get('progress')}".strip()
                for row in Goal.objects.filter(organization=self.organization)
                .values("title", "description", "status", "progress")[: sample_plan["goal"]]
            ],
            "document": [
                f"{row.get('title') or ''} {row.get('description') or ''} {row.get('content') or ''}".strip()
                for row in BusinessDocument.objects.filter(organization=self.organization)
                .exclude(content__isnull=True)
                .exclude(content__exact="")
                .values("title", "description", "content")[: sample_plan["document"]]
            ],
            "project": [
                f"{row.get('name') or ''} {row.get('description') or ''}".strip()
                for row in Project.objects.filter(organization=self.organization)
                .values("name", "description")[: sample_plan["project"]]
            ],
            "issue": [
                f"{row.get('title') or ''} {row.get('description') or ''} status:{row.get('status') or ''} priority:{row.get('priority') or ''}".strip()
                for row in Issue.objects.filter(organization=self.organization)
                .values("title", "description", "status", "priority")[: sample_plan["issue"]]
            ],
            "incident": [
                f"{row.get('title') or ''} {row.get('description') or ''} type:{row.get('incident_type') or ''} severity:{row.get('severity') or ''}".strip()
                for row in EnterpriseIncident.objects.filter(organization=self.organization)
                .values("title", "description", "incident_type", "severity")[: sample_plan["incident"]]
            ],
        }

        non_empty_bucket_texts = {
            bucket: [txt for txt in texts if txt.strip()]
            for bucket, texts in bucket_texts.items()
            if texts
        }
        label_to_bucket = {idx: bucket for idx, bucket in enumerate(sorted(non_empty_bucket_texts.keys()))}
        bucket_to_label = {bucket: idx for idx, bucket in label_to_bucket.items()}

        texts: List[str] = []
        labels: List[int] = []
        type_counts: Dict[str, int] = {}
        for bucket, samples in non_empty_bucket_texts.items():
            label = bucket_to_label[bucket]
            type_counts[bucket] = len(samples)
            for sample in samples:
                texts.append(sample)
                labels.append(label)

        # Build lightweight org context profile for downstream UX personalization.
        keyword_counts: Dict[str, int] = {}
        for conv in Conversation.objects.filter(organization=self.organization, ai_processed=True).values("ai_keywords")[:800]:
            for kw in (conv.get("ai_keywords") or [])[:8]:
                if not kw:
                    continue
                keyword_counts[kw] = keyword_counts.get(kw, 0) + 1

        org_profile = {
            "organization_id": self.organization.id,
            "generated_at": None,
            "type_counts": type_counts,
            "top_topics": sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:12],
            "status_snapshot": {
                "open_issues": Issue.objects.filter(organization=self.organization).exclude(status="done").count(),
                "open_tasks": Task.objects.filter(organization=self.organization).exclude(status="done").count(),
                "open_incidents": EnterpriseIncident.objects.filter(
                    organization=self.organization, status="open"
                ).count(),
            },
        }
        return texts, labels, label_to_bucket, org_profile

    def train(self, epochs: int = 3, max_samples: int = 1200) -> Dict:
        try:
            import numpy as np
        except Exception as exc:
            raise RuntimeError("numpy is required for deep model training. Install numpy.") from exc
        try:
            import torch
            from torch import nn
            from torch.utils.data import DataLoader, TensorDataset
        except Exception as exc:
            raise RuntimeError(
                "PyTorch is required for deep model training. Install torch to continue."
            ) from exc

        texts, labels, label_to_bucket, org_profile = self._build_org_dataset(max_samples=max_samples)
        if len(texts) < 12:
            raise ValueError("Not enough knowledge data to train. Add more conversations/decisions first.")

        embeddings = self.encoder.encode(texts, convert_to_numpy=True)
        x = torch.tensor(embeddings, dtype=torch.float32)
        y = torch.tensor(np.array(labels, dtype=np.int64))

        dataset = TensorDataset(x, y)
        batch_size = min(64, max(8, len(dataset) // 4))
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

        model = nn.Sequential(
            nn.Linear(x.shape[1], 192),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(192, 96),
            nn.ReLU(),
            nn.Linear(96, len(label_to_bucket)),
        )

        optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
        criterion = nn.CrossEntropyLoss()

        model.train()
        latest_loss = 0.0
        for _ in range(max(1, epochs)):
            for xb, yb in loader:
                optimizer.zero_grad()
                logits = model(xb)
                loss = criterion(logits, yb)
                loss.backward()
                optimizer.step()
                latest_loss = float(loss.item())

        model.eval()
        with torch.no_grad():
            logits = model(x)
            preds = torch.argmax(logits, dim=1)
            accuracy = float((preds == y).float().mean().item())

        artifact_dir = Path("backend/model_artifacts/knowledge")
        artifact_dir.mkdir(parents=True, exist_ok=True)
        artifact_path = artifact_dir / f"deep_knowledge_model_org_{self.organization.id}.pt"
        profile_path = artifact_dir / f"org_context_profile_org_{self.organization.id}.json"
        torch.save(
            {
                "state_dict": model.state_dict(),
                "embedding_model": self.EMBEDDING_MODEL,
                "input_dim": int(x.shape[1]),
                "label_map": label_to_bucket,
                "epochs": int(max(1, epochs)),
                "dataset_size": int(len(texts)),
                "metrics": {"accuracy": accuracy, "loss": latest_loss},
            },
            artifact_path,
        )

        org_profile["generated_at"] = timezone.now().isoformat()
        profile_path.write_text(json.dumps(org_profile, indent=2), encoding="utf-8")

        return {
            "embedding_model": self.EMBEDDING_MODEL,
            "epochs": int(max(1, epochs)),
            "dataset_size": int(len(texts)),
            "label_map": label_to_bucket,
            "metrics": {"accuracy": round(accuracy, 4), "loss": round(latest_loss, 6)},
            "artifact_path": str(artifact_path),
            "org_context_profile_path": str(profile_path),
            "org_context_profile": org_profile,
        }
