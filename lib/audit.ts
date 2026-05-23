import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function logAudit(params: {
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValues: params.oldValues,
      newValues: params.newValues,
    },
  });
}
