// Mirrors CodeGenTypeEnum.java — the only two values the backend ever sets.
const CODE_GEN_TYPE_LABEL: Record<string, string> = {
  html: "原生 HTML 模式",
  multi_file: "原生多文件模式",
}

export function formatCodeGenType(value?: string): string {
  if (!value) return "-"
  return CODE_GEN_TYPE_LABEL[value] ?? value
}
