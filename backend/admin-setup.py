from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    # Check if an admin user already exists
    admin_user = User.query.filter_by(username='admin').first()
    if admin_user:
        print("Admin user already exists.")
    else:
        # Create an admin user
        admin = User(
            username='admin',
            mail_address='admin@privbench.com',
            password="sebis01.12.040",
            research_institute='test',
            admin=True,
            is_verified=True,
            profile_picture_path=None
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin user created successfully.")
