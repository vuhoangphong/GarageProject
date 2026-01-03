import type { APIRoute } from 'astro';

const robots = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: https://garage-project-rose.vercel.app/sitemap.xml`;

export const GET: APIRoute = () => {
  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};