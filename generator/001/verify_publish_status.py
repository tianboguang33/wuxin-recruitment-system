import sqlite3

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

# 查询岗位ID为11的发布状态
cursor.execute("SELECT id, title, department, location, salary_min, salary_max, published, published_at, status FROM jobs WHERE id=11")
row = cursor.fetchone()

if row:
    print("岗位ID:", row[0])
    print("职位名称:", row[1])
    print("部门:", row[2])
    print("地点:", row[3])
    print("薪资范围:", row[4], "-", row[5])
    print("发布状态:", row[6])
    print("发布时间:", row[7])
    print("状态:", row[8])
    
    if row[6] == "published":
        print("\n✓ 岗位已成功发布到五新重工招聘门户！")
    else:
        print("\n✗ 岗位尚未发布，发布状态为:", row[6])
else:
    print("未找到岗位ID为11的职位")

conn.close()
