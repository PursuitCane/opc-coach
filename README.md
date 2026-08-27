# opc-sage · OPC 军师

投资人视角的商业 BP 诊断与优化工具。黑客松 demo 项目。

上传商业计划书（PDF），军师按红杉资本 pitch 六维度打分点评，陪你追问完善，最后产出一版优化后的 BP。

> Tag: `#shenicest-fission`

## 功能

1. 上传 PDF，浏览器端解析文本
2. 红杉六维度评估：公司使命 / 痛点问题 / 产品方案 / 市场规模 / 竞争格局 / 团队与财务
3. 打分 + 雷达图 + 逐项亮点与改进建议
4. 就报告多轮追问、补充信息
5. 一键产出优化后的 BP（Markdown，可下载）

## 技术栈

- React + Vite + TypeScript（纯前端，无后端）
- `pdfjs-dist` — 浏览器端 PDF 解析
- `recharts` — 六维度雷达图
- `react-markdown` — 报告与优化 BP 渲染
- AI：OpenAI 兼容中转（`api.openai-next.com`），模型 `gpt-5`

## 本地运行

```bash
npm install
cp .env.example .env   # 填入 API key
npm run dev
```

> ⚠️ 纯前端直连，`VITE_*` key 会打包进产物、浏览器可见。
> 务必用中转站的限额 key，别用主账号 key，demo 后作废。

详见 [REQUIREMENTS.md](./REQUIREMENTS.md)。
