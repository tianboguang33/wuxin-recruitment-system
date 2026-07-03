import sqlite3

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

print("=== 张家伟（application_id=6）的完整状态历史 ===")
cursor.execute("""
    SELECT id, from_state, to_state, event, operator, reason, created_at 
    FROM state_history 
    WHERE entity_id = 6 
    ORDER BY created_at ASC
""")
history = cursor.fetchall()
for h in history:
    print(f"  [{h[6]}] {h[1]} → {h[2]} (事件: {h[3]}, 操作人: {h[4]}, 原因: {h[5]})")

print("\n=== outbox表中关于申请6的邮件发送记录 ===")
cursor.execute("SELECT * FROM outbox WHERE application_id = 6")
outbox = cursor.fetchall()
if len(outbox) == 0:
    print("  无邮件发送记录")
else:
    for o in outbox:
        print(f"  记录ID: {o[0]}, 事件类型: {o[2]}, 状态: {o[3]}, 邮箱: {o[4]}, 发送时间: {o[7]}")

print("\n=== applications表中申请6的详细信息 ===")
cursor.execute("SELECT * FROM applications WHERE id = 6")
app = cursor.fetchone()
print(f"  ID: {app[0]}")
print(f"  job_id: {app[1]}")
print(f"  name: {app[2]}")
print(f"  phone: {app[3]}")
print(f"  email: {app[4]}")
print(f"  education: {app[5]}")
print(f"  experience: {app[6]}")
print(f"  resume_file_id: {app[8]}")
print(f"  status: {app[9]}")
print(f"  created_at: {app[10]}")
print(f"  updated_at: {app[11]}")

print("\n=== 对应的简历文件信息 ===")
cursor.execute("SELECT * FROM resume_files WHERE id = 6")
resume = cursor.fetchone()
print(f"  ID: {resume[0]}")
print(f"  application_id: {resume[1]}")
print(f"  original_name: {resume[2]}")
print(f"  file_name: {resume[3]}")

conn.close()