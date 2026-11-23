import { useEffect, useRef } from "react";

/**
 * Sets the tab title and moves focus to the page heading on navigation, so
 * screen-reader and keyboard users land at the start of the new page.
 */
export function usePageTitle(title: string) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} · Interview Practice Agent`;
  }, [title]);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: false });
  }, []);
  return headingRef;
}
