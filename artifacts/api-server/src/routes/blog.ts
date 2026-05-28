import { Router, type IRouter } from "express";
import {
  ListBlogPostsQueryParams,
  GetBlogPostParams,
} from "@workspace/api-zod";
import {
  listPublishedPosts,
  getPostBySlug,
  listTags,
} from "../services/notion";

const router: IRouter = Router();

router.get("/blog/posts", async (req, res): Promise<void> => {
  const parsed = ListBlogPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const posts = await listPublishedPosts({
      tag: parsed.data.tag ?? null,
      limit: parsed.data.limit ?? null,
    });
    res.json({ posts });
  } catch (err: any) {
    req.log.error({ err: String(err) }, "Failed to list blog posts");
    res.status(502).json({ error: "Failed to load posts from Notion" });
  }
});

router.get("/blog/tags", async (req, res): Promise<void> => {
  try {
    const tags = await listTags();
    res.json(tags);
  } catch (err: any) {
    req.log.error({ err: String(err) }, "Failed to list blog tags");
    res.status(502).json({ error: "Failed to load tags from Notion" });
  }
});

router.get("/blog/posts/:slug", async (req, res): Promise<void> => {
  const parsed = GetBlogPostParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const post = await getPostBySlug(parsed.data.slug);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json(post);
  } catch (err: any) {
    req.log.error({ err: String(err), slug: parsed.data.slug }, "Failed to load blog post");
    res.status(502).json({ error: "Failed to load post from Notion" });
  }
});

export default router;
