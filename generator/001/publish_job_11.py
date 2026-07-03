import requests
import json

API_BASE = "http://localhost:3001"

# 1. 登录系统
print("步骤1：登录系统...")
login_resp = requests.post(f"{API_BASE}/api/auth/login", json={
    "username": "admin",
    "password": "admin123"
})
if login_resp.status_code == 200:
    token = login_resp.json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("登录成功！")
else:
    print(f"登录失败: {login_resp.text}")
    exit(1)

# 2. 更新岗位ID为11的职位信息（修复乱码）
print("\n步骤2：更新岗位ID为11的机械工程师职位信息...")
update_data = {
    "title": "机械工程师（港口起重机方向）",
    "department": "机械所",
    "location": "长沙·浏阳经济技术开发区",
    "category": "技术研发",
    "salaryMin": 12000,
    "salaryMax": 20000,
    "description": "负责港口起重机（门座机、集装箱门机、岸桥等）机械系统的研发设计与技术落地工作，主导机械方案设计、结构分析、零部件选型及现场技术支持，作为技术研发部核心成员参与公司智能化、自动化港口装备的升级迭代，推动产品从设计到交付的全流程机械技术保障。主要职责：1.机械设计：负责起重机整机及关键部件的机械设计，包括结构方案、传动系统、液压系统等；2.结构分析：运用CAE工具进行结构强度、刚度分析，优化设计方案；3.图纸绘制：使用CAD/SolidWorks/ProE等软件进行三维建模和工程图纸绘制；4.BOM编制：负责产品BOM表的编制与维护，确保物料清单准确；5.技术支持：参与产品试制、装配、调试，提供现场技术支持。",
    "requirements": "硬性条件：1.学历专业：本科及以上学历，机械设计制造及其自动化、机械工程、机电一体化等相关专业；2.工作经验：3年以上机械设计或相关工作经验，有港口机械、重型装备、起重机械行业经验者优先；3.设计软件：熟练使用CAD、SolidWorks、ProE等设计软件；熟悉CAE分析工具者优先；4.专业知识：熟悉机械设计规范、材料力学、传动原理等专业知识。软性素质：1.问题分析：具备较强的现场技术问题诊断与解决能力；2.沟通协作：良好的跨部门沟通与协调能力；3.抗压能力：能适应项目制工作节奏，阶段性参与现场调试及短期出差；4.学习创新：对智能化、自动化技术保持学习热情；5.团队精神：具备良好的团队合作意识。",
    "urgency": "normal"
}

update_resp = requests.put(f"{API_BASE}/api/jobs/11", json=update_data, headers=headers)
if update_resp.status_code == 200:
    print("职位信息更新成功！")
else:
    print(f"更新失败: {update_resp.text}")
    exit(1)

# 3. 发布岗位（更新发布状态）
print("\n步骤3：发布岗位到五新重工招聘门户...")
publish_data = {
    "published": "published",
    "published_at": "2026-07-03 00:00:00"
}

publish_resp = requests.put(f"{API_BASE}/api/jobs/11", json=publish_data, headers=headers)
if publish_resp.status_code == 200:
    print("岗位发布成功！")
else:
    print(f"发布失败: {publish_resp.text}")
    exit(1)

# 4. 验证发布结果
print("\n步骤4：验证发布结果...")
verify_resp = requests.get(f"{API_BASE}/api/jobs/11", headers=headers)
if verify_resp.status_code == 200:
    job = verify_resp.json()["data"]["job"]
    print("\n发布验证结果:")
    print(f"岗位ID: {job['id']}")
    print(f"职位名称: {job['title']}")
    print(f"部门: {job['department']}")
    print(f"地点: {job['location']}")
    print(f"薪资范围: {job['salary_min']}-{job['salary_max']}")
    print(f"发布状态: {job['published']}")
    print(f"状态: {job['status']}")
    print("\n岗位已成功发布到五新重工招聘门户！")
else:
    print(f"验证失败: {verify_resp.text}")
