import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback';

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(oauth2Client) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

export async function getTokensFromCode(oauth2Client, code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getProfile(oauth2Client) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: 'me' });
  return profile.data;
}

/**
 * Fetch recent messages from Gmail and convert them to activities.
 * @param {object} oauth2Client - Authenticated OAuth2 client
 * @param {object} options - { maxResults, after (date string), smartRules }
 * @returns {Array} Array of activity objects ready for DB insertion
 */
export async function syncMessages(oauth2Client, options = {}) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const { maxResults = 50, after, inboundRate = 0.1, outboundRate = 0.2, hourlyRate = 350, userEmail = '' } = options;

  // Build search query
  let query = '';
  if (after) {
    const afterDate = new Date(after);
    const epoch = Math.floor(afterDate.getTime() / 1000);
    query = `after:${epoch}`;
  }

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: query || undefined,
  });

  const messageIds = listResponse.data.messages || [];
  if (messageIds.length === 0) return [];

  const activities = [];

  for (const msg of messageIds) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Subject', 'Date'],
    });

    const headers = full.data.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const from = getHeader('From');
    const to = getHeader('To');
    const subject = getHeader('Subject');
    const dateStr = getHeader('Date');
    const snippet = full.data.snippet || '';

    // Determine if inbound or outbound
    const fromLower = from.toLowerCase();
    const isOutbound = userEmail && fromLower.includes(userEmail.toLowerCase());
    const type = isOutbound ? 'mail-out' : 'mail-in';

    // Extract correspondent name/email
    let correspondent = isOutbound ? to : from;
    // Clean up "Name <email>" format to just the name or email
    const nameMatch = correspondent.match(/^"?([^"<]+)"?\s*</);
    if (nameMatch) {
      correspondent = nameMatch[1].trim();
    }

    // Parse date
    const parsedDate = new Date(dateStr);
    const date = isNaN(parsedDate.getTime())
      ? new Date().toLocaleDateString('en-US')
      : `${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getDate().toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
    const time = isNaN(parsedDate.getTime())
      ? '12:00 PM'
      : parsedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const duration = isOutbound ? outboundRate.toFixed(2) : inboundRate.toFixed(2);

    activities.push({
      type,
      date,
      time,
      subject: subject || 'No Subject',
      preview: snippet.substring(0, 300),
      correspondent,
      matterId: 'Unassigned', // Will be matched by smart rules on the server
      user: 'Steven Moore',
      duration,
      rate: hourlyRate,
      itemLink: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
      gmailMessageId: msg.id,
    });
  }

  return activities;
}

/**
 * Apply smart rules to an activity to determine matter assignment.
 */
export function matchActivityToMatter(activity, smartRules) {
  const textToSearch = (
    (activity.subject || '') + ' ' +
    (activity.preview || '') + ' ' +
    (activity.correspondent || '')
  ).toLowerCase();

  for (const rule of smartRules) {
    const triggers = Array.isArray(rule.triggers) ? rule.triggers : [];
    const match = triggers.some(trigger => {
      const t = trigger.toLowerCase().trim();
      return t && textToSearch.includes(t);
    });
    if (match) return rule.matterId;
  }
  return null;
}
