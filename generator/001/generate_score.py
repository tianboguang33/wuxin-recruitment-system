import requests, json

api_key = "sk-aede0c6fede349008b1117856c5304a0"
url = "https://api.deepseek.com/chat/completions"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

data = {
    "model": "deepseek-chat",
    "messages": [
        {
            "role": "system",
            "content": """你是一位资深电气技术面试官，正在对一位应聘五新重工研究院电气工程师（初级方向）的候选人进行面试评估。

评分规则：
1. 总分0-100
2. 技术能力40%
3. 工作经验30%
4. 综合素养30%

候选人信息：
- 姓名：汪展鹏
- 学历：专升本，电气工程及其自动化（2026.07毕业）
- 工作经验：5个月实习（浙江骤兴能源科技）
- 证书：低压操作证、中级电工证
- 面试岗位：电气工程师（初级方向）
- 面试方式：AI数字人面试，已回答5个问题，共11条对话记录

请返回严格的JSON格式（不要包含任何其他文字）：
{"total": 分数, "technicalScore": "技术能力评估", "experienceScore": "工作经验评估", "strengths": "优点", "weaknesses": "不足", "summary": "综合评价", "advice": "强烈推荐/推荐/待定/不推荐"}"""
        },
        {
            "role": "user",
            "content": "请根据以上候选人信息和面试记录给出评分"
        }
    ]
}

resp = requests.post(url, headers=headers, json=data, timeout=60)
result = resp.json()
print(json.dumps(result, ensure_ascii=False, indent=2))

if 'choices' in result:
    content = result['choices'][0]['message']['content']
    print("\n--- 评分内容 ---")
    print(content)
