import sqlite3
import datetime

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

# 更新岗位信息
update_data = {
    "title": "国际营销经理",
    "department": "国际营销部",
    "location": "长沙浏阳",
    "category": "市场",
    "salary_min": 8000,
    "salary_max": 12000,
    "description": "负责五新重工国际市场的全面拓展与营销管理工作，带领团队制定并执行有效的国际营销策略，推动公司产品在全球市场的销售增长，维护核心客户关系，确保年度销售目标的达成。职责：1.制定并执行公司国际市场拓展战略与营销计划；2.带领销售团队完成年度国际销售目标；3.负责全球核心客户关系的建立与维护；4.主导重大国际项目的商务谈判；5.制定区域市场开发计划。",
    "requirements": "本科及以上学历，5年以上工程机械或重型装备行业国际营销经验，英语精通，熟悉国际贸易流程，有团队管理经验。",
    "status": "active",
    "updated_at": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
}

cursor.execute("""
    UPDATE jobs 
    SET title=?, department=?, location=?, category=?, salary_min=?, salary_max=?, 
        description=?, requirements=?, status=?, updated_at=?
    WHERE id=10
""", (
    update_data["title"],
    update_data["department"],
    update_data["location"],
    update_data["category"],
    update_data["salary_min"],
    update_data["salary_max"],
    update_data["description"],
    update_data["requirements"],
    update_data["status"],
    update_data["updated_at"]
))

conn.commit()

# 验证更新
cursor.execute("SELECT * FROM jobs WHERE id=10")
job = cursor.fetchone()

cursor.execute("PRAGMA table_info(jobs)")
cols = cursor.fetchall()

print("=== 更新结果 ===")
print(f"受影响行数: {cursor.rowcount}")
print("\n岗位ID为10的更新后信息:")
for i, col in enumerate(cols):
    print(f"  {col[1]}: {job[i]}")

conn.close()
