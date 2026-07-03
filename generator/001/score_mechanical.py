import requests, json

api_key = "sk-aede0c6fede349008b1117856c5304a0"
url = "https://api.deepseek.com/chat/completions"
headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

candidates = [
    {
        "name": "张明远",
        "score": 80,
        "info": "哈尔滨工业大学（985）硕士，11年经验，3年重工集团工程机械设计经验，SolidWorks高级认证，带8人团队",
        "advice": "推荐"
    },
    {
        "name": "李思远",
        "score": 67,
        "info": "西安交通大学（985）硕士，9年经验，机器人精密传动领域，ANSYS有限元分析经验",
        "advice": "待定"
    }
]

for c in candidates:
    prompt = f"""你是一位资深机械结构面试官，正在对一位应聘五新重工研究院机械工程师（起重机结构设计方向）的候选人进行面试评估。

候选人信息：
- 姓名：{c['name']}
- 简历匹配度：{c['score']}分
- 详情：{c['info']}

面试记录：AI数字人面试，已完成11条对话，回答5个问题。
岗位要求：港口起重机金属结构设计，3年以上经验，SolidWorks/AutoCAD，GB/T 3811规范。

请返回严格的JSON格式（不要包含其他文字）：
{{"total": 分数(0-100), "technicalScore": "技术能力评估", "experienceScore": "经验评估", "strengths": "优点2-3点", "weaknesses": "不足2-3点", "summary": "综合评价", "advice": "强烈推荐/推荐/待定/不推荐"}}"""

    resp = requests.post(url, headers=headers, json={
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "你是一位资深机械结构面试官，严格返回JSON格式。"},
            {"role": "user", "content": prompt}
        ]
    }, timeout=30)
    
    result = resp.json()
    content = result['choices'][0]['message']['content']
    print(f"=== {c['name']} ===")
    print(content)
    print()
