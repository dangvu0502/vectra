import type { Request, Response, NextFunction } from 'express';
import { arangoDbService } from './arangodb.service.js';
import { DocumentNotFoundError } from '../../shared/errors.js'; // Import the specific error

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
      // Handle specific errors like "not found" differently
      if (error instanceof DocumentNotFoundError) {
        res.status(404).json({ status: 'error', message: error.message });
      } else {
        // Pass other errors to the generic error handler
        next(error);
      }
    }
  }
}

export const arangoDbController = new ArangoDbController();
