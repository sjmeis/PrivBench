from ..extensions import db
from werkzeug.security import generate_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    mail_address = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    badges = db.Column(db.PickleType, nullable=True)
    research_institute = db.Column(db.String(120), nullable=True)


    # The relationship from User to Result
    # One user can have many results
    results = db.relationship('Result', backref='user', lazy=True)

    def __init__(self, username, password , mail_address, research_institute, badges=None):
        self.username = username
        self.mail_address = mail_address
        self.password = generate_password_hash(password)
        self.badges = badges if badges is not None else []
        self.research_institute = research_institute