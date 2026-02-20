import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def add_file_columns():
    with connection.cursor() as cursor:
        cursor.execute("""
            ALTER TABLE business_documents 
            ADD COLUMN IF NOT EXISTS file_data BYTEA,
            ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) DEFAULT '',
            ADD COLUMN IF NOT EXISTS file_type VARCHAR(100) DEFAULT ''
        """)
        print("File columns added successfully")

if __name__ == '__main__':
    add_file_columns()
