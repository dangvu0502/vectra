import type { Request, Response } from 'express';
import { ApiKeyService } from './api-keys.service';
import type { UserProfile } from '../auth/auth.types';
import { createApiKeySchema, toggleApiKeySchema } from './api-keys.validation';

interface AuthenticatedRequest extends Request {
  user: UserProfile;
}

export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async createApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const input = createApiKeySchema.parse(req.body);
      const userId = req.user.id;

      const apiKey = await this.apiKeyService.createApiKey(userId, input);
      res.status(201).json(apiKey);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create API key' });
      }
    }
  }

  async listApiKeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user.id;

    try {
      const apiKeys = await this.apiKeyService.listApiKeys(userId);
      res.json(apiKeys);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list API keys' });
    }
  }

  async deleteApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      await this.apiKeyService.deleteApiKey(userId, id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  }

  async toggleApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const input = toggleApiKeySchema.parse(req.body);
      const userId = req.user.id;

      await this.apiKeyService.toggleApiKey(userId, id, input);
      res.status(200).json({ message: 'API key status updated successfully' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update API key status' });
      }
    }
  }
} 