from django.test import SimpleTestCase
from django.urls import resolve


class AgileFreshUrlCompatibilityTests(SimpleTestCase):
    def test_legacy_advanced_filter_routes_resolve(self):
        self.assertEqual(
            resolve("/api/agile/filter-issues/").url_name,
            "filter_issues",
        )
        self.assertEqual(
            resolve("/api/agile/saved-filters/").url_name,
            "saved_filters_legacy",
        )
        self.assertEqual(
            resolve("/api/agile/saved-filters/12/").url_name,
            "manage_saved_filter",
        )

    def test_ml_routes_resolve(self):
        self.assertEqual(
            resolve("/api/agile/ml/analyze-issue/").url_name,
            "ml_analyze_issue",
        )
        self.assertEqual(
            resolve("/api/agile/ml/predict-sprint/3/").url_name,
            "ml_predict_sprint",
        )

    def test_sprint_and_blocker_compat_routes_resolve(self):
        self.assertEqual(
            resolve("/api/agile/sprints/").url_name,
            "sprints_list",
        )
        self.assertEqual(
            resolve("/api/agile/sprints/7/").url_name,
            "sprint_detail_new",
        )
        self.assertEqual(
            resolve("/api/agile/blockers/5/").url_name,
            "blocker_detail",
        )
