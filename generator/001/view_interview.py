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
cursor.execute("SELECT * FROM applications WHERE id = ?", (app_id,))
app = cursor.fetchone()
print(f"   姓名: {app[2]}")
print(f"   电话: {app[3]}")
print(f"   邮箱: {app[4]}")
print(f"   应聘岗位: 电气工程师（港口起重机方向）")
print(f"   当前状态: {app[9]}")
print(f"   创建时间: {app[10]}")
print(f"   更新时间: {app[11]}")

print("\n" + "-"*70)
print("2. 面试房间记录")
print("-"*70)
cursor.execute("SELECT * FROM interview_rooms WHERE candidate_name = '张家伟'")
rooms = cursor.fetchall()
if len(rooms) == 0:
    print("   暂无面试房间记录")
else:
    for room in rooms:
        print(f"\n   房间ID: {room[1]}")
        print(f"   候选人ID: {room[2]}")
        print(f"   候选人姓名: {room[3]}")
        print(f"   候选人邮箱: {room[4]}")
        print(f"   预约时间: {room[5]}")
        print(f"   岗位名称: {room[6]}")
        print(f"   会议链接: {room[8]}")
        print(f"   房间状态: {room[9]}")
        print(f"   AI模型状态: {room[10]}")
        print(f"   网络状态: {room[11]}")
        print(f"   面试评分: {room[12]}")
        print(f"   维度评分: {room[13]}")
        print(f"   评估摘要: {room[14]}")
        print(f"   面试记录: {room[15]}")
        print(f"   创建时间: {room[16]}")

print("\n" + "-"*70)
print("3. 状态流转历史")
print("-"*70)
cursor.execute("""
    SELECT id, from_state, to_state, event, operator, reason, created_at 
    FROM state_history 
    WHERE entity_id = ? 
    ORDER BY created_at ASC
""", (app_id,))
history = cursor.fetchall()
for h in history:
    print(f"   [{h[6]}] {h[1]} → {h[2]} (事件: {h[3]}, 操作人: {h[4]}, 原因: {h[5]})")

print("\n" + "-"*70)
print("4. 简历评估结果")
print("-"*70)
cursor.execute("SELECT * FROM resume_files WHERE id = ?", (app[8],))
resume = cursor.fetchone()
if resume:
    print(f"   文件ID: {resume[0]}")
    print(f"   原始文件名: {resume[2]}")
    print(f"   存储文件名: {resume[3]}")
    print(f"   文件大小: {resume[4]} bytes")
    print(f"   文件类型: {resume[5]}")
    print(f"   上传时间: {resume[6]}")
else:
    print("   暂无简历文件记录")

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
        print(f"   申请ID: {o[1]}")
        print(f"   事件类型: {o[2]}")
        print(f"   状态: {o[3]}")
        print(f"   收件邮箱: {o[4]}")
        print(f"   消息ID: {o[5]}")
        print(f"   创建时间: {o[6]}")
        print(f"   发送时间: {o[7]}")

conn.close()

print("\n" + "="*70)
print("✓ 面试记录与评估报告查看完成")
print("="*70)