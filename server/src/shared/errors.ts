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

// Collection-related errors
export class CollectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CollectionError';
  }
}

export class CollectionNotFoundError extends CollectionError {
  constructor(idOrName: string) {
    super(`Collection with identifier ${idOrName} not found`);
    this.name = 'CollectionNotFoundError';
  }
}

export class CollectionConflictError extends CollectionError {
  constructor(name: string) {
    super(`A collection with the name "${name}" already exists.`);
    this.name = 'CollectionConflictError';
  }
}

// General App Errors
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403); // HTTP 403 Forbidden status code
    this.name = 'ForbiddenError';
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
