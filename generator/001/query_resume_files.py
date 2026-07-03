import sqlite3

conn = sqlite3.connect(r'c:\Users\36368\Desktop\trae-agent\generator\001\wuxin.db')
cursor = conn.cursor()

# 查询所有简历文件
cursor.execute("SELECT * FROM resume_files")
results = cursor.fetchall()

with open(r'c:\Users\36368\Desktop\trae-agent\generator\001\all_resume_files.txt', 'w', encoding='utf-8') as f:
    f.write("=== 所有简历文件记录 ===\n\n")
    for row in results:
        f.write(f"ID: {row[0]}\n")
        f.write(f"application_id: {row[1]}\n")
        f.write(f"original_name: {row[2]}\n")
        f.write(f"file_name: {row[3]}\n")
        f.write(f"file_size: {row[4]}\n")
        f.write(f"mime_type: {row[5]}\n")
        f.write(f"created_at: {row[6]}\n")
        f.write("-" * 30 + "\n")

# 查询电气工程师岗位（ID=9）的投递记录
cursor.execute('''
    SELECT a.*, rf.file_name as resume_file_name, rf.original_name as resume_original_name
    FROM applications a
    LEFT JOIN resume_files rf ON a.resume_file_id = rf.id
    WHERE a.job_id = 9
''')
applications = cursor.fetchall()

with open(r'c:\Users\36368\Desktop\trae-agent\generator\001\electric_engineer_applications.txt', 'w', encoding='utf-8') as f:
    f.write("=== 电气工程师岗位（ID=9）投递记录 ===\n\n")
    for row in applications:
        f.write(f"ID: {row[0]}\n")
        f.write(f"job_id: {row[1]}\n")
        f.write(f"name: {row[2]}\n")
        f.write(f"phone: {row[3]}\n")
        f.write(f"email: {row[4]}\n")
        f.write(f"education: {row[5]}\n")
        f.write(f"experience: {row[6]}\n")
        f.write(f"cover_letter: {row[7]}\n")
        f.write(f"resume_file_id: {row[8]}\n")
        f.write(f"status: {row[9]}\n")
        f.write(f"created_at: {row[10]}\n")
        f.write(f"updated_at: {row[11]}\n")
        f.write(f"resume_file_name: {row[12]}\n")
        f.write(f"resume_original_name: {row[13]}\n")
        f.write("-" * 30 + "\n")

conn.close()
print("查询完成，结果已写入文件")
