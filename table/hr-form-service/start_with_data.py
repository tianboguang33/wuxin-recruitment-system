import sys
sys.path.insert(0, r'C:\Users\36368\Desktop\trae-agent\table\hr-form-service')
from models import candidate_model
from app import app

# 创建候选人
r1 = candidate_model.create('ZMY_20260626', '张明远', '1920166300@qq.com',
    '机械工程师（起重机结构设计方向）', [], '面议')
print('张明远:', '成功' if r1[0] else '已存在')

r2 = candidate_model.create('LSY_20260626', '李思远', '1920166300@qq.com',
    '机械工程师（起重机结构设计方向）', [], '面议')
print('李思远:', '成功' if r2[0] else '已存在')

# 验证
for cid in ['ZMY_20260626', 'LSY_20260626']:
    c = candidate_model.get_by_id(cid)
    print(c['name'], '-', c['job_title'])

app.run(host='0.0.0.0', port=5000, debug=False)
