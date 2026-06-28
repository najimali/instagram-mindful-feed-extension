// Performance Manager — throttles DOM observation so we never scan more
// than once per animation frame, and debounces rapid mutation bursts.

export function rafThrottle(fn: () => void): [MutationCallback, () => void] {
  let pending = false;
  let rafId   = 0;

  const callback: MutationCallback = () => {
    if (pending) return;
    pending = true;
    rafId = requestAnimationFrame(() => {
      pending = false;
      fn();
    });
  };

  const cancel = () => {
    cancelAnimationFrame(rafId);
    pending = false;
  };

  return [callback, cancel];
}

export function watchDOM(
  target: Node,
  onMutation: () => void,
): () => void {
  const [throttled, cancel] = rafThrottle(onMutation);
  const observer = new MutationObserver(throttled);
  observer.observe(target, { childList: true, subtree: true });
  return () => { cancel(); observer.disconnect(); };
}
