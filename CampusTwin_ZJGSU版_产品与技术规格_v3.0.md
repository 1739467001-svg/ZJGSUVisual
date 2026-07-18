# CampusTwin · 浙商大下沙数字孪生 产品与技术规格 v3.0

> 定位：以**浙江工商大学下沙校区真实校园**为世界底版，做一个「一句话调度校园」的 3D 数字孪生服务台。
> 目标：打开链接即可体验的全前端 Demo —— 可运行、可体验、可路演、可录屏传播。
> 技术路线：Vite + React + TypeScript + Tailwind + Zustand + react-three-fiber + 本地数据 + 校园模拟引擎 + 规则 Agent（可选 LLM 增强）。
> 世界底稿：`campus-zjgsu.json`（真实楼宇档案 + 抽象布局）。

---

## 1. 产品一句话

**CampusTwin 是一张活着的浙商大下沙校园数字沙盘：你说一句话，它在真实的校园空间里替你办事。**

不是地图，不是预约表，不是聊天框。它是：

```txt
真实校园（15+ 栋真实楼宇、真实层数与面积、真实相对布局）
× 自然语言 Agent（听得懂"信电学院""三号楼 302""哪里最紧张"）
× 3D 指挥沙盘（扫描、剖层、脉冲、热力、人流潮汐、无人机运镜）
× 校园模拟引擎（虚拟时钟驱动上课/下课/食堂高峰/能耗曲线）
```

核心价值不变，格局放大：

```txt
N 个系统      -> 1 个入口
复杂流程      -> 一句话
静态表格      -> 活着的 3D 校园
抽象演示      -> 踩在真实校园的肩膀上
```

---

## 2. v3.0 相对 v2.0 的升级总览

| 维度 | v2.0 | v3.0 |
|---|---|---|
| 世界 | 3~5 栋虚构楼宇 | 浙商大下沙全校 21 栋真实档案楼宇（18 栋教学/场馆 + 3 食堂）+ 3 个生活区远景 + 道路/水系/广场/大门 |
| 真实锚点 | 楼名近似真实 | 图书馆 5.2万㎡/5层/钱江杯、经管楼 26789㎡、综合楼学正街18号等官方档案参数；口语别名表（"信电""三号楼"） |
| 3D 观感 | 数字沙盘 | 活着的数字孪生：天空昼夜、发光路网、景观湖、树阵灯柱、Bloom、人流粒子潮汐 |
| 智能 | 6 意图规则 Agent | 8 意图 + 编排可视化（规划-执行-验证）+ 校园模拟引擎提供"实时数据" + LLM 增强插槽 |
| 链路 | 3 条（预约/报修/态势） | 4 条（+ 新生导航链路，3D 路径流 + 地标讲解） |
| 下钻 | 楼宇剖层 | 三级下钻：楼宇剖层 → 楼层展开 → 房间浮出，面包屑返回 |
| 工程 | 6 阶段 | 7 阶段，每阶段带可运行验收命令 |

---

## 3. 世界设定：浙商大下沙数字孪生

### 3.1 坐标系与比例

```txt
单位：米。+X=东，+Z=南，+Y=上。原点=图书馆前广场中心。
校园范围：东西 1040m × 南北 980m（教学区为核心展示区，生活区为远景）。
相机默认视角：东南方向 45° 俯视，可看到学正街正门与图书馆中轴。
```

### 3.2 楼宇名录（全部来自官方调研，见 `campus-zjgsu.json`）

核心地标（archive 级参数）：

- **图书馆（lib）**：52000㎡，地下 1 层地上 5 层，2004 竣工，钱江杯。沙盘视觉中心，5 层馆藏布局真实嵌入（1F 经管借阅/报告厅、2F 人文法律、3F 社科科技、4F 样本外文、5F 网络教育中心/研讨间）。
- **综合大楼（zonghe）**：学正街 18 号，近地铁工商大学云滨站，12 层行政楼，沙盘制高点。
- **经管楼（jingguan）**：26789㎡，5 层，2009 竣工。
- **外语学院楼（waiyu）**：含日语楼，3 层。

教学与学院楼（abstract 级位置）：教学楼 A/B/C/D/E/F（E 楼进正门即见，F 楼近钱江湾）、信电学院楼、计算机学院楼、文科楼、食品学院楼、环境学院楼、艺术学院楼。

场馆与生活：剧院、文体中心、清风苑/行云苑/流水苑食堂，清风/行云/流水广场、图书馆前广场。

环境层：学正街（东界城市路）、乃器路/春华路（南北环路）、学林街（西界）、中央礼仪轴；图书馆景观湖 + 北部景观河；正门/北门/南门三个大门。

远景体量：钱江湾、金沙港、玉屏洲生活区（低精度体块，只参与天际线与热力，不可下钻）。

