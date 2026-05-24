import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { reportInclude } from "@/lib/reports/report-service";

const TRANSITIONS: Record<
  string,
  { from: ReportStatus[]; to: ReportStatus; action: string }
> = {
  submit: {
    from: [ReportStatus.draft, ReportStatus.rejected],
    to: ReportStatus.submitted,
    action: "SUBMIT",
  },
  review: {
    from: [ReportStatus.submitted],
    to: ReportStatus.reviewed,
    action: "REVIEW",
  },
  verify: {
    from: [ReportStatus.reviewed],
    to: ReportStatus.verified,
    action: "VERIFY",
  },
  approve: {
    from: [ReportStatus.verified],
    to: ReportStatus.approved,
    action: "APPROVE",
  },
  reject: {
    from: [
      ReportStatus.submitted,
      ReportStatus.reviewed,
      ReportStatus.verified,
    ],
    to: ReportStatus.rejected,
    action: "REJECT",
  },
};

export async function transitionReport(
  reportId: number,
  userId: number,
  step: keyof typeof TRANSITIONS,
  comment?: string,
) {
  const rule = TRANSITIONS[step];
  const report = await prisma.stationDailyReport.findUnique({
    where: { id: reportId },
  });
  if (!report) return { error: "Report not found", status: 404 as const };
  if (!rule.from.includes(report.status)) {
    return {
      error: `Cannot ${step} from status ${report.status}`,
      status: 400 as const,
    };
  }

  if (step === "reject" && !comment?.trim()) {
    return {
      error: "Rejection reason is required",
      status: 400 as const,
      requiresComment: true as const,
    };
  }

  const isReject = step === "reject";
  const isResubmit = step === "submit" && report.status === ReportStatus.rejected;

  const updated = await prisma.stationDailyReport.update({
    where: { id: reportId },
    data: {
      status: rule.to,
      submissionTime:
        step === "submit" ? new Date() : report.submissionTime,
      rejectionReason: isReject
        ? comment!.trim()
        : isResubmit
          ? null
          : report.rejectionReason,
      rejectedById: isReject ? userId : isResubmit ? null : report.rejectedById,
      rejectedAt: isReject ? new Date() : isResubmit ? null : report.rejectedAt,
      generalRemarks:
        comment && !isReject
          ? [report.generalRemarks, `[${step}] ${comment.trim()}`]
              .filter(Boolean)
              .join("\n")
          : report.generalRemarks,
    },
    include: reportInclude,
  });

  await logAudit({
    userId,
    action: rule.action,
    entityType: "station_daily_report",
    entityId: reportId,
    oldValues: {
      status: report.status,
      rejectionReason: report.rejectionReason,
    },
    newValues: {
      status: rule.to,
      comment: comment?.trim(),
      rejectionReason: updated.rejectionReason,
    },
  });

  return { report: updated };
}
