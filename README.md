# OPC Coach · 项目工作台

面向"一人公司/独立创业者"的 AI 创业陪伴教练。黑客松 demo。

上传 PDF/Markdown 材料，教练读完给出五维度评估、追问、优化商业计划、沉淀成长记录。

## 六个 Tab

1. **商业分析**：五维度评分（市场机会 / 客户价值 / 商业模式 / 竞争壁垒 / 获客能力）+ 亮点 / 问题 / 两周行动建议
2. **优化商业计划**：AI 找出 4 个信息缺口 → 用户答题 → 生成带 TOC 的 v2 计划书
3. **苏格拉底式追问**：教练不给答案，只把问题推到能被回答的地方；流式回复
4. **成长记录**：把对话总结成日记条目 + 28 天热力图 + 教练的一句话
5. **服务市场**：按最弱维度排序的教练/社群卡片（静态）
6. **材料管理**：只读展示上传的材料

## 技术栈

- Vite + React 19 + TypeScript
- `zustand` + `persist` → localStorage（刷新保留全部状态）
- `pdfjs-dist` — 浏览器端 PDF 解析
- `react-markdown` — 计划书渲染
- 手写 SVG 雷达图
- AI：OpenAI 兼容中转（`api.openai-next.com`），模型 `gpt-5`

## 本地运行

```bash
npm install
cp .env.example .env   # 填入 API key
npm run dev
```

> ⚠️ `VITE_*` 变量会打包进前端，浏览器可见。务必用中转站的限额 key，别用主账号 key，demo 后作废。

## 演示脚本

1. 登录页 → 点"登录，进入工作台"
2. 拖 PDF 或 Markdown 材料到空态页 → 输入项目名 → 创建
3. 4 步进度条走完（后台是真的 AI 分析）→ 落到分析页
4. 点某条行动建议的"带这条去追问" → 跳到 Chat，input 已预填
5. Chat 里问一句 → 教练流式回复
6. 回顶栏点"优化商业计划" → AI 生成 4 道题 → 填答案 → 生成 v2 计划书
7. Tab "成长记录" → 点"总结这次对话" → 追问被压成一条日记
8. Tab "服务市场" → 排在前面的是当前最弱维度对应的服务
9. 刷新浏览器 → 所有状态从 localStorage 恢复

## 结构

```
src/
  App.tsx                        # 按 screen 分发
  store/                         # zustand + persist
  lib/
    ai.ts                        # callAI / callAIJson / callAIStream
    pdf.ts / md.ts               # 材料解析
  prompts/                       # 各 tab 的 system + JSON schema
  screens/                       # Login / Empty / Creating / Workbench
  tabs/                          # Analysis / Plan / Chat / Diary / Market / Materials
  components/                    # Header / RadarChart / MarkdownView / FileDropzone
```

## 已知边界

- 只支持一个项目（demo 硬约束）
- 材料本轮不能追加/删除（Tab 6 只读）
- PDF/MD 单文件 ≤ 10MB
- 飞书/Notion/企微接入本轮不实现
