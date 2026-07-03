const http = require('http');
const fs = require('fs');
const path = require('path');

// 绝对路径配置
const DIST_DIR = 'C:\\Users\\36368\\Desktop\\trae-agent\\web\\dist';
const API_PORT = 3001;
const FORM_PORT = 5000;
const FRONTEND_PORT = 5173;

const server = http.createServer(function(req, res) {
  var url = req.url;

  // Flask表单服务代理(表单页面、静态资源)
  if (url === '/form' || url.startsWith('/form?') || url === '/submit' || url.startsWith('/submit') || url.startsWith('/static/') || url === '/health' || url === '/debug') {
    return proxyTo(req, res, url, FORM_PORT);
  }

  // Flask API (候选人创建/查询/更新)
  if (url.startsWith('/api/candidates') || url.startsWith('/api/candidate/')) {
    return proxyTo(req, res, url, FORM_PORT);
  }

  // Express API (招聘系统后端)
  if (url.startsWith('/api/')) {
    return proxyTo(req, res, url, API_PORT);
  }

  // 静态文件服务 (使用绝对路径)
  var filePath = DIST_DIR + (url === '/' ? '\\index.html' : url.replace('/', '\\'));
  var extname = path.extname(filePath);
  var contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
  };

  fs.readFile(filePath, function(err, content) {
    if (err) {
      // 404时返回index.html (SPA路由)
      fs.readFile(DIST_DIR + '\\index.html', 'utf8', function(err2, indexContent) {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexContent, 'utf8');
        }
      });
    } else {
      var contentType = contentTypes[extname] || 'text/plain';
      if (extname === '.html' || extname === '.js' || extname === '.css' || extname === '.json') {
        contentType += '; charset=utf-8';
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

function proxyTo(req, res, url, port) {
  var options = {
    hostname: 'localhost',
    port: port,
    path: url,
    method: req.method,
    headers: req.headers
  };

  var proxyReq = http.request(options, function(proxyRes) {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', function(err) {
    console.error('Proxy [' + port + '] error:', err.message);
    res.writeHead(502);
    res.end('Service error: ' + err.message);
  });

  req.pipe(proxyReq);
}

server.listen(FRONTEND_PORT, function() {
  console.log('Frontend: http://localhost:' + FRONTEND_PORT);
  console.log('Express API -> http://localhost:' + API_PORT);
  console.log('Flask Form -> http://localhost:' + FORM_PORT);
  console.log('Dist Dir: ' + DIST_DIR);
});