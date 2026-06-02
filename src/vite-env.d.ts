/// <reference types="vite/client" />

// Minimal typings for the Document Picture-in-Picture API, which is not yet in
// the standard DOM lib. https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API
interface DocumentPictureInPictureOptions {
  width?: number
  height?: number
  disallowReturnToOpener?: boolean
  preferInitialWindowPlacement?: boolean
}

interface DocumentPictureInPicture extends EventTarget {
  readonly window: Window | null
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture
}
