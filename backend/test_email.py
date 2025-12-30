import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
import resend

print(f"RESEND_API_KEY: {settings.RESEND_API_KEY[:20]}...")
print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

resend.api_key = settings.RESEND_API_KEY

try:
    response = resend.Emails.send({
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": "dataDisk52@gmail.com",
        "subject": "Test Email",
        "html": "<h1>Test</h1><p>This is a test email</p>"
    })
    print(f"Response: {response}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
