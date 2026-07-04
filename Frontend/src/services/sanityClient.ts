// Sanity.io CMS client for Pathy
// SETUP: npm install @sanity/client
// Create a free project at https://sanity.io and paste your projectId below
// or set EXPO_PUBLIC_SANITY_PROJECT_ID in your .env file

import { createClient } from '@sanity/client';

const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID || 'your-project-id';
const DATASET    = process.env.EXPO_PUBLIC_SANITY_DATASET    || 'production';

export const sanity = createClient({
  projectId: PROJECT_ID,
  dataset:   DATASET,
  apiVersion: '2024-01-01',
  useCdn: true,
});

export function urlFor(source: any): string {
  if (!source?.asset?._ref) return '';
  const [, id, dimensions, format] = source.asset._ref.split('-');
  return `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${id}-${dimensions}.${format}`;
}

export interface RoutePost {
  _id: string;
  title: string;
  user: { name: string };
  image: any;
  distanceKm: number;
  durationMin: number;
  caption?: string;
  likes: number;
  comments: number;
  createdAt: string;
}

export async function fetchRouteFeed(limit = 10): Promise<RoutePost[]> {
  const q = `*[_type == "routePost"] | order(createdAt desc) [0...${limit}] {
    _id, title, user, image, distanceKm, durationMin, caption, likes, comments, createdAt
  }`;
  try { return await sanity.fetch(q); } catch { return []; }
}
