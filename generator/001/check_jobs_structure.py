import sqlite3

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

# 查看jobs表结构
cursor.execute("PRAGMA table_info(jobs)")
print("jobs表结构:")
for col in cursor.fetchall():
    print(f"  {col}")

# 查询所有字段
cursor.execute("SELECT * FROM jobs WHERE id=11")
row = cursor.fetchone()
if row:
    print("\n岗位ID为11的所有字段值:")
    cursor.execute("PRAGMA table_info(jobs)")
    cols = cursor.fetchall()
    for i, col in enumerate(cols):
        print(f"  {col[1]}: {row[i]}")

conn.close()
