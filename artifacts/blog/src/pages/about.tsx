import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";

export default function About() {
  return (
    <Layout>
      <SEO 
        title="About" 
        description="PinnboxIO is a modern, calm, focused productivity tool for people drowning in scattered communication."
      />
      
      <div className="container mx-auto px-4 md:px-8 max-w-3xl py-12 md:py-20">
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
            We're building a calmer way to work.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            The modern professional's attention is fragmented across dozens of apps. We believe there is a better way.
          </p>
        </header>

        <figure className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <img 
            src="/about-hero.png" 
            alt="PinnboxIO workspace" 
            className="w-full aspect-video object-cover rounded-2xl shadow-sm border border-border/50"
          />
        </figure>

        <div className="prose prose-slate dark:prose-invert prose-lg max-w-none">
          <h2>The Problem</h2>
          <p>
            You check Gmail, then Outlook, then Slack. You dig through Google Drive for a file someone sent you last week. You check your calendar to see when you're free, then switch back to email to write a response. 
          </p>
          <p>
            We spend more time managing our tools than doing our actual work. Communication has become a chore, scattered across a dozen silos that don't talk to each other.
          </p>

          <h2>Our Solution</h2>
          <p>
            <strong>PinnboxIO</strong> is a unified communications hub. We bring your email (Gmail + Outlook), cloud storage, contacts, and calendar into a single, cohesive, thoughtfully designed interface.
          </p>
          <p>
            Backed by a contextual AI assistant that understands your communications, PinnboxIO helps you find what you need instantly, draft replies intelligently, and stay focused on what actually matters.
          </p>

          <h2>Why this blog?</h2>
          <p>
            We're obsessed with productivity, design, and building tools that respect your time. On this blog, our team shares product updates, essays on the future of work, and practical guides for taking back control of your inbox.
          </p>
          
          <hr className="my-12 border-border" />
          
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-6">Ready to tame your inbox?</h3>
            <a 
              href="https://pinnboxio.com" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              Try PinnboxIO Today
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
