import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def update_business_tables():
    with connection.cursor() as cursor:
        # Add conversation and decision columns to goals
        cursor.execute("""
            ALTER TABLE business_goals 
            ADD COLUMN IF NOT EXISTS conversation_id INTEGER,
            ADD COLUMN IF NOT EXISTS decision_id INTEGER
        """)
        
        # Add goal, conversation, and decision columns to meetings
        cursor.execute("""
            ALTER TABLE business_meetings 
            ADD COLUMN IF NOT EXISTS goal_id INTEGER,
            ADD COLUMN IF NOT EXISTS conversation_id INTEGER,
            ADD COLUMN IF NOT EXISTS decision_id INTEGER
        """)
        
        # Add conversation and decision columns to tasks
        cursor.execute("""
            ALTER TABLE business_tasks 
            ADD COLUMN IF NOT EXISTS conversation_id INTEGER,
            ADD COLUMN IF NOT EXISTS decision_id INTEGER
        """)
        
        print("Business tables updated successfully")

if __name__ == '__main__':
    update_business_tables()
