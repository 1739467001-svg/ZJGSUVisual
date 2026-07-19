// UI 精确验证：区分"app 问题"与"脚本匹配问题"。
// 1) 枚举全部按钮文本；2) 通过 DOM 区块定位演示脚本按钮点击；3) 用 store 断言链路真的走通。
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 5199
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
const issues = []

try {
  await waitServer()
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--headless=new', '--use-angle=metal', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 900 })
  page.on('pageerror', (e) => issues.push(`PAGEERROR: ${String(e)}`.slice(0, 200)))
  await page.goto(`http://localhost:${PORT}/?t=10:00`, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 60000 })
  await sleep(1500)

  // 1. 枚举所有按钮文本（排查死按钮与文本匹配）
  const buttons = await page.evaluate(() =>
    [...document.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter(Boolean),
  )
  console.log('页面按钮清单:', JSON.stringify(buttons, null, 0))

  // 找到文本为 anchorText 的最内层元素，在其父容器里点击按钮 btnText
  const clickInSection = (anchorText, btnText) =>
    page.evaluate(
      (anchor, btn) => {
        const anchorEl = [...document.querySelectorAll('span, div, label')].find(
          (e) => e.children.length === 0 && e.textContent?.trim() === anchor,
        )
        const sec = anchorEl?.parentElement
        const target = sec ? [...sec.querySelectorAll('button')].find((b) => b.textContent?.trim() === btn) : null
        if (target) {
          target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          return true
        }
        return false
      },
      anchorText,
      btnText,
    )

  const store = (expr) => page.evaluate(`window.__STORE__.getState().${expr}`)

  // 2. 链路一：预约（演示脚本按钮在底部"演示脚本"区）
  console.log('\n— 链路一 预约 —')
  console.log('点击演示脚本[预约]:', await clickInSection('演示脚本', '预约'))
  await sleep(4500)
  console.log('candidates:', await store('candidates.length'), 'activePanel:', await store('activePanel'), 'sceneMode:', await store('sceneMode'))
  // 点右栏第一个"确认预约"
  const confirmed = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === '确认预约')
    if (btns[0]) { btns[0].dispatchEvent(new MouseEvent('click', { bubbles: true })); return true }
    return false
  })
  console.log('点击[确认预约]:', confirmed)
  await sleep(1500)
  console.log('bookings:', await store('bookings.length'), '→', confirmed ? (await store('bookings.length')) > 0 ? '✓ 预约闭环' : '✗ 未生成预约' : '✗ 按钮缺失')

  // 3. 链路二：报修
  console.log('\n— 链路二 报修 —')
  console.log('点击演示脚本[报修]:', await clickInSection('演示脚本', '报修'))
  await sleep(3500)
  console.log('repairDraft:', await store('repairDraft !== null'), 'activePanel:', await store('activePanel'))
  const submitted = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === '提交工单')
    if (btns[0]) { btns[0].dispatchEvent(new MouseEvent('click', { bubbles: true })); return true }
    return false
  })
  console.log('点击[提交工单]:', submitted)
  await sleep(1200)
  console.log('tickets:', await store('tickets.length'), '→', submitted ? (await store('tickets.length')) > 0 ? '✓ 工单闭环' : '✗ 未生成工单' : '✗ 按钮缺失')

  // 4. 链路三/四：态势 + 导航
  console.log('\n— 链路三 态势 —')
  await clickInSection('演示脚本', '态势')
  await sleep(4000)
  console.log('admin:', await store('admin !== null'), 'sceneMode:', await store('sceneMode'))
  console.log('\n— 链路四 导航 —')
  await clickInSection('演示脚本', '导航')
  await sleep(4500)
  console.log('lastRoute:', await store('lastRoute !== null'), 'activePanel:', await store('activePanel'))

  // 5. 角色切换/价值标签/其他顶部控件
  console.log('\n— 顶部控件 —')
  for (const t of ['访客', '学生', '管理员']) {
    const before = await store('activePanel')
    await clickInSection('CampusTwin', t)
    await sleep(300)
    console.log(`角色[${t}] 点击后 activePanel:`, await store('activePanel'), '(前:', before + ')')
  }

  await browser.close()
} finally {
  server.kill()
}

console.log('\n===== 问题 =====')
if (issues.length === 0) console.log('（无页面错误）')
else [...new Set(issues)].forEach((i) => console.log('•', i))
