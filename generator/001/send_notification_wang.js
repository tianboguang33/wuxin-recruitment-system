const emailService = require('./emailService');

const COMPANY = '五新重工研究院';
const JOB_TITLE = '电气工程师（初级方向）';

async function main() {
  const candidate = {
    name: '汪展鹏',
    email: 'wzp12345677@126.com',
    recommendation: '待定',
    jobTitle: JOB_TITLE,
    company: COMPANY,
    score: 55.1,
    education: '电气工程及其自动化',
    experience: '工作经验尚浅',
  };

  const result = await emailService.sendCandidateNotification(candidate);

  const output = {
    success: result.success,
    candidate_name: candidate.name,
    email: candidate.email,
    recommendation: candidate.recommendation,
    messageId: result.messageId,
    status: result.status,
  };

  if (result.error) {
    output.error = result.error;
  }

  if (result.success) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.error(JSON.stringify(output, null, 2));
    process.exit(1);
  }
}

main();