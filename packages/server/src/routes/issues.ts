import type { FastifyPluginAsync } from 'fastify';
import { CreateIssueInputSchema, type CivicIssue } from '@civicresolve/shared';
import { IssueRepository } from '../services/firebase.js';
import { triageIssueWithGemini } from '../services/gemini.js';
import crypto from 'crypto';

export const issueRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/issues - List all civic reports
  fastify.get('/api/issues', async () => {
    const issues = await IssueRepository.list();
    return {
      success: true,
      data: issues,
      count: issues.length
    };
  });

  // GET /api/issues/:id - Retrieve single issue
  fastify.get<{ Params: { id: string } }>('/api/issues/:id', async (request, reply) => {
    const { id } = request.params;
    const issue = await IssueRepository.getById(id);

    if (!issue) {
      return reply.status(404).send({
        success: false,
        error: 'Not Found',
        message: `Issue with ID ${id} was not found`
      });
    }

    return {
      success: true,
      data: issue
    };
  });

  // POST /api/issues - Submit new civic report with automated AI triage
  fastify.post('/api/issues', async (request, reply) => {
    const parseResult = CreateIssueInputSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Bad Request',
        message: 'Invalid issue payload',
        details: parseResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    const input = parseResult.data;
    const id = `civic-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const timestamp = new Date().toISOString();

    // Trigger AI Triage
    const aiTriage = await triageIssueWithGemini({
      title: input.title,
      description: input.description,
      category: input.category,
      location: input.location
    });

    const newIssue: CivicIssue = {
      id,
      title: input.title,
      description: input.description,
      category: input.category,
      status: 'submitted',
      urgency: aiTriage.urgency,
      location: input.location,
      imageUrl: input.imageUrl || undefined,
      reporterName: input.reporterName,
      reporterEmail: input.reporterEmail,
      aiTriage,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const saved = await IssueRepository.save(newIssue);

    return reply.status(201).send({
      success: true,
      data: saved,
      message: 'Civic issue successfully submitted and triaged.'
    });
  });

  // POST /api/triage/test - Directly test AI triage without saving
  fastify.post('/api/triage/test', async (request, reply) => {
    const parseResult = CreateIssueInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Bad Request',
        details: parseResult.error.errors
      });
    }

    const triage = await triageIssueWithGemini(parseResult.data);
    return {
      success: true,
      data: triage
    };
  });
};
