import requests

API_BASE = "http://localhost:3001"

# 登录
login_resp = requests.post(f"{API_BASE}/api/auth/login", json={
    "username": "admin",
    "password": "admin123"
})
token = login_resp.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

# 获取岗位详情
resp = requests.get(f"{API_BASE}/api/jobs/11", headers=headers)
if resp.status_code == 200:
    job = resp.json()["data"]["job"]
    print("===== 岗位发布确认报告 =====")
    print(f"岗位ID: {job['id']}")
    print(f"职位名称: {job['title']}")
    print(f"部门: {job['department']}")
    print(f"地点: {job['location']}")
    print(f"分类: {job['category']}")
    print(f"薪资范围: {job['salary_min']}-{job['salary_max']}")
    print(f"状态: {job['status']}")
    print(f"创建时间: {job['created_at']}")
    print(f"更新时间: {job['updated_at']}")
    
    if job['status'] == 'active':
        print("\n✓ 岗位已成功发布到五新重工招聘门户！")
        print("✓ 候选人可以通过招聘门户查看并投递该职位")
    else:
        print("\n✗ 岗位状态不是active，需要发布")
else:
    print(f"获取岗位信息失败: {resp.text}")

# 检查所有已发布岗位列表
print("\n===== 五新重工招聘门户已发布岗位 =====")
list_resp = requests.get(f"{API_BASE}/api/jobs/", headers=headers)
if list_resp.status_code == 200:
    jobs = list_resp.json()["data"]["jobs"]
    for j in jobs:
        print(f"ID: {j['id']} | 职位: {j['title']} | 部门: {j['department']} | 状态: {j['status']}")
