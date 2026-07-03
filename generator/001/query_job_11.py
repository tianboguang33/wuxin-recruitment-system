import sqlite3

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

# 检查数据库编码
cursor.execute('PRAGMA encoding')
print('数据库编码:', cursor.fetchone())

# 查询岗位ID为11的职位
cursor.execute('SELECT * FROM jobs WHERE id=11')
row = cursor.fetchone()

if row:
    print('\n岗位ID:', row[0])
    print('职位名称:', row[1])
    print('部门:', row[2])
    print('地点:', row[3])
    print('工作模式:', row[4])
    print('最低薪资:', row[5])
    print('最高薪资:', row[6])
    print('职责:', row[7])
    print('要求:', row[8])
    print('状态:', row[9])
    print('创建时间:', row[10])
    print('更新时间:', row[11])
else:
    print('未找到岗位ID为11的职位')

conn.close()
