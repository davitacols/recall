import uuid

from django.db import migrations, models


def _backfill_unsubscribe_tokens(apps, schema_editor):
    User = apps.get_model("organizations", "User")
    used = set(
        User.objects.exclude(marketing_unsubscribe_token__isnull=True)
        .values_list("marketing_unsubscribe_token", flat=True)
    )
    for user in User.objects.filter(marketing_unsubscribe_token__isnull=True).only("id"):
        token = uuid.uuid4()
        while token in used:
            token = uuid.uuid4()
        used.add(token)
        User.objects.filter(id=user.id).update(marketing_unsubscribe_token=token)


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0024_user_experience_mode"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="marketing_opt_in",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="marketing_opt_in_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="marketing_unsubscribed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="marketing_unsubscribe_token",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.RunPython(_backfill_unsubscribe_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="marketing_unsubscribe_token",
            field=models.UUIDField(db_index=True, default=uuid.uuid4, unique=True),
        ),
    ]
