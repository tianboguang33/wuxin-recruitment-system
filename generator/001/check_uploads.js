const fs = require('fs');
const path = 'C:\\Users\\36368\\Desktop\\trae-agent\\web\\uploads';
if (fs.existsSync(path)) {
  const files = fs.readdirSync(path);
  console.log('简历文件数:', files.length);
  files.forEach(f => {
    const stat = fs.statSync(path + '\\' + f);
    console.log('  ' + f + ' (' + stat.size + ' bytes)');
  });
} else {
  console.log('目录不存在');
}
