from app import create_app, db
from app.models import (
    User,
    Submission,
    BenchmarkModule,
    Dataset,
    PrivatizedDataset,
    BenchmarkScore
)
from faker import Faker
from datetime import datetime
from app.models.submission import SubmissionStatusEnum  

fake = Faker()

app = create_app()

with app.app_context():
    # Drop all tables and recreate them
    db.drop_all()
    db.create_all()

    # Create Users
    users = []
    for _ in range(10):  # Create 10 users
        user = User(
            username=fake.user_name(),
            mail_address=fake.email(),
            research_institute=fake.company(),
            password=fake.password(),
            badges=fake.words(nb=2)
        )
        users.append(user)
        db.session.add(user)

    db.session.commit()

    # Create Datasets
    datasets = []
    for _ in range(3):  # Create 3 datasets
        dataset = Dataset(
            name=fake.word(),
            file_path=fake.file_path(),
            is_active=True
        )
        datasets.append(dataset)
        db.session.add(dataset)

    db.session.commit()

    # Create BenchmarkModules
    benchmark_modules = []
    for _ in range(5):  # Create 5 benchmark modules
        module = BenchmarkModule(
            name=fake.word(),
            version=fake.pystr(max_chars=5),
            is_active=True,
            path=fake.pystr(max_chars=15),
            dataset_id=fake.random_element(elements=[d.id for d in datasets])
        )
        benchmark_modules.append(module)
        db.session.add(module)

    db.session.commit()

    # Create Submissions, PrivatizedDatasets, and BenchmarkScores
    for user in users:
        submissions = []
        for _ in range(2):  # Each user has 2 submissions
            submission = Submission(
                name=fake.word(),
                submission_date=datetime.utcnow(),
                user_id=user.id,
                status=SubmissionStatusEnum.COMPLETED,  # Use the Enum
                score=round(fake.random.uniform(50, 100), 2),
                is_public=True
            )
            db.session.add(submission)
            db.session.commit()  # Commit to get submission.id
            submissions.append(submission)

            # Create PrivatizedDatasets for each Submission
            privatized_datasets = []
            for _ in range(2):  # Each submission has 2 privatized datasets
                privatized_dataset = PrivatizedDataset(
                    submission_id=submission.id,
                    original_dataset_id=fake.random_element(elements=[d.id for d in datasets]),
                    file_path=fake.file_path(),
                    created_at=datetime.utcnow(),
                    processing_status='COMPLETED'
                )
                db.session.add(privatized_dataset)
                db.session.commit()  # Commit to get privatized_dataset.id
                privatized_datasets.append(privatized_dataset)

            # Create BenchmarkScores for each PrivatizedDataset and BenchmarkModule
            for module in benchmark_modules:
                for privatized_dataset in privatized_datasets:
                    benchmark_score = BenchmarkScore(
                        submission_id=submission.id,
                        module_id=module.id,
                        privatized_dataset_id=privatized_dataset.id,
                        score=round(fake.random.uniform(50, 100), 2),  # Random float between 50 and 100
                        created_at=datetime.utcnow()
                    )
                    db.session.add(benchmark_score)

    db.session.commit()

    print("Database populated with mock data.")
