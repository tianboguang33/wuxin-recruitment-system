const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail({ to, subject, html, from }) {
    try {
      const info = await this.transporter.sendMail({
        from: from || `"招聘通知系统" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });

      return {
        success: true,
        messageId: info.messageId,
        status: '邮件发送成功',
      };
    } catch (error) {
      console.error(`[邮件发送失败] 收件人: ${to}, 错误: ${error.message}`);
      return {
        success: false,
        error: error.message,
        status: '邮件发送失败',
      };
    }
  }

  async sendEmailWithRetry({ to, subject, html, from }, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sendEmail({ to, subject, html, from });
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error.message;
        console.warn(`[重试 ${attempt}/${maxRetries}] 发送邮件到 ${to} 失败: ${error.message}`);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`[最终失败] 无法发送邮件到 ${to}: ${lastError}`);
    return {
      success: false,
      error: lastError,
      status: '邮件发送失败（已重试）',
    };
  }

  async sendCandidateNotification(candidate) {
    const { name, email, recommendation, jobTitle, company } = candidate;
    const html = this.generateCandidateHtml(candidate);

    const result = await this.sendEmail({
      to: email,
      subject: `【${company || '招聘系统'}】面试结果通知 - ${recommendation}`,
      html,
      from: `"${company || '招聘系统'} 人力资源部" <${process.env.SMTP_USER}>`,
    });

    console.log(`[${result.success ? 'OK' : 'FAIL'}] ${name} - ${recommendation}邮件${result.success ? '发送成功' : '发送失败'}`);

    return {
      candidate_name: name,
      email,
      recommendation,
      ...result,
    };
  }

  generateCandidateHtml(candidate) {
    const templates = {
      '通过': this.generatePassHtml,
      '待定': this.generatePendingHtml,
      '不通过': this.generateRejectHtml,
    };

    const templateGenerator = templates[candidate.recommendation] || templates['不通过'];
    return templateGenerator.call(this, candidate);
  }

  generatePassHtml(candidate) {
    const { name, jobTitle, company } = candidate;
    return `
      <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #1565c0, #0d47a1); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">面试结果通知</h1>
        </div>
        <div style="padding: 28px; background: #fff;">
          <p style="font-size: 16px; color: #333;"><strong>${name}</strong> 您好：</p>

          <p style="color: #555; line-height: 1.8;">感谢您对${company}"<strong>${jobTitle || '应聘岗位'}</strong>"岗位的关注与应聘。</p>

          <div style="background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 16px; color: #1b5e20; font-weight: bold;">恭喜您！您已通过本次初筛评估</p>
          </div>

          <p style="color: #555; line-height: 1.8;">经过综合评估，我们非常荣幸地通知您，您已通过本次初筛。我们诚挚地邀请您参加后续的线下面试环节。</p>

          <h3 style="color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 8px; margin-top: 28px;">线下面试安排</h3>

          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr>
              <td style="padding: 10px 14px; border: 1px solid #ddd; font-weight: bold; width: 130px; background: #f5f5f5; color: #333;">面试时间</td>
              <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">请您在收到本邮件后3个工作日内与我们联系，协商确定具体面试时间</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5; color: #333;">面试地点</td>
              <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">${company}（具体地址将在确认时间后另行通知）</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5; color: #333;">面试形式</td>
              <td style="padding: 10px 14px; border: 1px solid #ddd; color: #555;">专业技术面试 + 综合能力面试</td>
            </tr>
          </table>

          <h3 style="color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 8px; margin-top: 28px;">请携带以下资料</h3>
          <ol style="color: #555; line-height: 2;">
            <li>个人简历（纸质版1份）</li>
            <li>身份证原件及复印件</li>
            <li>学历学位证书原件及复印件</li>
            <li>专业资格证书原件及复印件</li>
            <li>近期一寸免冠照片1张</li>
            <li>过往项目经历证明材料（如有）</li>
          </ol>

          <h3 style="color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 8px; margin-top: 28px;">联系方式</h3>
          <p style="color: #555; line-height: 1.8;">
            如有任何疑问，请随时与我们联系：<br>
            邮箱：<a href="mailto:hr@example.com">hr@example.com</a>
          </p>

          <p style="color: #555; line-height: 1.8; margin-top: 24px;">请您在收到本邮件后尽快回复确认是否参加后续面试，以便我们为您安排具体事宜。</p>

          <p style="color: #555; line-height: 1.8;">再次恭喜您通过初筛，期待与您进一步交流！</p>

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

  generatePendingHtml(candidate) {
    const { name, jobTitle, company } = candidate;
    return `
      <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #ff8f00, #e65100); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">面试结果通知</h1>
        </div>
        <div style="padding: 28px; background: #fff;">
          <p style="font-size: 16px; color: #333;"><strong>${name}</strong> 您好：</p>

          <p style="color: #555; line-height: 1.8;">感谢您对${company}"<strong>${jobTitle || '应聘岗位'}</strong>"岗位的关注与应聘。</p>

          <div style="background: #fff8e1; border-left: 4px solid #ffa000; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 16px; color: #e65100; font-weight: bold;">评估结果：已进入人才储备库</p>
          </div>

          <p style="color: #555; line-height: 1.8;">经过综合评估，您的学历背景和专业能力给我们留下了良好印象。虽然经过慎重考量，您与本次岗位的要求存在一定差距，暂未进入终面环节，但我们已将您的简历纳入公司<strong style="color: #e65100;">人才储备库</strong>。</p>

          <p style="color: #555; line-height: 1.8;">未来如有与您背景更加匹配的岗位机会，我们会第一时间与您取得联系。</p>

          <div style="background: #f5f5f5; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #555; line-height: 1.8;">
              <strong>温馨提示：</strong><br>
              您的简历将在我们的人才库中保留6个月。在此期间，如您的求职意向或个人情况有更新，欢迎随时与我们联系。
            </p>
          </div>

          <p style="color: #555; line-height: 1.8;">再次感谢您对${company}的关注与支持，祝您求职顺利，事业发展顺利！</p>

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

  generateRejectHtml(candidate) {
    const { name, jobTitle, company } = candidate;
    return `
      <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #c62828, #b71c1c); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">面试结果通知</h1>
        </div>
        <div style="padding: 28px; background: #fff;">
          <p style="font-size: 16px; color: #333;"><strong>${name}</strong> 您好：</p>

          <p style="color: #555; line-height: 1.8;">感谢您参加<strong>${jobTitle || '应聘岗位'}</strong>岗位的面试，感谢您在此过程中付出的时间和精力。</p>

          <div style="background: #ffebee; border-left: 4px solid #c62828; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 16px; color: #c62828; font-weight: bold;">很遗憾，您未能通过本次评估</p>
          </div>

          <p style="color: #555; line-height: 1.8;">经过综合评估，我们认为您的个人背景与该岗位的匹配度暂有差距，因此很遗憾本次未能录用。</p>

          <p style="color: #555; line-height: 1.8;">您的简历已进入公司人才库，未来如有适合您的岗位机会，我们将主动与您联系。</p>

          <p style="color: #555; line-height: 1.8;">欢迎您继续关注${company || '公司'}的招聘动态，祝您找到更合适的发展平台！</p>

          <br>
          <p style="color: #333; margin-bottom: 4px;">此致</p>
          <p style="color: #333; margin-top: 0;">敬礼！</p>
          <p style="color: #333; margin-top: 16px;">${company || '公司'} 人力资源部</p>
        </div>
        <div style="background: #f5f5f5; padding: 12px 24px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 0;">本邮件由招聘通知系统自动发送</p>
          <p style="margin: 4px 0 0 0;">${company || '公司'} | 招聘专用邮箱</p>
        </div>
      </div>
    `;
  }

  async sendHrSummary(summaryData) {
    const html = this.generateHrSummaryHtml(summaryData);

    const result = await this.sendEmail({
      to: summaryData.to || process.env.SMTP_USER,
      subject: summaryData.subject || `【招聘汇总】面试结果通知报告`,
      html,
      from: `"招聘通知系统" <${process.env.SMTP_USER}>`,
    });

    console.log(`[${result.success ? 'OK' : 'FAIL'}] HR汇总报告${result.success ? '发送成功' : '发送失败'}`);
    return result;
  }

  generateHrSummaryHtml(summaryData) {
    const { jobTitle, company, candidates, summary, department, recruitCount } = summaryData;

    let candidatesRows = '';
    if (candidates && candidates.length > 0) {
      candidatesRows = candidates.map((c, index) => `
        <tr>
          <td style="text-align:center;">${index + 1}</td>
          <td style="font-weight:bold;">${c.name}</td>
          <td style="text-align:center;">${c.score || '-'}</td>
          <td>${c.education || '-'}</td>
          <td style="text-align:center;">${c.experience || '-'}</td>
          <td style="text-align:center;">${c.emailStatus || '已发送'}</td>
        </tr>
      `).join('');
    }

    const passedCount = summary?.passed || (candidates?.filter(c => c.recommendation === '通过').length || 0);
    const pendingCount = summary?.pending || (candidates?.filter(c => c.recommendation === '待定').length || 0);
    const rejectedCount = summary?.rejected || (candidates?.filter(c => c.recommendation === '不通过').length || 0);
    const totalCount = passedCount + pendingCount + rejectedCount;

    return `
      <div style="font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1565c0; border-bottom: 3px solid #1565c0; padding-bottom: 10px;">招聘结果汇总报告</h2>

        <p><strong>招聘岗位：</strong>${jobTitle || '未指定'}</p>
        <p><strong>招聘部门：</strong>${department || '技术研发部'}</p>
        <p><strong>招聘人数：</strong>${recruitCount || '未指定'}</p>
        <p><strong>公司名称：</strong>${company || '未指定'}</p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

        <h3 style="color: #333;">一、整体情况</h3>
        <table border="1" cellpadding="10" cellspacing="0" style="border-collapse:collapse; width:100%; max-width:500px;">
          <tr style="background:#1565c0; color:white;">
            <th>分类</th>
            <th>人数</th>
            <th>占比</th>
          </tr>
          <tr>
            <td>总候选人</td>
            <td style="text-align:center;">${totalCount}人</td>
            <td style="text-align:center;">100%</td>
          </tr>
          <tr style="background:#e8f5e9;">
            <td style="color:#2e7d32; font-weight:bold;">通过（推荐录用）</td>
            <td style="text-align:center; color:#2e7d32; font-weight:bold;">${passedCount}人</td>
            <td style="text-align:center;">${totalCount > 0 ? Math.round(passedCount / totalCount * 100) : 0}%</td>
          </tr>
          <tr style="background:#fff8e1;">
            <td style="color:#e65100; font-weight:bold;">待定（储备人选）</td>
            <td style="text-align:center; color:#e65100; font-weight:bold;">${pendingCount}人</td>
            <td style="text-align:center;">${totalCount > 0 ? Math.round(pendingCount / totalCount * 100) : 0}%</td>
          </tr>
          <tr style="background:#ffebee;">
            <td style="color:#c62828; font-weight:bold;">不通过</td>
            <td style="text-align:center; color:#c62828; font-weight:bold;">${rejectedCount}人</td>
            <td style="text-align:center;">${totalCount > 0 ? Math.round(rejectedCount / totalCount * 100) : 0}%</td>
          </tr>
        </table>

        ${candidatesRows ? `
        <h3 style="color: #333; margin-top: 28px;">二、候选人详情</h3>
        <table border="1" cellpadding="10" cellspacing="0" style="border-collapse:collapse; width:100%;">
          <tr style="background:#1565c0; color:white;">
            <th>序号</th>
            <th>姓名</th>
            <th>综合得分</th>
            <th>学历</th>
            <th>工作年限</th>
            <th>邮件状态</th>
          </tr>
          ${candidatesRows}
        </table>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size:12px; color:#999; text-align:right;">此报告由招聘通知系统自动生成 | ${new Date().toLocaleDateString()}</p>
      </div>
    `;
  }
}

module.exports = new EmailService();