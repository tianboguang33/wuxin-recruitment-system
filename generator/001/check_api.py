import requests

API_BASE = "http://localhost:3001"

try:
    # 尝试获取岗位信息
    resp = requests.get(f"{API_BASE}/api/jobs/11")
    print("API响应状态码:", resp.status_code)
    if resp.status_code == 200:
        data = resp.json()
        print("岗位信息:", data)
    else:
        print("API响应内容:", resp.text)
except requests.exceptions.ConnectionError as e:
    print(f"连接失败: {e}")
    print("API服务可能未运行")
