from app import create_app, db
from app.models import (
    User,
    Submission,
    BenchmarkModule,
    Dataset,
    PrivatizedDataset,
    BenchmarkScore,
    SubmissionMetadata
)
from faker import Faker
from datetime import datetime, timedelta
import random
from app.enums import SubmissionStatus, License
from sqlalchemy.exc import IntegrityError

fake = Faker()

app = create_app()

with app.app_context():

    institutions = [
        "MIT",
        "Stanford University",
        "Harvard University",
        "Technical University of Munich (TUM)",
        "University of Cambridge",
        "University of Oxford",
        "ETH Zurich",
        "University of Chicago",
        "Columbia University",
        "Princeton University",
        "University of California, Berkeley (UC Berkeley)",
        "University of Toronto",
        "Imperial College London",
        "National University of Singapore (NUS)",
        "Tsinghua University"
    ]


    # Check for existing BenchmarkModules
    benchmark_modules = BenchmarkModule.query.all()
    if not benchmark_modules:
        print("No benchmark modules found in the database. Please add some before running this script.")
    else:
        print(f"Found {len(benchmark_modules)} benchmark modules in the database.")

    # Check for existing Datasets
    datasets = Dataset.query.all()
    if not datasets:
        print("No datasets found in the database. Please add some before running this script.")
    else:
        print(f"Found {len(datasets)} datasets in the database.")

    # Create Users
    users = []
    for _ in range(10):  # Create 10 users
        user = User(
            username=fake.user_name(),
            mail_address=fake.email(),
            bio=fake.text(max_nb_chars=400),
            research_institute=random.choice(list(institutions)),
            password="test123",
        )
        users.append(user)
        db.session.add(user)

    db.session.commit()

    admin = User(
        username='admin',
        mail_address='admin@privbench.com',
        password="test123",
        research_institute='test',
        admin=True,
    )
    db.session.add(admin)

    privatization_models = [
        "Privacy Transformer",
        "Noise Injection Model",
        "Anonymization Framework",
        "Synthetic Text Protocol",
        "Privacy Embedding",
        "Redaction Algorithm",
        "Text Masking System",
        "Token Obfuscation",
        "Sequence Modeling",
        "Encrypted Tokenization",
        "Federated Masking",
        "Data Minimization",
        "Sanitization Model",
        "Adversarial Anonymization",
        "Contextual Encoding",
        "Noise-Augmented Privatization",
        "Syntax Replacement",
        "Secure Learning Protocol",
        "Redacted Modeling",
        "Privacy Tokenization"
    ]

    sample_tags = [
        "privacy",
        "anonymity",
        "sanitization",
        "minimization",
        "noise",
        "federation",
        "security",
        "synthetic",
        "adversarial",
        "embedding",
        "obfuscation",
        "redaction",
        "nlp",
        "masking",
        "encryption",
        "tokens",
        "models",
        "privacy-nlp"
    ]

    for module in benchmark_modules:
        print(f"Processing benchmark module: {module.name} (ID: {module.id})")

        for user in users:
            for _ in range(2):  # Each user has 2 submissions
                submission = Submission(
                    name = random.choice(privatization_models),
                    submission_date = datetime.utcnow() - timedelta(days=random.randint(0, 14)),
                    user_id=user.id,
                    status=SubmissionStatus.COMPLETED,
                    score=0.0,
                    is_public=True
                )
                db.session.add(submission)
                db.session.commit()

                # Create corresponding SubmissionMetadata for the new submission
                submission_metadata = SubmissionMetadata(
                    submission_id=submission.id,
                    model_name=fake.word(),
                    model_description=fake.text(),
                    license=random.choice(list(License)),
                    tags = random.sample(sample_tags, 2),
                    authors=fake.name(),
                    research_paper_url=fake.url(),
                    github_url=fake.url(),
                    bibtex_citation=fake.text()
                )
                db.session.add(submission_metadata)
                db.session.commit()


                privatized_datasets = []
                for _ in range(len(benchmark_modules)):  # Each submission has 2 privatized datasets
                    privatized_dataset = PrivatizedDataset(
                        submission_id=submission.id,
                        original_dataset_id=fake.random_element(elements=[d.id for d in datasets]),
                        file_path=fake.file_path(),
                        created_at=datetime.utcnow(),
                        processing_status='COMPLETED'
                    )
                    db.session.add(privatized_dataset)
                    db.session.commit()
                    privatized_datasets.append(privatized_dataset)


                benchmark_scores = []
                for privatized_dataset in privatized_datasets:
                    for module in benchmark_modules:
                        try:
                            benchmark_score = BenchmarkScore(
                                submission_id=submission.id,
                                module_id=module.id,
                                privatized_dataset_id=privatized_dataset.id,
                                score=round(fake.random.uniform(50, 100), 2),
                                created_at=datetime.utcnow()
                            )
                            db.session.add(benchmark_score)
                            db.session.commit()
                            benchmark_scores.append(round(benchmark_score.score, 2))
                        except IntegrityError:
                            db.session.rollback()  # Handle duplicate entries

                # Update submission score to average of benchmark scores
                if benchmark_scores:
                    submission.score = round(sum(benchmark_scores) / len(benchmark_scores), 2)
                    db.session.commit()

    print("Database populated with mock data.")