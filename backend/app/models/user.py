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

    # One-to-many relationship with Submission
    submissions = db.relationship('Submission', back_populates='user', lazy=True)

    def __init__(self, username, password, mail_address, research_institute, badges=None, admin=False):
        self.username = username
        self.mail_address = mail_address
        self.password = generate_password_hash(password)
        self.badges = badges if badges is not None else []
        self.research_institute = research_institute
        self.admin = admin
