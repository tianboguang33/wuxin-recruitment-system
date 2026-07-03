import requests

r = requests.post('https://api.deepseek.com/chat/completions', headers={
    'Authorization': 'Bearer sk-aede0c6fede349008b1117856c5304a0',
    'Content-Type': 'application/json'
}, json={
    'model': 'deepseek-chat',
    'messages': [
        {'role': 'system', 'content': '你是一个面试评分系统。只输出JSON，不输出任何其他文字。'},
        {'role': 'user', 'content': '请对以下面试进行评分，仅返回JSON格式。\n\n岗位：机械工程师\n对话记录：面试官问了一个问题，候选人没有回答。\n\n评分JSON格式：\n{"total": 0-100, "technicalScore": "...", "strengths": "...", "weaknesses": "...", "summary": "...", "advice": "..."}'}
    ],
    'temperature': 0.1,
    'max_tokens': 1024
}, timeout=30)
print(r.json()['choices'][0]['message']['content'])
