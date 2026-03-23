# NexDay MVP PRD（桌面周计划小插件）

## 1. Objective
做一个 Windows 桌面常驻小插件：导入课程表/外部计划，自动生成从周一 00:00 开始的一周生活计划（包含睡眠/运动等锚点），支持临时安排插入后自动液态重排，并用 P0/P1/P2 优先级确保关键时间。

## 2. Target Users
- 大学生：课程表 + 自习/健身计划 + 备考
- 初入职场：会议 + 深度工作块

## 3. Scope
### In
- 周视图 Planner（24h）+ 悬浮 Widget（Now/Next）
- FixedEvent（课程/睡眠/运动等）与 FlexibleBlock（学习/任务块）
- ICS 导入（固定事件）+ CSV 导入（灵活块）
- 周计划自动排程（确定性启发式）
- 临时安排（Interruptions）插入 + 自动重排（优先级保护）
- 本地持久化（JSON store for MVP）

### Out
- Google/Outlook 双向同步
- 账号系统、云端同步
- 复杂项目管理（Gantt/关键路径）
- 强 AI 全自动“凭空生成任务”（可选后续）

## 4. Entities
- FixedEvent: 不可轻易移动（导入课程/用户锁定睡眠等）
- FlexibleBlock: 可移动的计划块（P0/P1/P2）
- Interruption: 插入的临时固定事件，触发重排

## 5. Priority rules
- P0：必须保障（尽量不被其他灵活块挤掉）
- P1：重要
- P2：可让步

## 6. Scheduling
- 周起点：本地时区的周一 00:00
- 排程：冻结 FixedEvent → 计算空档 → 按 P0→P1→P2、deadline、duration 贪心填空
- 放不下：进入 Pool 并显示原因

## 7. Liquid rescheduling
- 插入 Interruption 后：找出被覆盖的 FlexibleBlock → 按优先级从高到低重新放置
- 保护：低优先级不允许挤掉高优先级（必要时低优先级进入 Pool）
- 级联上限：MVP 限制最多移动 N 个块，避免“计划大洗牌”

## 8. Acceptance criteria
- 周视图可创建/拖拽/缩放/删除块，重启不丢
- ICS 导入可在周视图显示；CSV 导入可生成灵活块
- 一键 Auto-plan 生成一周计划，不与 FixedEvent 冲突
- 插入临时安排后，系统能重排并保住 P0 块（尽量）

## 9. Milestones
- Week 1：周视图 + 本地存储 + Widget + 手动块
- Week 2：ICS/CSV 导入 + 自动排程 + 液态重排 v1 + 打包/演示脚本
