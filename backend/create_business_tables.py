import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def create_business_tables():
    with connection.cursor() as cursor:
        # Goals table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_goals (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT DEFAULT '',
                status VARCHAR(20) DEFAULT 'not_started',
                owner_id INTEGER,
                target_date DATE,
                progress INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Meetings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_meetings (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT DEFAULT '',
                meeting_date TIMESTAMP NOT NULL,
                duration_minutes INTEGER DEFAULT 60,
                location VARCHAR(255) DEFAULT '',
                notes TEXT DEFAULT '',
                created_by_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Meeting attendees junction table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_meeting_attendees (
                id SERIAL PRIMARY KEY,
                meeting_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                UNIQUE(meeting_id, user_id)
            )
        """)
        
        # Tasks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_tasks (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT DEFAULT '',
                status VARCHAR(20) DEFAULT 'todo',
                priority VARCHAR(20) DEFAULT 'medium',
                assigned_to_id INTEGER,
                goal_id INTEGER,
                meeting_id INTEGER,
                due_date DATE,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        print("Business tables created successfully")

if __name__ == '__main__':
    create_business_tables()
