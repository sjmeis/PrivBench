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

import logging
import os
import secrets
from app import create_app, db
from app.models import User

logger = logging.getLogger(__name__)

def seed_superadmin():
    admin_exists = User.query.filter((User.admin == True) | (User.is_superadmin == True)).first()
    
    if admin_exists:
        print("Administrative account exists. Skipping setup-admin.py execution.")
        return False

    print("No platform administrative accounts found. Creating root Superadmin account...")

    username = os.getenv("ADMIN_USERNAME", "admin")
    email = os.getenv("ADMIN_EMAIL", "admin@privbench.com")
    password = os.getenv("ADMIN_PASSWORD")

    using_generated_password = False
    if not password:
        password = secrets.token_urlsafe(20)
        using_generated_password = True
    
    superadmin = User(
        username='admin',
        mail_address='admin@privbench.com',
        password=password,
        research_institute='Technical University of Munich',
        admin=True,
        is_verified=True
    )
    superadmin.is_superadmin = True
    superadmin.daily_submission_limit = 100 
    superadmin.profile_picture_path = None

    db.session.add(superadmin)
    db.session.commit()
    print("==================================================================")
    print("ROOT SUPERADMIN INITIALIZED SUCCESSFULLY")
    print(f"Username: {username}")
    print(f"Email:    {email}")
    if using_generated_password:
        print(f"Password: {password}")
        print("WARNING: Please save this password immediately! It was auto-generated.")
    else:
        print("Password: [LOADED FROM ENVIRONMENT]")
    print("==================================================================")
    return True

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        seed_superadmin()