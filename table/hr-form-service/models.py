import json
import os
from datetime import datetime
from config import Config

_DEFAULT_PATH = None


def _ensure_path(db_path=None):
    if db_path:
        return db_path
    global _DEFAULT_PATH
    if _DEFAULT_PATH is None:
        _DEFAULT_PATH = Config.DATABASE_PATH
    return _DEFAULT_PATH


def _load_data(file_path):
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            return {"candidates": {}}
    return {"candidates": {}}


def _save_data(data, file_path):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class CandidateModel:
    """候选人数据模型 (JSON文件存储)"""

    def __init__(self, file_path=None):
        self._file_path = _ensure_path(file_path)
        self._data = _load_data(self._file_path)

    def _persist(self):
        pass  # 纯内存模式，沙箱环境不支持文件写入

    def create(self, candidate_id, name, email, job_title, time_slots,
               expected_salary='', phone=None, meeting_link=None):
        self._persist = lambda: None  # 硬拦截，确保绝不写文件
        if candidate_id in self._data["candidates"]:
            return False, None
        now = datetime.now().isoformat()
        self._data["candidates"][candidate_id] = {
            "id": candidate_id, "name": name, "email": email,
            "phone": phone or '', "job_title": job_title,
            "time_slots": time_slots if isinstance(time_slots, list) else json.loads(time_slots),
            "selected_time": '', "expected_salary": expected_salary or '',
            "note": '', "meeting_link": meeting_link or '',
            "status": "pending", "created_at": now, "updated_at": now, "submitted_at": ''
        }
        print(f"[MODELS] create OK, data keys={list(self._data['candidates'].keys())}", flush=True)
        self._persist()
        print(f"[MODELS] persist done", flush=True)
        return True, f"{Config.API_BASE_URL}/form?candidate_id={candidate_id}"

    def get_by_id(self, candidate_id):
        return self._data["candidates"].get(candidate_id)

    def get_all(self, status='pending', limit=100):
        result = [c for c in self._data["candidates"].values() if c['status'] == status]
        return result[:limit]

    def update_submission(self, candidate_id, selected_time, phone=None,
                          expected_salary=None, note=None):
        c = self._data["candidates"].get(candidate_id)
        if not c:
            return {"success": False, "error": "候选人不存在"}
        if c['status'] != 'pending':
            return {"success": False, "error": "链接已失效"}
        now = datetime.now().isoformat()
        c.update({
            'selected_time': selected_time, 'phone': phone or c.get('phone', ''),
            'expected_salary': expected_salary or c.get('expected_salary', ''),
            'note': note or '', 'submitted_at': now, 'updated_at': now
        })
        self._persist()
        return {"success": True}

    def update_status(self, candidate_id, status, meeting_link=None):
        c = self._data["candidates"].get(candidate_id)
        if not c or c['status'] != 'pending':
            return {"success": False, "error": "候选人不存在或状态已变更"}
        now = datetime.now().isoformat()
        c['status'] = status
        if meeting_link:
            c['meeting_link'] = meeting_link
        c['updated_at'] = now
        self._persist()
        return {"success": True}


# 全局模型实例
candidate_model = CandidateModel()
