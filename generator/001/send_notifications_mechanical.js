const emailService = require('./emailService');

const COMPANY = '五新重工研究院';
const JOB_TITLE = '机械工程师（起重机结构设计方向）';
const HR_EMAIL = '3636855416@qq.com';

const candidates = [
  {
    name: '张明远',
    email: 'zhangmy@email.com',
    recommendation: '通过',
    jobTitle: JOB_TITLE,
    company: COMPANY,
    score: 80,
    education: '哈工大（985）硕士',
    experience: '11年',
  },
  {
    name: '李思远',
    email: 'lisiyuan@email.com',
    recommendation: '待定',
    jobTitle: JOB_TITLE,
    company: COMPANY,
    score: 67,
    education: '西安交大（985）硕士',
    experience: '9年',
  },
];

async function sendAll() {
  const results = [];

  for (const candidate of candidates) {
    const result = await emailService.sendCandidateNotification(candidate);
    results.push(result);
  }

  const summaryData = {
    jobTitle: JOB_TITLE,
    company: COMPANY,
    department: '技术研发部',
    recruitCount: 8,
    to: HR_EMAIL,
    subject: `【招聘汇总】${JOB_TITLE}岗位 - 初筛结果通知报告`,
    candidates: candidates.map(c => ({
      ...c,
      emailStatus: '已发送',
    })),
    summary: {
      total: candidates.length,
      passed: candidates.filter(c => c.recommendation === '通过').length,
      pending: candidates.filter(c => c.recommendation === '待定').length,
      rejected: candidates.filter(c => c.recommendation === '不通过').length,
    },
  };

  await emailService.sendHrSummary(summaryData);

  console.log('\n========== 发送结果汇总 ==========');
  const summary = {
    total: results.length,
    passed: results.filter(r => r.recommendation === '通过').length,
    pending: results.filter(r => r.recommendation === '待定').length,
    rejected: results.filter(r => r.recommendation === '不通过').length,
    emails_sent: results.filter(r => r.success).length,
    hr_notified: true,
  };
  console.log(JSON.stringify({ summary, details: results }, null, 2));
}

sendAll().catch(e => console.error('脚本异常:', e.message));