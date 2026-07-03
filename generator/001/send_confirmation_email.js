const emailService = require('./emailService');

const COMPANY = '五新重工研究院';

/**
 * 生成面试确认邮件HTML
 */
function generateConfirmationHtml(candidate) {
  const { name, jobTitle, company, meetingLink, scheduledTime } = candidate;
  
  return `
    <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background: linear-gradient(135deg, #1565c0, #0d47a1); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">面试确认通知</h1>
      </div>
      <div style="padding: 28px; background: #fff;">
        <p style="font-size: 16px; color: #333;"><strong>${name}</strong> 您好：</p>

        <p style="color: #555; line-height: 1.8;">感谢您选择了面试时间，我们已为您创建了AI数字人面试房间。</p>

        <div style="background: #e3f2fd; border-left: 4px solid #1565c0; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 16px; color: #0d47a1; font-weight: bold;">面试时间已确认，请准时参加！</p>
        </div>

        <h3 style="color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 8px; margin-top: 28px;">面试详情</h3>

        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #ddd; font-weight: bold; width: 160px; background: #f5f5f5; color: #333;">面试岗位</td>
            <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">${jobTitle}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5; color: #333;">面试时间</td>
            <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">${scheduledTime}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5; color: #333;">面试形式</td>
            <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">AI数字人英语面试（共8道题目）</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5; color: #333;">面试时长</td>
            <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">约30分钟</td>
          </tr>
        </table>

        <h3 style="color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 8px; margin-top: 28px;">面试房间链接</h3>

        <p style="color: #555; line-height: 1.8;">请点击下方按钮进入面试房间（建议提前10分钟进入）：</p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${meetingLink}" target="_blank" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #1565c0, #0d47a1); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            进入面试房间
          </a>
        </div>

        <p style="text-align: center; color: #999; font-size: 14px; margin-top: 16px;">
          面试链接：<a href="${meetingLink}" target="_blank" style="color: #1565c0;">${meetingLink}</a>
        </p>

        <h3 style="color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 8px; margin-top: 28px;">面试须知</h3>
        <ol style="color: #555; line-height: 2;">
          <li>本次面试为英语面试，请确保您的英语听说能力能够应对面试交流</li>
          <li>面试共包含8道题目，请提前做好准备</li>
          <li>请在面试开始前10分钟进入面试房间进行设备测试</li>
          <li>请确保网络稳定，建议使用耳机进行面试</li>
          <li>面试过程中请保持安静，选择光线充足的环境</li>
          <li>面试开始后请按照系统提示完成答题</li>
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
    jobTitle: '电气工程师（港口起重机方向）',
    company: COMPANY,
    meetingLink: 'https://interview.example.com/join/room_ed56ae03524a87c8',
    scheduledTime: '2026年6月30日 09:47',
  };

  console.log(`===== 发送面试确认邮件 =====`);
  console.log(`候选人: ${candidate.name}`);
  console.log(`邮箱: ${candidate.email}`);
  console.log(`岗位: ${candidate.jobTitle}`);
  console.log(`面试时间: ${candidate.scheduledTime}`);
  console.log(`面试链接: ${candidate.meetingLink}`);

  const html = generateConfirmationHtml(candidate);
  
  const result = await emailService.sendEmail({
    to: candidate.email,
    subject: `【${COMPANY}】面试确认 - ${candidate.jobTitle}`,
    html,
    from: `"${COMPANY} 人力资源部" <${process.env.SMTP_USER}>`,
  });

  const output = {
    success: result.success,
    candidate_name: candidate.name,
    email: candidate.email,
    job_title: candidate.jobTitle,
    scheduled_time: candidate.scheduledTime,
    meeting_link: candidate.meetingLink,
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