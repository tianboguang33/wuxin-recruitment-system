import sqlite3

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

print("="*70)
print("📋 招聘系统 - 所有投递记录")
print("="*70)

cursor.execute("SELECT * FROM applications ORDER BY created_at DESC")
apps = cursor.fetchall()
cols = ['id', 'job_id', 'name', 'phone', 'email', 'education', 'experience', 'cover_letter', 'resume_file_id', 'status', 'created_at', 'updated_at']

for app in apps:
    print("\n" + "-"*70)
    for i, col in enumerate(cols):
        print(f"  {col}: {app[i]}")
    
    cursor.execute("SELECT title FROM jobs WHERE id = ?", (app[1],))
    job = cursor.fetchone()
    if job:
        print(f"  岗位名称: {job[0]}")
    
    cursor.execute("SELECT COUNT(*) FROM state_history WHERE entity_id = ?", (app[0],))
    count = cursor.fetchone()[0]
    print(f"  状态变更次数: {count}")

print("\n" + "="*70)
print("📊 状态统计")
print("="*70)
cursor.execute("SELECT status, COUNT(*) FROM applications GROUP BY status")
stats = cursor.fetchall()
for stat in stats:
    print(f"  {stat[0]}: {stat[1]} 人")

conn.close()