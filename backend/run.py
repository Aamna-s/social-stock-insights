from app import create_app
import psycopg2
app = create_app()

if __name__ == '__main__':
    app.run(debug=False)