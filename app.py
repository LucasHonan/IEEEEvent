from flask import Flask, render_template, request, redirect, url_for
from models import db, Stamp

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///stamps.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/')
def home():
    stamps = Stamp.query.all()
    return render_template('index.html', stamps=stamps)

@app.route('/add', methods=['GET', 'POST'])
def add_stamp():
    if request.method == 'POST':
        name = request.form['name']
        country = request.form['country']
        year = int(request.form['year']) if request.form['year'] else None
        description = request.form['description']
        new_stamp = Stamp(name=name, country=country, year=year, description=description)
        db.session.add(new_stamp)
        db.session.commit()
        return redirect(url_for('home'))
    return render_template('add.html')

if __name__ == '__main__':
    app.run(debug=True)