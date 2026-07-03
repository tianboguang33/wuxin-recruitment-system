import requests
import json

API_BASE = "http://localhost:3001"

# 登录
login_resp = requests.post(f"{API_BASE}/api/auth/login", json={
    "username": "admin",
    "password": "admin123"
})
token = login_resp.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

# 读取完整JD
with open(r"c:\Users\36368\Desktop\trae-agent\generator\001\电气工程师JD-五新重工研究院.md", "r", encoding="utf-8") as f:
    jd_content = f.read()

# 更新岗位
update_data = {
    "title": "电气工程师（港口起重机方向）",
    "department": "电气所",
    "location": "长沙·浏阳经济技术开发区",
    "category": "技术研发",
    "salaryMin": 15000,
    "salaryMax": 25000,
    "description": "负责港口起重机（门座机、集装箱门机、岸桥等）电气系统的研发设计与技术落地工作，主导电气方案设计、PLC编程调试、电气图纸绘制及现场技术支持，作为技术研发部核心成员参与公司智能化、自动化港口装备的升级迭代，推动产品从设计到交付的全流程电气技术保障。",
    "requirements": "硬性条件：1.学历专业：本科及以上学历，电气工程及其自动化、自动化、机电一体化等相关专业；2.工作经验：3年以上电气设计或相关工作经验，有港口机械、重型装备、起重机械行业经验者优先；3.PLC编程能力：精通西门子S7系列（S7-1200/1500）PLC编程与调试，熟悉TIA Portal博途开发环境，了解三菱、施耐德等主流品牌者优先；4.电气设计软件：熟练使用AutoCAD Electrical或EPLAN等电气设计软件，能独立完成电气原理图、施工图纸的深化设计；5.变频器与通讯：熟悉西门子、ABB、施耐德等品牌变频器的配置与调试，了解常用工业通讯协议（Profinet、Profibus、以太网/IP、Modbus等）；6.规范标准：了解起重机设计规范（GB/T 3811）及电气装置安装施工规范（GB 50168/50169），具备安规意识。软性素质：1.问题分析与解决能力：具备较强的现场技术问题诊断与解决能力；2.沟通协作能力：良好的跨部门沟通与协调能力；3.抗压能力：能适应项目制工作节奏，阶段性参与现场调试及短期出差；4.学习创新意识：对智能化、自动化控制技术保持学习热情；5.团队精神：具备良好的团队合作意识。"
}

resp = requests.put(f"{API_BASE}/api/jobs/9", json=update_data, headers=headers)
print("更新结果:", json.dumps(resp.json(), ensure_ascii=False, indent=2))

# 验证更新
verify_resp = requests.get(f"{API_BASE}/api/jobs/9", headers=headers)
job = verify_resp.json()["data"]["job"]
print("\n验证结果:")
print(f"岗位ID: {job['id']}")
print(f"标题: {job['title']}")
print(f"部门: {job['department']}")
print(f"状态: {job['status']}")
print(f"薪资: {job['salary_min']}-{job['salary_max']}")