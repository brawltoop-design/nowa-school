"use client";

import { useEffect } from "react";

export function CourseActivityBeacon({ courseId }: { courseId: string }) {
  useEffect(() => {
    const storageKey = `nowa-course-activity:${courseId}`;
    const previous = window.sessionStorage.getItem(storageKey);
    const now = Date.now();

    if (previous) {
      const previousTs = Number(previous);

      if (Number.isFinite(previousTs) && now - previousTs < 30 * 60_000) {
        return;
      }
    }

    window.sessionStorage.setItem(storageKey, String(now));
    void fetch("/api/learning/activity", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ courseId }),
    });
  }, [courseId]);

  return null;
}