### 3.3 真实锚点策略

```txt
楼名、别名、层数、面积、位置关系  = 真实/档案级
房间号、课表、占用、能耗、人流    = 程序生成的演示数据（确定性种子，可复现）
界面常驻标注："演示数据 · 结构可替换真实系统"
```

Agent 必须能听懂口语：`信电学院` / `新电学院` / `三号楼` / `经管楼` / `图文` 全部命中 `spokenAliases` 表。匹配前先归一化（剥离「学院 / 楼 / 大楼」后缀、去空格）再查表，未命中则按包含匹配兜底。

### 3.4 世界运行规则（模拟引擎驱动）

- 虚拟时钟默认从**周二 09:58** 开始（临近下课，人流潮汐最戏剧化），1 秒真实时间 = 1 分钟虚拟时间，可暂停/调速。
- 课表潮汐：每 50 分钟一个上课/下课脉冲。下课时教学楼 → 食堂/图书馆人流激增。
- 食堂高峰：11:30–12:30、17:00–18:30，清风/行云/流水三食堂热力飙升。
- 图书馆：8:00–22:00 占用率爬升，21:30 后回落。
- 能耗曲线：与占用率正相关 + 基础负荷，按楼宇聚合。

---

## 4. 信息架构

```txt
┌──────────────────────────────────────────────────────────┐
│ 顶部品牌栏  CampusTwin·浙商大 | 虚拟时钟 | 角色 | 价值标签  │
├──────────┬───────────────────────────────┬───────────────┤
│ 左栏      │ 中栏：3D 数字孪生沙盘          │ 右栏           │
│ 一句话    │  全校楼宇/道路/水系/广场        │ 上下文服务台    │
│ 指挥台    │  扫描/剖层/脉冲/人流           │ 预约/报修/      │
│ Agent步骤 │  无人机运镜                     │ 态势/导航面板   │
├──────────┴───────────────────────────────┴───────────────┤
│ 底部：场景模式条 + 时间轴（模拟时钟控制 + 演示脚本一键触发） │
└──────────────────────────────────────────────────────────┘
```

任务流不变：`左栏发起 -> 中栏看见 -> 右栏办结`。

左栏：自然语言输入、Agent 编排步骤流（规划-执行-验证）、历史指令、4 条示例指令。
右栏五个面板：`overview`（校园总览，默认）/ `booking`（候选与预约）/ `repair`（报修工单）/ `navigation`（路径与地标讲解）/ `admin`（管理态势）。

---

## 5. 四条核心演示链路

### 5.1 链路一：一句话找空间 / 预约会议室

演示语句：`帮我找一个现在空着、有投影、能坐 8 个人的会议室`

```txt
parseIntent -> book_room {capacity:8, equipment:[projector], time:now}
-> 模拟引擎取当前时刻占用
-> roomSearch 过滤（容量≥8、含投影、当前无课无预约、非报修）
-> 3D：扫描光掠过 -> 候选楼宇依次点亮 -> 镜头推近 -> 候选房间蓝色描边
-> 右栏候选列表（楼名/房间/容量/设备/"距正门步行 X 分钟"）
-> 用户确认 -> createBooking -> 房间状态 busy -> 对话区回执（预约号）
```

验收：候选与课表一致；3D 高亮与右栏列表一致；预约后全界面状态联动（沙盘颜色、右栏、KPI）。

### 5.2 链路二：一句话设备报修

演示语句：`三号楼 302 投影坏了`（"三号楼"必须经别名表映射到 C 楼）

```txt
parseIntent -> repair {building:三号楼->jxc, room:302, device:projector}
-> 3D：镜头快速定位 C 楼 -> 楼体剖层到 3F -> 302 红色脉冲 + 告警标记
-> 右栏报修表单自动填充（楼/房间/设备/描述）
-> 提交 -> createTicket(RP-xxx) -> 状态推进 待受理->处理中->已完成
-> 异常项进入 admin 面板与沙盘热力
```

验收：别名解析正确；空间定位准确；工单生命周期可见可推进；管理视图同步出现该异常。

### 5.3 链路三：一句话管理态势

演示语句：`看一下现在全校哪里最紧张`

```txt
parseIntent -> admin_overview
-> 态势 Agent 汇总：全校占用率、今日能耗、实时人流、进行中工单
-> 右栏 admin 面板：KPI 卡 + 占用排行 + 能耗趋势 + 异常列表 + 调度建议
-> 3D：overview 模式 -> 楼宇高度/颜色映射占用率，热力浮层展开，
   道路人流粒子加密，最紧张楼宇橙红脉冲，镜头自动拉高聚焦
```

验收：KPI/图表/热力三者数据同源；点击异常项 -> 镜头定位到对应楼宇；至少输出一条可解释调度建议（如"C 楼 302 报修未受理，建议派员"）。

