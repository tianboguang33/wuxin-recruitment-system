const emailService = require('./emailService');

const COMPANY = 'XX新能源科技有限公司';
const JOB_TITLE = '电气工程师';

const candidates = [
  { name: '张三', email: '1920166300@qq.com', recommendation: '通过', jobTitle: JOB_TITLE, company: COMPANY },
  { name: '李四', email: 'lisi@test.com', recommendation: '待定', jobTitle: JOB_TITLE, company: COMPANY },
  { name: '王五', email: 'wangwu@test.com', recommendation: '不通过', jobTitle: JOB_TITLE, company: COMPANY },
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
    recruitCount: 3,
    candidates: candidates.map((c, index) => ({
      ...c,
      score: c.recommendation === '通过' ? 85 : (c.recommendation === '待定' ? 68 : 35),
      education: '本科',
      experience: c.recommendation === '通过' ? '5年' : (c.recommendation === '待定' ? '3年' : '1年'),
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