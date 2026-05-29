import { useListBlogPosts } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { BlogCard } from "@/components/blog-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookmarks } from "@/hooks/use-bookmarks";

export default function Bookmarks() {
  const { bookmarks } = useBookmarks();
  
  // Fetch all posts - in a real app with pagination we'd fetch specific IDs, 
  // but for a CMS-backed marketing blog, fetching all/recent is fine to filter client-side
  const { data: postsData, isLoading } = useListBlogPosts(
    { limit: 100 }, 
    { query: { queryKey: ["blogPosts", "all"] } }
  );

  const posts = postsData?.posts || [];
  const bookmarkedPosts = posts.filter(post => bookmarks.includes(post.slug));

  return (
    <Layout>
      <SEO title="Saved Posts" />
      
      <div className="container mx-auto px-4 md:px-8 max-w-4xl py-12 md:py-20">
        <header className="mb-16">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
            Bookmarks
          </h1>
          <p className="text-lg text-muted-foreground">
            Articles you've saved to read later.
          </p>
        </header>

        <div className="space-y-16">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-6 md:gap-8">
                <Skeleton className="w-full sm:w-1/3 aspect-[4/3] rounded-xl" />
                <div className="flex-1 space-y-4 py-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ))
          ) : bookmarkedPosts.length > 0 ? (
            bookmarkedPosts.map((post, i) => <BlogCard key={post.id} post={post} index={i} />)
          ) : (
            <div className="text-center py-24 bg-muted/30 rounded-2xl border border-border border-dashed">
              <h3 className="text-xl font-medium mb-2">No saved posts</h3>
              <p className="text-muted-foreground">Click the bookmark icon on any article to save it here.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
