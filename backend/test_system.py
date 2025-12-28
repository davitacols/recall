import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def test_redis():
    """Test Redis connection"""
    try:
        from redis import Redis
        from django.conf import settings
        
        redis_url = settings.CELERY_BROKER_URL
        r = Redis.from_url(redis_url)
        r.ping()
        print("✅ Redis: Connected")
        return True
    except Exception as e:
        print(f"❌ Redis: {e}")
        return False

def test_celery():
    """Test Celery configuration"""
    try:
        from config.celery import app
        print(f"✅ Celery: Configured (broker: {app.conf.broker_url})")
        return True
    except Exception as e:
        print(f"❌ Celery: {e}")
        return False

def test_database():
    """Test database connection"""
    try:
        from django.db import connection
        connection.ensure_connection()
        print("✅ Database: Connected")
        return True
    except Exception as e:
        print(f"❌ Database: {e}")
        return False

def test_aws():
    """Test AWS credentials"""
    try:
        from django.conf import settings
        import boto3
        
        if not settings.AWS_ACCESS_KEY_ID:
            print("⚠️  AWS: No credentials configured")
            return False
            
        client = boto3.client(
            'bedrock-runtime',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        print("✅ AWS: Credentials configured")
        return True
    except Exception as e:
        print(f"❌ AWS: {e}")
        return False

def test_chroma():
    """Test ChromaDB"""
    try:
        from apps.knowledge.search_engine import get_search_engine
        engine = get_search_engine()
        print("✅ ChromaDB: Initialized")
        return True
    except Exception as e:
        print(f"❌ ChromaDB: {e}")
        return False

def test_models():
    """Test model imports"""
    try:
        from apps.organizations.models import Organization, User
        from apps.conversations.models import Conversation, Tag
        from apps.decisions.models import Decision
        from apps.knowledge.models import KnowledgeItem
        print("✅ Models: All imported successfully")
        return True
    except Exception as e:
        print(f"❌ Models: {e}")
        return False

if __name__ == '__main__':
    print("=" * 50)
    print("RECALL SYSTEM CHECK")
    print("=" * 50)
    print()
    
    results = []
    results.append(("Database", test_database()))
    results.append(("Models", test_models()))
    results.append(("Redis", test_redis()))
    results.append(("Celery", test_celery()))
    results.append(("AWS", test_aws()))
    results.append(("ChromaDB", test_chroma()))
    
    print()
    print("=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("\n🎉 All systems operational!")
    else:
        print("\n⚠️  Some systems need attention")
        print("\nFailed components:")
        for name, result in results:
            if not result:
                print(f"  - {name}")
