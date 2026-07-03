import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const pdfParse = require('pdf-parse');

const uploadsDir = path.join(__dirname, 'uploads');
const resumesDir = path.join(__dirname, 'resumes');

const pdfFiles = [
  { file: 'resume_1782461300604_x1m71k.pdf', name: '候选人3-张明远-机械工程师（起重机结构设计方向）' },
  { file: 'resume_1782461334895_x1bvsw.pdf', name: '候选人4-李思远-机械工程师（起重机结构设计方向）' },
];

async function main() {
  const results = {};
  
  for (const resume of pdfFiles) {
    const filePath = path.join(uploadsDir, resume.file);
    console.log(`\n========== 解析: ${resume.name} ==========`);
    console.log(`文件: ${resume.file}`);
    
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      const text = data.text;
      
      console.log('--- 内容开始 ---');
      console.log(text);
      console.log('--- 内容结束 ---');
      
      results[resume.name] = text;
      
      // 保存解析结果
      const outputPath = path.join(resumesDir, `parsed_${resume.name}.txt`);
      fs.writeFileSync(outputPath, text, 'utf-8');
      console.log(`解析结果已保存到: ${outputPath}`);
    } catch (err) {
      console.error(`解析失败: ${err.message}`);
      results[resume.name] = `解析失败: ${err.message}`;
    }
  }
  
  // 保存汇总结果
  const summaryPath = path.join(resumesDir, 'parsed_pdf_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n汇总结果已保存到: ${summaryPath}`);
}

main().catch(console.error);
