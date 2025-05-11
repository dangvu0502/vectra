import type { Request, Response, NextFunction } from "express";
import fs from "fs/promises";
import { z } from "zod";
import { FileNotFoundError, ForbiddenError } from "@/shared/errors";
import { fileService, FileService } from "./file.service"; // Consolidated FileService import
import {
  // fileSchema, // fileSchema seems unused in this controller directly
  querySchema,
  type File as DbFileType,
} from "./file.schema";
import type { UserProfile } from "@/modules/auth/auth.types";

// Helper function to format the embedding status part of the response
const formatEmbeddingStatusResponse = (metadata: DbFileType['metadata']) => {
  if (metadata?.embeddingsCreated) {
    return {
      embeddingStatus: "success",
      embeddingTimestamp: metadata.embeddingsTimestamp,
    };
  }
  if (metadata?.embeddingError) {
    return {
      embeddingStatus: "error",
      embeddingError: metadata.embeddingError,
    };
  }
  return { embeddingStatus: "pending" };
};

export class FileController {
  constructor(private readonly fileService: FileService) {}

  uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }

      const { content, collectionId } = req.body;
      const user = req.user as UserProfile;

      const file = await this.fileService.upload({
        file: req.file,
        content,
        collectionId,
        userId: user.id,
      });

      res.status(201).json({
        status: "success",
        message: "File uploaded successfully",
        data: {
          ...file,
          embedding: formatEmbeddingStatusResponse(file.metadata),
        },
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      // Pass error to central handler for consistency
      next(error);
    }
  };

  uploadBulk = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user as UserProfile;
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || !Array.isArray(files) || files.length === 0) {
        res.status(400).json({ message: "No files uploaded" });
        return;
      }

      const uploadedFilesInfo: DbFileType[] = [];
      const errors: Array<{ fileName: string; error: string }> = [];

      for (const file of files) {
        try {
          const content = await fs.readFile(file.path, "utf-8");
          const createdFile = await this.fileService.upload({
            file,
            content,
            collectionId: req.body?.collection_id,
            userId: user.id,
          });
          uploadedFilesInfo.push(createdFile);
        } catch (uploadError: any) {
          errors.push({
            fileName: file.originalname,
            error: uploadError.message || "Failed to process file",
          });
          await fs.unlink(file.path).catch(console.error);
        } finally {
          try {
            await fs.access(file.path);
            await fs.unlink(file.path);
          } catch (unlinkError: any) {
            if (unlinkError.code !== "ENOENT") {
              console.error(
                `Failed to clean up temp file ${file.path}:`,
                unlinkError
              );
            }
          }
        }
      }

      if (errors.length === files.length) {
        res.status(400).json({
          status: "error",
          message: "All files failed to upload.",
          errors,
        });
      } else if (errors.length > 0) {
        res.status(207).json({
          status: "partial_success",
          message: "Some files were uploaded successfully, others failed.",
          data: uploadedFilesInfo.map((file: DbFileType) => ({
            ...file,
            embedding: formatEmbeddingStatusResponse(file.metadata),
          })),
          errors,
        });
      } else {
        res.status(201).json({
          status: "success",
          message: "All files uploaded successfully.",
          data: uploadedFilesInfo.map((file: DbFileType) => ({
            ...file,
            embedding: formatEmbeddingStatusResponse(file.metadata),
          })),
        });
      }
    } catch (error) {
      next(error);
    }
  };

  getFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user as UserProfile;
      const { q, page, limit, sortBy, sortOrder } = req.query;
      const validatedQuery = querySchema.parse({
        q,
        page,
        limit,
        sortBy,
        sortOrder,
      });
      const result = await this.fileService.query(user.id, validatedQuery);

      res.json({
        status: "success",
        data: {
          files: result.files.map((file) => ({
            ...file,
            embedding: formatEmbeddingStatusResponse(file.metadata),
          })),
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getFileById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user as UserProfile;
      const { id } = req.params;
      const file = await this.fileService.findById(user.id, id);

      if (!file) {
        throw new FileNotFoundError(id);
      }

      res.json({ data: file });
    } catch (error) {
      console.error("Error getting file:", error);
      // Pass error to central handler for consistency
      next(error);
    }
  };

  deleteFile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user as UserProfile;
      const { id } = req.params;
      await this.fileService.delete(user.id, id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  getFileCollections = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user as UserProfile;
      const { id } = req.params;
      const collections = await this.fileService.getCollectionsForFile(
        id,
        user.id
      );

      res.json({
        status: "success",
        data: { collections },
      });
    } catch (error) {
      // TODO: Handle specific errors like FileNotFoundError or ForbiddenError if needed from service
      if (error instanceof z.ZodError) {
        return void res
          .status(400)
          .json({ message: "Invalid file ID", errors: error.errors });
      }
      if (error instanceof FileNotFoundError) {
        return void res.status(404).json({ message: error.message });
      }
      if (error instanceof ForbiddenError) {
        return void res.status(403).json({ message: error.message });
      }
      next(error);
    }
  };
}

export const fileController = new FileController(fileService);
