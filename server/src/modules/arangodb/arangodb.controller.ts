import type { Request, Response, NextFunction } from 'express';
import { arangoDbService } from './arangodb.service'; // Removed .js
import { DocumentNotFoundError } from '../../shared/errors'; // Removed .js

export class ArangoDbController {

  async getNode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const nodeKey = req.params.key;
      if (!nodeKey) {
        res.status(400).json({ status: 'error', message: 'Node key parameter is required.' });
        return;
      }

      const nodeData = await arangoDbService.getNodeByKey(nodeKey);
      res.status(200).json({ status: 'success', data: nodeData });

    } catch (error) {
      if (error instanceof DocumentNotFoundError) {
        res.status(404).json({ status: 'error', message: error.message });
      } else {
        next(error);
      }
    }
  }
}

export const arangoDbController = new ArangoDbController();
