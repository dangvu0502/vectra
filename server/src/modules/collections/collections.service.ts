import { CollectionQueries } from "./collections.queries";
import type {
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
} from "./collections.validation";
import type {
  CollectionResponse,
  CollectionWithFilesResponse,
} from "./collections.types";
import type { UserProfile } from "@/modules/auth/auth.types";
import {
  CollectionNotFoundError,
  CollectionConflictError,
  FileNotFoundError,
  ForbiddenError,
} from "@/shared/errors";
import { findFileByIdQuery } from "@/modules/file/file.queries";

export class CollectionService {
  constructor(private readonly queries: CollectionQueries) {}

  async createCollection(
    userId: UserProfile["id"],
    input: CreateCollectionInput
  ): Promise<CollectionResponse> {
    const existing = await this.queries.findCollectionByNameAndUserId(
      input.name,
      userId
    );
    if (existing) {
      throw new CollectionConflictError(input.name);
    }

    const collection = await this.queries.createCollection(
      userId,
      input.name,
      input.description
    );

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
    };
  }

  async getCollectionById(
    collectionId: Collection["id"],
    userId: UserProfile["id"]
  ): Promise<CollectionResponse> {
    const collection = await this.queries.findCollectionById(
      collectionId,
      userId
    );
    if (!collection) {
      throw new CollectionNotFoundError(collectionId);
    }

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
    };
  }

  async getUserCollections(
    userId: UserProfile["id"]
  ): Promise<CollectionResponse[]> {
    const collections = await this.queries.findCollectionsByUserId(userId);
    return collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
    }));
  }

  async updateCollection(
    collectionId: Collection["id"],
    userId: UserProfile["id"],
    input: UpdateCollectionInput
  ): Promise<CollectionResponse> {
    const existingCollection = await this.queries.findCollectionById(
      collectionId,
      userId
    );
    if (!existingCollection) {
      throw new CollectionNotFoundError(collectionId);
    }

    if (input.name && input.name !== existingCollection.name) {
      const conflictingCollection =
        await this.queries.findCollectionByNameAndUserId(input.name, userId);
      if (conflictingCollection) {
        throw new CollectionConflictError(input.name);
      }
    }

    const updatedCollection = await this.queries.updateCollection(
      collectionId,
      userId,
      input
    );
    if (!updatedCollection) {
      throw new CollectionNotFoundError(collectionId);
    }

    return {
      id: updatedCollection.id,
      name: updatedCollection.name,
      description: updatedCollection.description,
      created_at: updatedCollection.created_at,
      updated_at: updatedCollection.updated_at,
    };
  }

  async deleteCollection(
    collectionId: Collection["id"],
    userId: UserProfile["id"]
  ): Promise<void> {
    const deletedCount = await this.queries.deleteCollection(
      collectionId,
      userId
    );
    if (deletedCount === 0) {
      throw new CollectionNotFoundError(collectionId);
    }
  }

  async addFileToCollection(
    userId: UserProfile["id"],
    collectionId: string,
    fileId: string
  ): Promise<void> {
    const collection = await this.queries.findCollectionById(
      collectionId,
      userId
    );
    if (!collection) {
      throw new CollectionNotFoundError(collectionId);
    }

    const file = await findFileByIdQuery(userId, fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }
    if (file.user_id !== userId) {
      throw new ForbiddenError("User does not own the specified file.");
    }

    try {
      await this.queries.addFileLink(collectionId, fileId);
    } catch (error: any) {
      if (error.code === "23505") {
        console.warn(
          `Link between file ${fileId} and collection ${collectionId} already exists.`
        );
      } else {
        console.error(
          `Error linking file ${fileId} to collection ${collectionId}:`,
          error
        );
        throw error;
      }
    }
  }

  async removeFileFromCollection(
    userId: UserProfile["id"],
    collectionId: string,
    fileId: string
  ): Promise<void> {
    const collection = await this.queries.findCollectionById(
      collectionId,
      userId
    );
    if (!collection) {
      throw new CollectionNotFoundError(collectionId);
    }

    const deletedCount = await this.queries.removeFileLink(
      collectionId,
      fileId
    );
    if (deletedCount === 0) {
      console.warn(
        `Attempted to remove link between file ${fileId} and collection ${collectionId}, but link did not exist.`
      );
    }
  }

  async getFilesInCollection(
    userId: UserProfile["id"],
    collectionId: string
  ): Promise<CollectionWithFilesResponse> {
    const collection = await this.queries.findCollectionById(
      collectionId,
      userId
    );
    if (!collection) {
      throw new CollectionNotFoundError(collectionId);
    }

    const files = await this.queries.findFilesByCollectionId(
      collectionId,
      userId
    );

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
      files: files.map((file) => ({
        id: file.id,
        filename: file.filename,
        created_at: file.created_at,
      })),
    };
  }

  async getCollectionsForFile(
    userId: UserProfile["id"],
    fileId: string
  ): Promise<CollectionResponse[]> {
    const collections = await this.queries.findCollectionsByFileId(
      fileId,
      userId
    );
    return collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
    }));
  }
}
