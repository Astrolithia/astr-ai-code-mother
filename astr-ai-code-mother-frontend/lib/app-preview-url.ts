import { API_BASE_URL } from "@/lib/api/mutator/custom-fetch"
import { needsBuild } from "@/lib/app-code-gen"

/**
 * Mirrors StaticResourceController#serveStaticResource: `/static/{key}/**`
 * resolves `{key}` against CODE_OUTPUT_ROOT_DIR, and the generation pipeline
 * writes each app's output to `{codeGenType}_{appId}` there — independent of
 * `deployKey`, which only exists once the app has been deployed.
 *
 * Vue projects are served from their build output. The controller only maps
 * a bare `/` to index.html, so `dist/index.html` must be spelled out; the
 * generated vite.config uses `base: './'`, so its asset URLs resolve under dist/.
 */
export function getAppPreviewUrl(codeGenType: string, appId: string): string {
  const root = `${API_BASE_URL}/static/${codeGenType}_${appId}/`
  return needsBuild(codeGenType) ? `${root}dist/index.html` : root
}
