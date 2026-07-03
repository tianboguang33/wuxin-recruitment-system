import json, sqlite3, os

db_path = r'C:\Users\36368\Desktop\trae-agent\table\hr-form-service\candidates.db'

# Remove old db
try:
    os.remove(db_path)
except:
    pass

# Create with DELETE journal mode
conn = sqlite3.connect(db_path)
conn.execute('PRAGMA journal_mode=DELETE')

conn.execute('''CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
    phone TEXT, job_title TEXT, time_slots TEXT, selected_time TEXT,
    expected_salary TEXT DEFAULT '', note TEXT, meeting_link TEXT,
    status TEXT DEFAULT 'pending', created_at TEXT, updated_at TEXT, submitted_at TEXT
)''')

slots = json.dumps([
    '2026-06-27 09:00', '2026-06-27 10:00', '2026-06-27 14:00', '2026-06-27 15:00',
    '2026-06-28 09:00', '2026-06-28 10:00', '2026-06-28 14:00', '2026-06-28 15:00'
])

conn.execute(
    '''INSERT OR REPLACE INTO candidates
       (id, name, email, phone, job_title, time_slots, expected_salary, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
    ('WZP_20260626', '汪展鹏', 'wzp12345677@126.com', '',
     '电气工程师（初级方向）', slots, '面议', 'pending',
     '2026-06-26T14:00:00', '2026-06-26T14:00:00')
)

conn.commit()
conn.close()
print('Database initialized successfully')
