import pymysql, json, uuid as uuid_mod
from datetime import datetime

conn = pymysql.connect(host='localhost', port=3306, user='root', password='123456', database='recruitment_platform', charset='utf8mb4')
cursor = conn.cursor()

# Get jobs from jobs table
cursor.execute('SELECT id, job_id, job_name, department, headcount, salary, location, responsibilities, requirements FROM jobs WHERE id IN (16, 17)')
jobs = cursor.fetchall()

for j in jobs:
    jid, job_id_db, job_name, dept, headcount, salary, location, resp, reqs = j
    
    # Delete any existing published record
    cursor.execute('DELETE FROM published_jobs WHERE job_id = %s', (jid,))
    
    publish_id = str(uuid_mod.uuid4())[:8]
    desc = '【岗位职责】\n' + (resp or '') + '\n\n【任职要求】\n' + (reqs or '') + '\n\n【薪资待遇】\n' + (salary or '') + '\n\n【工作地点】\n' + (location or '')
    reqs_json = json.dumps([reqs], ensure_ascii=False)
    channels_json = json.dumps(['website'], ensure_ascii=False)
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    cursor.execute('''
        INSERT INTO published_jobs 
        (publish_id, job_id, job_name, department, headcount, salary, location, description, requirements, channels, publish_status, published_at, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ''', (publish_id, jid, job_name, dept, headcount, salary, location, desc, reqs_json, channels_json, 'published', now, now, now))
    
    print('Published: {} ({}) → publish_id={}'.format(job_name, dept, publish_id))

conn.commit()
cursor.close()
conn.close()
print('\nDone!')
