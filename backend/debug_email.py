import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
import resend
import logging

logging.basicConfig(level=logging.DEBUG)

print(f"RESEND_API_KEY set: {bool(settings.RESEND_API_KEY)}")
print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

resend.api_key = settings.RESEND_API_KEY

try:
    response = resend.Emails.send({
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": "davitacols@gmail.com",
        "subject": "Test Email from Recall",
        "html": "<h1>Test</h1><p>This is a test email from Recall</p>"
    })
    print(f"Success! Response: {response}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
