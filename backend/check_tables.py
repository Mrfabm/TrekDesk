from sqlalchemy import inspect
from app.database import engine

def check_tables():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("\nExisting tables:")
    for table in tables:
        print(f"- {table}")
        columns = inspector.get_columns(table)
        for column in columns:
            print(f"  • {column['name']}: {column['type']}")

if __name__ == "__main__":
    check_tables() 