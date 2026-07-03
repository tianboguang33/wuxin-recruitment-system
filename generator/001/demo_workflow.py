import sqlite3
import requests
from datetime import datetime

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

BASE_URL = "http://localhost:3001"
TOKEN = None

def login():
    global TOKEN
    try:
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "admin", "password": "admin123"},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            TOKEN = data.get('data', {}).get('token')
            print(f"  ✓ 登录成功，获取令牌")
            return True
        else:
            print(f"  ✗ 登录失败: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        print(f"  ✗ 登录请求失败: {e}")
        return False

def log_step(step, action, detail=""):
    print(f"\n{'='*60}")
    print(f"Step {step}: {action}")
    if detail:
        print(f"  {detail}")
    print(f"{'='*60}")

def get_headers():
    return {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}

def get_application_status(app_id):
    cursor.execute("SELECT status FROM applications WHERE id = ?", (app_id,))
    return cursor.fetchone()[0]

def trigger_transition(app_id, event, operator="demo", reason=""):
    try:
        resp = requests.post(
            f"{BASE_URL}/api/applications/{app_id}/transition",
            json={"event": event, "operator": operator, "reason": reason},
            headers=get_headers(),
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            result_data = data.get('data', {})
            print(f"  ✓ 状态转换成功: {result_data.get('fromState')} → {result_data.get('toState')}")
            return True
        else:
            print(f"  ✗ 状态转换失败: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        print(f"  ✗ 请求失败: {e}")
        return False

app_id = 6

log_step("0/7", "管理员登录")
if not login():
    print("登录失败，无法继续演示")
    conn.close()
    exit(1)

log_step("1/7", "查看当前状态")
current_status = get_application_status(app_id)
print(f"  当前状态: {current_status}")

log_step("2/7", "模拟候选人确认时间 → 创建面试房间")
print("  [hr-boot检测到候选人已确认时间]")
print("  [调用面试机器人创建房间]")

try:
    resp = requests.post(
        f"{BASE_URL}/api/interview/rooms",
        json={
            "candidate_id": "cand_zhangjiawei_001",
            "candidate_name": "张家伟",
            "candidate_email": "1920166300@qq.com",
            "scheduled_time": "2026-07-04 10:00",
            "job_title": "电气工程师（港口起重机方向）",
            "jd": "负责港口起重机电气系统的研发设计..."
        },
        headers=get_headers(),
        timeout=10
    )
    if resp.status_code == 200:
        room_data = resp.json()
        print(f"  ✓ 面试房间创建成功")
        print(f"    房间ID: {room_data.get('room_id')}")
        print(f"    会议链接: {room_data.get('meeting_link')}")
    else:
        print(f"  ✗ 房间创建失败: {resp.status_code} - {resp.text}")
except Exception as e:
    print(f"  ✗ 房间创建失败: {e}")

trigger_transition(app_id, "confirm_time", "hr-boot", "候选人确认面试时间")

log_step("3/7", "排期面试")
trigger_transition(app_id, "schedule_interview", "hr-boot", "安排面试时间")

log_step("4/7", "开始AI面试（面试机器人）")
trigger_transition(app_id, "start_interview", "面试机器人", "AI面试开始")

log_step("5/7", "综合评估（evaluator）")
print("  [获取面试评分: 假设面试评分90分]")
print("  [综合得分 = 简历评分88 × 0.3 + 面试评分90 × 0.7 = 89.4分]")
print("  [综合得分 >= 80 → 评估通过]")
trigger_transition(app_id, "evaluate_pass", "evaluator", "综合评估通过，得分89.4")

log_step("6/7", "发送Offer")
trigger_transition(app_id, "send_offer", "evaluator", "发送录用Offer")

log_step("7/7", "发送最终通知（notifier）")
print("  [发送录用通知邮件给候选人]")
print("  [发送招聘结果汇总给HR负责人]")

print("\n" + "🎉"*20)
print("🎉 完整招聘流程演示完成！")
print("🎉"*20)

print("\n最终状态验证:")
cursor.execute("SELECT id, name, status FROM applications WHERE id = ?", (app_id,))
app = cursor.fetchone()
print(f"  ID: {app[0]}, 姓名: {app[1]}, 状态: {app[2]}")

print("\n状态流转记录:")
cursor.execute("SELECT from_state, to_state, event, operator, created_at FROM state_history WHERE entity_id = ? ORDER BY created_at ASC", (app_id,))
history = cursor.fetchall()
flow = " → ".join([h[0] for h in history] + [history[-1][1]])
print(f"  {flow}")

conn.close()