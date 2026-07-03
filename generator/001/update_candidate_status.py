import requests
import json

API_BASE = "http://localhost:5000"

# 更新候选人状态
def update_candidate_status(candidate_id, status, meeting_link=None):
    url = f"{API_BASE}/api/candidates/update"
    data = {
        "candidate_id": candidate_id,
        "status": status
    }
    if meeting_link:
        data["meeting_link"] = meeting_link
    
    print(f"请求数据: {json.dumps(data, ensure_ascii=False)}")
    
    response = requests.post(url, json=data)
    print(f"响应状态码: {response.status_code}")
    print(f"响应内容: {response.text}")
    
    return response.json()

# 查询候选人状态
def get_candidate(candidate_id):
    url = f"{API_BASE}/api/candidate/{candidate_id}"
    response = requests.get(url)
    return response.json()

if __name__ == "__main__":
    candidate_id = "cand_wzp_003_new"
    
    # 先查询当前状态
    print("===== 查询当前状态 =====")
    candidate = get_candidate(candidate_id)
    print(f"当前状态: {candidate.get('status', '未知')}")
    
    # 更新状态为 confirmed
    print("\n===== 更新状态 =====")
    result = update_candidate_status(
        candidate_id=candidate_id,
        status="confirmed",
        meeting_link="https://interview.example.com/join/room_ed56ae03524a87c8"
    )
    
    print(f"\n更新结果: {json.dumps(result, ensure_ascii=False, indent=2)}")
    
    # 再次查询确认
    print("\n===== 确认更新 =====")
    candidate = get_candidate(candidate_id)
    print(f"更新后状态: {candidate.get('status', '未知')}")