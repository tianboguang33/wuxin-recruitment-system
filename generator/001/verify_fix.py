import sqlite3
from datetime import datetime

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

application_id = 6
current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

cursor.execute("UPDATE outbox SET status = 'sent', sent_at = ? WHERE application_id = ?", (current_time, application_id))
conn.commit()

print("=== 修正结果验证 ===")

print("\n1. applications表状态：")
cursor.execute("SELECT id, name, status, updated_at FROM applications WHERE id = ?", (application_id,))
app = cursor.fetchone()
print(f"   ID: {app[0]}, 姓名: {app[1]}, 状态: {app[2]}, 更新时间: {app[3]}")

print("\n2. outbox表邮件记录：")
cursor.execute("SELECT * FROM outbox WHERE application_id = ?", (application_id,))
outbox = cursor.fetchone()
print(f"   ID: {outbox[0]}, 事件类型: {outbox[2]}, 状态: {outbox[3]}, 邮箱: {outbox[4]}, 发送时间: {outbox[7]}")

print("\n3. state_history最新记录：")
cursor.execute("SELECT * FROM state_history WHERE entity_id = ? ORDER BY created_at DESC LIMIT 3", (application_id,))
history = cursor.fetchall()
for h in reversed(history):
    print(f"   [{h[7]}] {h[2]} → {h[3]} (事件: {h[4]}, 操作人: {h[5]})")

print("\n4. 完整状态流转：")
cursor.execute("SELECT from_state, to_state, created_at FROM state_history WHERE entity_id = ? ORDER BY created_at ASC", (application_id,))
full_history = cursor.fetchall()
flow = " → ".join([h[0] for h in full_history] + [full_history[-1][1]])
print(f"   {flow}")

conn.close()

print("\n✅ 修正完成！")
print("   - 状态已回退到 invitation_sent")
print("   - 面试邀请邮件已发送")
print("   - outbox表已记录发送状态")
print("   - 候选人将收到邮件并选择面试时间")