const http = require('http');
const fs = require('fs');
const path = require('path');

const API_PORT = 3001;
const FORM_PORT = 5000;
const FRONTEND_PORT = 5173;
const INTERVIEW_PORT = 8080;

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

  // AI面试服务代理 (转发到8080根路径，浏览器会自动携带查询参数)
  if (url.startsWith('/interview') || url.startsWith('/ws')) {
    // 8080面试页面在根路径/提供服务，浏览器端JS读取location.search获取参数
    return proxyTo(req, res, '/', INTERVIEW_PORT);
  }

  // 静态文件服务
  var filePath = 'dist' + (url === '/' ? '/index.html' : url);
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
      fs.readFile('dist/index.html', function(err2, indexContent) {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(indexContent);
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentTypes[extname] || 'text/plain' });
      res.end(content);
    }
  });
});

function proxyTo(req, res, url, port, originalUrl) {
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
});