from ..extensions import db
from werkzeug.security import generate_password_hash

class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    mail_address = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    badges = db.Column(db.PickleType, nullable=True)
    research_institute = db.Column(db.String(120), nullable=True)
    admin = db.Column(db.Boolean, default=False, nullable=False)
    is_superadmin = db.Column(db.Boolean, default=False)
    bio = db.Column(db.String(400), nullable=True)
    profile_picture_path = db.Column(db.String(255), nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    daily_submission_limit = db.Column(db.Integer, default=5, nullable=False)

    # One-to-many relationship with Submission
    submissions = db.relationship('Submission', back_populates='user', cascade="all, delete-orphan", lazy=True)

    def __init__(self, username, password, mail_address, research_institute, badges=None, admin=False, bio="", is_verified=False, daily_submission_limit=5):
        self.username = username
        self.mail_address = mail_address
        self.password = generate_password_hash(password)
        self.badges = badges if badges is not None else []
        self.research_institute = research_institute
        self.admin = admin
        self.bio = bio
        self.is_verified = is_verified
        self.daily_submission_limit = daily_submission_limit
