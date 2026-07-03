const emailService = require('./emailService');

const COMPANY = '五新重工研究院';
const JOB_TITLE = '电气工程师';

/**
 * 生成面试邀请邮件HTML
 */
function generateInterviewInvitationHtml(candidate) {
  const { name, jobTitle, company, formLink } = candidate;
  
  return `
    <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background: linear-gradient(135deg, #1565c0, #0d47a1); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">面试邀请</h1>
      </div>
      <div style="padding: 28px; background: #fff;">
        <p style="font-size: 16px; color: #333;"><strong>${name}</strong> 您好：</p>

        <p style="color: #555; line-height: 1.8;">感谢您对${company}"<strong>${jobTitle}</strong>"岗位的关注与应聘。</p>

        <div style="background: #e3f2fd; border-left: 4px solid #1565c0; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 16px; color: #0d47a1; font-weight: bold;">恭喜您！您已通过简历初筛，我们诚挚邀请您参加AI数字人面试</p>
        </div>

        <h3 style="color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 8px; margin-top: 28px;">面试安排</h3>

        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #ddd; font-weight: bold; width: 160px; background: #f5f5f5; color: #333;">面试岗位</td>
            <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">${jobTitle}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5; color: #333;">面试形式</td>
            <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">AI数字人面试</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5; color: #333;">面试时长</td>
            <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">约30分钟</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5; color: #333;">语言要求</td>
            <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">中文面试</td>
          </tr>
        </table>

        <h3 style="color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 8px; margin-top: 28px;">请选择面试时间</h3>

        <p style="color: #555; line-height: 1.8;">请点击下方按钮，选择您方便的面试时间（本链接24小时内有效）：</p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${formLink}" target="_blank" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #1565c0, #0d47a1); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            选择面试时间
          </a>
        </div>

        <h3 style="color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 8px; margin-top: 28px;">面试须知</h3>
        <ol style="color: #555; line-height: 2;">
          <li>本次面试为AI数字人面试，请确保您的网络稳定</li>
          <li>面试共包含8道题目，请提前做好准备</li>
          <li>请在选择的面试时间前10分钟进入面试房间</li>
          <li>建议使用耳机进行面试</li>
          <li>面试过程中请保持安静，选择光线充足的环境</li>
          <li>确认时间后，系统将自动发送面试房间链接至您的邮箱</li>
        </ol>

        <h3 style="color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 8px; margin-top: 28px;">联系方式</h3>
        <p style="color: #555; line-height: 1.8;">
          如有任何疑问，请随时与我们联系：<br>
          邮箱：<a href="mailto:hr@wuxin.com">hr@wuxin.com</a>
        </p>

        <p style="color: #555; line-height: 1.8; margin-top: 24px;">期待您的精彩表现！</p>

        <br>
        <p style="color: #333; margin-bottom: 4px;">此致</p>
        <p style="color: #333; margin-top: 0;">敬礼！</p>
        <p style="color: #333; margin-top: 16px;">${company} 人力资源部</p>
      </div>
      <div style="background: #f5f5f5; padding: 12px 24px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #999;">
        <p style="margin: 0;">本邮件由招聘通知系统自动发送</p>
        <p style="margin: 4px 0 0 0;">${company} | 招聘专用邮箱</p>
      </div>
    </div>
  `;
}

async function main() {
  const candidate = {
    name: '汪展鹏',
    email: '1847092142@qq.com',
    jobTitle: JOB_TITLE,
    company: COMPANY,
    formLink: 'https://add-declined-full-michael.trycloudflare.com/form?candidate_id=cand_wzp_002',
  };

  console.log(`===== 发送面试邀请邮件 =====`);
  console.log(`候选人: ${candidate.name}`);
  console.log(`邮箱: ${candidate.email}`);
  console.log(`岗位: ${candidate.jobTitle}`);
  console.log(`时间选择链接: ${candidate.formLink}`);

  const html = generateInterviewInvitationHtml(candidate);
  
  const result = await emailService.sendEmail({
    to: candidate.email,
    subject: `【${COMPANY}】面试邀请 - ${JOB_TITLE}`,
    html,
    from: `"${COMPANY} 人力资源部" <${process.env.SMTP_USER}>`,
  });

  const output = {
    success: result.success,
    candidate_name: candidate.name,
    email: candidate.email,
    job_title: JOB_TITLE,
    form_link: candidate.formLink,
    messageId: result.messageId,
    status: result.status,
  };

  if (result.error) {
    output.error = result.error;
  }

  console.log(`\n===== 发送结果 =====`);
  console.log(JSON.stringify(output, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main();