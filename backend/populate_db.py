
from app import create_app, db
from app.models import User, Result
from faker import Faker

fake = Faker()

app = create_app()

with app.app_context():
    # Drop all tables and recreate them
    db.drop_all()
    db.create_all()

    users = []
    for _ in range(20): #count how many to create
        user = User(
            username=fake.user_name(),
            mail_address=fake.email(),
            research_institute=fake.name(),
            password=fake.password(),
            badges=fake.words(nb=2)  # count on how many badges per user
        )
        users.append(user)
        db.session.add(user)

    db.session.commit()

    for user in users:
        for _ in range(3):
            result = Result(
                name=fake.word(),
                method=fake.word(),
                submitted_by=user.id,
                score=fake.random_int(min=50, max=100)  # Random score between 50 and 100
            )
            db.session.add(result)

    db.session.commit()

    print("Database populated with mock data.")
