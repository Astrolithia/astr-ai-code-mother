import { API_BASE_URL } from "@/lib/api/mutator/custom-fetch"

/**
 * Mirrors StaticResourceController#serveStaticResource: `/static/{key}/**`
 * resolves `{key}` against CODE_OUTPUT_ROOT_DIR, and the generation pipeline
 * writes each app's output to `{codeGenType}_{appId}` there — independent of
 * `deployKey`, which only exists once the app has been deployed.
 */
export function getAppPreviewUrl(codeGenType: string, appId: string): string {
  return `${API_BASE_URL}/static/${codeGenType}_${appId}/`
}