### 5.4 链路四：新生导航（P0 新增）

演示语句：`我从正门怎么去图书馆？` / `信电学院怎么走？`

```txt
parseIntent -> navigate {from:正门(默认或解析), to:图书馆}
-> 路径引擎：路网图（roads 折线建图）上跑最短路径
-> 3D：镜头切到跟拍视角 -> 路径金色流动线 -> 沿途地标气泡
   （"经过图书馆前广场"->"左转求真路"）
-> 右栏 navigation 面板：分段指引 + 总步行时间 + 无障碍备选（绕行坡度路段标注）
```

验收：路径必须贴着道路网走，不穿楼；跟拍运镜流畅；分段指引与沙盘高亮同步。

路径建图规则（`lib/pathfind.ts`）：以 `roads` 折线求交建图，交点吸附容差 8m；大门与楼宇由其 `position` 向最近道路点垂直投影接入路网；若路径段与任一楼宇 `footprint` 相交则该段不可走（路网本身布于楼外，此判定兜底抽象布局误差）。

---

## 6. 数据模型（TypeScript）

```ts
// —— 世界（静态，来自 campus-zjgsu.json）——
export type BuildingKind = 'library' | 'admin' | 'teaching' | 'faculty' | 'venue' | 'sports' | 'canteen' | 'dorm'

export interface BuildingSpec {
  id: string
  name: string
  fullName?: string
  alias: string[]
  kind: BuildingKind
  position: [number, number]        // x, z（米）
  footprint: [number, number]       // 宽, 深（米）
  floors: number
  floorHeight: number
  realFloors?: string
  area?: number
  completed?: number
  honor?: string
  landmark?: boolean
  tags: string[]
  floorGuide?: { level: number; name: string }[]
}

export interface WorldData {
  buildings: BuildingSpec[]
  gates: Gate[]
  roads: Road[]        // { id, name, kind: city|main|minor, width, path: [x,z][] }
  water: WaterBody[]   // lake: center+radius / river: width+path
  plazas: Plaza[]
  distantQuarters: DistantQuarter[]
  spokenAliases: Record<string, string>
}

// —— 业务（运行时，种子生成）——
export type RoomType = 'meeting' | 'classroom' | 'lab' | 'venue' | 'study'
export type RoomStatus = 'free' | 'busy' | 'repair'
export type DeviceType = 'projector' | 'ac' | 'light' | 'mic' | 'screen' | 'computer'
export type TicketStatus = 'new' | 'doing' | 'done'

export interface Room {
  id: string                  // `${buildingId}-${floor}${seq}` 如 jxc-302
  buildingId: string
  floor: number
  name: string                // "302"
  type: RoomType
  capacity: number
  equipment: DeviceType[]
  status: RoomStatus
  schedule: ScheduleItem[]    // 当日课表/占用
}

export interface ScheduleItem { start: string; end: string; title: string; by: string }

export interface Device { id: string; roomId: string; type: DeviceType; status: 'ok' | 'fault' }

export interface Booking {
  id: string; roomId: string; user: string
  start: string; end: string; status: 'ok' | 'cancelled'; createdAt: string
}

export interface Ticket {
  id: string; roomId: string; deviceId?: string
  desc: string; status: TicketStatus; assignee: string; createdAt: string
}

// —— 模拟引擎输出（按虚拟时刻 t 采样）——
export interface BuildingPulse {
  buildingId: string
  occupancy: number      // 0..1 占用率
  headcount: number      // 估算在楼人数
  powerKw: number        // 当前功率
  alerts: number         // 未闭环工单数
}

export interface CampusSnapshot {
  ts: string                       // 虚拟时间 ISO
  pulses: Record<string, BuildingPulse>
  totalHeadcount: number
  totalPowerKw: number
  occupancyOverall: number
}

// —— Agent ——
export type IntentName =
  | 'book_room' | 'find_free_classroom' | 'repair' | 'navigate'
  | 'admin_overview' | 'where_is' | 'schedule_query' | 'energy_insight'
  | 'unknown'

export type AgentName = '调度Agent' | '预约Agent' | '报修Agent' | '导航Agent' | '态势Agent'

export interface Intent {
  intent: IntentName
  slots: {
    time?: string; start?: string; end?: string
    capacity?: number; equipment?: string[]
    building?: string; buildingId?: string; room?: string; device?: string
    from?: string; fromId?: string; target?: string; targetId?: string
  }
  agent: AgentName
  confidence: number
  rawText: string
}

export interface AgentStep {
  id: string
  agent: AgentName
  phase: 'plan' | 'act' | 'verify'      // 规划-执行-验证
  title: string
  detail: string
  status: 'waiting' | 'running' | 'done' | 'error'
  ts: number
}

export interface TaskResult {
  type: 'booking_candidates' | 'booking_done' | 'ticket_created'
      | 'overview' | 'navigation' | 'answer' | 'unknown'
  message: string
  roomIds?: string[]; buildingIds?: string[]
  bookingId?: string; ticketId?: string
  route?: NavigationRoute
}

export interface NavigationRoute {
  from: { kind: 'gate' | 'building'; id: string }
  to: { kind: 'gate' | 'building'; id: string }
  waypoints: [number, number][]          // 贴路网折线
  distanceM: number
  walkMin: number
  segments: { text: string; landmark?: string; to: [number, number] }[]
  accessible?: boolean
}
```

