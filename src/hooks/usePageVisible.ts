"use client";

import { useState, useEffect } from "react";

export function usePageVisible() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    function handleChange() {
      setVisible(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", handleChange);
    return () => document.removeEventListener("visibilitychange", handleChange);
  }, []);

  return visible;
}
