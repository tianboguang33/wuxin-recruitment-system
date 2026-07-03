const http = require('http');
const fs = require('fs');

const API_BASE = 'localhost';
const API_PORT = 5000;
const CANDIDATE_ID = 'cand_wzp_003';
const POLL_INTERVAL = 5000; // 每5秒轮询一次

function checkCandidateStatus() {
  const options = {
    hostname: API_BASE,
    port: API_PORT,
    path: `/api/candidate/${CANDIDATE_ID}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const candidate = JSON.parse(data);
        
        console.log(`[${new Date().toLocaleString()}] 候选人: ${candidate.name}, 状态: ${candidate.status}, 已选时间: ${candidate.selected_time || '未选择'}`);
        
        if (candidate.status === 'pending' && candidate.selected_time) {
          // 候选人已提交时间选择
          console.log('\n===== 候选人已提交时间选择 =====');
          console.log(`候选人ID: ${candidate.id}`);
          console.log(`姓名: ${candidate.name}`);
          console.log(`邮箱: ${candidate.email}`);
          console.log(`选择时间: ${candidate.selected_time}`);
          console.log(`期望薪资: ${candidate.expected_salary || '未填写'}`);
          
          // 保存结果并退出
          const result = {
            success: true,
            candidate_id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            selected_time: candidate.selected_time,
            expected_salary: candidate.expected_salary,
            status: candidate.status
          };
          
          fs.writeFileSync('candidate_submission.json', JSON.stringify(result, null, 2));
          console.log('\n结果已保存到: candidate_submission.json');
          
          process.exit(0);
        } else if (candidate.status === 'confirmed') {
          console.log('\n===== 候选人已确认 =====');
          console.log(`面试链接: ${candidate.meeting_link}`);
          process.exit(0);
        }
      } catch (error) {
        console.error(`解析响应失败: ${error.message}`);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`轮询失败: ${error.message}`);
  });

  req.end();
}

console.log(`===== 开始轮询候选人状态 =====`);
console.log(`候选人ID: ${CANDIDATE_ID}`);
console.log(`轮询间隔: ${POLL_INTERVAL / 1000}秒`);
console.log('等待候选人提交时间选择...\n');

// 立即执行一次，然后定时轮询
checkCandidateStatus();
setInterval(checkCandidateStatus, POLL_INTERVAL);