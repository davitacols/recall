import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def create_advanced_tables():
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_milestones (
                id SERIAL PRIMARY KEY,
                goal_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT DEFAULT '',
                due_date DATE,
                completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP,
                "order" INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_templates (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                template_type VARCHAR(20) NOT NULL,
                content JSONB NOT NULL,
                created_by_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_reminders (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                remind_at TIMESTAMP NOT NULL,
                sent BOOLEAN DEFAULT FALSE,
                goal_id INTEGER,
                meeting_id INTEGER,
                task_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_comments (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL,
                author_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                goal_id INTEGER,
                meeting_id INTEGER,
                task_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        print("Advanced business tables created successfully")

if __name__ == '__main__':
    create_advanced_tables()
