# 滑动变祖 · 人像与视频生成交接

## 结论

- 计划关键图：**24 张**
- 已生成：**24 / 24**
- 分辨率与色彩：**1024 × 1024，RGB**
- 生成图目录：`packages/dsh-client-liang-intensity-skin/assets/portrait-source-v2/`
- 原视频关键帧目录：`packages/dsh-client-liang-intensity-skin/assets/portrait-source-v2/references/`
- 原视频：`packages/dsh-client-liang-intensity-skin/assets/liang-evolution.webm`

`stage-low.png`、`stage-mid.png`、`stage-max.png` 是早期别名。后续生图和生视频只使用表格里的 24 个规范文件名。

## 公共提示词

下面这段作为每张图的公共提示词。把大括号变量替换为表格中对应内容；阶段服装、表情和装饰必须以该阶段原视频关键帧为准。

```text
Use case: identity-preserve
Asset type: square key portrait for a continuous image-to-video character evolution sequence

Primary request:
Using {REFERENCE_FRAME} as the authoritative stage reference, create the level {LEVEL} key portrait of the same Chinese adult man. Preserve his identity exactly: facial structure, glasses, hairstyle, skin tone, age, eye spacing, nose, mouth and overall proportions. Preserve the outfit, expression, posture and stage-specific accessories shown in the authoritative reference. Do not borrow clothing or accessories from a later stage.

Composition and camera:
Photorealistic 1:1 studio portrait, 1024×1024. Full centered half-body composition from the top of the head to the waist or slightly below the waist. The complete head, shoulders, upper arms and torso must remain inside the frame. Keep generous and balanced safety margins on the top, left and right. The head must be clearly smaller than a headshot and must not dominate the frame. Front-facing, eye-level camera, symmetrical posture, 85mm portrait-lens look, no perspective distortion.

Continuity:
Use {PREVIOUS_KEY} and {NEXT_KEY} only as continuity references. Keep eye line, head size, shoulder width, body scale, camera distance, background horizon and light direction consistent across the sequence. Changes from adjacent keys must be gradual and attributable only to increasing intensity. Do not change identity. Do not introduce an intermediate transition pose or motion blur.

Scene and lighting:
Clean full-frame studio background with a subtle neutral gradient appropriate to this stage. The background must fill the entire square evenly; do not bake a left-side blank layout or right-side placement into the image. Soft frontal key light, restrained rim light, realistic skin texture, natural fabric texture, high-end editorial photography.

Constraints:
No close-up crop. No cropped head, shoulders, arms or torso. No side pose. No extra person. No duplicated limbs or accessories. No text, logo, UI, frame, border or watermark. No motion blur. No transition frame. No exaggerated fantasy elements beyond those already visible in the authoritative stage reference. Output only the final square image to {OUTPUT_PATH}.
```

## 24 张关键图状态表

