import 'server-only';

import { getSupabaseAdmin } from './supabase-server';

export type VisitorActivityReport = {
  summary: { visitors: number; views: number; bagAdds: number; checkouts: number };
  visitors: Array<{ visitor: string; firstSeen: number; lastSeen: number; events: number; device: string }>;
  events: Array<{ visitor: string; action: string; path: string; device: string; created: number }>;
  mode: 'customers' | 'preview';
};

export async function recordVisitorActivity(input: {
  visitorHash: string;
  action: string;
  path: string;
  device: string;
  isTest: boolean;
}) {
  const { data, error } = await getSupabaseAdmin().rpc('record_visitor_activity', {
    p_visitor_hash: input.visitorHash,
    p_action: input.action,
    p_path: input.path,
    p_device: input.device,
    p_is_test: input.isTest,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function readVisitorActivity(isTest: boolean): Promise<VisitorActivityReport> {
  const { data, error } = await getSupabaseAdmin().rpc('admin_read_visitor_activity', {
    p_is_test: isTest,
  });
  if (error) throw new Error(error.message);
  return data as VisitorActivityReport;
}
