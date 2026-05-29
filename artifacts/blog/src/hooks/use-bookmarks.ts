import { useState, useEffect, useCallback } from "react";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pinnbox_blog_bookmarks");
      if (stored) {
        setBookmarks(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load bookmarks from localStorage", e);
    }
  }, []);

  const toggleBookmark = useCallback((slug: string) => {
    setBookmarks((prev) => {
      const isBookmarked = prev.includes(slug);
      const newBookmarks = isBookmarked
        ? prev.filter((s) => s !== slug)
        : [...prev, slug];
      
      try {
        localStorage.setItem("pinnbox_blog_bookmarks", JSON.stringify(newBookmarks));
      } catch (e) {
        console.error("Failed to save bookmarks to localStorage", e);
      }
      
      return newBookmarks;
    });
  }, []);

  return { bookmarks, toggleBookmark };
}
