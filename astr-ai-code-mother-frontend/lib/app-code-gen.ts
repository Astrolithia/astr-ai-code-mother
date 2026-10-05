// Mirrors CodeGenTypeEnum.java.
export const CODE_GEN_TYPE = {
  HTML: "html",
  MULTI_FILE: "multi_file",
  VUE_PROJECT: "vue_project",
} as const

export const CODE_GEN_TYPE_OPTIONS = [
  { value: CODE_GEN_TYPE.HTML, label: "原生 HTML 模式" },
  { value: CODE_GEN_TYPE.MULTI_FILE, label: "原生多文件模式" },
  { value: CODE_GEN_TYPE.VUE_PROJECT, label: "Vue 工程模式" },
]

const CODE_GEN_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CODE_GEN_TYPE_OPTIONS.map((o) => [o.value, o.label]),
)

export function formatCodeGenType(value?: string): string {
  if (!value) return "-"
  return CODE_GEN_TYPE_LABEL[value] ?? value
}

/** Vue projects only become previewable after the backend's async
 *  `npm install && npm run build` finishes, some time after the stream ends. */
export function needsBuild(codeGenType?: string): boolean {
  return codeGenType === CODE_GEN_TYPE.VUE_PROJECT
}
