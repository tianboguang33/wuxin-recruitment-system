const emailService = require('./emailService');

const COMPANY = '五新重工研究院';
const JOB_TITLE = '电气工程师（港口起重机方向）';
const CANDIDATE_NAME = '汪展鹏';
const CANDIDATE_EMAIL = '1920166300@qq.com';
const HR_EMAIL = '3636855416@qq.com';

async function main() {
  // 1. 发送通知给候选人
  const candidateHtml = `
    <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:650px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
      <div style="background:linear-gradient(135deg,#c62828,#b71c1c);color:white;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:22px;">面试结果通知</h1>
      </div>
      <div style="padding:28px;background:#fff;">
        <p style="font-size:16px;color:#333;"><strong>${CANDIDATE_NAME}</strong> 您好：</p>
        <p style="color:#555;line-height:1.8;">感谢您参加${COMPANY}"<strong>${JOB_TITLE}</strong>"岗位的面试，感谢您在此过程中付出的时间和精力。</p>
        <div style="background:#ffebee;border-left:4px solid #c62828;padding:16px;margin:20px 0;border-radius:4px;">
          <p style="margin:0;font-size:16px;color:#c62828;font-weight:bold;">很遗憾，您未能通过本次综合评估</p>
        </div>
        <p style="color:#555;line-height:1.8;">经过综合评估，我们认为您的个人背景与该岗位的要求存在一定差距，因此很遗憾本次未能录用。</p>
        <p style="color:#555;line-height:1.8;">您的简历已进入公司人才储备库，未来如有适合您的岗位机会，我们将主动与您联系。</p>
        <div style="background:#f5f5f5;padding:16px;margin:20px 0;border-radius:4px;">
          <p style="margin:0;color:#555;line-height:1.8;"><strong>评估概况：</strong><br>简历匹配度：45分<br>面试评分：15分<br>综合得分：24分</p>
        </div>
        <br><p style="color:#333;margin-bottom:4px;">此致</p>
        <p style="color:#333;margin-top:0;">敬礼！</p>
        <p style="color:#333;margin-top:16px;">${COMPANY} 人力资源部</p>
      </div>
    </div>`;

  const candidateResult = await emailService.sendEmail({
    to: CANDIDATE_EMAIL,
    subject: `【${COMPANY}】面试结果通知`,
    html: candidateHtml,
  });
  console.log(`[候选人通知] ${candidateResult.success ? '✅' : '❌'} ${candidateResult.message || candidateResult.error}`);

  // 2. 发送汇总报告给HR
  const hrHtml = `
    <div style="font-family:'Microsoft YaHei',Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;">
      <h2 style="color:#1565c0;border-bottom:3px solid #1565c0;padding-bottom:10px;">招聘结果汇总报告</h2>
      <p><strong>招聘岗位：</strong>${JOB_TITLE}</p>
      <p><strong>公司名称：</strong>${COMPANY}</p>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;">
      <h3 style="color:#333;">评估结果</h3>
      <table border="1" cellpadding="10" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr style="background:#1565c0;color:white;">
          <th>候选人</th><th>简历分</th><th>面试分</th><th>综合分</th><th>结论</th>
        </tr>
        <tr>
          <td style="font-weight:bold;">${CANDIDATE_NAME}</td>
          <td style="text-align:center;">45</td>
          <td style="text-align:center;">15</td>
          <td style="text-align:center;color:#c62828;font-weight:bold;">24</td>
          <td style="text-align:center;color:#c62828;font-weight:bold;">不通过</td>
        </tr>
      </table>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;">
      <p style="font-size:12px;color:#999;text-align:right;">此报告由招聘通知系统自动生成 | ${new Date().toLocaleDateString()}</p>
    </div>`;

  const hrResult = await emailService.sendEmail({
    to: HR_EMAIL,
    subject: `【招聘汇总】${JOB_TITLE} 面试结果报告`,
    html: hrHtml,
  });
  console.log(`[HR汇总报告] ${hrResult.success ? '✅' : '❌'} ${hrResult.message || hrResult.error}`);
}

main();
