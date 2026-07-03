import sys, traceback
sys.path.insert(0, r'C:\Users\36368\Desktop\trae-agent\table\hr-form-service')

# Test models directly first
from models import candidate_model
result = candidate_model.create('WZP_20260626', '汪展鹏', 'wzp12345677@126.com', '电气工程师（初级方向）', ['2026-06-27 09:00'])
print('Create result:', result)
print('Get result:', candidate_model.get_by_id('WZP_20260626'))

# Test update
sub = candidate_model.update_submission('WZP_20260626', '2026-06-27 09:00', '18673398998', '面议', '期待面试')
print('Submit result:', sub)

import json
print('File content:', open(candidate_model._get_path() if hasattr(candidate_model, '_get_path') else r'C:\Users\36368\Desktop\trae-agent\table\hr-form-service\candidates.json').read())
