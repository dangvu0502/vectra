import { DocumentServiceImpl } from '../document/document.service';
import type { DocumentService } from '../document/document.service';
import type { DocumentInputPort } from '../document/embedding';
import type { IDocument } from '../document/document.model'; // Import IDocument

export class DocumentAdapter implements DocumentInputPort {
  private documentService: DocumentService;

  constructor() {
    this.documentService = DocumentServiceImpl.getInstance();
  }

  async findById(id: string): Promise<IDocument | null> { // Return IDocument
    return this.documentService.findById(id);
  }
}
