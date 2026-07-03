import requests

API_BASE = "http://localhost:3001"

# 登录
login_resp = requests.post(f"{API_BASE}/api/auth/login", json={
    "username": "admin",
    "password": "admin123"
})
token = login_resp.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

# 获取岗位信息
resp = requests.get(f"{API_BASE}/api/jobs/11", headers=headers)
print("完整API响应:")
print(resp.json())

# 查看字段列表
job = resp.json()["data"]["job"]
print("\njob对象的所有字段:")
for key in job.keys():
    print(f"  {key}: {job[key]}")
