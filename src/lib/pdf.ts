// 浏览器端 PDF 文本提取（pdf.js）
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const parts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(text)
  }

  const full = parts.join('\n\n').trim()
  if (full.length < 20) {
    throw new Error('没能从 PDF 提取到足够文本，可能是扫描件或图片型 PDF。请换一份或手动粘贴文本。')
  }
  return full
}
