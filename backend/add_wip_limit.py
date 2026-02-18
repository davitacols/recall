import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("ALTER TABLE columns ADD COLUMN IF NOT EXISTS wip_limit INTEGER DEFAULT NULL;")
    print("Added wip_limit column to columns table")
