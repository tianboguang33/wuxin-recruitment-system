import sqlite3

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

# 查询岗位ID为11的完整信息
cursor.execute("SELECT * FROM jobs WHERE id=11")
row = cursor.fetchone()

if row:
    print("完整岗位信息:")
    print(f"ID: {row[0]}")
    print(f"title: {row[1]}")
    print(f"department: {row[2]}")
    print(f"location: {row[3]}")
    print(f"category: {row[4]}")
    print(f"salary_min: {row[5]}")
    print(f"salary_max: {row[6]}")
    print(f"description: {row[7]}")
    print(f"requirements: {row[8]}")
    print(f"status: {row[9]}")
    print(f"created_at: {row[10]}")
    print(f"updated_at: {row[11]}")
    print(f"urgency: {row[12]}")
    print(f"published: {row[13]}")
    print(f"published_at: {row[14]}")

conn.close()
