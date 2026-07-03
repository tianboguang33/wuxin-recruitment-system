const emailService = require('./emailService');

const COMPANY = 'XX新能源科技有限公司';
const JOB_TITLE = '电气工程师';
const HR_EMAIL = '3636855416@qq.com';

const candidates = [
  { name: '张三', email: '1920166300@qq.com', recommendation: '通过', score: 85, education: '本科', experience: '5年', emailStatus: '已发送' },
  { name: '李四', email: 'lisi@test.com', recommendation: '待定', score: 68, education: '本科', experience: '3年', emailStatus: '已发送' },
  { name: '王五', email: 'wangwu@test.com', recommendation: '不通过', score: 35, education: '本科', experience: '1年', emailStatus: '已发送' },
];

async function main() {
  const summaryData = {
    jobTitle: JOB_TITLE,
    company: COMPANY,
    department: '技术研发部',
    recruitCount: 3,
    to: HR_EMAIL,
    subject: `【招聘汇总】${JOB_TITLE}岗位 - 面试结果通知报告`,
    candidates,
    summary: {
      total: candidates.length,
      passed: candidates.filter(c => c.recommendation === '通过').length,
      pending: candidates.filter(c => c.recommendation === '待定').length,
      rejected: candidates.filter(c => c.recommendation === '不通过').length,
    },
  };

  const result = await emailService.sendHrSummary(summaryData);

  if (result.success) {
    console.log('HR汇总报告已发送成功');
  } else {
    console.error('发送失败:', result.error);
    process.exit(1);
  }
}

main().catch(e => { console.error('发送失败:', e.message); process.exit(1); });