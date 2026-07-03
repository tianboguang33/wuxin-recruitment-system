import requests
import json

API_BASE = "http://localhost:3001"

# 读取JD内容
with open(r"c:\Users\36368\Desktop\trae-agent\generator\001\电气工程师JD-五新重工研究院.md", "r", encoding="utf-8") as f:
    jd_content = f.read()

# 候选人信息
candidate_info = {
    "candidate_id": "cand_wzp_002",
    "candidate_name": "汪展鹏",
    "candidate_email": "wzp12345677@126.com",
    "scheduled_time": "2026-06-29 15:00",
    "job_title": "电气工程师",
    "jd": jd_content
}

# 登录系统
login_resp = requests.post(f"{API_BASE}/api/auth/login", json={
    "username": "admin",
    "password": "admin123"
})

if not login_resp.json().get("success"):
    print("登录失败")
    exit(1)

token = login_resp.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

# 创建面试房间
print("===== 创建AI面试房间 =====")
print(f"候选人: {candidate_info['candidate_name']}")
print(f"岗位: {candidate_info['job_title']}")
print(f"面试时间: {candidate_info['scheduled_time']}")

resp = requests.post(f"{API_BASE}/api/mcp/tool", json={
    "tool": "create_interview_room",
    "args": candidate_info
}, headers=headers)

result = resp.json()
print(f"\nAPI响应: {json.dumps(result, ensure_ascii=False, indent=2)}")

if result.get("success"):
    room_data = result["data"]["result"]
    print("\n===== 面试房间创建成功 =====")
    print(f"房间ID: {room_data['room_id']}")
    print(f"会议链接: {room_data['meeting_link']}")
    print(f"状态: {room_data['status']}")
    
    # 保存面试房间信息
    room_info = {
        "candidate_id": candidate_info["candidate_id"],
        "candidate_name": candidate_info["candidate_name"],
        "candidate_email": candidate_info["candidate_email"],
        "job_title": candidate_info["job_title"],
        "scheduled_time": candidate_info["scheduled_time"],
        "room_id": room_data["room_id"],
        "meeting_link": room_data["meeting_link"],
        "status": room_data["status"],
        "created_at": result.get("created_at", "")
    }
    
    output_file = r"c:\Users\36368\Desktop\trae-agent\generator\001\interview_room_汪展鹏_电气工程师_new.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(room_info, f, ensure_ascii=False, indent=2)
    
    print(f"\n面试房间信息已保存到: {output_file}")
else:
    print(f"\n创建面试房间失败: {result.get('error', '未知错误')}")
