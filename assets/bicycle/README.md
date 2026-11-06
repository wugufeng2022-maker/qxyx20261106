# Meadow 自行车 · 第一版

原创程序建模的休闲城市自行车：鼠尾草绿车架、奶油色胎边、棕色座椅和握把、编织前篮筐、挡泥板、后货架、车灯、车铃及传动部件。

## 文件

- `meadow-bicycle.blend`：可编辑 Blender 工程，含展示用灯光、地面和相机。
- `meadow-bicycle.glb`：供 Three.js 加载的模型，仅包含自行车，不含展示场景。材质已包含，无外部纹理依赖。
- `../../previews/meadow-bicycle.png`：1440 × 1080 实际模型渲染图。
- `../../scripts/build_bicycle.py`：完整建模脚本，可调整参数并重新生成。

## 模型规格

- 单位：米；车轮半径 0.365 m，轴距 1.19 m。
- 21,684 个三角形，29 个网格，11 种材质；GLB 608,248 字节。
- Blender 中 +X 为前方、+Z 为上方；导出的 glTF 中 +X 为前方、+Y 为上方。
- 模型默认车轮着地，根节点为 `Bicycle`。
- 已保留运动部件的枢轴，尚未制作烘焙动画或骑行控制。

## Three.js 中的运动节点

| 节点 | 用途 | glTF / Three.js 中的旋转轴 |
| --- | --- | --- |
| `Wheel_Rear` | 后轮 | 局部 Z |
| `Wheel_Front` | 前轮，随转向节点运动 | 局部 Z |
| `Steering` | 车把、前叉、前轮、前篮筐整体转向 | 局部 Y（简化转向轴） |
| `Crank` | 曲柄、齿盘与脚踏位置 | 局部 Z |
| `Pedal_Left`、`Pedal_Right` | 脚踏平台 | 局部 Z，反向抵消曲柄角度可保持平台水平 |

`GLTFLoader.load()` 后，可以通过 `gltf.scene.getObjectByName()` 获取这些节点。沿 +X 行驶时，车轮绕 Z 轴的增量为 `-移动距离 / 0.365` 弧度。

## 重新生成

从项目根目录执行：

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/build_bicycle.py
```

脚本在独立的 Blender 后台进程中工作，输出上述工程、模型与预览。重新执行会替换这些生成文件。
