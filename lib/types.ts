export type FutureItemType = "event" | "task" | "reminder";

export type FutureItem = {
  id: string;
  type: FutureItemType;
  title: string;
  startsAt?: string;
  dueAt?: string;
  remindAt?: string;
  reminderMinutesBefore?: number;
  rawText: string;
  createdAt: string;
  completedAt?: string;
};

export type ParsedCommand = Omit<FutureItem, "id" | "createdAt" | "completedAt">;