---

## 7. 校园模拟引擎（Simulation Engine）

职责：让沙盘"活着"，并为 Agent/图表/KPI 提供同一份"实时"数据。

```txt
SimClock：startAt = 周二 09:58；rate = 60（1s 真实 = 1min 虚拟）；可 pause / 1x / 10x / 60x。
TideModel：
  - 课表脉冲：每整 50 分钟（09:40,10:30,...）切换 上课/下课 状态
  - 上课中：教学楼 occupancy 0.75~0.95；下课 10 分钟内骤降 0.2，食堂/图书馆 +0.3
  - 食堂窗：11:30-12:30 / 17:00-18:30 occupancy->0.9
  - 图书馆：8:00 起爬升至 14:00 峰值 0.85，21:30 后 0.2
  - 噪声：确定性伪随机（seed=42），同一时刻任何刷新结果一致
EnergyModel：powerKw = base(kind) * (0.35 + 0.65*occupancy) * areaFactor
TrafficModel：下课脉冲时在 教学楼->食堂/图书馆 的道路段上生成人流权重
```

接口：

```ts
export function pulseAt(world: WorldData, rooms: Room[], tickets: Ticket[], t: Date): CampusSnapshot
export function trafficOnRoads(world: WorldData, t: Date): Record<string /*roadId*/, number /*0..1*/>
```

所有确定性：同一 `t` 输入必然得到同一输出（无 `Math.random()` 裸调用，统一 `lib/rng.ts` 的种子 PRNG）。

---

## 8. Agent 平台

### 8.1 架构

```txt
用户输入
  -> 调度Agent（parseIntent：规则优先，LLM 插槽可选）
  -> 领域Agent（预约/报修/导航/态势）：plan -> act -> verify
  -> TaskResult -> store 变更 -> 3D/右栏/图表联动
```

- **规则层（默认，断网可演）**：关键词 + 正则 + 别名表 + 槽位抽取。数字/人数/设备/楼名/房间号/时间词（现在/下午/明天 14 点）全覆盖。
- **LLM 增强插槽（可选，默认关）**：`agent/llm.ts` 暴露 `enhanceParse(text): Promise<Intent | null>`，超时 2.5s 无响应自动回退规则层。Demo 全程不依赖它。

### 8.2 意图覆盖（8 + 1）

| 意图 | 触发示例 | 领域 Agent |
|---|---|---|
| book_room | "找个能坐 8 人有投影的会议室" | 预约 |
| find_free_classroom | "现在哪有空教室自习" | 预约 |
| repair | "三号楼 302 投影坏了" | 报修 |
| navigate | "从正门怎么去图书馆" | 导航 |
| where_is | "信电学院在哪" | 导航 |
| admin_overview | "全校哪里最紧张" | 态势 |
| energy_insight | "今天哪栋楼最耗电" | 态势 |
| schedule_query | "图书馆 5 楼研讨间接下来有空的吗" | 预约 |
| unknown | 其他 | 调度（兜底回复 + 给示例） |

### 8.3 编排可视化

每条指令在左栏渲染为步骤流（Framer Motion 入场）：

```txt
调度Agent  plan   识别意图 book_room，置信度 0.93
预约Agent  plan   抽取槽位：容量≥8、设备=投影、时间=现在(10:07)
预约Agent  act    检索 21 栋楼 214 间房间 -> 命中 4 间候选
预约Agent  verify 与当前课表交叉验证：4 间均空闲
调度Agent  act    已点亮候选楼宇，等待你确认
```

每步 200~450ms stagger 播放，业务真实执行、UI 只是可视化。

---

## 9. 3D 视觉系统（本项目的第一生产力）

### 9.1 分层结构

```txt
WorldLayer    天空穹顶+太阳/月亮光照、地面沙盘底座、发光路网、水系、绿化树阵、灯柱、远景生活区
BuildingLayer 21 栋主楼宇（玻璃质感+描边+楼顶状态光带）、大门与广场、悬浮标签
EffectLayer   扫描光、剖层切片、房间浮出、红色脉冲、热力浮层、人流粒子、路径流动线
CameraLayer   CameraDirector（无人机运镜：总览/推近/跟拍/环绕/拉高）
PostLayer     Bloom + Vignette（EffectComposer，可降级关闭）
```

