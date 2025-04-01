export class DocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentError';
  }
}

export class DocumentNotFoundError extends DocumentError {
  constructor(id: string) {
    super(`Document with id ${id} not found`);
    this.name = 'DocumentNotFoundError';
  }
}

export class DocumentValidationError extends DocumentError {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentValidationError';
  }
}

export class DocumentProcessingError extends DocumentError {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

// File-related errors
export class FileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileError';
  }
}

export class FileNotFoundError extends FileError {
  constructor(id: string) {
    super(`File with id ${id} not found`);
    this.name = 'FileNotFoundError';
  }
}

export class FileValidationError extends FileError {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export class FileProcessingError extends FileError {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'FileProcessingError';
  }
}
