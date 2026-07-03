import pdfParseModule from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('pdfParseModule type:', typeof pdfParseModule);
console.log('pdfParseModule keys:', Object.keys(pdfParseModule));
console.log('pdfParseModule:', pdfParseModule);

// 尝试不同的调用方式
const pdfPath = path.join(__dirname, 'uploads', 'resume_1782461300604_x1m71k.pdf');
const dataBuffer = fs.readFileSync(pdfPath);

async function test() {
  try {
    // 方式1：直接调用
    console.log('\n--- 方式1：直接调用模块 ---');
    const result1 = await pdfParseModule(dataBuffer);
    console.log('成功，文本长度:', result1.text?.length);
    console.log('前500字:', result1.text?.slice(0, 500));
  } catch (e) {
    console.log('方式1失败:', e.message);
  }
}

test();