### 9.2 世界层参数

- **天空**：渐变穹顶，颜色随虚拟时钟走完**完整 24h 昼夜循环**（与现实一致）：白天（07:30–16:30）明亮蓝调 + 暖白太阳；清晨（06:00–07:30）低角度暖金日出；黄昏（16:30–18:30）橙红渐变；夜晚（19:00–06:00）深蓝（`#0b1220` → `#16233a`）+ 月光 + 楼宇窗带自发光点亮 + 灯柱点亮。太阳/月亮方向光的位置与强度由时刻推算（06:00 日出、18:00 日落）。默认从周二 09:58（白天）开始，时间条可拖到任意时刻验证昼夜。
- **地面**：深色沙盘底座（`#0d1420`），细网格（1m 细线 + 10m 粗线，透明度 0.06/0.12），边缘微发光描边。
- **路网**：道路按 `roads` 折线生成发光条带（city `#2b4a6f`、main `#3d6ea5`、minor `#24405f`，自发光强度 0.6），上有缓慢流动的虚线光点。
- **水系**：景观湖 = 半透明平面（`#123a52`，opacity 0.85 + 高光）；北部景观河同理贴路径。
- **绿化**：InstancedMesh 树阵（~600 棵低多边形锥形树，沿道路与广场边缘伪随机分布，种子固定）。
- **灯柱**：InstancedMesh（~120 个），夜景时顶端自发光。
- **远景**：生活区体块（低饱和 `#1a2637`），只参与天际线与热力层。

### 9.3 楼宇层参数

- **材质**：`meshPhysicalMaterial`，transmission 0.35、roughness 0.25；按 kind 着色基色（library `#3d7ea6`、admin `#4a6fa5`、teaching `#3a5f8a`、faculty `#35618c`、canteen `#4f7a6a`、venue/sports `#5a6f9a`）。
- **描边**：`Edges` 线框（`#7fb2e5`，opacity 0.5）。
- **楼顶状态光带**：每栋楼顶一圈 0.4m 发光带，颜色 = 该楼聚合状态（free 绿 `#34d399` / busy 灰 `#6b7280` / repair 红 `#ef4444` / matched 蓝 `#38bdf8` / selected 金 `#f5c542` / hot 橙红 `#fb7185`），2.6s 呼吸。
- **标签**：drei `Html` 悬浮牌（楼名 + 占用率%），仅 landmark 楼与 camera 距离 < 700 的楼显示，上限 12 个。
- **夜景窗户**：每栋楼 4~8 条横向窗带，自发光随 occupancy 与昼夜系数变化。

### 9.4 三级下钻

```txt
Lv0 校园总览：全部楼宇 + 世界层
Lv1 楼宇聚焦：点击楼 -> 楼体抬升 +12m，其余楼降透明至 0.15，镜头环绕推近
Lv2 楼层剖层：楼体按楼层切片，层间距展开 1.8x，非目标层 opacity 0.25
Lv3 房间浮出：目标房间小方块从楼层中抬出 + 发光描边 + 信息气泡（房间号/容量/设备/当前状态）
面包屑：沙盘左上角「校园 / 图书馆 / 3F / 302」，逐级可点返回
注：图书馆 `floors=6` 含地下 1 层；剖层与楼层展开按地上 5 层（`floorGuide` 的 5 层）进行，B1 不参与下钻。
```

### 9.5 八个 Wow 时刻（参数化，录屏锚点）

| # | 名称 | 触发 | 参数 |
|---|---|---|---|
| 1 | 首屏唤醒 | 页面加载 | 楼宇从地面 800ms 依次弹起（stagger 60ms，弹性曲线），光带呼吸，道路光流启动，镜头 3s 内从 1200m 缓推到 780m |
| 2 | 扫描命中 | book_room | 全场降亮 40% -> 一道扫描光沿 X 轴 1.2s 掠过 -> 候选楼顶依次点亮金光（间隔 200ms）-> 镜头 1.4s 推到最近候选楼 |
| 3 | 剖层下钻 | 点击候选 | 见 9.4 Lv1→Lv3，全程 1.8s |
| 4 | 异常脉冲 | repair | 镜头 0.9s 快切到目标楼 -> 目标房间红色脉冲（半径 6→18m 扩散环，1s 循环）+ 楼顶光带变红 + 告警图标浮起 |
| 5 | 热力爆发 | admin_overview | 镜头拉高到 1100m 俯视 -> 楼宇按 occupancy 升高（最大 +60%）-> 热力浮层（半透明橙红渐变贴合楼顶）-> 人流粒子加密 3 倍 |
| 6 | 金色路径 | navigate | 路径曲线从起点"生长"（drawRange 动画 2s），流动光点沿线奔跑，镜头 3.5s 低空跟拍全程 |
| 7 | 下课潮汐 | 虚拟时钟过整 50 分 | 教学楼群人流粒子喷涌 -> 沿道路汇向食堂/图书馆，持续 90s 衰减 |
| 8 | 昼夜切换 | 时间条拖过 18:00 | 天空 2s 过渡 -> 灯柱点亮 -> 楼宇窗带亮起 -> Bloom 强度 +40% |

