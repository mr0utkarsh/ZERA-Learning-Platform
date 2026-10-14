import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

// AI Doubt Solver (Feature 5). Conversations and messages persist per user.
// Answers come from the configured provider via aiService; when no provider is
// available the call fails honestly (503) rather than fabricating an answer.

const createConversation = async (userId, { title, topicId } = {}) =>
  prisma.doubtConversation.create({
    data: {
      userId,
      title: title ? String(title).trim().slice(0, 200) : null,
      topicId: topicId || null
    }
  });

export const listConversations = async (userId) =>
  prisma.doubtConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 1, select: { content: true, sender: true } }, _count: { select: { messages: true } } }
  });

export const getConversation = async (userId, id) => {
  const conversation = await prisma.doubtConversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });
  if (!conversation) throw new ApiError(404, 'Conversation not found.');
  return conversation;
};

/**
 * Asks a doubt. Persists the student's message, requests an answer from the
 * configured AI provider (optionally grounded in the confirmed topic title),
 * and persists the assistant reply with the provider that produced it. Throws
 * 503 if no provider is configured or the call fails — never a fake answer.
 */
export const askDoubt = async (userId, { conversationId, question, topicId, style, language }) => {
  const text = String(question || '').trim();
  if (!text) throw new ApiError(400, 'A question is required.');
  if (text.length > 4000) throw new ApiError(400, 'Questions are limited to 4000 characters.');

  let conversation;
  if (conversationId) {
    conversation = await prisma.doubtConversation.findFirst({ where: { id: conversationId, userId } });
    if (!conversation) throw new ApiError(404, 'Conversation not found.');
  } else {
    conversation = await createConversation(userId, { title: text.slice(0, 80), topicId });
  }

  await prisma.doubtMessage.create({
    data: { conversationId: conversation.id, sender: 'USER', content: text.slice(0, 8000) }
  });

  // Ground the answer in the confirmed topic when one is linked.
  let context = '';
  if (conversation.topicId || topicId) {
    const topic = await prisma.confirmedTopic.findFirst({
      where: { id: conversation.topicId || topicId, unit: { subject: { syllabus: { userId } } } },
      select: { title: true, description: true }
    });
    if (topic) context = `${topic.title}${topic.description ? `: ${topic.description}` : ''}`;
  }

  let answer;
  let provider;
  try {
    const { generateDoubtAnswer } = await import('./aiService.js');
    const result = await generateDoubtAnswer({ question: text, style, language, context });
    answer = result.answer;
    provider = result.provider;
  } catch (error) {
    // Record the failure on the conversation so history is honest, then surface it.
    await prisma.doubtMessage.create({
      data: { conversationId: conversation.id, sender: 'ASSISTANT', content: `The AI provider is currently unavailable: ${error.message || 'unknown error'}` }
    });
    const apiError = new ApiError(503, error.message || 'The AI provider is unavailable. Please try again.');
    throw apiError;
  }

  const assistantMessage = await prisma.doubtMessage.create({
    data: { conversationId: conversation.id, sender: 'ASSISTANT', content: String(answer).slice(0, 20000), provider }
  });

  return { conversationId: conversation.id, messageId: assistantMessage.id, answer, provider };
};

/** Saves an assistant answer as a personal note (source = DOUBT). */
export const saveAnswerAsNote = async (userId, messageId) => {
  const message = await prisma.doubtMessage.findFirst({
    where: { id: messageId, sender: 'ASSISTANT', conversation: { userId } },
    include: { conversation: true }
  });
  if (!message) throw new ApiError(404, 'Answer not found.');
  const note = await prisma.note.create({
    data: {
      userId,
      topicId: message.conversation.topicId || null,
      source: 'DOUBT',
      title: `Doubt: ${message.content.split('\n')[0].slice(0, 120)}`,
      content: message.content
    }
  });
  return note;
};
