import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()
cursor.execute("ALTER TABLE issues ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;")
print("Column time_spent added successfully")
