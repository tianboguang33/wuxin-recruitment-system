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

### 李思远

**基本信息：**
- 性别：男 | 1992年3月
- 电话：139-0002-3456
- 邮箱：lisiyuan@email.com

**教育背景：**
- 西安交通大学 | 机械工程 | 硕士 | 毕业时间：2017年7月

**个人简介：**
9年机械研发经验，专注于精密传动与机器人结构设计。具备从概念设计到量产的完整项目经验。熟悉DFM/DFA设计理念，成功交付6款量产产品。

**工作经验：**
1. 2020.03 - 至今 某机器人科技有限公司 | 机械研发工程师
   - 负责协作机器人关节模组结构设计，实现国产化替代，成本降低40%
   - 设计谐波减速器与电机的集成方案，通过5000小时寿命测试
   - 参与编写企业标准2项，申请发明专利4项

2. 2017.07 - 2020.02 某精密制造有限公司 | 机械工程师
   - 负责精密减速器设计，产品精度达到国际同类水平
   - 完成30+款非标工装夹具设计，支持产线自动化改造
   - 使用ANSYS进行结构优化，减重15%的同时保持刚度

**项目经验：**
- 轻型协作机器人关节模组 (2021.01-2022.06)：负责关节整体结构设计，包括谐波减速器集成、双编码器安装、制动器选型等
- 高精度RV减速器开发 (2019.03-2020.09)：参与RV减速器结构设计与优化

**专业技能：**
- 专业软件：Creo/ProE, SolidWorks, ANSYS Workbench, Adams
- 专业能力：精密传动设计、机器人结构设计、DFM/DFA、公差分析
- 编程能力：Python（数据分析）、MATLAB（仿真计算）
- 语言能力：英语CET-6

**证书与资质：**
- 中级机械工程师职称
- 六西格玛绿带"""

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
