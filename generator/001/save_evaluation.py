import requests, json
from datetime import datetime

API_BASE = "http://localhost:3001"

# ==================== 评估结果定义 ====================

evaluation_zhang = {
    "candidateName": "张明远",
    "applicationId": 3,
    "jobId": 5,
    "jobTitle": "机械工程师（起重机结构设计方向）",
    "evaluationDate": datetime.now().isoformat(),
    "parsedResume": {
        "name": "张明远",
        "phone": "18673398995",
        "email": "1920166300@qq.com",
        "education": [
            {
                "institution": "哈尔滨工业大学",
                "major": "机械设计制造及其自动化",
                "degree": "硕士",
                "graduationDate": "2015年7月"
            }
        ],
        "workExperience": [
            {
                "company": "某智能制造科技有限公司",
                "position": "高级机械工程师",
                "period": "2018.06 - 至今",
                "duration": "8年",
                "responsibilities": [
                    "主导新能源汽车电池PACK组装线设计，项目金额3000万",
                    "核心机械结构设计与仿真分析",
                    "带领8人设计团队，制定设计规范",
                    "参与发明专利3项，实用新型专利5项"
                ]
            },
            {
                "company": "某重工集团",
                "position": "机械工程师",
                "period": "2015.07 - 2018.05",
                "duration": "3年",
                "responsibilities": [
                    "工程机械液压系统设计（挖掘机、装载机）",
                    "30+套液压系统计算与选型",
                    "编写技术文档和设计规范20余份"
                ]
            }
        ],
        "skills": [
            "SolidWorks（高级认证CSWP）",
            "AutoCAD",
            "ANSYS（有限元分析）",
            "ADAMS（动力学仿真）",
            "MATLAB",
            "机械制图国标（GB）"
        ],
        "certifications": [
            "高级机械工程师职称",
            "PMP项目管理认证",
            "SolidWorks CSWP认证"
        ]
    },
    "matchScore": 68,
    "dimensionScores": {
        "education": {"score": 15, "maxScore": 15, "analysis": "哈尔滨工业大学机械设计制造及其自动化硕士，学历层次高于本科要求，专业完全对口，满分。"},
        "experience": {"score": 20, "maxScore": 35, "analysis": "10年机械设计经验远超3年要求，主要集中在非标自动化设备领域；仅有3年重工集团工程机械液压系统设计经验，部分相关但非核心结构设计。"},
        "skills": {"score": 20, "maxScore": 30, "analysis": "精通SolidWorks和AutoCAD，掌握ANSYS有限元分析和ADAMS动力学仿真，软件技能符合且超出要求；但不熟悉GB/T 3811、GB 50017等起重机专用钢结构设计规范，缺乏焊接工艺及钢结构制造流程的明确证据。"},
        "industryRelevance": {"score": 13, "maxScore": 20, "analysis": "具有重工集团工程机械经验，部分涉及结构相关领域，但主导项目多为新能源汽车非标自动化，与港口机械、起重机械行业直接关联度较低。"}
    },
    "matchingAdvantages": [
        "学历背景优秀，专业完全对口（哈工大机械硕士）",
        "10年机械设计经验丰富，远超经验年限要求",
        "精通SolidWorks（CSWP认证）和ANSYS有限元分析等核心软件",
        "具备PMP项目管理认证，有团队管理经验（带领8人团队）",
        "创新能力强，拥有多项专利和获奖经历"
    ],
    "matchingRisks": [
        "缺乏起重机或钢结构设计直接经验，行业相关性不足",
        "不熟悉GB/T 3811、GB 50017等起重机钢结构设计规范",
        "未体现焊接工艺及钢结构制造流程的相关知识",
        "项目经验集中在非标自动化领域，与岗位方向差异较大"
    ],
    "overallAssessment": "候选人学历背景优秀，机械设计通用能力扎实，但核心问题在于行业经验与岗位需求错位。候选人具备重工背景和有限元分析能力，具备向起重机结构设计转型的基础，但缺乏直接相关的设计规范和行业知识，需要较长适应期。建议可进入面试环节进一步评估其钢结构设计潜力和学习能力。",
    "recommendation": "待定（建议面试评估）"
}

