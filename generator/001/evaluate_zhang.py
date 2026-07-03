import requests, json

api_key = "sk-aede0c6fede349008b1117856c5304a0"
url = "https://api.deepseek.com/chat/completions"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

system_prompt = """你是一位资深HR数据分析专家，专精于简历解析与岗位匹配评估。

请对以下候选人简历与岗位JD进行匹配分析，给出客观专业的评估。

## 岗位JD：机械工程师（起重机结构设计方向）
- 部门：技术研发部
- 学历要求：本科及以上（机械设计制造及其自动化、机械工程、力学等相关专业）
- 经验要求：3年以上机械结构设计经验
- 技能要求：熟练掌握SolidWorks、AutoCAD等设计软件
- 专业要求：熟悉钢结构设计规范（GB/T 3811、GB 50017等）
- 加分项：有港口机械、起重机械行业经验者优先；具备有限元分析能力者优先
- 其他要求：了解焊接工艺及钢结构制造流程

## 评分规则
1. 总分0-100分
2. 学历匹配度 15%
3. 工作经验匹配度 35%
4. 技能匹配度 30%
5. 行业相关性 20%

请返回严格的JSON格式（不要包含任何其他文字）：
{
  "candidateName": "姓名",
  "matchScore": 分数,
  "dimensionScores": {
    "education": {"score": 分数, "analysis": "评估说明"},
    "experience": {"score": 分数, "analysis": "评估说明"},
    "skills": {"score": 分数, "analysis": "评估说明"},
    "industryRelevance": {"score": 分数, "analysis": "评估说明"}
  },
  "matchingAdvantages": ["优势1", "优势2", "优势3", "优势4", "优势5"],
  "matchingRisks": ["风险1", "风险2", "风险3"],
  "overallAssessment": "综合评价",
  "recommendation": "强烈推荐/推荐/待定/不推荐"
}"""

user_prompt = """## 候选人信息

### 张明远

**基本信息：**
- 性别：男 | 1990年8月
- 电话：138-0001-2345
- 邮箱：zhangmy@email.com

**教育背景：**
- 哈尔滨工业大学 | 机械设计制造及其自动化 | 硕士 | 毕业时间：2015年7月

**个人简介：**
10年机械设计经验，主导过多个大型非标自动化设备项目。精通SolidWorks、ANSYS等设计仿真软件，具备丰富的项目管理与团队协作经验。曾获公司年度技术创新奖2次。

**工作经验：**
1. 2018.06 - 至今 某智能制造科技有限公司 | 高级机械工程师
   - 主导新能源汽车电池PACK组装线设计，项目金额3000万，按期交付率100%
   - 负责核心机械结构设计与仿真分析，优化后设备效率提升15%
   - 带领8人设计团队，制定部门设计规范与标准化流程
   - 参与发明专利3项，实用新型专利5项

2. 2015.07 - 2018.05 某重工集团 | 机械工程师
   - 负责工程机械液压系统设计，参与挖掘机、装载机等产品开发
   - 完成30+套液压系统的计算与选型工作
   - 编写技术文档和设计规范20余份

**项目经验：**
- 新能源汽车电池模组自动组装线 (2021.03-2022.08)：负责整线方案设计与核心工站机械结构设计，采用模块化设计理念
- 锂电池极片高速裁切机 (2019.06-2020.12)：主导高速裁切机结构设计与动力学仿真

**专业技能：**
- 专业软件：SolidWorks（高级）, AutoCAD, ANSYS, ADAMS, MATLAB
- 专业能力：非标自动化设计、有限元分析、动力学仿真、液压系统设计
- 标准规范：精通机械制图国标（GB），了解ISO、DIN标准
- 语言能力：英语CET-6

**证书与资质：**
- 高级机械工程师职称
- PMP项目管理认证
- SolidWorks CSWP认证"""

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
    content = result['choices'][0]['message']['content']
    # 尝试解析JSON
    try:
        parsed = json.loads(content)
        print(json.dumps(parsed, ensure_ascii=False, indent=2))
    except:
        print(content)
else:
    print(json.dumps(result, ensure_ascii=False, indent=2))
