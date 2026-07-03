import sqlite3
import requests

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

BASE_URL = "http://localhost:3001"
TOKEN = None

def login():
    global TOKEN
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "admin", "password": "admin123"},
        timeout=10
    )
    if resp.status_code == 200:
        data = resp.json()
        TOKEN = data.get('data', {}).get('token')
        print(f"  ✓ 登录成功")
        return True
    return False

def get_headers():
    return {"Authorization": f"Bearer {TOKEN}"}

def trigger_transition(app_id, event, operator, reason=""):
    resp = requests.post(
        f"{BASE_URL}/api/applications/{app_id}/transition",
        json={"event": event, "operator": operator, "reason": reason},
        headers=get_headers(),
        timeout=10
    )
    if resp.status_code == 200:
        data = resp.json()
        result_data = data.get('data', {})
        print(f"  ✓ {result_data.get('fromState')} → {result_data.get('toState')}")
        return True
    else:
        print(f"  ✗ {resp.status_code} - {resp.text}")
        return False

app_id = 6

print("="*60)
print("演示当前状态")
print("="*60)
cursor.execute("SELECT id, name, status FROM applications WHERE id = ?", (app_id,))
app = cursor.fetchone()
print(f" 当前状态: {app[2]}")

login()

print("\n" + "="*60)
print("Step 1: 候选人接受Offer")
print("="*60)
trigger_transition(app_id, "accept_offer", "张家伟", "接受录用Offer")

print("\n" + "="*60)
print("最终状态验证")
print("="*60)
cursor.execute("SELECT id, name, status FROM applications WHERE id = ?", (app_id,))
app = cursor.fetchone()
print(f" ID: {app[0]}, 姓名: {app[1]}, 状态: {app[2]}")

print("\n完整状态流转:")
cursor.execute("SELECT from_state, to_state, event, operator, created_at FROM state_history WHERE entity_id = ? ORDER BY created_at ASC", (app_id,))
history = cursor.fetchall()
flow = " → ".join([h[0] for h in history] + [history[-1][1]])
print(f" {flow}")

conn.close()

print("\n🎉 恭喜！张家伟已成功录用！")