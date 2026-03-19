import type { RequestHandler } from '@sveltejs/kit';
import { app } from "@agents/functions/src/api/routes"

app.basePath('/api')

export const GET: RequestHandler = ({ request }) => app.fetch(request);

export const POST: RequestHandler = ({ request }) => app.fetch(request);

export const PUT: RequestHandler = ({ request }) => app.fetch(request);

export const DELETE: RequestHandler = ({ request }) => app.fetch(request);
