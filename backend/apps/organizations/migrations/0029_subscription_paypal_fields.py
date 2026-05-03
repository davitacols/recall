from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0028_userfeedback"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscription",
            name="billing_provider",
            field=models.CharField(
                choices=[
                    ("manual", "Manual"),
                    ("stripe", "Stripe"),
                    ("paypal", "PayPal"),
                ],
                default="manual",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="subscription",
            name="paypal_subscription_id",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
