"use client";

// Bencho Create menu — MIT, Copyright (c) 2026 Lorenzo Cabra.
// Full licence: THIRD_PARTY_NOTICES.md. Original comments retained below.
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { FileText, Folder, Grid2x2, Loader2, Plus, Table2, type LucideIcon } from "lucide-react";
import { useCreateMenuTokens } from "./create-menu-tokens";

/* ══ Liquid ═══════════════════════════════════════════════
   Three metaball studies: a toggle, a reorderable list, and
   a create menu.

   RECONSTRUCTED. The original file was destroyed; this is
   rebuilt against the surviving stylesheet, which specifies
   the geometry, the layering and the timing exactly. The
   behaviour matches what index.css and the catalog demos
   require. The original's internal reasoning is not
   recoverable and is not reproduced here.

   ── the shared constraint ───────────────────────────────
   Everything on a filtered layer must be OPAQUE. The goo
   filter thresholds alpha, so a translucent fill under it
   disappears. That is why each of these has two layers: an
   opaque blob layer that carries the filter, and an unfiltered
   layer above it carrying the text — antialiased type would
   be eaten by the same threshold. */

/* ── inlined from lab/motionkit ──────────────────────── */
/* ══ liquid ═══════════════════════════════════════════════
   Shared parts for the Framer Motion layer: one spring, one
   goo filter, one velocity→skew binding.

   ── why the filter is a hook ────────────────────────────
   The filter is embedded in each component's own return, but
   its id CANNOT be a literal. Every block here renders twice
   at once — once in the wall card, once in the detail overlay
   — and duplicate SVG ids do not scope, they collide: the
   second instance silently steals the first one's filter.
   useId() gives each mount its own name.

   ── what the goo can and cannot do ──────────────────────
   This is feGaussianBlur + feColorMatrix, not a shader. The
   matrix multiplies alpha by `cut` and subtracts half of it,
   so alpha below 0.5 lands on zero and everything above 0.536
   is fully opaque. That hard edge is what fuses nearby shapes
   into one blob — and it is also why this must never touch
   text: glyph antialiasing lives entirely below 0.5, so type
   under this filter loses its edges and then itself. */

/* the elastic, as specified: ζ = 14 / (2·√(220·0.5)) ≈ 0.67,
   so it overshoots about 6% before it settles. A deliberate
   bounce, not a wobble. */
const LIQUID = {
  type: "spring" as const,
  stiffness: 220,
  damping: 14,
  mass: 0.5,
};

/* Non-drag blocks reuse the same feel without the overshoot,
   so a toggle does not bounce like a dragged card. */
/* ── the same liquid, without the overshoot ────────────────
   For shapes whose corner radius is animating: a spring that
   passes its target drags the radius past it too, and corners
   that dip under and come back read as a wobble rather than
   as a bounce.

   NOT just LIQUID with more damping, which is what this was.
   Raising damping alone to 30 against the same stiffness put
   ζ at 1.43 — comfortably overdamped, so it stopped
   overshooting by creeping: about 470ms to settle, against
   LIQUID's 290ms. It read as slow because it was.

   Stiffness comes up with the damping instead, which holds ζ
   at 1.03 — no overshoot, and it lands in about 180ms. */
