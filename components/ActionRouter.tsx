"use client";

import { useEffect } from "react";

const PHONE_URI = "tel:+13469097822";

export function ActionRouter() {
  useEffect(() => {
    function handleAction(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;

      const href = link.getAttribute("href") ?? "";

      if (href.startsWith("tel:")) {
        event.preventDefault();
        event.stopPropagation();

        try {
          if (window.top && window.top !== window) {
            window.top.location.href = PHONE_URI;
          } else {
            window.location.href = PHONE_URI;
          }
        } catch {
          window.location.href = PHONE_URI;
        }
        return;
      }

      if (href === "/quote" || href.startsWith("/quote?")) {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign(new URL(href, window.location.origin).toString());
      }
    }

    document.addEventListener("click", handleAction, true);
    return () => document.removeEventListener("click", handleAction, true);
  }, []);

  return null;
}
