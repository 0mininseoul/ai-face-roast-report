const PERMANENT_SHARE_IMAGE_REPORT_IDS = new Set(["55c6cf35-ed8b-46e3-b9dc-7a6122b87712"]);

export function hasPermanentShareImage(reportId: string): boolean {
  return PERMANENT_SHARE_IMAGE_REPORT_IDS.has(reportId);
}
