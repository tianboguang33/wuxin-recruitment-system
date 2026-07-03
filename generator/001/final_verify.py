import sqlite3

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

app_id = 6

print("="*70)
print("📋 张家伟 - 完整面试记录与评估报告")
print("="*70)

print("\n" + "-"*70)
print("1. 基础信息")
print("-"*70)
cursor.execute("SELECT id, name, phone, email, status, created_at, updated_at FROM applications WHERE id = ?", (app_id,))
app = cursor.fetchone()
print(f"   姓名: {app[1]}")
print(f"   电话: {app[2]}")
print(f"   邮箱: {app[3]}")
print(f"   当前状态: {app[4]}")
print(f"   创建时间: {app[5]}")
print(f"   更新时间: {app[6]}")

print("\n" + "-"*70)
print("2. 面试房间记录")
print("-"*70)
cursor.execute("SELECT * FROM interview_rooms WHERE candidate_name = '张家伟' ORDER BY created_at DESC")
rooms = cursor.fetchall()
if len(rooms) == 0:
    print("   暂无面试房间记录")
else:
    for room in rooms:
        print(f"\n   房间ID: {room[1]}")
        print(f"   候选人姓名: {room[3]}")
        print(f"   候选人邮箱: {room[4]}")
        print(f"   预约时间: {room[5]}")
        print(f"   岗位名称: {room[6]}")
        print(f"   会议链接: {room[8]}")
        print(f"   房间状态: {room[9]}")
        print(f"   面试评分: {room[12]}")
        print(f"   维度评分: {room[13]}")
        print(f"   创建时间: {room[16]}")

print("\n" + "-"*70)
print("3. 面试评估报告")
print("-"*70)
cursor.execute("SELECT summary, transcript FROM interview_rooms WHERE candidate_name = '张家伟' AND status = 'completed' ORDER BY created_at DESC LIMIT 1")
result = cursor.fetchone()
if result:
    print(f"\n评估摘要:\n{result[0]}")
    print(f"\n面试记录:\n{result[1]}")
else:
    print("   暂无评估报告")

print("\n" + "-"*70)
print("4. 状态流转历史")
print("-"*70)
cursor.execute("""
    SELECT from_state, to_state, event, operator, reason, created_at 
    FROM state_history 
    WHERE entity_id = ? 
    ORDER BY created_at ASC
""", (app_id,))
history = cursor.fetchall()
for h in history:
    print(f"   [{h[5]}] {h[0]} → {h[1]} (事件: {h[2]}, 操作人: {h[3]})")

print("\n" + "-"*70)
print("5. 邮件发送记录")
print("-"*70)
cursor.execute("SELECT * FROM outbox WHERE application_id = ?", (app_id,))
outbox = cursor.fetchall()
if len(outbox) == 0:
    print("   暂无邮件发送记录")
else:
    for o in outbox:
        print(f"\n   记录ID: {o[0]}")
        print(f"   事件类型: {o[2]}")
        print(f"   状态: {o[3]}")
        print(f"   收件邮箱: {o[4]}")
        print(f"   创建时间: {o[6]}")
        print(f"   发送时间: {o[7]}")

conn.close()

print("\n" + "="*70)
print("✓ 面试记录与评估报告查看完成")
print("="*70)