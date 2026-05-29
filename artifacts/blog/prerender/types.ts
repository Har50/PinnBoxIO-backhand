export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  author: string | null;
  publishedAt: string | null;
  tags: string[];
  readingMinutes: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  aiSummary: string | null;
}

export interface BlogPostDetail extends BlogPostSummary {
  bodyHtml: string;
}

export interface BlogTag {
  name: string;
  count: number;
}

export interface BlogData {
  posts: BlogPostDetail[];
  tags: BlogTag[];
}
