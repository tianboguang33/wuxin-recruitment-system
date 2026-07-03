import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const pdfParseModule = await import('pdf-parse');
const pdfParse = pdfParseModule.default || pdfParseModule;

async function parsePdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function parseDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function main() {
  const resumePath = path.join('..', 'generator', '001', 'uploads', 'resume_1782980633816_hv9gb4.pdf');
  console.log('=== 解析张家伟的简历 ===');
  console.log('文件路径:', resumePath);
  
  try {
    const text = await parsePdf(resumePath);
    console.log('\n=== 简历内容 ===');
    console.log(text);
  } catch(e) {
    console.error('解析失败:', e.message);
    console.error(e.stack);
  }
}

main();