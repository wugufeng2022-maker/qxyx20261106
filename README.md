# 慢慢 · 乡野骑行

用 Three.js r187 制作的浏览器骑行游戏。沿 10 公里乡间小路骑行，经过林荫、湖岸、村庄和果园。可以停下来等鸭群过路，也可以邀请小兔或小猫同行。

## 本地运行

需要 Node.js 20.19+（20.x）或 22.12+。

```sh
npm ci
npm run dev
```

打开终端打印的地址。用 `npm test` 跑测试，用 `npm run build` 生成可静态部署的 `dist/`。

## 骑行

- 点击「出发，去吹吹风」开始自动骑行。
- 轻点 W / ↑ 或「加速」切换持续加速。按住 S / ↓ 刹车。用 A / ←、D / → 或鼠标转向。
- 手机使用画面下方的触控按钮，支持时也可启用倾斜转向。
- 用「换个视角」切换镜头，用空格或「暂停骑行」歇一会儿。
- 开发模式的「场景跳转 DEV」可直接前往指定路段。绘画湖畔可用 `?previewAt=1123&previewPainting=1` 预览。

## 修改游戏

- `src/main.js` 管理骑行循环、镜头和界面。
- `src/route.js` 与 `src/scenery.js` 定义路线、地形和环境。路线规划见 [10 公里路线设计](docs/NATURAL-WORLD-ROUTE-PLAN.md)。
- `src/rider.js` 定义骑手和骑行动作。
- `assets/bicycle/` 和 `assets/rider/` 包含可编辑的 Blender 工程以及游戏使用的模型数据。对应目录的 README 记录导出方式，`assets/` 中还保留了素材的来源和许可。

协作时可从 `main` 新建分支，运行测试和构建后再提交 PR。
