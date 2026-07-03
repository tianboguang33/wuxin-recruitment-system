import sqlite3

conn = sqlite3.connect(r'c:\Users\36368\Desktop\trae-agent\generator\001\wuxin.db')
cursor = conn.cursor()

# 查询ID为3的简历文件
cursor.execute("SELECT * FROM resume_files WHERE id = 3")
result = cursor.fetchone()

# 将结果写入文件
with open(r'c:\Users\36368\Desktop\trae-agent\generator\001\resume_file_info.txt', 'w', encoding='utf-8') as f:
    f.write(f"简历文件ID=3:\n")
    if result:
        f.write(f"id: {result[0]}\n")
        f.write(f"application_id: {result[1]}\n")
        f.write(f"original_name: {result[2]}\n")
        f.write(f"file_name: {result[3]}\n")
        f.write(f"file_size: {result[4]}\n")
        f.write(f"mime_type: {result[5]}\n")
        f.write(f"created_at: {result[6]}\n")
    else:
        f.write("未找到该简历文件\n")

conn.close()
print("信息已写入文件")
