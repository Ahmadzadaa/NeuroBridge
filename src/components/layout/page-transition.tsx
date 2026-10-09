/**
 * The fade-and-lift every dashboard page enters with.
 *
 * This wrapper used to be the reason a page could come up completely blank. It
 * was a framer-motion element starting at `opacity: 0`, relying on an
 * animation frame to bring its children back. `requestAnimationFrame` does not
 * run while a document is hidden — a page opened in a background tab, a
 * restored session, a tab switched away from mid-load — so the animation never
 * started and the content stayed invisible even once the tab was brought
 * forward. Nothing looked wrong in the DOM or the console: the markup was all
 * there, at zero opacity.
 *
 * It is now a plain element carrying a CSS animation whose resting state is
 * the visible one (see `.animate-enter` in globals.css). If the animation never
 * runs, the content is simply there.
 *
 * No longer a client component: there is nothing left to run in the browser,
 * so this no longer pulls framer-motion into every dashboard page's bundle.
 * The `exit` variant it used to declare was dead configuration — exit variants
 * only run inside an `AnimatePresence`, and there is none above this.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="animate-enter">{children}</div>;
}
