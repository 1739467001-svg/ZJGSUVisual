// 三时刻截图验证：puppeteer-core 连系统 Chrome，开 dev server，
// 通过 ?t=HH:mm 调试钩子设定虚拟时刻并暂停，截白天/黄昏/夜晚三张图。
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 5199
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const SHOTS = join(ROOT, 'shots')

const TIMES = [
  { t: '10:00', name: 'day' },
  { t: '17:30', name: 'dusk' },
  { t: '21:30', name: 'night' },
]

async function waitServer() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`)
      if (r.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('dev server 未就绪')
}

const server = spawn('npm', ['run', 'dev', '--', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'ignore',
})

try {
  await waitServer()
  mkdirSync(SHOTS, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--headless=new', '--use-angle=metal', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  })
  const drawcalls = {}
  for (const { t, name } of TIMES) {
    const page = await browser.newPage()
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/?t=${encodeURIComponent(t)}`, { waitUntil: 'networkidle0', timeout: 60000 })
    await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 60000 })
    await new Promise((r) => setTimeout(r, 1500))
    drawcalls[t] = await page.evaluate('window.__DRAWCALLS__')
    await page.screenshot({ path: join(SHOTS, `${name}.png`) })
    console.log(`✓ ${name} (${t})  drawCalls=${drawcalls[t]}`)
    await page.close()
  }
  console.log('drawcalls:', JSON.stringify(drawcalls))
  await browser.close()
} finally {
  server.kill()
}
