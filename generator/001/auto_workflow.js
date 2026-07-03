/**
 * 自动工作流：轮询候选人提交 → 通知流程总控官（面试官机器人负责创建房间）
 */
const http = require('http');
const fs = require('fs');

const FLASK_PORT = 5000;
const POLL_INTERVAL = 10000; // 10秒
const processed = new Set();

function httpGet(host, port, path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: host, port, path, method: 'GET', timeout: 10000 };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('JSON parse error: ' + data.substring(0, 100))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function httpPost(host, port, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: host, port, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 10000
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve({ raw: d }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function poll() {
  try {
    const list = await httpGet('localhost', FLASK_PORT, '/api/candidates?status=pending&limit=100');
    const candidates = Array.isArray(list) ? list : (list.candidates || []);

    for (const c of candidates) {
      if (processed.has(c.id)) continue;
      if (!c.selected_time || c.selected_time === '') continue;

      processed.add(c.id);

      // 保存提交信息到文件，供后续流程使用
      const result = {
        candidate_id: c.id,
        name: c.name,
        email: c.email,
        job_title: c.job_title,
        phone: c.phone,
        selected_time: c.selected_time,
        expected_salary: c.expected_salary,
        note: c.note,
        detected_at: new Date().toISOString()
      };
      fs.writeFileSync('candidate_submission.json', JSON.stringify(result, null, 2));

      console.log(`\n========================================`);
      console.log(`  候选人已提交面试时间！`);
      console.log(`========================================`);
      console.log(`姓名: ${c.name}`);
      console.log(`邮箱: ${c.email}`);
      console.log(`岗位: ${c.job_title}`);
      console.log(`选择时间: ${c.selected_time}`);
      console.log(`========================================`);
      console.log(`\n请调用面试官机器人初始化面试:`);
      console.log(`  action = "init_interview"`);
      console.log(`  候选人: ${c.id}`);
      console.log(`========================================\n`);
    }
  } catch (e) {
    console.error(`[${new Date().toLocaleString()}] 轮询异常: ${e.message}`);
  }
}

console.log(`===== 自动工作流已启动 =====`);
console.log(`轮询间隔: ${POLL_INTERVAL/1000}秒`);
console.log(`等待候选人提交时间...\n`);

poll();
setInterval(poll, POLL_INTERVAL);
