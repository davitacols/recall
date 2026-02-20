import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def create_documents_table():
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_documents (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT DEFAULT '',
                document_type VARCHAR(20) DEFAULT 'other',
                content TEXT DEFAULT '',
                file_url VARCHAR(500) DEFAULT '',
                version VARCHAR(50) DEFAULT '1.0',
                created_by_id INTEGER,
                updated_by_id INTEGER,
                goal_id INTEGER,
                meeting_id INTEGER,
                task_id INTEGER,
                tags JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        print("Documents table created successfully")

if __name__ == '__main__':
    create_documents_table()
