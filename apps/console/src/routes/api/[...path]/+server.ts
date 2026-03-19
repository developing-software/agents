import type { RequestHandler } from '@sveltejs/kit';
import { Hono } from 'hono';
import { app } from "@agents/functions/src/api/routes"

const api = new Hono().route('/api', app);

export const GET: RequestHandler = ({ request }) => api.fetch(request);

export const POST: RequestHandler = ({ request }) => api.fetch(request);

export const PUT: RequestHandler = ({ request }) => api.fetch(request);

export const DELETE: RequestHandler = ({ request }) => api.fetch(request);
