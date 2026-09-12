export type EmailMessageSummary = {
  id: string;
  threadId?: string;
  from: string;
  subject: string;
  snippet: string;
  date?: string;
};
