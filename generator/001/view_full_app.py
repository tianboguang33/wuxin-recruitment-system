import sqlite3

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

app_id = 6

cursor.execute("SELECT * FROM applications WHERE id = ?", (app_id,))
app = cursor.fetchone()

cols = ['id', 'job_id', 'name', 'phone', 'email', 'education', 'experience', 'cover_letter', 'resume_file_id', 'status', 'created_at', 'updated_at']
print("=== 张家伟 - 申请表完整记录 ===")
for i, col in enumerate(cols):
    print(f"  {col}: {app[i]}")

print("\n=== 应聘岗位信息 ===")
cursor.execute("SELECT * FROM jobs WHERE id = ?", (app[1],))
job = cursor.fetchone()
job_cols = ['id', 'title', 'department', 'location', 'salary_min', 'salary_max', 'job_type', 'experience', 'education', 'status', 'description', 'requirements', 'created_at', 'updated_at']
for i, col in enumerate(job_cols):
    print(f"  {col}: {job[i]}")

conn.close()