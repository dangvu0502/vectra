import type { DocumentStorage } from "../../types";

export async function deleteDocument(storage: DocumentStorage, id: string): Promise<boolean> {
    return storage.delete(id);
}