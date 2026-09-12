import type { Store } from '../db/store.js';
import type { CaseRecord, CaseNotification } from '../types/domain.js';

export function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function generateCandidateNotifications(
  caseRecord: CaseRecord,
  store: Store,
  todayStr: string = getTodayDateStr()
): CaseNotification[] {
  const notifications: CaseNotification[] = [];

  // 1. Case connected successfully (Always present for a connected case)
  if (caseRecord.docket) {
    notifications.push({
      id: `notif-${caseRecord.id}-connected`,
      type: 'case_connected',
      title: 'Case Connected Successfully',
      message: `Your case with docket number ${caseRecord.docket} has been successfully connected to SAATH.`,
      priority: 'medium',
      createdAt: caseRecord.registrationDate ? new Date(caseRecord.registrationDate).toISOString() : new Date().toISOString(),
      read: false,
    });
  }

  // 2. Case stage updated
  if (caseRecord.currentStage) {
    const stageDetails: string[] = [];
    if (caseRecord.daysInCurrentStage) {
      stageDetails.push(`${caseRecord.daysInCurrentStage} days in current stage`);
    }
    if (caseRecord.investigationStatus) {
      stageDetails.push(`Investigation status: ${caseRecord.investigationStatus}`);
    }
    const detailsSuffix = stageDetails.length > 0 ? ` (${stageDetails.join(', ')})` : '';

    notifications.push({
      id: `notif-${caseRecord.id}-stage`,
      type: 'case_stage_updated',
      title: `Case Stage: ${caseRecord.currentStage}`,
      message: `Your case is currently at the ${caseRecord.currentStage} stage${detailsSuffix}.`,
      priority: 'medium',
      createdAt: caseRecord.stageStartedAt
        ? new Date(caseRecord.stageStartedAt).toISOString()
        : caseRecord.registrationDate
          ? new Date(caseRecord.registrationDate).toISOString()
          : new Date().toISOString(),
      read: false,
    });
  }

  // 3. Upcoming hearing reminder (Only if next hearing date is present and valid)
  if (caseRecord.nextHearingDate && caseRecord.nextHearingDate.trim()) {
    const hearingsCountMsg =
      caseRecord.hearingCount !== undefined && caseRecord.hearingCount !== null
        ? ` Total previous hearings: ${caseRecord.hearingCount}.`
        : '';

    notifications.push({
      id: `notif-${caseRecord.id}-hearing`,
      type: 'upcoming_hearing',
      title: 'Upcoming Court Hearing',
      message: `Your next court hearing is scheduled for ${caseRecord.nextHearingDate}.${hearingsCountMsg}`,
      priority: 'high',
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  // 4. Counsellor assigned (Resolved from counsellor database)
  if (caseRecord.assignedCounsellorId) {
    const counsellor = store.counsellors.find((c) => c.id === caseRecord.assignedCounsellorId);
    if (counsellor) {
      const specMsg = counsellor.specialisation ? ` (${counsellor.specialisation})` : '';
      notifications.push({
        id: `notif-${caseRecord.id}-counsellor`,
        type: 'counsellor_assigned',
        title: 'Counsellor Assigned',
        message: `Counsellor ${counsellor.name}${specMsg} has been assigned to support your case.`,
        priority: 'medium',
        createdAt: caseRecord.stageStartedAt || caseRecord.registrationDate || new Date().toISOString(),
        read: false,
      });
    }
  }

  // 5. Counselling appointment reminder / follow-up schedule
  const scheduledFollowUps = (store.records.get('follow_ups') || []).filter(
    (f: any) =>
      (f.caseId === caseRecord.id || f.victimToken === caseRecord.victimToken) &&
      f.status === 'SCHEDULED'
  );

  if (scheduledFollowUps.length > 0) {
    const upcomingFollowUp = scheduledFollowUps[0];
    notifications.push({
      id: `notif-${caseRecord.id}-counselling-apt-${upcomingFollowUp.id}`,
      type: 'counselling_appointment',
      title: 'Counselling Appointment Reminder',
      message: `You have an upcoming counselling session scheduled for ${upcomingFollowUp.date}.${
        upcomingFollowUp.notes ? ` Notes: ${upcomingFollowUp.notes}` : ''
      }`,
      priority: 'high',
      createdAt: upcomingFollowUp.createdAt || new Date().toISOString(),
      read: false,
    });
  } else if (caseRecord.followupFrequency && caseRecord.followupFrequency.trim()) {
    // Explicitly labeled as schedule rather than an actual appointment date
    notifications.push({
      id: `notif-${caseRecord.id}-counselling-schedule`,
      type: 'counselling_appointment',
      title: 'Counselling Follow-up Schedule',
      message: `Your counselling check-in schedule is set to ${caseRecord.followupFrequency.replace(
        /_/g,
        ' '
      )} with your assigned counsellor.`,
      priority: 'medium',
      createdAt: caseRecord.stageStartedAt || caseRecord.registrationDate || new Date().toISOString(),
      read: false,
    });
  }

  // 6. Legal aid / protection services update (Only if assigned or active)
  const hasLegalAid = Boolean(
    caseRecord.legalAidStatus &&
      !['Not assigned', 'not_assigned', 'Not Assigned', 'none'].includes(caseRecord.legalAidStatus)
  );
  const hasProtection = Boolean(
    caseRecord.protectionStatus &&
      !['Not Requested', 'Not requested', 'none', '', 'not_requested'].includes(caseRecord.protectionStatus)
  );
  const hasRelocation = Boolean(
    caseRecord.relocationStatus &&
      !['Not requested', 'Not Requested', 'none', '', 'not_requested'].includes(caseRecord.relocationStatus)
  );

  if (hasLegalAid || hasProtection || hasRelocation) {
    const parts: string[] = [];
    if (caseRecord.legalAidStatus) {
      parts.push(`Legal aid: ${caseRecord.legalAidStatus}`);
    }
    if (caseRecord.protectionStatus && !['Not Requested', 'Not requested'].includes(caseRecord.protectionStatus)) {
      parts.push(`Protection status: ${caseRecord.protectionStatus}`);
    }
    if (hasRelocation) {
      parts.push(`Relocation: ${caseRecord.relocationStatus}`);
    }

    notifications.push({
      id: `notif-${caseRecord.id}-legal-protection`,
      type: 'legal_protection_update',
      title: 'Legal Aid & Protection Services Update',
      message: `Support services update: ${parts.join('. ')}.`,
      priority: 'medium',
      createdAt: caseRecord.stageStartedAt || caseRecord.registrationDate || new Date().toISOString(),
      read: false,
    });
  }

  // 7. Financial relief update (Only if valid amount or active status exists)
  const compensationStatus = caseRecord.compensationStatus?.trim();
  const isExcludedStatus =
    !compensationStatus ||
    compensationStatus.toLowerCase() === 'not applicable' ||
    compensationStatus.toLowerCase() === 'not yet assessed';

  if (!isExcludedStatus) {
    const hasApproved =
      typeof caseRecord.compensationAmountApproved === 'number' && caseRecord.compensationAmountApproved > 0;
    const hasDisbursed =
      typeof caseRecord.compensationAmountReceived === 'number' && caseRecord.compensationAmountReceived > 0;

    let reliefMsg = `Financial relief status: ${compensationStatus}.`;
    if (hasApproved) {
      reliefMsg += ` Approved amount: ₹${caseRecord.compensationAmountApproved.toLocaleString('en-IN')}.`;
    }
    if (hasDisbursed) {
      reliefMsg += ` Disbursed amount: ₹${caseRecord.compensationAmountReceived.toLocaleString('en-IN')}.`;
    }
    if (caseRecord.lastPaymentDate) {
      reliefMsg += ` Last payment date: ${caseRecord.lastPaymentDate}.`;
    }

    notifications.push({
      id: `notif-${caseRecord.id}-financial-relief`,
      type: 'financial_relief_update',
      title: 'Financial Relief Update',
      message: reliefMsg,
      priority: 'medium',
      createdAt:
        caseRecord.lastPaymentDate ||
        caseRecord.stageStartedAt ||
        caseRecord.registrationDate ||
        new Date().toISOString(),
      read: false,
    });
  }

  // 8. Daily wellbeing check-in reminder (Always generated once per day per survivor upon login)
  notifications.push({
    id: `notif-${caseRecord.id}-daily-checkin-${todayStr}`,
    type: 'daily_checkin',
    title: 'Daily Wellbeing Check-in',
    message: 'Take a moment to complete your wellbeing check-in. You can check in whenever you feel ready.',
    priority: 'high',
    createdAt: new Date().toISOString(),
    read: false,
  });

  return notifications;
}

export function syncSurvivorNotifications(
  userId: string,
  caseRecord: CaseRecord,
  store: Store,
  todayStr: string = getTodayDateStr()
): CaseNotification[] {
  const existing: CaseNotification[] = store.records.get(`notifications:${userId}`) || [];
  const existingMap = new Map<string, CaseNotification>(existing.map((n) => [n.id, n]));

  const candidateNotifications = generateCandidateNotifications(caseRecord, store, todayStr);

  const mergedNotifications: CaseNotification[] = candidateNotifications.map((candidate) => {
    const prior = existingMap.get(candidate.id);
    if (prior) {
      // Preserve read status and prior createdAt timestamp
      return {
        ...candidate,
        read: prior.read,
        createdAt: prior.createdAt,
      };
    }
    return candidate;
  });

  // Sort notifications: daily_checkin or unread high priority near the top, then newest first
  mergedNotifications.sort((a, b) => {
    if (a.type === 'daily_checkin' && b.type !== 'daily_checkin') return -1;
    if (b.type === 'daily_checkin' && a.type !== 'daily_checkin') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  store.records.set(`notifications:${userId}`, mergedNotifications);
  return mergedNotifications;
}
