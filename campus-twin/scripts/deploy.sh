#!/usr/bin/env bash
# 部署 campus-twin/dist 到 GitHub Pages（gh-pages 分支）
# 在独立临时克隆中操作，不碰当前工作区与 main 分支
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="https://github.com/1739467001-svg/ZJGSUVisual.git"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
npm run build

git clone --depth 1 "$REPO" "$TMP/repo"
cd "$TMP/repo"
git checkout --orphan gh-pages
git rm -rf . >/dev/null 2>&1 || true
cp -R "$ROOT/dist/"* .
touch .nojekyll
git add .
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')"
git push origin gh-pages --force

echo "✓ 已推送 gh-pages：https://1739467001-svg.github.io/ZJGSUVisual/"
