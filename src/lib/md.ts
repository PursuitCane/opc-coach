// Markdown file → text (just read as UTF-8)
export async function extractMdText(file: File): Promise<string> {
  const text = await file.text()
  const trimmed = text.trim()
  if (trimmed.length < 20) {
    throw new Error('Markdown 内容太短，换一份更完整的材料。')
  }
  return trimmed
}
