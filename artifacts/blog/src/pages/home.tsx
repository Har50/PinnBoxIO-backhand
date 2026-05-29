import { useListBlogPosts, useListBlogTags } from "@workspace/api-client-react";
import { Link } from "wouter";
import { BlogCard } from "@/components/blog-card";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: postsData, isLoading: isLoadingPosts } = useListBlogPosts({}, { query: { queryKey: ["blogPosts"] } });
  const { data: tags, isLoading: isLoadingTags } = useListBlogTags({ query: { queryKey: ["blogTags"] } });

  const posts = postsData?.posts || [];

  return (
    <Layout>
      <SEO title="Latest Updates & Insights" />
      
      <div className="container mx-auto px-4 md:px-8 max-w-5xl py-12 md:py-20">
        <header className="mb-16 md:mb-24 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
            Thoughts on building a calmer inbox.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Product updates, deep-dives into productivity, and stories from the PinnboxIO team.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          <div className="flex-1 space-y-16">
            {isLoadingPosts ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-6 md:gap-8">
                  <Skeleton className="w-full sm:w-1/3 aspect-[4/3] rounded-xl" />
                  <div className="flex-1 space-y-4 py-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ))
            ) : posts.length > 0 ? (
              posts.map((post, i) => <BlogCard key={post.id} post={post} index={i} />)
            ) : (
              <div className="text-center py-24 bg-muted/30 rounded-2xl border border-border border-dashed">
                <h3 className="text-xl font-medium mb-2">No posts yet</h3>
                <p className="text-muted-foreground">Check back soon for our first article.</p>
              </div>
            )}
          </div>

          <aside className="w-full lg:w-64 shrink-0">
            <div className="sticky top-24">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground mb-6">
                Topics
              </h3>
              {isLoadingTags ? (
                <div className="flex flex-wrap lg:flex-col gap-3">
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
              ) : tags && tags.length > 0 ? (
                <div className="flex flex-wrap lg:flex-col gap-2 lg:gap-3">
                  {tags.map((tag) => (
                    <Link
                      key={tag.name}
                      href={`/category/${tag.name}`}
                      className="inline-flex items-center justify-between px-3 py-1.5 rounded-md hover:bg-secondary text-sm font-medium transition-colors"
                    >
                      <span>{tag.name}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-2">
                        {tag.count}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
