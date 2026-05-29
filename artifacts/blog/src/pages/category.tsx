import { useParams, Link } from "wouter";
import { useListBlogPosts } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { BlogCard } from "@/components/blog-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function Category() {
  const params = useParams();
  const tag = params.tag || "";
  
  const { data: postsData, isLoading } = useListBlogPosts(
    { tag }, 
    { query: { enabled: !!tag, queryKey: ["blogPosts", { tag }] } }
  );

  const posts = postsData?.posts || [];

  return (
    <Layout>
      <SEO title={`${tag} posts`} />
      
      <div className="container mx-auto px-4 md:px-8 max-w-4xl py-12 md:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to all posts
        </Link>
        
        <header className="mb-16">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
            <span className="text-muted-foreground">Topic:</span> {tag}
          </h1>
          <p className="text-lg text-muted-foreground">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'} found.
          </p>
        </header>

        <div className="space-y-16">
          {isLoading ? (
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
              <h3 className="text-xl font-medium mb-2">No posts found</h3>
              <p className="text-muted-foreground">There are currently no posts tagged with "{tag}".</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
