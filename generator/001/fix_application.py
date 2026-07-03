import sqlite3
import requests
import json
from datetime import datetime

conn = sqlite3.connect('wuxin.db')
cursor = conn.cursor()

application_id = 6
current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

print("=== Step 1: 回退申请状态 ===")
cursor.execute("UPDATE applications SET status = 'invitation_sent', updated_at = ? WHERE id = ?", (current_time, application_id))
print(f"  ✓ applications表状态已更新为 invitation_sent")

print("\n=== Step 2: 记录状态回退历史 ===")
cursor.execute("""
    INSERT INTO state_history (entity_type, entity_id, from_state, to_state, event, operator, reason, created_at)
    VALUES ('application', ?, 'interview_scheduled', 'invitation_sent', 'rollback', 'admin', '修复流程异常：邮件未发送即创建房间', ?)
""", (application_id, current_time))
print(f"  ✓ state_history表已记录回退操作")

print("\n=== Step 3: 发送面试邀请邮件 ===")
try:
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
        
        print("\n=== Step 4: 发送邮件 ===")
        cursor.execute("""
            INSERT INTO outbox (application_id, event_type, status, email, created_at)
            VALUES (?, 'invitation', 'pending', ?, ?)
        """, (application_id, '1920166300@qq.com', current_time))
        
        import smtplib
        from email.mime.text import MIMEText
        
        msg = MIMEText(email_content, 'plain', 'utf-8')
        msg['Subject'] = '五新重工 - 电气工程师岗位面试邀请'
        msg['From'] = 'hr@wuxin.com'
        msg['To'] = '1920166300@qq.com'
        
        try:
            server = smtplib.SMTP('localhost', 25)
            server.send_message(msg)
            server.quit()
            cursor.execute("UPDATE outbox SET status = 'sent', sent_at = ? WHERE application_id = ? AND event_type = 'invitation'", (current_time, application_id))
            print("  ✓ 邮件已发送成功")
        except Exception as e:
            print(f"  ✗ 邮件发送失败（本地SMTP服务器未启动）: {e}")
            print("  - 已在outbox表中记录待发送状态")
    
    else:
        print(f"  ✗ 邮件生成失败: {result}")
        
except Exception as e:
    print(f"  ✗ 发送邮件时出错: {e}")

conn.commit()
conn.close()

print("\n=== 操作完成 ===")
print(f"  • 申请状态已回退到 invitation_sent")
print(f"  • 状态历史已记录")
print(f"  • 邮件发送状态已记录到outbox表")