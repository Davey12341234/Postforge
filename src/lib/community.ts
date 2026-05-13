import { v4 as uuidv4 } from "uuid";
import type { CommentSentiment } from "./comment-analysis";

export type Sentiment = CommentSentiment;

export interface CommunityComment {
  id: string;
  author: string;
  body: string;
  createdAt: number;
  ghostReply?: string;
  sentiment?: Sentiment;
}

export interface CommunityPost {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  comments: CommunityComment[];
  resonance: number;
  /** Anonymous appreciations — one per browser id, shared ranking for everyone. */
  appreciationCount: number;
  /** Set when API sends `X-Community-Visitor` so the UI can disable “Appreciate” locally. */
  viewerHasAppreciated?: boolean;
}

const memory: CommunityPost[] = [];
/** Dedupe appreciations per post (visitor keys from client, typically a stable random id). */
const appreciatorsByPost = new Map<string, Set<string>>();

function appreciatorSet(postId: string): Set<string> {
  let s = appreciatorsByPost.get(postId);
  if (!s) {
    s = new Set();
    appreciatorsByPost.set(postId, s);
  }
  return s;
}

export function listPosts(): CommunityPost[] {
  return [...memory].sort((a, b) => {
    if (b.appreciationCount !== a.appreciationCount) {
      return b.appreciationCount - a.appreciationCount;
    }
    return b.createdAt - a.createdAt;
  });
}

export function attachViewerAppreciationFlags(
  posts: CommunityPost[],
  visitorKey: string | undefined,
): CommunityPost[] {
  const vk = visitorKey?.trim();
  if (!vk || vk.length < 8) return posts.map((p) => ({ ...p, viewerHasAppreciated: false }));
  return posts.map((p) => ({
    ...p,
    viewerHasAppreciated: appreciatorSet(p.id).has(vk),
  }));
}

export function addPost(title: string, body: string): CommunityPost {
  const post: CommunityPost = {
    id: uuidv4(),
    title: title.trim(),
    body: body.trim(),
    createdAt: Date.now(),
    comments: [],
    resonance: 0,
    appreciationCount: 0,
  };
  appreciatorsByPost.set(post.id, new Set());
  memory.unshift(post);
  return post;
}

export function appreciatePost(
  postId: string,
  visitorKey: string,
): { appreciationCount: number; duplicate: boolean } | null {
  const p = memory.find((x) => x.id === postId);
  if (!p) return null;
  const vk = visitorKey.trim();
  if (vk.length < 8) return null;
  const set = appreciatorSet(postId);
  if (set.has(vk)) return { appreciationCount: p.appreciationCount, duplicate: true };
  set.add(vk);
  p.appreciationCount += 1;
  return { appreciationCount: p.appreciationCount, duplicate: false };
}

export function addComment(postId: string, author: string, body: string): CommunityComment | null {
  const p = memory.find((x) => x.id === postId);
  if (!p) return null;
  const c: CommunityComment = {
    id: uuidv4(),
    author: author.trim() || "anon",
    body: body.trim(),
    createdAt: Date.now(),
  };
  p.comments.push(c);
  return c;
}

export function updateResonance(postId: string, score: number) {
  const p = memory.find((x) => x.id === postId);
  if (p) p.resonance = score;
}
