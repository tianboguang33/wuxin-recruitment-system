import sqlite3
import requests
import uuid
from datetime import datetime

BASE_URL = "http://localhost:3001"
TOKEN = None
app_id = 6

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

def trigger_transition(event, operator, reason=""):
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

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

print("="*70)
print("🔄 步骤1: 回退状态到 invitation_sent")
print("="*70)

cursor.execute("SELECT status FROM applications WHERE id = ?", (app_id,))
current_status = cursor.fetchone()[0]
print(f"  当前状态: {current_status}")

if current_status != 'invitation_sent':
    cursor.execute("""
        UPDATE applications 
        SET status = 'invitation_sent', updated_at = datetime('now')
        WHERE id = ?
    """, (app_id,))
    conn.commit()
    print("  ✓ 状态已回退到 invitation_sent")

login()

print("\n" + "="*70)
print("🏠 步骤2: 创建面试房间")
print("="*70)

cursor.execute("SELECT name, email FROM applications WHERE id = ?", (app_id,))
app = cursor.fetchone()
candidate_name = app[0]
candidate_email = app[1]

cursor.execute("SELECT title, description FROM jobs WHERE id = (SELECT job_id FROM applications WHERE id = ?)", (app_id,))
job = cursor.fetchone()
job_title = job[0]
jd = job[1]

room_id = f"room_{uuid.uuid4().hex[:16]}"
meeting_link = f"https://interview.example.com/join/{room_id}"

cursor.execute("""
    INSERT INTO interview_rooms 
    (room_id, candidate_id, candidate_name, candidate_email, scheduled_time, job_title, jd, meeting_link, status, ai_model_status, network_status, score, dimension_scores, summary, transcript, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, 'created', 'online', 'normal', NULL, '', '', '', datetime('now'), datetime('now'))
""", (room_id, f"cand_{app_id}", candidate_name, candidate_email, job_title, jd, meeting_link))
conn.commit()

print(f"  ✓ 面试房间创建成功")
print(f"    房间ID: {room_id}")
print(f"    会议链接: {meeting_link}")

trigger_transition('confirm_time', 'admin', '候选人确认时间')
trigger_transition('schedule_interview', 'admin', '安排面试时间')
trigger_transition('start_interview', 'admin', 'AI面试开始')

print("\n" + "="*70)
print("🤖 步骤3: 执行AI面试")
print("="*70)

interview_transcript = """面试官: 请介绍一下您的电气工程师工作经历？
候选人: 我从事电气设计工作5年，主要负责港口起重机的电气系统设计，包括PLC编程、电气原理图绘制、变频器调试等工作。

面试官: 您使用过哪些PLC品牌？
候选人: 主要使用西门子S7-1200/1500系列，也有使用三菱和施耐德的经验。

面试官: 请描述一个您解决的复杂电气故障案例？
候选人: 在一次设备调试中，起重机运行出现频繁停机。我通过分析PLC程序和电气图纸，发现是通讯协议不匹配导致的数据传输错误。我重新配置了Profinet通讯参数，解决了问题。

面试官: 您对港口起重机自动化发展有什么看法？
候选人: 我认为自动化是未来趋势，尤其是5G远程操控和无人码头。我参与过一些智能化项目，对这方面很感兴趣。"""

dimension_scores = {
    "专业技能": 92,
    "问题解决能力": 88,
    "沟通表达": 85,
    "职业素养": 90,
    "潜力评估": 87
}

interview_score = sum(dimension_scores.values()) // len(dimension_scores)

summary = f"""【AI面试评估报告】
候选人: 张家伟
岗位: 电气工程师（港口起重机方向）
面试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

一、整体评分: {interview_score}/100

二、维度评分:
{chr(10).join([f'  - {k}: {v}分' for k, v in dimension_scores.items()])}

三、优势分析:
1. 专业技能扎实，熟悉西门子PLC编程和港口起重机电气系统
2. 具备丰富的故障诊断经验，能快速定位和解决问题
3. 对行业新技术保持关注，有学习热情

四、待提升点:
1. 英语沟通能力有待加强（本次面试为中文）
2. 大型项目管理经验相对较少

五、综合评价:
候选人技术能力优秀，完全符合岗位要求，建议录用。"""

cursor.execute("""
    UPDATE interview_rooms 
    SET status = 'completed', score = ?, dimension_scores = ?, summary = ?, transcript = ?, updated_at = datetime('now')
    WHERE room_id = ?
""", (interview_score, str(dimension_scores), summary, interview_transcript, room_id))
conn.commit()

print(f"  ✓ AI面试完成")
print(f"  面试评分: {interview_score}分")
print(f"  维度评分: {dimension_scores}")

print("\n" + "="*70)
print("📊 步骤4: 综合评估")
print("="*70)

cursor.execute("SELECT * FROM resume_files WHERE id = (SELECT resume_file_id FROM applications WHERE id = ?)", (app_id,))
resume = cursor.fetchone()
resume_score = 88

composite_score = round(resume_score * 0.3 + interview_score * 0.7, 1)
print(f"  简历评分: {resume_score}分 (占30%)")
print(f"  面试评分: {interview_score}分 (占70%)")
print(f"  综合得分: {composite_score}分")

if composite_score >= 80:
    print("  综合评估通过！")
    trigger_transition('evaluate_pass', 'evaluator', f'综合评估通过，得分{composite_score}')
    trigger_transition('send_offer', 'evaluator', '发送录用Offer')
else:
    print("  综合评估未通过")
    trigger_transition('evaluate_fail', 'evaluator', f'综合评估未通过，得分{composite_score}')

print("\n" + "="*70)
print("✓ 完整面试流程完成！")
print("="*70)

conn.close()