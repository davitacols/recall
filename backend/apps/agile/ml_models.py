import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from apps.agile.models import Issue, Sprint


TOKEN_PATTERN = re.compile(r"\b\w+\b")
MODEL_VERSION = "v1"


def _tokenize(text):
    return TOKEN_PATTERN.findall((text or "").lower())


class NaiveBayesTextClassifier:
    """Small multinomial Naive Bayes classifier without external deps."""

    def __init__(self):
        self.class_counts = Counter()
        self.word_counts = defaultdict(Counter)
        self.class_word_totals = Counter()
        self.vocabulary = set()
        self.total_examples = 0

    def fit(self, rows):
        for text, label in rows:
            if not text or label is None:
                continue
            tokens = _tokenize(text)
            if not tokens:
                continue
            self.class_counts[label] += 1
            self.total_examples += 1
            for token in tokens:
                self.word_counts[label][token] += 1
                self.class_word_totals[label] += 1
                self.vocabulary.add(token)
        return self

    def is_trained(self):
        return self.total_examples > 0 and len(self.class_counts) > 0

    def predict_proba(self, text):
        if not self.is_trained():
            return {}
        tokens = _tokenize(text)
        if not tokens:
            return {}

        vocab_size = max(len(self.vocabulary), 1)
        scores = {}

        for label, label_count in self.class_counts.items():
            prior = math.log(label_count / self.total_examples)
            total_words_for_label = self.class_word_totals[label]
            token_score = 0.0
            for token in tokens:
                token_count = self.word_counts[label][token]
                prob = (token_count + 1) / (total_words_for_label + vocab_size)
                token_score += math.log(prob)
            scores[label] = prior + token_score

        max_score = max(scores.values())
        exp_scores = {label: math.exp(score - max_score) for label, score in scores.items()}
        denom = sum(exp_scores.values()) or 1.0
        return {label: value / denom for label, value in exp_scores.items()}

    def to_dict(self):
        return {
            "class_counts": dict(self.class_counts),
            "word_counts": {str(label): dict(words) for label, words in self.word_counts.items()},
            "class_word_totals": dict(self.class_word_totals),
            "vocabulary": sorted(self.vocabulary),
            "total_examples": self.total_examples,
        }

    @classmethod
    def from_dict(cls, data):
        instance = cls()
        if not data:
            return instance
        instance.class_counts = Counter(data.get("class_counts", {}))
        instance.word_counts = defaultdict(Counter)
        for label, words in data.get("word_counts", {}).items():
            instance.word_counts[label] = Counter(words)
        instance.class_word_totals = Counter(data.get("class_word_totals", {}))
        instance.vocabulary = set(data.get("vocabulary", []))
        instance.total_examples = int(data.get("total_examples", 0))
        return instance


class AgileMLModelStore:
    @staticmethod
    def _dir():
        model_dir = Path(__file__).resolve().parent / "model_artifacts"
        model_dir.mkdir(parents=True, exist_ok=True)
        return model_dir

    @classmethod
    def _path(cls, organization_id):
        return cls._dir() / f"agile_ml_org_{organization_id}_{MODEL_VERSION}.json"

    @classmethod
    def save(cls, organization_id, payload):
        path = cls._path(organization_id)
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return str(path)

    @classmethod
    def load(cls, organization_id):
        path = cls._path(organization_id)
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    @classmethod
    def exists(cls, organization_id):
        return cls._path(organization_id).exists()


class AgileMLTrainer:
    @staticmethod
    def train_for_organization(organization_id):
        issues = Issue.objects.filter(organization_id=organization_id).select_related("assignee", "project")

        assignee_rows = []
        story_point_rows = []

        for issue in issues:
            text = f"{issue.title} {issue.description or ''}".strip()
            if issue.assignee_id:
                assignee_rows.append((text, str(issue.assignee_id)))
            if issue.story_points is not None:
                story_point_rows.append((text, str(issue.story_points)))

        assignee_model = NaiveBayesTextClassifier().fit(assignee_rows)
        story_point_model = NaiveBayesTextClassifier().fit(story_point_rows)

        completed_sprints = Sprint.objects.filter(
            organization_id=organization_id,
            status="completed",
        ).prefetch_related("issues")

        sprint_ratios = []
        for sprint in completed_sprints:
            total = sprint.issues.count()
            if total == 0:
                continue
            done = sprint.issues.filter(status="done").count()
            sprint_ratios.append(done / total)

        avg_completion_ratio = round((sum(sprint_ratios) / len(sprint_ratios)) if sprint_ratios else 0.0, 4)

        artifact = {
            "metadata": {
                "organization_id": organization_id,
                "version": MODEL_VERSION,
                "trained_at": datetime.utcnow().isoformat() + "Z",
                "issue_count": issues.count(),
                "assignee_examples": len(assignee_rows),
                "story_point_examples": len(story_point_rows),
                "completed_sprints": completed_sprints.count(),
            },
            "assignee_model": assignee_model.to_dict(),
            "story_point_model": story_point_model.to_dict(),
            "sprint_baseline": {
                "avg_completion_ratio": avg_completion_ratio,
            },
        }

        path = AgileMLModelStore.save(organization_id, artifact)

        return {
            "trained": True,
            "artifact_path": path,
            "metadata": artifact["metadata"],
            "baseline": artifact["sprint_baseline"],
        }
