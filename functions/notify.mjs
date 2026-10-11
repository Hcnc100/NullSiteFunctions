/** Preserve the deployed mobile contract: all data values are strings. */
export function notificationData(email, idEmail) {
  if (!email || typeof idEmail !== 'string' || !idEmail ||
      !['email', 'name', 'subject', 'message'].every(key => typeof email[key] === 'string') ||
      typeof email.isOpen !== 'boolean') return null;
  try {
    const createdAt = email.createdAt?.toMillis(); const updatedAt = email.updatedAt?.toMillis();
    if (![createdAt, updatedAt].every(value => Number.isSafeInteger(value) && value >= 0)) return null;
    const data = { idEmail, email: email.email, name: email.name, subject: email.subject,
      isOpen: String(email.isOpen), message: email.message, createdAt: String(createdAt), updatedAt: String(updatedAt) };
    // NullSiteAdmin's Gson EmailDeserializer reads data.notify, id and timestamp.
    // Retain flat keys for other installed clients; never add a notification block.
    data.notify = JSON.stringify({ id: idEmail, timestamp: createdAt, name: email.name,
      email: email.email, subject: email.subject, message: email.message });
    if (Buffer.byteLength(JSON.stringify(data), 'utf8') > 3500) return null;
    return data;
  } catch { return null; }
}
export async function notifyCreatedEmail(email, idEmail, { readPhones, send, claim = async () => true }) {
  const data = notificationData(email, idEmail);
  const result = { sent: 0, invalid: 0, failed: 0, skipped: 0, invalidDocument: !data };
  if (!data) return result;
  const phones = await readPhones(); const unique = new Set();
  for (const phone of phones) {
    const token = phone?.tokenGCM;
    if (typeof token !== 'string' || !token.trim() || token.length > 4096) { result.skipped++; continue; }
    if (unique.has(token)) { result.skipped++; continue; }
    unique.add(token);
  }
  const tokens = [...unique];
  if (tokens.length && !await claim(idEmail)) return { ...result, duplicate: true };
  for (let offset = 0; offset < tokens.length; offset += 10) {
    await Promise.all(tokens.slice(offset, offset + 10).map(async token => {
      try { await send({ data, token }); result.sent++; }
      catch (error) {
        if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error?.code)) result.invalid++;
        else result.failed++;
      }
    }));
  }
  // Match deployed retry policy; no phone documents are modified/deleted.
  return result;
}
