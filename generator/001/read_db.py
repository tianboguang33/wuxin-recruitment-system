import sqlite3

conn = sqlite3.connect(r'c:\Users\36368\AppData\Roaming\Trae CN\ModularData\ai-agent\database.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", tables)

for table in tables:
    name = table[0]
    print(f"\n=== {name} ===")
    cursor.execute(f"SELECT * FROM {name}")
    rows = cursor.fetchall()
    for row in rows[:10]:
        print(row)

conn.close()