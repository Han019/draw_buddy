# Generated manually to restore the Room/RoomPlayer field names used by the API.

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("game", "0003_rename_created_at_room_created_time_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="room",
            old_name="created_time",
            new_name="created_at",
        ),
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
        migrations.AddField(
            model_name="roomplayer",
            name="is_host",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="roomplayer",
            name="joined_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="roomplayer",
            name="score",
            field=models.IntegerField(default=0),
        ),
    ]
