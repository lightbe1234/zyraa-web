/** Errors returned when a just-deployed API is ahead of the database schema. */
export function isMissingDatabaseObject(error: unknown) {
  const value = error as { code?: string; message?: string; details?: string } | null;
  const code = String(value?.code || '').toUpperCase();
  const message = `${value?.message || ''} ${value?.details || ''}`.toLowerCase();
  return code === '42883' || code === '42P01' || code === 'PGRST202' || code === 'PGRST205'
    || message.includes('does not exist') || message.includes('could not find the function')
    || message.includes('schema cache');
}
