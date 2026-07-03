import sqlite3
conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

print('=== 检查所有相关表 ===')
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print(f'数据库表: {[t[0] for t in tables]}')

print('\n=== 检查interview_rooms表结构 ===')
cursor.execute("PRAGMA table_info(interview_rooms)")
cols = cursor.fetchall()
print(f'列: {[c[1] for c in cols]}')

print('\n=== 检查interview_rooms所有记录 ===')
cursor.execute('SELECT * FROM interview_rooms')
rooms = cursor.fetchall()
print(f'记录数: {len(rooms)}')
for r in rooms:
    print(r)

print('\n=== 检查是否有evaluation相关表 ===')
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%evaluation%'")
print(cursor.fetchall())

print('\n=== 检查applications表中evaluation字段 ===')
cursor.execute("PRAGMA table_info(applications)")
cols = cursor.fetchall()
print(f'applications列: {[c[1] for c in cols]}')

cursor.execute("SELECT id, name, status, evaluation FROM applications WHERE id = 6")
app = cursor.fetchone()
print(f'\n张家伟的evaluation字段: {app[3]}')

conn.close()