const LIQUID_STILL = { ...LIQUID, stiffness: 420, damping: 30 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ══ 3 · Create ═══════════════════════════════════════════
   One shape, and no filter on it — the other studies fuse two
   or more shapes, this has exactly one, so a blur could only
   damage it. The liquid here is entirely in the timing: the
   press sinks, and the spread starts while the sink is still
   running so there is never a still frame.

   The pill's width is measured from its own label and written
   back as --pill-w, so the label can change without the shape
   jumping. */

const ITEMS = [
  { icon: FileText, label: "Document", value: "document" },
  { icon: Table2, label: "Spreadsheet", value: "spreadsheet" },
  { icon: Grid2x2, label: "Board", value: "board" },
  { icon: Folder, label: "Folder", value: "folder" },
];

/* ── the menu's corners, and there are three ───────────────
   The panel is 28, the rows inside it are cut to 28 less the
   10px inset — concentric, which is what makes a row look like
   it belongs in the panel rather than merely sitting in one —
   and the shut pill is a 38px button, so 19 is round for it.

   One knob moves all three because they are one relationship:
   turn it down and the panel, the pill and the rows square off
   together. Each is capped at half its own height, past which
   a bigger number draws the same shape. */
const CRT_CORNER = 28;
const CRT_MAX = 40;

export interface CreateMenuItem {
  icon: LucideIcon;
  label: string;
  value: string;
}

export interface CreateMenuProps {
  corner?: number;
  label?: string;
  items?: readonly CreateMenuItem[];
  disabled?: boolean;
  pending?: boolean;
  onSelect?: (value: string) => void;
}

export function CreateMenu({
  corner = CRT_CORNER,
  label = "Create",
  items = ITEMS,
  disabled = false,
  pending = false,
  onSelect,
}: CreateMenuProps = {}) {
  const [open, setOpen] = useState(false);
  const [sink, setSink] = useState(false);

  const panel = useRef<HTMLDivElement | null>(null);
  const say = useRef<HTMLSpanElement | null>(null);
  const beat = useRef(0);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const reducedMotion = useCreateMenuTokens(panel);

  const [sayW, setSayW] = useState(96);
  /* ── MEASURE TWICE: ONCE NOW, ONCE THE FONT IS REAL ────────
     .crt-say clips whatever it cannot fit, so this width being
     even slightly short takes the right edge off the last
     letter — and it was short two different ways.

     The rounding: offsetWidth is an integer and the label is
     not. "Create" measures 42.46 and comes back 42. The +1 is
     the fix; the error is always under a pixel so a pixel
     always covers it, and the pill is centred on the label so
     the spare costs nothing.

     The race, which is the one that made it intermittent: a
     layout effect runs before a webfont has swapped in, so on
     a cold cache this measured "Create" in the FALLBACK face
     and then froze that number for good. Warm cache measured
     Inter and looked fine — same code, different result, which
     is why it only cut the word sometimes. So measure again
     when the fonts are actually ready. */
  useLayoutEffect(() => {
    const el = say.current;
    if (!el) return;
    let live = true;
    const measure = () => { if (live) setSayW(el.offsetWidth + 1); };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    return () => { live = false; };
  }, [label, pending]);

  useEffect(() => () => {
    window.clearTimeout(beat.current);
  }, []);

  /* No close button and no title bar — anywhere but the menu
     puts it away. Registered only while it is open, and in an
     effect, so the very press that opened it cannot close it
     on the same click. */
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      /* ── a press by SOMEBODY, not by the page ─────────────
         This listens on the document, so it hears every press
         anywhere — including the ones other components'
         demonstrations dispatch at themselves. One component
         performing is harmless; several at once are not. On a
         page showing six of them side by side this menu was
         opened by its own demonstration and then slammed shut
         a moment later by a neighbour's, and the rest of its
         script went on clicking a row that was no longer
         there.

         "Anywhere but the menu puts it away" was always about
         a person reaching past it. A scripted press on another
         component is not somebody deciding to leave. */
      if (!e.isTrusted) return;
      /* ── ASK THE VISIBLE BOX, NOT THE RESERVED ONE ───────
         This used to be panel.current.contains(target), and
         `panel` is the STAGE — the square this block reserves
         so that opening the menu does not resize the card
         under it. The stage is 305x305; the menu it holds is
         265x208. Everything in between is stage, so every
         press in it counted as a press on the menu and did
         nothing: measured at 48px of dead ground above the
         panel and 49 below, which is why closing it meant
         clicking well clear of the block rather than just off
         the menu.

         Hit-tested against the panel's own rectangle instead.
         Geometry rather than containment, because the thing
         that must be hit is smaller than the element the ref
         points at and there is no node covering only it — the
         liquid body is painted, not laid out.

         The rect is read per press rather than kept, since it
         is a different size on every frame of the open. */
      const box = panel.current
        ?.querySelector(".crt-panel")
        ?.getBoundingClientRect();
      const on =
        !!box &&
        e.clientX >= box.left && e.clientX <= box.right &&
        e.clientY >= box.top && e.clientY <= box.bottom;
      if (!on) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  // Integration only: move focus into the original rows, without changing their animation.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => rows.current[0]?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const press = () => {
    if (disabled || pending || sink) return;
    setSink(true);
    window.clearTimeout(beat.current);
    /* 60ms handoff against a 120ms sink: the spread begins
       while the press is still running. It was 95, which is
       most of the sink — long enough to read as a pause before
       anything opened. */
    beat.current = window.setTimeout(() => {
      setSink(false);
      setOpen(true);
    }, reducedMotion ? 0 : 60);
  };

  const close = () => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };

  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    const current = rows.current.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    switch (event.key) {
      case "Escape": event.preventDefault(); event.stopPropagation(); close(); return;
      case "Tab":
        // The hidden trigger is removed from tab order while open. Return to it
        // before the browser performs its normal forward/backward Tab navigation.
        close(); return;
      case "ArrowDown": next = (current + 1) % items.length; break;
      case "ArrowUp": next = (current - 1 + items.length) % items.length; break;
      case "Home": next = 0; break;
      case "End": next = items.length - 1; break;
      default: return;
    }
    event.preventDefault();
    rows.current[next]?.focus({ preventScroll: true });
  };

  /* glyph + gap + label + the padding either side */
  const pillW = 18 + 8 + sayW + 34;

  /* the two the animation needs as NUMBERS — Framer writes
     borderRadius inline, so it cannot read a css variable */
  const panelR = clamp(corner, 0, CRT_MAX);
  const shutR = Math.min(19, panelR * (19 / CRT_CORNER));
  // The supplied four-row menu is 166px tall. Each row away from four adds or
  // removes its 34px height + 2px gap; every other number stays.
  const panelH = 166 + (items.length - 4) * 36;

  return (
    <motion.div
      className="crt-stage"
      data-open={open || undefined}
      data-sink={sink || undefined}
      ref={panel}
      onKeyDown={navigate}
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      style={{
        "--pill-w": `${pillW}px`,
        "--panel-h": `${panelH}px`,
        "--crt-r": `${clamp(corner, 0, CRT_MAX)}px`,
        /* the shut pill is 38 tall, so 19 is as round as it goes */
        "--crt-shut-r": `${Math.min(19, clamp(corner, 0, CRT_MAX) * (19 / CRT_CORNER)).toFixed(2)}px`,
        /* concentric: the panel's corner less its 10px inset,
           and no rounder than the 34px row's own half */
        "--crt-row-r": `${Math.min(17, Math.max(0, clamp(corner, 0, CRT_MAX) - 10)).toFixed(2)}px`,
      } as CSSProperties}
    >
      <div className="crt-blobs" aria-hidden="true">
        {/* LIQUID_STILL, not LIQUID. A spring past the target
            takes the corner radius with it — the corners dip
            under 28 and come back, which is a wobble, not a
            bounce. This is the one shape here that must not
            overshoot. */}
        <motion.div
          className="crt-body"
          initial={false}
          animate={{
            width: open ? 212 : pillW,
            height: open ? panelH : 38,
            /* ── from the knob, not from two literals ──────
               Framer writes this inline every frame, so the
               stylesheet's `var(--r)` on .crt-body never gets
               a look in — the CSS variables set on the stage
               reach the ROWS, and this shape has to be told
               separately. Same two numbers the vars carry:
               the panel's own corner, and a 38px pill's half
               when it is shut. */
            borderRadius: open ? panelR : shutR,
          }}
          transition={reducedMotion ? { duration: 0 } : LIQUID_STILL}
        />
      </div>

      <button
        ref={trigger}
        type="button"
        className="crt-pill"
        onClick={press}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            press();
          }
        }}
        disabled={disabled || pending}
        tabIndex={open ? -1 : 0}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-busy={pending}
        aria-label={pending ? "正在创建应用" : label}
      >
        <span className="crt-glyph" aria-hidden="true">
          {pending ? <Loader2 size={16} strokeWidth={2} className="animate-spin motion-reduce:animate-none" /> : <Plus size={16} strokeWidth={2} />}
        </span>
        <span className="crt-say" style={{ width: sayW || undefined }}>
          <span ref={say}>{pending ? "正在创建" : label}</span>
        </span>
      </button>

      <div className="crt-panel" aria-hidden={!open} inert={!open}>
        {/* each row lights its own wash — see .crt-item button::before;
            nothing travels between them */}
        <ul className="crt-menu" id={menuId} role="menu" aria-label="选择应用生成模式">
          {items.map((it, i) => (
            <li
              className="crt-item"
              key={it.value}
              role="none"
              /* tightened with the shell. The last row used to
                 start at 162ms — after a box that now finishes
                 in 180 — so the menu kept arriving for half a
                 second after it had opened. */
              style={{ transitionDelay: open ? `${30 + i * 22}ms` : "0ms" }}
            >
              <button
                ref={(el) => { rows.current[i] = el; }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={disabled || pending}
                onClick={() => {
                  if (!open || disabled || pending) return;
                  close();
                  onSelect?.(it.value);
                }}
              >
                <it.icon size={15} strokeWidth={2} aria-hidden="true" />
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
