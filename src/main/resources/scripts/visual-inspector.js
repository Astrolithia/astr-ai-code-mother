const http = require('http');
const fs = require('fs');
const path = require('path');
const { runDOMCollisionDetector } = require('./visual-detector.js');

// 自动探测可用 Playwright 库路径与浏览器二进制
function resolveChromium() {
  const possiblePaths = [
    '/Users/shiro/Documents/Developer/shiori-monitor/node_modules/playwright-core',
    'playwright-core',
    'playwright'
  ];
  let pw = null;
  for (const p of possiblePaths) {
    try {
      pw = require(p);
      break;
    } catch (e) {}
  }
  if (!pw) {
    throw new Error('未找到 Playwright 运行库');
  }

  // 探测 Chromium 二进制
  const cacheDirs = [
    '/Users/shiro/Library/Caches/ms-playwright',
    path.join(process.env.HOME || '', '.cache/ms-playwright')
  ];
  let execPath = null;
  for (const c of cacheDirs) {
    if (!fs.existsSync(c)) continue;
    const entries = fs.readdirSync(c);
    for (const ent of entries) {
      if (ent.startsWith('chromium-')) {
        const macBin = path.join(c, ent, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
        const linuxBin = path.join(c, ent, 'chrome-linux/chrome');
        if (fs.existsSync(macBin)) { execPath = macBin; break; }
        if (fs.existsSync(linuxBin)) { execPath = linuxBin; break; }
      }
    }
    if (execPath) break;
  }

  return { pw, execPath };
}

async function inspect(distDir, screenshotPath) {
  if (!fs.existsSync(distDir)) {
    console.log(JSON.stringify({
      success: false,
      error: `产物目录不存在: ${distDir}`,
      issues: []
    }));
    return;
  }

  const server = http.createServer((req, res) => {
    let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
    if (!fs.existsSync(filePath)) filePath = path.join(distDir, 'index.html');
    const ext = path.extname(filePath);
    const mime = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(0, async () => {
    const port = server.address().port;
    let browser = null;
    try {
      const { pw, execPath } = resolveChromium();
      browser = await pw.chromium.launch({
        executablePath: execPath || undefined,
        headless: true
      });
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.goto(`http://127.0.0.1:${port}`);
      // 等待 Vue 挂载和图标渲染
      await page.waitForTimeout(1200);

      // 截屏留证
      if (screenshotPath) {
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        await page.screenshot({ path: screenshotPath, fullPage: false });
      }

      // 执行物理几何碰撞分析
      const issues = await page.evaluate(runDOMCollisionDetector);

      console.log(JSON.stringify({
        success: true,
        distDir,
        screenshotPath: screenshotPath || null,
        issues
      }));
    } catch (e) {
      console.log(JSON.stringify({
        success: false,
        error: e.message,
        issues: []
      }));
    } finally {
      if (browser) await browser.close();
      server.close();
    }
  });
}

const args = process.argv.slice(2);
const targetDist = args[0] || 'dist';
const targetScreenshot = args[1] || '';
inspect(targetDist, targetScreenshot);