### 9.6 CameraDirector 镜头语言

```ts
type Shot =
  | { kind: 'overview' }                                   // 780m 45° 总览，呼吸浮动 ±6m/8s
  | { kind: 'push'; buildingId: string; ms: number }       // 推到楼前 120m
  | { kind: 'orbit'; buildingId: string; ms: number }      // 环绕 360°
  | { kind: 'follow'; route: NavigationRoute; ms: number } // 低空跟拍
  | { kind: 'topdown'; ms: number }                        // 拉高俯视（态势）
  | { kind: 'room'; roomId: string; ms: number }           // 房间特写
```

实现：`useFrame` 中对 camera position/target 做 damp 插值（`THREE.MathUtils.damp`），用户可拖拽打断，任务态 1.2s 后柔和回到导演镜头。

### 9.7 性能预算（硬指标）

```txt
桌面 60fps 目标 / 30fps 底线；首屏 < 3s 可交互
draw call < 220；三角形 < 450k
树/灯柱/窗带/人流粒子全部 InstancedMesh 或 Points
人流粒子上限 1200；标签上限 12；Bloom 可关（低配自动关）
dpr 上限 1.75；低端机 dpr=1 + 关 Bloom + 粒子减半（自动探测 + 手动开关）
```

---

## 10. UI 视觉方向

```txt
中栏：深色指挥沙盘（#0b1220 系），视觉重心
左栏：浅色工作台（#f6f8fb），Agent 步骤卡 = 任务调度单（非聊天气泡）
右栏：浅色服务台，面板可切换，强调"可操作"
品牌色：理性蓝绿 #0ea5a3（主）/ #38bdf8（候选蓝）/ #f5c542（选中金）/ #ef4444（异常红）
字体：系统栈 + 数字用 tabular-nums；标题 600，正文 400
价值标签（顶部常驻）：「N系统→1入口」「10秒办事」「可复制到社区·园区·医院·政务」「新生·访客·无障碍友好」
```

---

## 11. 状态管理（Zustand）

```ts
interface CampusState {
  world: WorldData
  rooms: Room[]; devices: Device[]; bookings: Booking[]; tickets: Ticket[]

  clock: { virtualTs: string; rate: 0 | 1 | 10 | 60; running: boolean }
  snapshot: CampusSnapshot                  // 由模拟引擎按 clock 产出，1s 节流刷新

  currentIntent?: Intent
  agentSteps: AgentStep[]
  messages: { role: 'user' | 'agent'; text: string; ts: number }[]

  selectedRoomId?: string; selectedBuildingId?: string
  highlightedRoomIds: string[]
  activePanel: 'overview' | 'booking' | 'repair' | 'navigation' | 'admin'
  sceneMode: 'idle' | 'searching' | 'booking' | 'repair' | 'overview' | 'navigation'
  heatMode: 'none' | 'energy' | 'traffic' | 'occupancy'
  drill: { level: 0 | 1 | 2 | 3; buildingId?: string; floor?: number; roomId?: string }
  cameraShot?: Shot
  quality: 'high' | 'low'

  submitCommand: (text: string) => Promise<void>
  confirmBooking: (roomId: string) => void
  createTicket: (input: { roomId: string; deviceType?: DeviceType; desc: string }) => Ticket
  advanceTicket: (id: string) => void
  setDrill: (d: CampusState['drill']) => void
  setHeatMode: (m: CampusState['heatMode']) => void
  setClockRate: (r: CampusState['clock']['rate']) => void
  runDemoScript: (id: 'booking' | 'repair' | 'overview' | 'navigate') => Promise<void>
}
```

原则：3D/图表/面板全部只读 store；一切变更走 action；`demoScenarios` 一键复现四条链路。

---

## 12. 文件树

