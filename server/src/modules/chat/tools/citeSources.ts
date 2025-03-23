export const citeSources = (text: string, documents: any[]) => {
  const citations = documents.map(doc => `[doc-${doc.docId}]`).join('');
  return `${text} ${citations}`;
};
