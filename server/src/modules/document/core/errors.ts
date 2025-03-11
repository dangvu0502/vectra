export class DocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentError';
  }
}

export class DocumentNotFoundError extends DocumentError {
  constructor(id: string) {
    super(`Document with id "${id}" not found`);
    this.name = 'DocumentNotFoundError';
  }
}

export class InvalidDocumentError extends DocumentError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDocumentError';
  }
}