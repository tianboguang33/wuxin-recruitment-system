import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 动态导入pdf-parse
const pdfParseModule = await import('pdf-parse');
const pdfParse = pdfParseModule.default || pdfParseModule;

const uploadsDir = path.join(__dirname, 'uploads');
const resumesDir = path.join(__dirname, 'resumes');

const resumeFiles = [
  { file: 'resume_1782437545457_2ea166.docx', name: '候选人1-汪展鹏-电气工程师（五新重工研究院）' },
  { file: 'resume_1782454484380_ypptxc.docx', name: '候选人2-汪展鹏-电气工程师（技术研发部）' },
  { file: 'resume_1782461300604_x1m71k.pdf', name: '候选人3-张明远-机械工程师（起重机结构设计方向）' },
  { file: 'resume_1782461334895_x1bvsw.pdf', name: '候选人4-李思远-机械工程师（起重机结构设计方向）' },
];

async function parseDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function parsePdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function main() {
  const results = {};
  
  for (const resume of resumeFiles) {
    const filePath = path.join(uploadsDir, resume.file);
    console.log(`\n========== 解析: ${resume.name} ==========`);
    console.log(`文件: ${resume.file}`);
    
    try {
      let text = '';
      if (resume.file.endsWith('.docx')) {
        text = await parseDocx(filePath);
      } else if (resume.file.endsWith('.pdf')) {
        text = await parsePdf(filePath);
      }
      
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
  const summaryPath = path.join(resumesDir, 'parsed_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n汇总结果已保存到: ${summaryPath}`);
}

main().catch(console.error);
