import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'hr-form-integration/flask-service'))

from models import candidate_model
from datetime import datetime

candidate_id = "cand_wzp_003_new"

# 查询当前状态
candidate = candidate_model.get_by_id(candidate_id)
print(f"当前候选人信息:")
print(f"  ID: {candidate.get('id')}")
print(f"  姓名: {candidate.get('name')}")
print(f"  状态: {candidate.get('status')}")
print(f"  面试时间: {candidate.get('selected_time')}")
print(f"  邮箱: {candidate.get('email')}")

# 直接更新状态
if candidate and candidate['status'] == 'room_created':
    candidate['status'] = 'confirmed'
    candidate['meeting_link'] = 'https://interview.example.com/join/room_ed56ae03524a87c8'
    candidate['updated_at'] = datetime.now().isoformat()
    
    print("\n状态已更新为: confirmed")
    print(f"更新时间: {candidate['updated_at']}")
    
    # 验证更新
    updated = candidate_model.get_by_id(candidate_id)
    print(f"\n验证更新后状态: {updated.get('status')}")
else:
    print("\n无法更新状态，候选人不存在或状态不对")