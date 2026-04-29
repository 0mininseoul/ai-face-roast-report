import "server-only";

import { getServerSupabase } from "@/lib/supabase/server";

export const DAILY_QUOTA_LIMIT = 5;
const QUOTA_WINDOW_HOURS = 24;

export interface QuotaCheckResult {
  ok: boolean;
  count: number;
  limit: number;
  windowHours: number;
  matchedBy: "ip_and_device" | "ip" | "none";
}

export async function checkDailyQuota(ipHash: string, deviceId: string | null): Promise<QuotaCheckResult> {
  const supabase = getServerSupabase();
  const since = new Date(Date.now() - QUOTA_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("analyze_quota")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (deviceId) query = query.eq("device_id", deviceId);

  const { count, error } = await query;
  if (error) {
    return { ok: true, count: 0, limit: DAILY_QUOTA_LIMIT, windowHours: QUOTA_WINDOW_HOURS, matchedBy: "none" };
  }
  const used = count ?? 0;
  return {
    ok: used < DAILY_QUOTA_LIMIT,
    count: used,
    limit: DAILY_QUOTA_LIMIT,
    windowHours: QUOTA_WINDOW_HOURS,
    matchedBy: deviceId ? "ip_and_device" : "ip",
  };
}

export async function recordQuotaUsage(input: {
  ipHash: string;
  deviceId: string | null;
  reportId: string;
}): Promise<void> {
  const supabase = getServerSupabase();
  await supabase.from("analyze_quota").insert({
    ip_hash: input.ipHash,
    device_id: input.deviceId,
    report_id: input.reportId,
  });
}
