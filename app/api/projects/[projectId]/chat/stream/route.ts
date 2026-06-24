import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { createProjectService } from '@/lib/api/services';
import { getSseHub } from '@/lib/sse/hub';
import { UnauthorizedError } from '@/lib/errors';
import { handleApiError } from '@/lib/api/handleError';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return handleApiError(new UnauthorizedError());
  const { projectId } = await params;

  const projectService = createProjectService();
  try {
    projectService.getProject(user.id, Number(projectId));
  } catch (error) {
    return handleApiError(error);
  }

  const pid = Number(projectId);
  const hub = getSseHub();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const client = {
        enqueue: (chunk: string) => controller.enqueue(encoder.encode(chunk)),
        close: () => {
          try {
            controller.close();
          } catch {
            // 既に閉じられている
          }
        },
      };
      hub.addClient(pid, client);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        hub.removeClient(pid, client);
        try {
          controller.close();
        } catch {
          // 既に閉じられている
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
