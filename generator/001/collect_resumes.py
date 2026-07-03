import sqlite3
import os
import json
import re
import shutil
from datetime import datetime

# 数据库路径
DB_PATH = r'c:\Users\36368\Desktop\trae-agent\generator\001\wuxin.db'

# 简历存储目录
RESUMES_DIR = r'c:\Users\36368\Desktop\trae-agent\web\resumes'
UPLOADS_DIR = r'c:\Users\36368\Desktop\trae-agent\web\uploads'
LOCAL_UPLOADS_DIR = r'c:\Users\36368\Desktop\trae-agent\generator\001\uploads'
QUALIFIED_DIR = r'c:\Users\36368\Desktop\trae-agent\generator\001\qualified_candidates'

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def get_job_info(job_id):
    """获取岗位信息"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, department, status FROM jobs WHERE id = ?', (job_id,))
    result = cursor.fetchone()
    conn.close()
    if result:
        return {
            'id': result[0],
            'title': result[1],
            'department': result[2],
            'status': result[3]
        }
    return None

def get_pending_applications(job_id):
    """获取指定岗位的待处理投递记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.*, j.title as job_title, rf.file_name as resume_file_name, rf.original_name as resume_original_name
        FROM applications a
        LEFT JOIN jobs j ON a.job_id = j.id
        LEFT JOIN resume_files rf ON a.resume_file_id = rf.id
        WHERE a.job_id = ? AND a.status = 'pending'
        ORDER BY a.created_at DESC
    ''', (job_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    applications = []
    for row in rows:
        applications.append({
            'id': row[0],
            'job_id': row[1],
            'name': row[2],
            'phone': row[3],
            'email': row[4],
            'education': row[5],
            'experience': row[6],
            'cover_letter': row[7],
            'resume_file_id': row[8],
            'status': row[9],
            'created_at': row[10],
            'updated_at': row[11],
            'job_title': row[12],
            'resume_file_name': row[13],
            'resume_original_name': row[14]
        })
    
    return applications

def get_existing_resumes():
    """获取已有的简历记录（用于去重）"""
    existing = {}
    
    # 从qualified_candidates目录读取
    if os.path.exists(QUALIFIED_DIR):
        for filename in os.listdir(QUALIFIED_DIR):
            if filename.endswith('.json'):
                try:
                    with open(os.path.join(QUALIFIED_DIR, filename), 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if 'name' in data and 'email' in data:
                            key = f"{data['name']}_{data['email']}"
                            existing[key] = filename
                        elif 'passed_list' in data:
                            for candidate in data.get('passed_list', []):
                                if isinstance(candidate, dict) and 'name' in candidate:
                                    key = f"{candidate['name']}_unknown"
                                    existing[key] = filename
                except:
                    pass
    
    # 从resumes目录读取
    if os.path.exists(RESUMES_DIR):
        for filename in os.listdir(RESUMES_DIR):
            if filename.endswith('.json'):
                try:
                    with open(os.path.join(RESUMES_DIR, filename), 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if 'name' in data and 'email' in data:
                            key = f"{data['name']}_{data['email']}"
                            existing[key] = filename
                except:
                    pass
    
    return existing

def deduplicate_applications(applications):
    """对同一候选人的多次投递进行去重，保留最新的记录"""
    unique_apps = {}
    for app in applications:
        key = f"{app['name']}_{app['email']}"
        if key not in unique_apps:
            unique_apps[key] = app
        else:
            # 保留最新的投递记录（创建时间晚的）
            if app['created_at'] > unique_apps[key]['created_at']:
                unique_apps[key] = app
    return list(unique_apps.values())

def save_new_resume(application):
    """保存新简历文件"""
    # 创建简历数据
    resume_data = {
        'id': application['id'],
        'name': application['name'],
        'phone': application['phone'],
        'email': application['email'],
        'job_id': application['job_id'],
        'job_title': application['job_title'],
        'education': application['education'],
        'experience': application['experience'],
        'cover_letter': application['cover_letter'],
        'resume_file_id': application['resume_file_id'],
        'resume_file_name': application['resume_file_name'],
        'resume_original_name': application['resume_original_name'],
        'status': application['status'],
        'created_at': application['created_at'],
        'submitted_at': datetime.now().isoformat(),
        'source': '官方网站',
        'collection_time': datetime.now().isoformat()
    }
    
    # 生成文件名（加入投递ID确保唯一性）
    timestamp = datetime.now().strftime('%Y-%m-%dT%H-%M-%S')
    safe_name = re.sub(r'[<>:"/\\|?*]', '_', application['name']) if isinstance(application['name'], str) else 'unknown'
    safe_job = re.sub(r'[<>:"/\\|?*]', '_', application['job_title']) if application['job_title'] else 'unknown'
    file_name = f"{timestamp}_{safe_name}_{safe_job}_{application['id']}"
    
    # 保存JSON文件
    json_path = os.path.join(QUALIFIED_DIR, f"{file_name}.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(resume_data, f, ensure_ascii=False, indent=2)
    
    # 保存TXT文件
    text_content = f"""═══════════════════════════════════════
              简 历 信 息
═══════════════════════════════════════

【基本信息】
  姓    名：{application['name']}
  电    话：{application['phone']}
  邮    箱：{application['email']}
  投递岗位：{application['job_title']}
  投递时间：{application['created_at']}
  采集时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
  状    态：{application['status']}

【教育经历】
{application['education'] or '无'}

【工作经验】
{application['experience'] or '无'}

【求职信】
{application['cover_letter'] or '无'}

【简历文件】
  原始文件名：{application['resume_original_name'] or '无'}
  存储文件名：{application['resume_file_name'] or '无'}

───────────────────────────────────
  五新重工招聘系统 · 简历采集助手
═══════════════════════════════════════"""
    
    txt_path = os.path.join(QUALIFIED_DIR, f"{file_name}.txt")
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(text_content)
    
    # 如果有简历文件，复制到qualified_candidates目录
    resume_file_path = None
    if application['resume_file_name']:
        # 先检查web/uploads目录
        src_path = os.path.join(UPLOADS_DIR, application['resume_file_name'])
        if not os.path.exists(src_path):
            # 再检查本地uploads目录
            src_path = os.path.join(LOCAL_UPLOADS_DIR, application['resume_file_name'])
        
        if os.path.exists(src_path):
            dst_path = os.path.join(QUALIFIED_DIR, application['resume_file_name'])
            shutil.copy2(src_path, dst_path)
            resume_file_path = dst_path
            print(f"  [复制简历文件] {src_path} -> {dst_path}")
    
    return json_path, resume_file_path

def collect_resumes(job_id):
    """采集指定岗位的新简历"""
    print(f"=== 开始采集岗位ID: {job_id} 的新简历 ===")
    
    # 获取岗位信息
    job_info = get_job_info(job_id)
    if not job_info:
        print(f"错误：未找到岗位ID {job_id}")
        return []
    
    print(f"岗位信息：{job_info['title']}（{job_info['department']}）")
    print(f"岗位状态：{job_info['status']}")
    
    # 获取待处理投递记录
    applications = get_pending_applications(job_id)
    print(f"\n待处理投递记录数量：{len(applications)}")
    
    # 对同一候选人的多次投递进行去重
    unique_applications = deduplicate_applications(applications)
    if len(unique_applications) < len(applications):
        print(f"去重后投递记录数量：{len(unique_applications)}（移除了{len(applications)-len(unique_applications)}条重复记录）")
    
    # 获取已有简历（用于去重）
    existing_resumes = get_existing_resumes()
    print(f"已有简历记录数量：{len(existing_resumes)}")
    
    # 去重并保存新简历
    new_resume_paths = []
    for app in unique_applications:
        key = f"{app['name']}_{app['email']}"
        
        if key in existing_resumes:
            print(f"  [跳过] 重复简历：{app['name']} ({app['email']})")
            continue
        
        print(f"  [采集] 新简历：{app['name']} ({app['email']})")
        json_path, resume_file_path = save_new_resume(app)
        new_resume_paths.append(json_path)
        if resume_file_path:
            new_resume_paths.append(resume_file_path)
    
    print(f"\n=== 采集完成 ===")
    print(f"新采集简历数量：{len(new_resume_paths)}")
    
    return new_resume_paths

if __name__ == '__main__':
    # 用户要求岗位ID: 7，国际售后服务工程师
    job7_info = get_job_info(7)
    print(f"岗位ID 7信息：{job7_info}")
    
    # 采集岗位ID 7（国际售后服务工程师）的简历
    print("\n" + "="*50)
    print("开始采集岗位ID 7（国际售后服务工程师）的新简历")
    print("="*50)
    
    new_resumes = collect_resumes(7)
    
    # 输出结果
    print("\n" + "="*50)
    print("采集结果汇总")
    print("="*50)
    if new_resumes:
        print(f"成功采集 {len(new_resumes)} 份新简历：")
        for path in new_resumes:
            print(f"  - {path}")
    else:
        print("没有新的简历需要采集")
