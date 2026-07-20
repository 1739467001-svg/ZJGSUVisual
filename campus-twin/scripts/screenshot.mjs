// 截图验证：puppeteer-core 连系统 Chrome，开 dev server。
// 1) ?t=HH:mm 钩子截三时刻昼夜图；2) page.evaluate 驱动 store 截五张 Wow 效果图。
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

const WOWS = [
  { name: 'wow-scan', script: `runDemoScript('booking', { stepDelay: 0 })`, wait: 5000 },
  { name: 'wow-drill', script: `selectBuilding('lib'); window.__STORE__.getState().setDrill({ level: 2, buildingId: 'lib', floor: 3 })`, wait: 3000 },
  { name: 'wow-pulse', script: `runDemoScript('repair', { stepDelay: 0 })`, wait: 3500 },
  { name: 'wow-heat', script: `runDemoScript('overview', { stepDelay: 0 })`, wait: 4000 },
  { name: 'wow-route', script: `runDemoScript('navigate', { stepDelay: 0 })`, wait: 2800 },
  // 阶段 5
  { name: 'admin-charts', script: `runDemoScript('overview', { stepDelay: 0 })`, wait: 4500 },
  { name: 'tide-burst', query: '?t=10:29', script: `setClockRate(60)`, wait: 4000 },
  { name: 'evening', query: '?t=18:00', script: '', wait: 1500 },
  // 批次 2：10:31 下课潮汐 + 人流热力
  { name: 'heat-traffic', query: '?t=10:31', script: `setHeatMode('traffic')`, wait: 4000 },
]

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

  const openScene = async (query = '') => {
    const page = await browser.newPage()
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/${query}`, { waitUntil: 'networkidle0', timeout: 60000 })
    await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 60000 })
    return page
  }

  for (const { t, name } of TIMES) {
    const page = await openScene(`?t=${encodeURIComponent(t)}`)
    await sleep(1500)
    const calls = await page.evaluate('window.__DRAWCALLS__')
    await page.screenshot({ path: join(SHOTS, `${name}.png`) })
    console.log(`✓ ${name} (${t})  drawCalls=${calls}`)
    await page.close()
  }

  for (const { name, script, wait, query } of WOWS) {
    const page = await openScene(query ?? '?t=10:00')
    await sleep(800)
    if (script) await page.evaluate(`window.__STORE__.getState().${script}`)
    await sleep(wait)
    const calls = await page.evaluate('window.__DRAWCALLS__')
    await page.screenshot({ path: join(SHOTS, `${name}.png`) })
    console.log(`✓ ${name}  drawCalls=${calls}`)
    await page.close()
  }

  await browser.close()
} finally {
  server.kill()
}
