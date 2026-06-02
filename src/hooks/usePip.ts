import { useCallback, useEffect, useState } from 'react'

export const PIP_SUPPORTED = typeof window !== 'undefined' && 'documentPictureInPicture' in window

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

  const close = useCallback(() => {
    pipWindow?.close()
  }, [pipWindow])

  const open = useCallback(async () => {
    if (!PIP_SUPPORTED || pipWindow) return
    try {
      // A square mini window, as requested.
      const w = await window.documentPictureInPicture!.requestWindow({ width: 320, height: 320 })
      copyStyles(w)
      w.document.documentElement.dataset.theme = document.documentElement.dataset.theme ?? 'light'
      w.document.documentElement.lang = document.documentElement.lang
      w.document.body.classList.add('pip-body')
      // Restore to the main window when the user closes the PiP window.
      w.addEventListener('pagehide', () => setPipWindow(null), { once: true })
      setPipWindow(w)
    } catch {
      /* user dismissed the request, or it failed — leave state untouched */
    }
  }, [pipWindow])

  const toggle = useCallback(() => {
    if (pipWindow) close()
    else void open()
  }, [pipWindow, close, open])

  // Close the PiP window if the app unmounts.
  useEffect(() => () => pipWindow?.close(), [pipWindow])

  return { pipWindow, isOpen: pipWindow != null, supported: PIP_SUPPORTED, toggle, open, close }
}
