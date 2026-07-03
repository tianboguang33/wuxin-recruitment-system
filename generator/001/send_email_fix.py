import sqlite3
import requests
import json
from datetime import datetime

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

application_id = 6
current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

print("=== 检查outbox表当前状态 ===")
cursor.execute("SELECT * FROM outbox WHERE application_id = 6")
outbox = cursor.fetchone()
if outbox:
    print(f"  已存在记录: ID={outbox[0]}, event_type={outbox[2]}, status={outbox[3]}")
    cursor.execute("UPDATE outbox SET status = 'pending', sent_at = NULL WHERE application_id = ?", (application_id,))
    print("  ✓ 已重置为pending状态")
else:
    print("  无记录")

print("\n=== 生成面试邀请邮件 ===")
api_key = "sk-aede0c6fede349008b1117856c5304a0"
url = "https://api.deepseek.com/chat/completions"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

system_prompt = """你是五新重工HR部门的邮件撰写助手，请为张家伟撰写一封面试邀请邮件。

公司信息：五新重工
岗位：电气工程师（港口起重机方向）
地点：长沙·浏阳经济技术开发区
薪资：15k-25k

邮件要求：
1. 专业、友好、热情
2. 说明岗位匹配度高（智能科学与技术专业、STM32开发经验、嵌入式系统开发）
3. 邀请参加AI面试
4. 提供时间选择链接（使用Cloudflare Tunnel地址）
5. 包含公司介绍和发展前景
6. 中英文双语

请返回纯邮件文本，包含主题和正文。"""

user_prompt = "候选人信息：姓名-张家伟，邮箱-1920166300@qq.com，电话-18673398995"

data = {
    "model": "deepseek-chat",
    "messages": [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
}

resp = requests.post(url, headers=headers, json=data, timeout=60)
result = resp.json()

if 'choices' in result:
    email_content = result['choices'][0]['message']['content']
    print("  ✓ 邮件内容已生成")
    
    print("\n" + "="*60)
    print(email_content)
    print("="*60 + "\n")
    
    cursor.execute("UPDATE outbox SET status = 'pending', email = ?, created_at = ? WHERE application_id = ?", 
                   ('1920166300@qq.com', current_time, application_id))
    
    print("  ✓ outbox记录已更新")
else:
    print(f"  ✗ 邮件生成失败: {result}")

conn.commit()
conn.close()

print("\n=== 邮件内容已生成，请调用MCP邮件工具发送 ===")