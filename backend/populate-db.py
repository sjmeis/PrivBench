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

def install_demo_data():
    """Generates mock users, submissions, and scores."""
    benchmark_modules = BenchmarkModule.query.all()
    datasets = Dataset.query.all()

    if not benchmark_modules or not datasets:
        print("Missing baseline modules or datasets. Cannot populate mock entries.")
        return False

    users = []
    for _ in range(10):  
        user = User(
            # Prefixed with demo_ so it can be safely targeted for deletion later
            username=f"demo_{fake.user_name()[:15]}",
            mail_address=fake.email(),
            bio=fake.text(max_nb_chars=200),
            research_institute=random.choice(institutions),
            password="test123",
            is_verified=True,
            daily_submission_limit=0
        )
        users.append(user)
        db.session.add(user)

    db.session.commit()

    for module in benchmark_modules:
        for user in users:
            for _ in range(2):  
                submission = Submission(
                    name=random.choice(privatization_models),
                    submission_date=datetime.utcnow() - timedelta(days=2) - timedelta(days=random.randint(0, 14)),
                    user_id=user.id,
                    status=SubmissionStatus.COMPLETED,
                    score=0.0,
                    is_public=True,
                    version="1.0.0"
                )
                db.session.add(submission)
                db.session.commit()

                submission_metadata = SubmissionMetadata(
                    submission_id=submission.id,
                    model_name=fake.word(),
                    model_description=fake.text(max_nb_chars=150),
                    license=random.choice(list(License)),
                    tags=random.sample(sample_tags, 2),
                    authors=fake.name(),
                    research_paper_url="https://arxiv.org/",
                    github_url="https://github.com/",
                    bibtex_citation="@article{example, title={Article}, author={The PrivBench Team}, year={2026}}"
                )
                db.session.add(submission_metadata)
                db.session.commit()

                privatized_datasets = []
                for _ in range(len(benchmark_modules)): 
                    privatized_dataset = PrivatizedDataset(
                        submission_id=submission.id,
                        original_dataset_id=random.choice([d.id for d in datasets]),
                        file_path=f"/data/privatized_datasets/mock_{fake.file_name(extension='csv')}",
                        created_at=datetime.utcnow(),
                        processing_status='COMPLETED'
                    )
                    db.session.add(privatized_dataset)
                    db.session.commit()
                    privatized_datasets.append(privatized_dataset)

                benchmark_scores = []
                for privatized_dataset in privatized_datasets:
                    for inner_module in benchmark_modules:
                        try:
                            benchmark_score = BenchmarkScore(
                                submission_id=submission.id,
                                module_id=inner_module.id,
                                privatized_dataset_id=privatized_dataset.id,
                                score=round(random.uniform(50, 90), 2),
                                created_at=datetime.utcnow()
                            )
                            db.session.add(benchmark_score)
                            db.session.commit()
                            benchmark_scores.append(round(benchmark_score.score, 2))
                        except IntegrityError:
                            db.session.rollback()

                if benchmark_scores:
                    submission.score = round(sum(benchmark_scores) / len(benchmark_scores), 2)
                    db.session.commit()

    print("Database successfully populated with mock data.")
    return True

def purge_demo_data():
    """Safely cleans up all objects connected to users with a 'demo_' prefix."""
    demo_users = User.query.filter(User.username.ilike("demo_%")).all()
    if not demo_users:
        print("No active mock records detected.")
        return False

    demo_user_ids = [u.id for u in demo_users]
    demo_submissions = Submission.query.filter(Submission.user_id.in_(demo_user_ids)).all()
    demo_sub_ids = [s.id for s in demo_submissions]

    if demo_sub_ids:
        BenchmarkScore.query.filter(BenchmarkScore.submission_id.in_(demo_sub_ids)).delete(synchronize_session=False)
        PrivatizedDataset.query.filter(PrivatizedDataset.submission_id.in_(demo_sub_ids)).delete(synchronize_session=False)
        SubmissionMetadata.query.filter(SubmissionMetadata.submission_id.in_(demo_sub_ids)).delete(synchronize_session=False)
        Submission.query.filter(Submission.id.in_(demo_sub_ids)).delete(synchronize_session=False)

    User.query.filter(User.id.in_(demo_user_ids)).delete(synchronize_session=False)
    db.session.commit()
    print("Database cleared of mock data successfully.")
    return True

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        install_demo_data()