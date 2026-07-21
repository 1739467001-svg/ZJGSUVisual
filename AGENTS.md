# AGENTS.md — CampusTwin 工作约定

## 项目

- `campus-twin/`：React 19 + Three.js(r3f) 浙商大下沙数字孪生（Vite）。
- 世界底稿 `campus-zjgsu.json`（仓库根 + `campus-twin/public/` 两份，由 `campus-twin/scripts/build-world.mjs` 同时生成，**禁止手工只改一份**）。OSM 原始数据重拉：`scripts/fetch-osm.mjs`（`--cached` 离线重建）。
- 规格文档：`CampusTwin_ZJGSU版_产品与技术规格_v3.0.md`。

## 质量门槛（每次提交前必过）

```bash
cd campus-twin
npm run lint && npm test && npm run uicheck   # 91 测试 + 全链路 UI 断言
npm run shots                                  # 截图回归，drawCalls 预算 < 220
```

## 发布约定（每一次更新都必须走完，不得只提交本地）

1. `git commit`（批次化信息：阶段/批次 + 改动摘要 + 根因）
2. `git push origin main`
3. `campus-twin/scripts/deploy.sh`（自动 build + 推 gh-pages，临时克隆不碰工作区）
4. 等 Pages `built` 后 `curl` 核对线上 index.html 的 bundle 哈希与本地 `dist/` 一致

线上地址：https://1739467001-svg.github.io/ZJGSUVisual/
网络抖动时重试推送，不得把"推送失败"当作完成态结束任务。

## 关键约束

- 断网可演：运行时零外部请求（OSM 数据离线生成进 JSON；LLM 插槽默认关闭）。
- 性能预算（规格 §9.7）：drawCall < 220、三角形 < 450k；树/灯柱/窗带/配楼必须实例化或合并。
- 新增 world 字段要同步 `src/types/index.ts` 与 `src/data/world.ts` 的运行时校验。
- `pathfind.ts` 的 `getGraph` 有模块级缓存：world 热替换需清缓存（测试各自独立进程无碍）。
