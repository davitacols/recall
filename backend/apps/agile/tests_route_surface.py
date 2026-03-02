import re
import unittest
from pathlib import Path


PATH_PATTERN = re.compile(r"path\('([^']+)'")


class AgileRouteSurfaceTests(unittest.TestCase):
    def test_legacy_routes_are_present_in_urls_fresh(self):
        legacy_file = Path(__file__).with_name("urls.py")
        fresh_file = Path(__file__).with_name("urls_fresh.py")

        legacy_routes = set(PATH_PATTERN.findall(legacy_file.read_text(encoding="utf-8")))
        fresh_routes = set(PATH_PATTERN.findall(fresh_file.read_text(encoding="utf-8")))

        missing = sorted(legacy_routes - fresh_routes)
        self.assertEqual(
            missing,
            [],
            f"Legacy Agile routes missing from urls_fresh: {missing}",
        )


if __name__ == "__main__":
    unittest.main()