```txt
campus-twin/
  index.html
  package.json  vite.config.ts  tsconfig.json  tailwind.config.ts  postcss.config.js
  public/
    campus-zjgsu.json            # 世界底稿（从项目根目录拷贝）
  src/
    main.tsx
    app/App.tsx  app/providers.tsx
    styles/globals.css
    types/index.ts               # 第 6 节全部类型
    data/
      world.ts                   # 加载 campus-zjgsu.json -> WorldData
      seedRooms.ts               # 确定性生成房间/设备/课表（lib/rng.ts）
      demoScenarios.ts           # 四条链路一键脚本
    sim/
      clock.ts                   # SimClock
      tides.ts                   # 课表潮汐/食堂窗/图书馆曲线
      energy.ts  traffic.ts
      engine.ts                  # pulseAt / trafficOnRoads
    agent/
      parseIntent.ts             # 规则解析（别名表/正则/槽位）
      aliases.ts
      dispatchIntent.ts          # 编排 + 步骤流产出
      handlers/bookingHandler.ts repairHandler.ts navigationHandler.ts
      handlers/overviewHandler.ts infoHandler.ts
      llm.ts                     # 可选增强插槽（默认关）
    lib/
      rng.ts                     # 种子 PRNG（mulberry32）
      time.ts  ids.ts  roomSearch.ts  pathfind.ts  format.ts
    store/campusStore.ts
    components/
      layout/AppShell.tsx TopBar.tsx CommandPanel.tsx ServiceDesk.tsx BottomBar.tsx
      agent/ChatInput.tsx MessageList.tsx AgentTimeline.tsx AgentStepCard.tsx
      service/OverviewPanel.tsx BookingPanel.tsx RepairPanel.tsx AdminPanel.tsx NavigationPanel.tsx
      charts/OccupancyChart.tsx EnergyTrendChart.tsx TrafficChart.tsx   # ECharts
      campus3d/
        CampusCanvas.tsx         # Canvas + 相机 + Post 挂载
        world/Ground.tsx SkyDome.tsx Roads.tsx Water.tsx Greenery.tsx DistantQuarters.tsx
        buildings/BuildingMesh.tsx BuildingLabels.tsx StatusLightBand.tsx WindowBands.tsx
        effects/ScanBeam.tsx Drilldown.tsx PulseMarker.tsx HeatLayer.tsx FlowParticles.tsx RouteFlow.tsx
        camera/CameraDirector.tsx
      ui/Button.tsx Badge.tsx Tabs.tsx KpiCard.tsx Breadcrumb.tsx
```

---

## 13. 开发阶段与验收

### 阶段 0：脚手架

```bash
npm create vite@latest campus-twin -- --template react-ts
cd campus-twin
npm i zustand three @react-three/fiber @react-three/drei @react-three/postprocessing echarts framer-motion lucide-react
npm i -D tailwindcss@^3 postcss autoprefixer @types/three
```

注：Tailwind 锁 v3 —— §12 文件树中 `tailwind.config.ts` + `postcss.config.js` 为 v3 风格，v4 配置方式不同。图表使用原生 `echarts` + 薄 React 封装（`components/charts/`），`echarts-for-react` 未声明支持 React 19，不引入。

验收：`npm run dev` 启动；`npm run build` 通过。

### 阶段 1：三栏骨架 + 数据层

- AppShell 三栏 + 顶栏 + 底栏；Tailwind 主题色
- `types` + `world.ts` 加载 campus-zjgsu.json + `seedRooms.ts`（21 楼 → ~214 房间，确定性）
- Zustand store 骨架；右栏 OverviewPanel 展示楼宇统计

验收：页面三栏可见；OverviewPanel 显示 21 栋楼与房间总数；`npm run build` 通过。

### 阶段 2：Agent + 业务闭环（不依赖 3D）

- parseIntent（8 意图）+ 4 handler + 步骤流
- parseIntent 测试矩阵（`npm i -D vitest`；覆盖 8 意图示例句/口语变体、别名归一化、槽位抽取、unknown 兜底）
- BookingPanel/RepairPanel 完整闭环；AgentTimeline 渲染步骤
- demoScenarios 一键跑四条链路（此时 3D 区为占位深色块）
- 路径引擎 `lib/pathfind.ts` 在本阶段落地（导航面板需要真实分段指引；3D 金色路径在阶段 4 接入）

验收：输入四条演示语句，左栏步骤流 + 右栏面板全部正确联动；预约/报修状态回写 store；`npm run test` 与 `npm run build` 通过。

### 阶段 3：3D 世界接入

- WorldLayer 全部（地面/天空/路网/水系/绿化/远景）
- 虚拟时钟开始走字（pause/1x/10x/60x + 时间条可拖到任意时刻）；天空/光照/窗带/灯柱按 §9.2 的 24h 昼夜循环联动
- BuildingLayer（21 楼 + 光带 + 标签）+ 状态色
- CameraDirector 基础（overview/push/topdown）
- sceneMode/heatMode 驱动；点选楼宇

验收：首屏即"活着的沙盘"；Agent 高亮能点亮楼宇；右栏确认后楼顶光带变色；拖动时间条可见白天/黄昏/夜晚过渡（窗带与灯柱夜间点亮）；桌面 30fps+。

