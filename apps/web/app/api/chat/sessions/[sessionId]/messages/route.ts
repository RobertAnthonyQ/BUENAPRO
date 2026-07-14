import { NextResponse } from "next/server";
import { currentUserId, requireTenantId } from "@/server/auth/tenant";
import {
  maybeCompactConversationMemory,
  runLicitationAgent,
  type AgentMessage,
  type ProposedApplicationChanges,
} from "@/server/agent";
import {
  beginAgentRun,
  completeAgentRun,
  failAgentRun,
  getChatSession,
  updateChatSummary,
} from "@/server/services/applicationChat";

function changesForPersistence(changes: ProposedApplicationChanges) {
  return changes;
}

function agentMessages(messages: any[]): AgentMessage[] {
  return messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant",
    )
    .map((message) => ({
      role: message.role,
      content: String(message.content ?? "").slice(0, 8_000),
    }));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const tenantId = await requireTenantId();
  const actorId = await currentUserId();
  if (!actorId) {
    return NextResponse.json(
      { error: "Inicia sesión para usar el copiloto." },
      { status: 401 },
    );
  }
  const { sessionId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const content = String(body.content ?? "")
    .trim()
    .slice(0, 8_000);
  if (!content) {
    return NextResponse.json(
      { error: "Escribe una pregunta para el copiloto." },
      { status: 400 },
    );
  }

  const session = await getChatSession(tenantId, sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Conversación no encontrada." },
      { status: 404 },
    );
  }
  const memory = await maybeCompactConversationMemory(
    session.summary as string | null,
    agentMessages(session.messages as any[]),
  );
  if (memory.compacted) {
    await updateChatSummary(tenantId, sessionId, memory.summary);
  }

  const started = await beginAgentRun(tenantId, sessionId, actorId, content);
  if (!started) {
    return NextResponse.json(
      { error: "Conversación no encontrada." },
      { status: 404 },
    );
  }
  try {
    const result = await runLicitationAgent({
      tenantId,
      matchId: session.matchId ? Number(session.matchId) : null,
      idContrato: Number(session.contractId),
      userMessage: content,
      conversationSummary: memory.summary,
      recentMessages: memory.retainedMessages,
    });
    if (!result)
      throw new Error("No se encontró el expediente de la licitación.");
    await completeAgentRun(tenantId, String(started.run.id), {
      content: result.answer,
      citations: result.citations.map((citation) => ({
        label: citation.label,
        source: citation.sourceId,
        excerpt: citation.evidence,
      })),
      metadata: { model: result.model },
      changes: changesForPersistence(result.proposedChanges),
    });
    const refreshed = await getChatSession(tenantId, sessionId);
    const messages = (refreshed?.messages as any[]) ?? [];
    return NextResponse.json({
      data: {
        userMessage: messages.at(-2),
        assistantMessage: messages.at(-1),
      },
    });
  } catch (error) {
    await failAgentRun(tenantId, String(started.run.id), error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "El copiloto no pudo responder en este momento.",
      },
      { status: 422 },
    );
  }
}
