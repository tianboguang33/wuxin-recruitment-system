const emailService = require('./emailService');

const COMPANY = '五新重工研究院';
const JOB_TITLE = '电气工程师（港口起重机方向）';

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
            <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">AI数字人技术面试（中文）</td>
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

        <p style="color: #555; line-height: 1.8;">请点击下方按钮，选择您方便的面试时间（