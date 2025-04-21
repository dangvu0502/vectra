import type { Request, Response, NextFunction } from "express";
import fs from "fs/promises";
import { z } from "zod";
import { FileNotFoundError, ForbiddenError } from "@/shared/errors"; // Import ForbiddenError
import type { IFileService } from "./file.service";
import { fileService } from "./file.service";
// Removed ingestUrlSchema from import
import {
  fileSchema,
  querySchema,
  type File as DbFileType,
} from "./file.schema";
import { v4 as uuidv4 } from "uuid";
import { TEST_USER_ID } from "@/database/constants"; // Assuming TEST_USER_ID is still used for auth placeholder
import type { UserProfile } from "@/modules/auth/auth.types";
import { FileService } from "./file.service";

// Zod schema for ID parameter validation
const IdParamSchema = z.object({
  id: z.string().uuid("Invalid File ID format"),
});

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
          embedding: file.metadata?.embeddingsCreated
            ? {
                embeddingStatus: "success",
                embeddingTimestamp: file.metadata.embeddingsTimestamp,
              }
            : file.metadata?.embeddingError
              ? {
                  embeddingStatus: "error",
                  embeddingError: file.metadata.embeddingError,
                }
              : { embeddingStatus: "pending" },
        },
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      if (error instanceof FileNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: "Internal server error" });
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
            embedding: file.metadata?.embeddingsCreated
              ? {
                  embeddingStatus: "success",
                  embeddingTimestamp: file.metadata.embeddingsTimestamp,
                }
              : file.metadata?.embeddingError
                ? {
                    embeddingStatus: "error",
                    embeddingError: file.metadata.embeddingError,
                  }
                : { embeddingStatus: "pending" },
          })),
          errors,
        });
      } else {
        res.status(201).json({
          status: "success",
          message: "All files uploaded successfully.",
          data: uploadedFilesInfo.map((file: DbFileType) => ({
            ...file,
            embedding: file.metadata?.embeddingsCreated
              ? {
                  embeddingStatus: "success",
                  embeddingTimestamp: file.metadata.embeddingsTimestamp,
                }
              : file.metadata?.embeddingError
                ? {
                    embeddingStatus: "error",
                    embeddingError: file.metadata.embeddingError,
                  }
                : { embeddingStatus: "pending" },
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
            embedding: file.metadata?.embeddingsCreated
              ? {
                  embeddingStatus: "success",
                  embeddingTimestamp: file.metadata.embeddingsTimestamp,
                }
              : file.metadata?.embeddingError
                ? {
                    embeddingStatus: "error",
                    embeddingError: file.metadata.embeddingError,
                  }
                : { embeddingStatus: "pending" },
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
      res.status(500).json({ message: "Internal server error" });
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
      // Handle specific errors like FileNotFoundError or ForbiddenError if needed
      if (error instanceof z.ZodError) {
        return void res
          .status(400)
          .json({ message: "Invalid file ID", errors: error.errors });
      }
      if (error instanceof FileNotFoundError) {
        return void res.status(404).json({ message: error.message });
      }
      if (error instanceof ForbiddenError) {
        // Now ForbiddenError is recognized
        return void res.status(403).json({ message: error.message });
      }
      next(error); // Pass other errors (including unknown) to the central error handler
    }
  };
}

export const fileController = new FileController(fileService);
