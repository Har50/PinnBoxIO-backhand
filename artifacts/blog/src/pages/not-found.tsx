import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";

export default function NotFound() {
  return (
    <Layout>
      <SEO
        title="Page Not Found"
        description="The page you are looking for could not be found."
      />
      <div className="container mx-auto px-4 md:px-8 max-w-2xl py-24 md:py-32 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            404 — Page Not Found
          </h1>
        </div>
        <p className="text-lg text-muted-foreground mb-10">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to the blog
        </Link>
      </div>
    </Layout>
  );
}