| 顺序 | 强度 | 实际时间戳 | 状态 | 规范输出文件 | 权威阶段参考图 | 连续性参考 |
|---:|---:|---:|---|---|---|---|
| 1 | 00 | 0.000s | 已生成 | `stage-00.png` | `references/stage-00-0.000s.png` | 下一张 `level-01.png` |
| 2 | 01 | 0.268s | 已生成 | `level-01.png` | `references/level-01-0.268s.png` | 前一张 `stage-00.png`；下一张 `level-03.png` |
| 3 | 03 | 0.803s | 已生成 | `level-03.png` | `references/level-03-0.803s.png` | 前一张 `level-01.png`；下一张 `level-04.png` |
| 4 | 04 | 1.071s | 已生成 | `level-04.png` | `references/level-04-1.071s.png` | 前一张 `level-03.png`；下一张 `stage-06.png` |
| 5 | 06 | 1.600s | 已生成 | `stage-06.png` | `references/stage-06-1.600s.png` | 前一张 `level-04.png`；下一张 `level-07.png` |
| 6 | 07 | 1.874s | 已生成 | `level-07.png` | `references/level-07-1.874s.png` | 前一张 `stage-06.png`；下一张 `level-09.png` |
| 7 | 09 | 2.410s | 已生成 | `level-09.png` | `references/level-09-2.410s.png` | 前一张 `level-07.png`；下一张 `level-10.png` |
| 8 | 10 | 2.678s | 已生成 | `level-10.png` | `references/level-10-2.678s.png` | 前一张 `level-09.png`；下一张 `stage-12.png` |
| 9 | 12 | 3.200s | 已生成 | `stage-12.png` | `references/stage-12-3.200s.png` | 前一张 `level-10.png`；下一张 `level-13.png` |
| 10 | 13 | 3.481s | 已生成 | `level-13.png` | `references/level-13-3.481s.png` | 前一张 `stage-12.png`；下一张 `level-14.png` |
| 11 | 14 | 3.749s | 已生成 | `level-14.png` | `references/level-14-3.749s.png` | 前一张 `level-13.png`；下一张 `bridge-15.png` |
| 12 | 15（桥接） | 4.000s | 已生成 | `bridge-15.png` | `references/bridge-15-4.000s.png` | 前一张 `level-14.png`；下一张 `level-16.png` |
| 13 | 16 | 4.284s | 已生成 | `level-16.png` | `references/level-16-4.284s.png` | 前一张 `bridge-15.png`；下一张 `level-17.png` |
| 14 | 17 | 4.552s | 已生成 | `level-17.png` | `references/level-17-4.552s.png` | 前一张 `level-16.png`；下一张 `stage-18.png` |
| 15 | 18 | 4.800s | 已生成 | `stage-18.png` | `references/stage-18-4.800s.png` | 前一张 `level-17.png`；下一张 `level-19.png` |
| 16 | 19 | 5.088s | 已生成 | `level-19.png` | `references/level-19-5.088s.png` | 前一张 `stage-18.png`；下一张 `level-21.png` |
| 17 | 21 | 5.623s | 已生成 | `level-21.png` | `references/level-21-5.623s.png` | 前一张 `level-19.png`；下一张 `level-22.png` |
| 18 | 22 | 5.891s | 已生成 | `level-22.png` | `references/level-22-5.891s.png` | 前一张 `level-21.png`；下一张 `stage-24.png` |
| 19 | 24 | 6.400s | 已生成 | `stage-24.png` | `references/stage-24-6.400s.png` | 前一张 `level-22.png`；下一张 `level-25.png` |
| 20 | 25 | 6.694s | 已生成 | `level-25.png` | `references/level-25-6.694s.png` | 前一张 `stage-24.png`；下一张 `bridge-27.png` |
| 21 | 27（桥接） | 7.200s | 已生成 | `bridge-27.png` | `references/bridge-27-7.200s.png` | 前一张 `level-25.png`；下一张 `level-28.png` |
| 22 | 28 | 7.497s | 已生成 | `level-28.png` | `references/level-28-7.497s.png` | 前一张 `bridge-27.png`；下一张 `level-29.png` |
| 23 | 29 | 7.765s | 已生成 | `level-29.png` | `references/level-29-7.765s.png` | 前一张 `level-28.png`；下一张 `stage-30.png` |
| 24 | 30 | 8.000s | 已生成 | `stage-30.png` | `references/stage-30-8.000s.png` | 前一张 `level-29.png` |

所有表格路径均相对于本文件所在目录。

## 生视频输入顺序

```text
stage-00.png
level-01.png
level-03.png
level-04.png
stage-06.png
level-07.png
level-09.png
level-10.png
stage-12.png
level-13.png
level-14.png
bridge-15.png
level-16.png
level-17.png
stage-18.png
level-19.png
level-21.png
level-22.png
stage-24.png
level-25.png
bridge-27.png
level-28.png
level-29.png
stage-30.png
```

视频 agent 应锁定镜头、构图和人物位置，只在相邻关键图之间做外观演化；不要加入推拉、横移、眨眼、转头、嘴部动作或随机肢体运动。输出仍按当前 UI 使用的 1:1 方形画幅制作，左侧留白和人物右移由 UI 的裁切、定位与渐变遮罩完成。
