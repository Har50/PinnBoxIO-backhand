import { Link } from "wouter";
import { Bookmark } from "lucide-react";
import { format } from "date-fns";
import type { BlogPost } from "@workspace/api-client-react";
import { useBookmarks } from "@/hooks/use-bookmarks";

export function BlogCard({ post, index }: { post: BlogPost; index: number }) {
  const { bookmarks, toggleBookmark } = useBookmarks();
  const isBookmarked = bookmarks.includes(post.slug);

  const formattedDate = post.publishedAt
    ? format(new Date(post.publishedAt), "MMMM d, yyyy")
    : "Recently";

  return (
    <article 
      className="group flex flex-col sm:flex-row gap-6 md:gap-8 items-start animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Cover Image */}
      {post.coverImage && (
        <Link href={`/${post.slug}`} className="w-full sm:w-1/3 aspect-[4/3] sm:aspect-square md:aspect-[4/3] overflow-hidden rounded-xl shrink-0 block">
          <img 
            src={post.coverImage} 
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </Link>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col h-full justify-center min-w-0">
        <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground mb-3">
          <time dateTime={post.publishedAt || undefined}>{formattedDate}</time>
          {post.readingMinutes && (
            <>
              <span>•</span>
              <span>{post.readingMinutes} min read</span>
            </>
          )}
        </div>

        <Link href={`/${post.slug}`} className="block group-hover:opacity-80 transition-opacity">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight leading-snug mb-3 line-clamp-2">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed line-clamp-2 mb-4">
              {post.excerpt}
            </p>
          )}
        </Link>

        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex gap-2 flex-wrap min-w-0">
            {post.tags?.slice(0, 3).map((tag) => (
              <Link 
                key={tag} 
                href={`/category/${tag}`}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
              >
                {tag}
              </Link>
            ))}
          </div>

          <button 
            onClick={(e) => {
              e.preventDefault();
              toggleBookmark(post.slug);
            }}
            className={`p-2 rounded-full transition-colors ${
              isBookmarked ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </article>
  );
}
