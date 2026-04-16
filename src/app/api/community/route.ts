import { NextResponse, type NextRequest } from "next/server";
import { guardApi } from "@/lib/chat-route-guard";
import { analyzeCommentSentiment, shouldRejectCommunityComment } from "@/lib/comment-analysis";
import { resonanceScore } from "@/lib/resonance";
import {
  addComment,
  addPost,
  appreciatePost,
  attachViewerAppreciationFlags,
  listPosts,
  updateResonance,
  type CommunityPost,
} from "@/lib/community";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = await guardApi(req);
  if (denied) {
    return denied;
  }
  const visitorKey = req.headers.get("x-community-visitor") ?? undefined;
  const posts = attachViewerAppreciationFlags(listPosts(), visitorKey);
  return NextResponse.json({ posts: posts as CommunityPost[] });
}

export async function POST(req: NextRequest) {
  const denied = await guardApi(req);
  if (denied) {
    return denied;
  }

  const body = (await req.json()) as {
    action: "post" | "comment" | "appreciate";
    title?: string;
    body?: string;
    postId?: string;
    author?: string;
    visitorKey?: string;
  };

  if (body.action === "appreciate" && body.postId && body.visitorKey) {
    const r = appreciatePost(body.postId, body.visitorKey);
    if (!r) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json({ appreciationCount: r.appreciationCount, duplicate: r.duplicate });
  }

  if (body.action === "post" && body.title && body.body) {
    const post = addPost(body.title, body.body);
    return NextResponse.json({ post });
  }

  if (body.action === "comment" && body.postId && body.body) {
    const trimmed = body.body.trim();
    if (shouldRejectCommunityComment(trimmed)) {
      return NextResponse.json(
        {
          error:
            "This space is for encouragement. Try rephrasing without put-downs, insults, or harsh criticism.",
          code: "tone",
        },
        { status: 422 },
      );
    }
    const c = addComment(body.postId, body.author ?? "you", trimmed);
    if (!c) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    c.sentiment = analyzeCommentSentiment(c.body);
    const posts = listPosts();
    const p = posts.find((x) => x.id === body.postId);
    if (p) {
      const ghostBodies = p.comments.map((x) => x.ghostReply).filter(Boolean) as string[];
      const score = resonanceScore(p.body, ghostBodies);
      updateResonance(p.id, score);
    }
    return NextResponse.json({ comment: c });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
