import { useCallback, useEffect, useState } from 'react'

export const PIP_SUPPORTED = typeof window !== 'undefined' && 'documentPictureInPicture' in window

export interface PipSize {
  width: number
  height: number
}

const DEFAULT_SIZE: PipSize = { width: 320, height: 320 }

/** Copy the main document's styles into the PiP document so it looks identical. */
function copyStyles(target: Window) {
  const head = target.document.head
  // Clone <style> blocks (Vite dev / runtime CSS) and <link rel="stylesheet">
  // (production build + Google Fonts). The PiP window is a separate document,
  // so styles must be attached to it explicitly.
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    head.appendChild(node.cloneNode(true))
  })
  // Constructed/adopted stylesheets, if any are in use.
  const adopted = (document as Document & { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets
  if (adopted?.length) {
    try {
      ;(target.document as Document & { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets = [...adopted]
    } catch {
      /* cross-document adoption not allowed in some versions — clones above cover it */
    }
  }
}

/**
 * Manages a Document Picture-in-Picture window. Returns the PiP window (so the
 * caller can portal a React subtree into its <body> — keeping state in sync
 * automatically, since it's the same React tree) plus open/close controls.
 */
export function usePip() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  // Create the PiP window at the given size. No open-guard here so it can also
  // be used to reopen at a new size; callers guard as needed.
  const spawn = useCallback(async (size: PipSize) => {
    const w = await window.documentPictureInPicture!.requestWindow({ width: size.width, height: size.height })
    copyStyles(w)
    w.document.documentElement.dataset.theme = document.documentElement.dataset.theme ?? 'light'
    w.document.documentElement.lang = document.documentElement.lang
    w.document.body.classList.add('pip-body')
    // Restore to the main window when this window closes — but only clear state
    // if it's still the current one (guards against an old window's pagehide
    // firing after a resize has already swapped in a new window).
    w.addEventListener('pagehide', () => setPipWindow((cur) => (cur === w ? null : cur)), { once: true })
    setPipWindow(w)
  }, [])

  const close = useCallback(() => {
    pipWindow?.close()
  }, [pipWindow])

  const open = useCallback(
    async (size: PipSize = DEFAULT_SIZE) => {
      if (!PIP_SUPPORTED || pipWindow) return
      try {
        await spawn(size)
      } catch {
        /* user dismissed the request, or it failed — leave state untouched */
      }
    },
    [pipWindow, spawn],
  )

  const toggle = useCallback(
    (size: PipSize = DEFAULT_SIZE) => {
      if (pipWindow) close()
      else void open(size)
    },
    [pipWindow, close, open],
  )

  // Resize an open PiP window by reopening it (Document PiP can't be resized in
  // place): open the new window first, then close the previous one — so if the
  // reopen fails the existing window is left untouched. Best-effort: relies on
  // the originating user gesture still being a valid transient activation.
  const resize = useCallback(
    async (size: PipSize) => {
      if (!PIP_SUPPORTED || !pipWindow) return
      const previous = pipWindow
      try {
        await spawn(size)
        // spawn() has now set state to the new window; closing the old one's
        // pagehide is a no-op thanks to the identity guard in spawn().
        previous.close()
      } catch {
        /* reopen failed — keep the existing window */
      }
    },
    [pipWindow, spawn],
  )

  // Close the PiP window if the app unmounts.
  useEffect(() => () => pipWindow?.close(), [pipWindow])

  return { pipWindow, isOpen: pipWindow != null, supported: PIP_SUPPORTED, toggle, open, close, resize }
}
