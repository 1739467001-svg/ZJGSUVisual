# CampusTwin · 浙商大下沙数字孪生

一张"活着的"浙商大下沙校园数字沙盘：你说一句话，它在真实的校园空间里替你办事。
Vite + React 19 + TypeScript + Tailwind v3 + Zustand 的全前端 Demo，断网可演。

> 演示数据 · 结构可替换真实系统（界面常驻口径）

## 快速启动

```bash
npm install
npm run dev    # 开发服务器
npm run build  # 类型检查 + 生产构建
npm run test   # vitest：解析/检索/路径/链路 44 用例
npm run lint   # oxlint
```

## 四条演示语句（左栏输入或点示例卡/底栏一键触发）

| 语句 | 效果 |
|---|---|
| 帮我找一个现在空着、有投影、能坐 8 个人的会议室 | 步骤流 → 右栏候选卡（容量/设备/距正门步行分钟）→ 确认预约 → 回执预约号 B-xxx |
| 三号楼 302 投影坏了 | "三号楼"别名映射 C 楼 → 报修表单自动填充 → 提交建工单 RP-xxx → 受理/办结推进 |
| 看一下现在全校哪里最紧张 | 态势面板：占用率/在楼人数/功率 KPI、Top5 排行、异常列表、调度建议 |
| 我从正门怎么去图书馆？ | 路网 Dijkstra 最短路 → 分段指引（贴路名 + 途经地标）+ 总距离/步行时间 |

## 目录导读

```txt
public/campus-zjgsu.json   世界底稿：21 栋真实档案楼宇 + 3 门 + 7 路 + 水系/广场 + 口语别名表
src/
  types/index.ts           规格 §6 全量数据模型 + 阶段 2 运行态类型
  data/world.ts            JSON 加载与校验、buildingById、resolveSpokenName（口语楼名解析）
  data/seedRooms.ts        确定性种子生成 214 房间 / 设备 / 当日课表
  data/demoScenarios.ts    四条链路一键脚本
  lib/
    rng.ts                 mulberry32 种子 PRNG（全项目禁裸 Math.random）
    time.ts                虚拟时间 / 时间词解析 / 时段冲突
    ids.ts                 预约号 B-xxx、工单号 RP-xxx
    roomSearch.ts          容量/设备/类型/时段空闲过滤
    pathfind.ts            路网求交建图（8m 吸附）+ 场所投影接入 + Dijkstra
    format.ts              楼名/设备/时间显示
  agent/
    parseIntent.ts         规则层解析：8 意图 + 槽位抽取（别名表/正则/时间词）
    aliases.ts             设备/房型口语别名、场所解析、楼宇提及抽取
    dispatchIntent.ts      编排器：调度Agent → 领域Agent plan/act/verify → TaskResult
    handlers/              booking / repair / navigation / overview / info(unknown 兜底)
    llm.ts                 LLM 增强插槽（默认关，2.5s 超时回退规则层的设计预留）
  store/campusStore.ts     Zustand 单一数据源；3D/面板只读，一切变更走 action
  components/
    layout/                AppShell 三栏 + TopBar / CommandPanel / ServiceDesk / BottomBar
    agent/                 ChatInput / MessageList / AgentTimeline / AgentStepCard（任务调度单）
    service/               Overview / Booking / Repair / Admin / Navigation 五面板
```

## 当前进度

- 阶段 1 ✅ 三栏骨架 + 数据层（21 楼 → 214 房间，确定性）
- 阶段 2 ✅ Agent + 业务闭环（8 意图规则解析、步骤流、预约/报修/态势/导航四链路、vitest 矩阵）
- 阶段 3 ⬜ 3D 世界接入（中栏当前为深色占位块）
- 阶段 4–6 ⬜ Wow 效果 / 模拟引擎潮汐 / 路演打磨

真实锚点策略：楼名、层数、面积、位置关系为真实/档案级；房间号、课表、占用、能耗为确定性程序生成的演示数据。
