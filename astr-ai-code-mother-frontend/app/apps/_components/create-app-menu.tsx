"use client"

import { FileCode2, Files, PanelsTopLeft } from "lucide-react"

import { CreateMenu } from "@/components/create-menu"
import { CODE_GEN_TYPE, CODE_GEN_TYPE_OPTIONS } from "@/lib/app-code-gen"

const MODE_ICONS = {
  [CODE_GEN_TYPE.HTML]: FileCode2,
  [CODE_GEN_TYPE.MULTI_FILE]: Files,
  [CODE_GEN_TYPE.VUE_PROJECT]: PanelsTopLeft,
}

const ITEMS = CODE_GEN_TYPE_OPTIONS.map((option) => ({
  ...option,
  icon: MODE_ICONS[option.value],
}))

/** Only Astr's labels and action are adapted; the visual component is Bencho's. */
export function CreateAppMenu({ onChoose, pending }: {
  onChoose: (codeGenType: string) => void
  pending: boolean
}) {
  return (
    // The original supports an optional stroke. Use it on Astr's white page,
    // rather than changing its white fill to grey or adding a lifted-card shadow.
    <div className="crt-inline" data-stroke="on">
      <CreateMenu label="生成应用" items={ITEMS} pending={pending} onSelect={onChoose} />
    </div>
  )
}
