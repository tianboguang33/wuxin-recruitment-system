import requests
import json

API_BASE = "http://localhost:5000"

def create_candidate(candidate_id, name, email, job_title, time_slots, expected_salary=''):
    """创建候选人记录"""
    url = f"{API_BASE}/api/candidates/create"
    data = {
        "candidate_id": candidate_id,
        "name": name,
        "email": email,
        "job_title": job_title,
        "time_slots": time_slots,
        "expected_salary": expected_salary
    }
    response = requests.post(url, json=data)
    return response.json()

def submit_form(candidate_id, selected_time, phone=None, expected_salary=None):
    """提交表单选择时间"""
    url = f"{API_BASE}/submit"
    data = {
        "candidate_id": candidate_id,
        "selected_time": selected_time
    }
    if phone:
        data["phone"] = phone
    if expected_salary:
        data["expected_salary"] = expected_salary
    response = requests.post(url, json=data)
    return response.json()

def update_candidate_status(candidate_id, status, meeting_link=None):
    """更新候选人状态"""
    url = f"{API_BASE}/api/candidates/update"
    data = {
        "candidate_id": candidate_id,
        "status": status
    }
    if meeting_link:
        data["meeting_link"] = meeting_link
    response = requests.post(url, json=data)
    return response.json()

def get_candidate(candidate_id):
    """查询候选人信息"""
    url = f"{API_BASE}/api/candidate/{candidate_id}"
    response = requests.get(url)
    return response.json()

if __name__ == "__main__":
    candidate_info = {
        "candidate_id": "cand_wzp_003_new",
        "name": "汪展鹏",
        "email": "1847092142@qq.com",
        "job_title": "电气工程师（港口起重机方向）",
        "time_slots": ["2026-07-01 10:00-10:45", "2026-07-01 14:00-14:45", "2026-07-02 10:00-10:45"],
        "expected_salary": "15000-20000",
        "phone": "18673398995",
        "selected_time": "2026-06-30T09:47",
        "meeting_link": "https://interview.example.com/join/room_ed56ae03524a87c8"
    }
    
    print("===== 步骤1: 创建候选人 =====")
    result = create_candidate(
        candidate_id=candidate_info["candidate_id"],
        name=candidate_info["name"],
        email=candidate_info["email"],
        job_title=candidate_info["job_title"],
        time_slots=candidate_info["time_slots"],
        expected_salary=candidate_info["expected_salary"]
    )
    print(f"结果: {json.dumps(result, ensure_ascii=False)}")
    
    if result.get("success"):
        print("\n===== 步骤2: 提交表单（选择面试时间） =====")
        result = submit_form(
            candidate_id=candidate_info["candidate_id"],
            selected_time=candidate_info["selected_time"],
            phone=candidate_info["phone"],
            expected_salary=candidate_info["expected_salary"]
        )
        print(f"结果: {json.dumps(result, ensure_ascii=False)}")
        
        if result.get("success"):
            print("\n===== 步骤3: 更新状态为confirmed =====")
            result = update_candidate_status(
                candidate_id=candidate_info["candidate_id"],
                status="confirmed",
                meeting_link=candidate_info["meeting_link"]
            )
            print(f"结果: {json.dumps(result, ensure_ascii=False)}")
            
            print("\n===== 步骤4: 查询最终状态 =====")
            candidate = get_candidate(candidate_info["candidate_id"])
            print(f"候选人状态: {json.dumps(candidate, ensure_ascii=False, indent=2)}")
            
            # 保存面试房间信息
            room_info = {
                "candidate_id": candidate_info["candidate_id"],
                "candidate_name": candidate_info["name"],
                "candidate_email": candidate_info["email"],
                "job_title": candidate_info["job_title"],
                "scheduled_time": candidate_info["selected_time"],
                "meeting_link": candidate_info["meeting_link"],
                "status": candidate.get("status", "unknown"),
                "expected_salary": candidate_info["expected_salary"]
            }
            
            output_file = "interview_room_汪展鹏_电气工程师_complete.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(room_info, f, ensure_ascii=False, indent=2)
            
            print(f"\n面试房间信息已保存到: {output_file}")
        else:
            print(f"提交表单失败: {result.get('error')}")
    else:
        print(f"创建候选人失败: {result.get('error')}")