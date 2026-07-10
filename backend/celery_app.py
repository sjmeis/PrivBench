# Copyright (C) 2026 Stephen Meisenbacher

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

from app.extensions import celery
from app import create_app

# Create the Flask application
flask_app = create_app()

# Update celery config
celery.conf.update(flask_app.config)


class ContextTask(celery.Task):
    def __call__(self, *args, **kwargs):
        with flask_app.app_context():
            return self.run(*args, **kwargs)


# Set ContextTask BEFORE tasks are discovered so all tasks get app context
celery.Task = ContextTask

# Force autodiscovery of tasks so they use ContextTask as their base
celery.autodiscover_tasks(["app.services", "app.tasks"])

print("Available Celery tasks:")
print(celery.tasks.keys())