evaluation_li = {
    "candidateName": "李思远",
    "applicationId": 4,
    "jobId": 5,
    "jobTitle": "机械工程师（起重机结构设计方向）",
    "evaluationDate": datetime.now().isoformat(),
    "parsedResume": {
        "name": "李思远",
        "phone": "18673398995",
        "email": "1920166300@qq.com",
        "education": [
            {
                "institution": "西安交通大学",
                "major": "机械工程",
                "degree": "硕士",
                "graduationDate": "2017年7月"
            }
        ],
        "workExperience": [
            {
                "company": "某机器人科技有限公司",
                "position": "机械研发工程师",
                "period": "2020.03 - 至今",
                "duration": "6年",
                "responsibilities": [
                    "协作机器人关节模组结构设计，国产化替代，成本降低40%",
                    "谐波减速器与电机集成方案设计",
                    "参与编写企业标准2项，申请发明专利4项"
                ]
            },
            {
                "company": "某精密制造有限公司",
                "position": "机械工程师",
                "period": "2017.07 - 2020.02",
                "duration": "3年",
                "responsibilities": [
                    "精密减速器设计，产品精度达国际同类水平",
                    "30+款非标工装夹具设计",
                    "使用ANSYS进行结构优化，减重15%"
                ]
            }
        ],
        "skills": [
            "Creo/ProE",
            "SolidWorks",
            "ANSYS Workbench（有限元分析）",
            "Adams（动力学仿真）",
            "Python",
            "MATLAB",
            "精密传动设计",
            "公差分析",
            "DFM/DFA"
        ],
        "certifications": [
            "中级机械工程师职称",
            "六西格玛绿带"
        ]
    },
    "matchScore": 48,
    "dimensionScores": {
        "education": {"score": 15, "maxScore": 15, "analysis": "西安交通大学机械工程硕士，学历匹配度很高，完全满足岗位本科及以上要求，且专业对口。"},
        "experience": {"score": 15, "maxScore": 35, "analysis": "候选人拥有9年机械研发经验，远超3年要求，但专注于精密传动与机器人结构设计，而非起重机或钢结构领域，经验方向与岗位需求存在偏差。"},
        "skills": {"score": 10, "maxScore": 30, "analysis": "掌握SolidWorks，但缺乏对AutoCAD及钢结构设计规范（GB/T 3811、GB 50017）的明确提及；具备ANSYS有限元分析能力是加分项，但专业技能主要集中在精密传动和机器人领域，与起重机结构设计所需技能不完全匹配。"},
        "industryRelevance": {"score": 8, "maxScore": 20, "analysis": "候选人行业背景为机器人和精密制造，无港口机械或起重机械行业经验，行业相关性较低，不符合加分项要求。"}
    },
    "matchingAdvantages": [
        "高学历背景，机械工程硕士，专业对口",
        "9年丰富机械研发经验，具备从概念到量产的完整项目经验",
        "精通SolidWorks和ANSYS有限元分析软件，满足部分技能要求",
        "具备中级机械工程师职称，专业资质良好",
        "有专利申请和标准化经验，体现出一定的创新能力"
    ],
    "matchingRisks": [
        "缺乏起重机械、港口机械行业经验，行业背景不匹配",
        "未提及熟悉的钢结构设计规范，如GB/T 3811和GB 50017",
        "工作经验方向主要为精密传动和机器人结构，与起重机大型钢结构设计差异较大",
        "未明确具备AutoCAD技能，可能需要额外学习或适应",
        "不了解焊接工艺及钢结构制造流程，与岗位其他要求有差距"
    ],
    "overallAssessment": "候选人教育背景和通用机械设计经验优秀，但行业方向和专业技能与起重机结构设计岗位存在较大偏差。其经验集中在精密传动和机器人领域，而非大型钢结构和起重机械。虽具备有限元分析和SolidWorks技能，但缺乏对行业规范及制造工艺的了解，匹配度不高。",
    "recommendation": "待定"
}

# ==================== 登录系统 ====================
login_resp = requests.post(f"{API_BASE}/api/auth/login", json={
    "username": "admin",
    "password": "admin123"
})

if not login_resp.json().get("success"):
    print("登录失败")
    exit(1)

token = login_resp.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

# ==================== 保存评估报告文件 ====================
import os
resumes_dir = r"C:\Users\36368\Desktop\trae-agent\web\resumes"

# 保存张明远评估报告
report_zhang = {
    "evaluationType": "简历匹配评估报告",
    "position": "机械工程师（起重机结构设计方向）",
    "evaluationDetail": evaluation_zhang
}

zhang_file = os.path.join(resumes_dir, "evaluation_张明远_机械工程师（起重机结构设计方向）.json")
with open(zhang_file, "w", encoding="utf-8") as f:
    json.dump(report_zhang, f, ensure_ascii=False, indent=2)
print(f"张明远评估报告已保存: {zhang_file}")

# 保存李思远评估报告
report_li = {
    "evaluationType": "简历匹配评估报告",
    "position": "机械工程师（起重机结构设计方向）",
    "evaluationDetail": evaluation_li
}

li_file = os.path.join(resumes_dir, "evaluation_李思远_机械工程师（起重机结构设计方向）.json")
with open(li_file, "w", encoding="utf-8") as f:
    json.dump(report_li, f, ensure_ascii=False, indent=2)
print(f"李思远评估报告已保存: {li_file}")

# ==================== 调用系统MCP API进行评估 ====================
print("\n===== 调用系统MCP analyze_resume_match =====")

# 评估张明远
mcp_resp1 = requests.post(f"{API_BASE}/api/mcp/tool", json={
    "tool": "analyze_resume_match",
    "args": {"jobId": 5, "applicationId": 3}
}, headers=headers)
print(f"张明远 MCP评估: {json.dumps(mcp_resp1.json(), ensure_ascii=False, indent=2)}")

# 评估李思远
mcp_resp2 = requests.post(f"{API_BASE}/api/mcp/tool", json={
    "tool": "analyze_resume_match",
    "args": {"jobId": 5, "applicationId": 4}
}, headers=headers)
print(f"李思远 MCP评估: {json.dumps(mcp_resp2.json(), ensure_ascii=False, indent=2)}")

# ==================== 更新投递状态 ====================
print("\n===== 更新投递状态为 reviewed =====")

status_resp1 = requests.patch(f"{API_BASE}/api/applications/3/status", json={
    "status": "reviewed"
}, headers=headers)
print(f"张明远状态更新: {status_resp1.json()}")

status_resp2 = requests.patch(f"{API_BASE}/api/applications/4/status", json={
    "status": "reviewed"
}, headers=headers)
print(f"李思远状态更新: {status_resp2.json()}")

print("\n===== 评估完成 =====")
print(f"张明远: 匹配分数 {evaluation_zhang['matchScore']}/100 | 建议: {evaluation_zhang['recommendation']}")
print(f"李思远: 匹配分数 {evaluation_li['matchScore']}/100 | 建议: {evaluation_li['recommendation']}")
