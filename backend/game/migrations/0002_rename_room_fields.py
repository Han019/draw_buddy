# Generated manually to align Room field names with the public API.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("game", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="room",
            old_name="invite_code",
            new_name="code",
        ),
        migrations.RenameField(
            model_name="room",
            old_name="max_player",
            new_name="max_players",
        ),
        migrations.RenameField(
            model_name="room",
            old_name="created_time",
            new_name="created_at",
        ),
    ]
