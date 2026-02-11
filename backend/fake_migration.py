# Run this in Django shell: python manage.py shell

from django.db import connection

# Mark migration as applied without running it
with connection.cursor() as cursor:
    cursor.execute("""
        INSERT INTO django_migrations (app, name, applied)
        VALUES ('agile', '0015_missing_jira_features', NOW())
        ON CONFLICT DO NOTHING;
    """)

print("Migration marked as applied!")
