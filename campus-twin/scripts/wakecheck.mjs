// 首屏唤醒验证：t≈0.9s（弹起中）与 t≈3.5s（落位后）各截一帧
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHOTS_DIR = join(ROOT, 'shots')
const PORT = 5198
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitServer() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`)
      if (r.ok) return
    } catch {}
    await sleep(500)
  }
  throw new Error('dev server 未就绪')
}

const server = spawn('npm', ['run', 'dev', '--', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
try {
  await waitServer()
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--headless=new', '--use-angle=metal', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/?t=10:00`, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 60000 })
  await sleep(900)
  await page.screenshot({ path: join(SHOTS_DIR, 'wake-mid.png') })
  console.log('✓ wake-mid (t≈0.9s)')
  await sleep(2600)
  await page.screenshot({ path: join(SHOTS_DIR, 'wake-done.png') })
  console.log('✓ wake-done (t≈3.5s)')
  await browser.close()
} finally {
  server.kill()
}
