from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Stamp(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(100))
    year = db.Column(db.Integer)
    description = db.Column(db.Text)

    def __repr__(self):
        return f'<Stamp {self.name}>'