const prisma = require('../config/prisma');
const ai = require('../ai');
const { badRequest, notFound } = require('../utils/errors');
const { ok, created } = require('../utils/response');

async function listConversations(req, res, next) {
  try {
    const conversations = await prisma.doubtConversation.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { messages: true } } },
    });
    return ok(res, { conversations });
  } catch (err) {
    next(err);
  }
}

async function getConversation(req, res, next) {
  try {
    const conversation = await prisma.doubtConversation.findUnique({ where: { id: req.params.id } });
    if (!conversation || conversation.userId !== req.user.id) throw notFound('Conversation not found');
    const messages = await prisma.doubtMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'asc' } });
    return ok(res, { conversation, messages });
  } catch (err) {
    next(err);
  }
}

async function deleteConversation(req, res, next) {
  try {
    const conversation = await prisma.doubtConversation.findUnique({ where: { id: req.params.id } });
    if (!conversation || conversation.userId !== req.user.id) throw notFound('Conversation not found');
    await prisma.doubtConversation.delete({ where: { id: conversation.id } });
    return ok(res, null, 'Conversation deleted');
  } catch (err) {
    next(err);
  }
}

/**
 * Ask the tutor a question. If conversationId is omitted a new
 * conversation is created (title = first question, truncated).
 */
async function ask(req, res, next) {
  try {
    if (!(await ai.isConfigured())) throw new ai.AiNotConfiguredError();
    const { question, conversationId, context } = req.body || {};
    if (!question || !String(question).trim()) throw badRequest('Please type a question first');
    const q = String(question).trim().slice(0, 1500);

    let conversation;
    if (conversationId) {
      conversation = await prisma.doubtConversation.findUnique({ where: { id: String(conversationId) } });
      if (!conversation || conversation.userId !== req.user.id) throw notFound('Conversation not found');
    } else {
      conversation = await prisma.doubtConversation.create({
        data: { userId: req.user.id, title: q.slice(0, 120), context: context ? String(context).slice(0, 1000) : null },
      });
    }

    const history = await prisma.doubtMessage.findMany({
      where: { conversationId: conversation.id, role: { in: ['USER', 'ASSISTANT'] } },
      orderBy: { createdAt: 'asc' },
      take: 16,
    });

    await prisma.doubtMessage.create({ data: { conversationId: conversation.id, role: 'USER', content: q } });

    const answer = await ai.solveDoubt({ question: q, history, context: conversation.context || undefined });

    const message = await prisma.doubtMessage.create({ data: { conversationId: conversation.id, role: 'ASSISTANT', content: answer } });
    return created(res, { conversationId: conversation.id, message }, 'Answer generated');
  } catch (err) {
    next(err);
  }
}

module.exports = { listConversations, getConversation, deleteConversation, ask };
