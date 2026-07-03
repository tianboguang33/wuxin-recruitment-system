import requests, json

api_key = "sk-aede0c6fede349008b1117856c5304a0"
url = "https://api.deepseek.com/chat/completions"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

system_prompt = """你是一位资深HR数据分析专家，专精于简历解析与岗位匹配评估。

请对以下候选人简历与岗位JD进行匹配分析，给出客观专业的评估。

## 岗位JD：电气工程师
- 部门：电气所
- 学历要求：本科及以上（自动化、电气工程、计算机、智能科学与技术等相关专业）
- 经验要求：应届毕业生或1-3年工作经验
- 技能要求：熟练掌握C语言编程，熟悉STM32开发平台，了解Linux开发环境
- 专业要求：熟悉TCP/IP协议、Socket编程、UART/I2C/SPI/CAN等通信协议
- 加分项：有嵌入式系统开发经验者优先；具备英文技术文档读写能力者优先；有数电模电基础者优先
- 其他要求：能看懂电气原理图，具备问题分析与解决能力

## 评分规则
1. 总分0-100分
2. 学历匹配度 15%
3. 工作经验匹配度 25%
4. 技能匹配度 30%
5. 项目经验匹配度 15%
6. 综合评估 15%

请返回严格的JSON格式（不要包含任何其他文字）：
{
  "candidateName": "姓名",
  "matchScore": 分数,
  "dimensionScores": {
    "education": {"score": 分数, "analysis": "评估说明"},
    "experience": {"score": 分数, "analysis": "评估说明"},
    "skills": {"score": 分数, "analysis": "评估说明"},
    "projectExperience": {"score": 分数, "analysis": "评估说明"},
    "overall": {"score": 分数, "analysis": "评估说明"}
  },
  "matchingAdvantages": ["优势1", "优势2", "优势3", "优势4", "优势5"],
  "matchingRisks": ["风险1", "风险2", "风险3"],
  "overallAssessment": "综合评价",
  "recommendation": "强烈推荐/推荐/待定/不推荐"
}"""

user_prompt = """## 候选人信息

### 张家伟

**基本信息：**
- 性别：男 | 出生年月：2003-04
- 籍贯：湖南株洲
- 电话：18673398995
- 邮箱：3636855416@qq.com

**教育背景：**
- 湖南工商大学 | 智能科学与技术 | 本科 | 毕业时间：2025年7月
- 专业成绩：前20%
- 主修课程：数据结构、面向对象程序设计、C语言程序竞赛、计算机组成原理、Linux网络操作系统、嵌入式系统设计、模电、数电、单片机应用开发
- 辅修课程：机器视觉、机器学习、智能机器人技术、自动控制、多媒体技术

**工作经验：**
- 劲拓自动化设备股份有限公司 | 海外技术支持 | 2025-05至2025-08
  - 为欧洲、东南亚等地区及国内客户提供远程/现场技术支持
  - 解决设备安装、调试及故障问题
  - 协助编写英文技术文档
  - 协调研发团队与海外客户需求
  - 推动技术改进方案落地

**专业技能：**
- Linux开发环境、常用命令及shell编程、Makefile
- C语言编程、常用算法与数据结构
- 多进程多线程原理及Linux开发经验
- TCP/IP协议族及Linux Socket编程
- SQL语言、SQLite数据库应用开发
- STM32/Zigbee开发经验
- UART、I2C、SPI、CAN等协议及调试
- GPIO输入输出、中断配置、定时器配置、PWM信号生成
- 数电模电基础，能看懂基本原理图
- Keil开发环境
- 英语CET-4，能够阅读基本英文资料

**项目经验：**
1. 智慧校园安防系统 (2023-02 ~ 2023-06)
   - 项目组成员
   - 使用STM32、Zigbee(CC2530)、MQTT服务器EMQX
   - 负责STM32、Zigbee代码实现
   - 实现ADC转换、传感器数据采集、环境监测
   - 实现Zigbee组网与数据传输
   - 实现STM32与MQTT服务器通信
   - 实现手机APP远程控制

2. 家居助手 (2023-11 ~ 2024-01)
   - 项目负责人
   - 使用STM32F407、OV5640摄像头、RC522 RFID模块
   - 实现RFID门禁控制、蓝牙通信、LCD显示
   - 实现风扇控制、继电器控制等智能家居功能

**获奖经历：**
- 电商图文检索挑战赛三等奖
- 湖南省机器人大赛银牌
- Destination Imagination (DI)头脑创新思维大赛湖南省特等奖、全国二等奖"""

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
    try:
        parsed = json.loads(content)
        print(json.dumps(parsed, ensure_ascii=False, indent=2))
    except:
        print(content)
else:
    print(json.dumps(result, ensure_ascii=False, indent=2))