### 阶段 4：Wow 效果 + 四级联动

- ScanBeam / Drilldown 三级下钻 / PulseMarker / HeatLayer / FlowParticles / RouteFlow
- Wow #2–#6 落地（#1 首屏唤醒在阶段 6；#7 下课潮汐在阶段 5；#8 昼夜切换已在阶段 3 接入）；面包屑
- PostLayer（Bloom + Vignette，quality=low 自动关闭；夜晚 Bloom 强度 +40%）
- 跟拍运镜（路径引擎已在阶段 2 落地）

验收：四条链路每条都有对应的 3D 高光；下钻/返回稳定；30 秒连续操作无卡顿。

### 阶段 5：管理态势 + 模拟引擎打磨

- AdminPanel（KPI + ECharts 三图 + 异常列表 + 调度建议）
- 潮汐/能耗/人流模型调参；时间条（暂停/1x/10x/60x）驱动全场
- 下课潮汐 Wow、昼夜切换 Wow

验收：拖动时间条，沙盘热力/KPI/图表同源变化；下课脉冲可见；点击异常定位楼宇。

### 阶段 6：路演打磨

- 首屏唤醒编排；四个演示脚本微调；价值标签落位；降级开关
- 录屏 30 秒高光走查；`npm run build && npm run preview` 全链路 smoke
- 静态部署：`vite.config.ts` 配置 `base`，构建产物上传静态托管（GitHub Pages / Vercel 任一）；验收：分享链接可打开、断网可演

验收：第 14 节总清单全绿。

---

## 14. 总验收清单

- [ ] `npm run dev` 打开即用，无需登录，断网可演（LLM 插槽默认关闭）
- [ ] 首屏 3 秒内形成"活着的浙商大沙盘"观感（楼宇弹起 + 光带呼吸 + 道路光流）
- [ ] 沙盘呈现 ≥ 21 栋真实档案楼宇，图书馆/综合楼/经管楼参数与官方档案一致
- [ ] 四条链路全部闭环：预约 / 报修（含"三号楼"别名解析）/ 态势 / 新生导航
- [ ] 每条链路有对应 3D Wow：扫描点亮 / 红色脉冲剖层 / 热力爆发 / 金色路径跟拍
- [ ] 三级下钻 + 面包屑返回稳定
- [ ] Agent 步骤流（规划-执行-验证）可见，且与真实业务执行一致
- [ ] 管理态势 KPI/图表/热力同源；点击异常定位楼宇；至少一条调度建议
- [ ] 虚拟时钟可暂停/变速；下课潮汐与昼夜切换可演示
- [ ] 顶部价值标签可见；界面标注"演示数据 · 结构可替换真实系统"
- [ ] 桌面 30fps+；低配模式可一键降级
- [ ] 可录 30 秒高光：开场沙盘 → 一句话预约 → 剖层确认 → 报修脉冲 → 态势热力

---

## 15. 30 秒路演脚本

```txt
00-03s  首屏：沙盘自转唤醒，楼宇弹起，光带呼吸（不说话，让画面说话）
03-08s  "校园里预约、报修、找教室、看态势，原本在 N 个系统里。"
08-18s  输入"帮我找一个现在空着、有投影、能坐 8 个人的会议室"
        -> 扫描光掠过浙商大 -> 候选楼点亮 -> 剖层 -> 确认 -> 预约回执
18-24s  输入"三号楼 302 投影坏了" -> C 楼红色脉冲剖层 -> 工单生成
24-29s  输入"看一下现在全校哪里最紧张" -> 镜头拉高 -> 热力爆发 -> 调度建议
29-30s  收束字幕："N 个系统，1 句话。可复制到社区、园区、医院、政务大厅。"
```

---

## 16. 风险与降级

| 风险 | 对策 |
|---|---|
| 3D 性能不足 | 预算写死（9.7）；quality=low 自动关 Bloom、粒子减半、dpr=1 |
| 真实布局被质疑 | 界面与路演口径：「位置为官方地图抽象，面积层数为官方档案」；campus-zjgsu.json 单文件可替换为测绘数据 |
| 规则 Agent 听不懂长句 | 兜底 unknown 意图给示例；LLM 插槽预留；演示语句已全覆盖测试 |
| 时间不够 | 阶段 0-4 为 P0 不可砍；阶段 5 图表可砍一张；阶段 6 昼夜切换可砍 |

## 17. 一句话总结

**v3.0 把 CampusTwin 从"一个不错的 3D Demo"升级为"踩在真实校园肩膀上的活数字孪生"：真的校园、真的档案、真的潮汐、一句话调度 —— 评审看到的是未来公共服务的样子。**
