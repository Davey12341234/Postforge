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
}

const memory: CommunityPost[] = [];

export function listPosts(): CommunityPost[] {
  return [...memory].sort((a, b) => b.createdAt - a.createdAt);
}

export function addPost(title: string, body: string): CommunityPost {
  const post: CommunityPost = {
    id: uuidv4(),
    title: title.trim(),
    body: body.trim(),
    createdAt: Date.now(),
    comments: [],
    resonance: 0,
  };
  memory.unshift(post);
  return post;
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
