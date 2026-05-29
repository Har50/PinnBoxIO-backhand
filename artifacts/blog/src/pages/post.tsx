import { useParams } from "wouter";
import { useGetBlogPost } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Bookmark, ArrowLeft } from "lucide-react";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { Link } from "wouter";

export default function Post() {
  const params = useParams();
  const slug = params.slug || "";
  
  const { data: post, isLoading } = useGetBlogPost(slug, { 
    query: { enabled: !!slug, queryKey: ["blogPost", slug] } 
  });
  
  const { bookmarks, toggleBookmark } = useBookmarks();
  const isBookmarked = bookmarks.includes(slug);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 max-w-3xl py-12 md:py-20">
          <Skeleton className="h-6 w-24 mb-12" />
          <Skeleton className="h-12 w-3/4 mb-6" />
          <Skeleton className="h-6 w-1/2 mb-12" />
          <Skeleton className="aspect-video w-full rounded-2xl mb-12" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <SEO title="Post Not Found" />
        <div className="container mx-auto px-4 max-w-3xl py-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Post not found</h1>
          <p className="text-muted-foreground mb-8">This article doesn't exist or has been removed.</p>
          <Link href="/" className="text-primary hover:underline inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to blog
          </Link>
        </div>
      </Layout>
    );
  }

  const formattedDate = post.publishedAt 
    ? format(new Date(post.publishedAt), "MMMM d, yyyy") 
    : "Recently";

  return (
    <Layout>
      <SEO 
        title={post.seoTitle || post.title} 
        description={post.seoDescription || post.excerpt || undefined} 
        image={post.coverImage || undefined}
        type="article"
      />
      
      {/* JSON-LD Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "image": post.coverImage ? [post.coverImage] : [],
          "datePublished": post.publishedAt || new Date().toISOString(),
          "author": [{
            "@type": "Person",
            "name": post.author || "PinnboxIO Team"
          }]
        })}
      </script>

      <article className="container mx-auto px-4 max-w-3xl py-12 md:py-20 animate-in fade-in duration-700">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Back to all posts
        </Link>

        <header className="mb-12">
          <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground mb-6">
            <time dateTime={post.publishedAt || undefined}>{formattedDate}</time>
            {post.readingMinutes && (
              <>
                <span>•</span>
                <span>{post.readingMinutes} min read</span>
              </>
            )}
            {post.tags && post.tags.length > 0 && (
              <>
                <span>•</span>
                <span>{post.tags[0]}</span>
              </>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight mb-8">
            {post.title}
          </h1>

          <div className="flex items-center justify-between py-6 border-y border-border/60">
            <div className="flex items-center gap-4">
              <img 
                src={`${import.meta.env.BASE_URL}avatar-fallback.png`} 
                alt={post.author || "Author"} 
                className="w-10 h-10 rounded-full object-cover bg-secondary"
              />
              <div>
                <p className="font-medium text-sm">{post.author || "PinnboxIO Team"}</p>
              </div>
            </div>
            
            <button 
              onClick={() => toggleBookmark(post.slug)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isBookmarked 
                  ? "bg-primary/10 text-primary hover:bg-primary/20" 
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
              {isBookmarked ? "Saved" : "Save post"}
            </button>
          </div>
        </header>

        {post.coverImage && (
          <figure className="mb-16 -mx-4 md:mx-0">
            <img 
              src={post.coverImage} 
              alt={post.title} 
              className="w-full aspect-[21/9] object-cover md:rounded-2xl"
            />
          </figure>
        )}

        {post.aiSummary && (
          <div className="mb-12 p-6 rounded-xl bg-secondary/50 border border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              AI Summary
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {post.aiSummary}
            </p>
          </div>
        )}

        <div 
          className="prose prose-slate dark:prose-invert prose-lg max-w-none 
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-img:w-full
            prose-pre:bg-secondary prose-pre:border prose-pre:border-border"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
        
        {post.tags && post.tags.length > 0 && (
          <div className="mt-16 pt-8 border-t border-border flex gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground flex items-center mr-2">Tagged with:</span>
            {post.tags.map((tag) => (
              <Link 
                key={tag} 
                href={`/category/${tag}`}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm px-3 py-1 rounded-full transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </article>
    </Layout>
  );
}
