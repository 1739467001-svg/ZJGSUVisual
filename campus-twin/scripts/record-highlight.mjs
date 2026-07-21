// 30 秒高光录屏（规格 §15 路演脚本）：唤醒俯冲 → 一句话预约 → 剖层定位 → 报修脉冲 → 态势热力
// 产物：shots/highlight.webm + highlight-30s.mp4（ffmpeg 转码）
// 用法：node scripts/record-highlight.mjs
import puppeteer from 'puppeteer-core'
import { spawn, execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHOTS = join(ROOT, 'shots')
const PORT = 5195
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
const t0 = Date.now()
const mark = (label) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${label}`)

try {
  await waitServer()
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--headless=new', '--use-angle=metal', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)))

  const evalJs = (js) => page.evaluate(`(() => { const s = window.__STORE__.getState(); return (${js}); })()`)
  const call = (js) => evalJs(js)
  const waitStore = async (js, timeout = 15000) => {
    const t = Date.now()
    while (Date.now() - t < timeout) {
      if (await evalJs(js)) return true
      await sleep(250)
    }
    throw new Error(`waitStore 超时: ${js}`)
  }

  // 00-03s：开场即录——沙盘自转唤醒，楼宇弹起，镜头俯冲落位
  const webm = join(SHOTS, 'highlight.webm')
  const recorder = await page.screencast({ path: webm })
  await page.goto(`http://localhost:${PORT}/?t=10:00`, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 60000 })
  await sleep(3500)
  mark('唤醒落位')

  // 03-18s：链路一 一句话预约（扫描命中 → 候选 → 确认 → Lv3 剖层定位）
  await call(`s.runDemoScript('booking')`)
  mark('发起预约指令')
  await waitStore(`s.candidates !== null && s.candidates.length > 0`)
  await sleep(3500)
  mark('候选出列，点确认预约')
  await call(`s.confirmBooking(s.candidates[0].roomId)`)
  await sleep(4000)
  mark('剖层定位展示')

  // 18-24s：链路二 一句话报修（红色脉冲钉房间）
  await call(`s.runDemoScript('repair')`)
  mark('发起报修指令')
  await waitStore(`s.repairDraft !== null && s.repairDraft.roomId`)
  await sleep(2000)
  await call(`s.createTicket({ roomId: s.repairDraft.roomId, deviceType: s.repairDraft.deviceType, desc: s.repairDraft.desc })`)
  mark('工单提交，红脉冲展示')
  await sleep(3500)

  // 24-31s：链路三 管理态势（热力爆发）
  await call(`s.runDemoScript('overview')`)
  mark('发起态势指令')
  await waitStore(`s.admin !== null`)
  await call(`s.setHeatMode('occupancy')`)
  await sleep(4000)
  mark('热力展示')

  // 31-34s：复位总览收尾
  await call(`s.resetView()`)
  await sleep(3500)
  mark('总览收尾')

  await recorder.stop()
  await browser.close()

  const mp4 = join(SHOTS, 'highlight-30s.mp4')
  // -ss 2.8：裁掉片头加载黑屏，从唤醒俯冲尾段开画
  execSync(`ffmpeg -y -ss 2.8 -i "${webm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 21 "${mp4}"`, { stdio: 'pipe' })
  const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp4}"`).toString().trim()
  console.log(`✓ 录屏完成：${mp4}（${Number(dur).toFixed(1)}s）`)
} finally {
  server.kill()
}
