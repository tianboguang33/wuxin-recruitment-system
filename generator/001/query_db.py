import sqlite3

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("=== 数据库表列表 ===")
for t in tables:
    print(f"  - {t[0]}")

for table in tables:
    table_name = table[0]
    print(f"\n=== {table_name} 表结构 ===")
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    
    print(f"\n=== {table_name} 数据 (前10条) ===")
    cursor.execute(f"SELECT * FROM {table_name} LIMIT 10")
    rows = cursor.fetchall()
    if len(rows) == 0:
        print("  (空表)")
    else:
        for row in rows:
            print(f"  {row}")

conn.close()