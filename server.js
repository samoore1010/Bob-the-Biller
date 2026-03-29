import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  getProfile,
  syncMessages,
  matchActivityToMatter,
} from './server/gmail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

// ─── Ensure default settings row exists ────────────────────────────
async function ensureSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!existing) {
    await prisma.settings.create({
      data: {
        id: 1,
        narrativePrompt: 'Your job is to assist me to draft law firm billing entries...',
        geminiApiKey: process.env.GEMINI_API_KEY || '',
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  ACTIVITIES
// ═══════════════════════════════════════════════════════════════════

app.get('/api/activities', async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(activities);
  } catch (err) {
    console.error('GET /api/activities error:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const created = await prisma.activity.createMany({
      data: items.map(item => ({
        type: item.type || 'mail-in',
        date: item.date,
        time: item.time || '12:00 PM',
        subject: item.subject || 'No Subject',
        preview: item.preview || '',
        correspondent: item.correspondent || 'Unknown',
        matterId: item.matterId || 'Unassigned',
        user: item.user || 'Steven Moore',
        duration: item.duration || '0.10',
        rate: item.rate || 350,
        itemLink: item.itemLink || null,
        gmailMessageId: item.gmailMessageId || null,
      })),
      skipDuplicates: true,
    });
    res.json({ count: created.count });
  } catch (err) {
    console.error('POST /api/activities error:', err);
    res.status(500).json({ error: 'Failed to create activities' });
  }
});

app.put('/api/activities/:id', async (req, res) => {
  try {
    const updated = await prisma.activity.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/activities/:id error:', err);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

app.put('/api/activities/bulk-update', async (req, res) => {
  try {
    const { ids, data } = req.body;
    const updated = await prisma.activity.updateMany({
      where: { id: { in: ids.map(Number) } },
      data,
    });
    res.json({ count: updated.count });
  } catch (err) {
    console.error('PUT /api/activities/bulk-update error:', err);
    res.status(500).json({ error: 'Failed to bulk update' });
  }
});

app.delete('/api/activities', async (req, res) => {
  try {
    const { ids } = req.body;
    const deleted = await prisma.activity.deleteMany({
      where: { id: { in: ids.map(Number) } },
    });
    res.json({ count: deleted.count });
  } catch (err) {
    console.error('DELETE /api/activities error:', err);
    res.status(500).json({ error: 'Failed to delete activities' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  BILLED ENTRIES
// ═══════════════════════════════════════════════════════════════════

app.get('/api/billed-entries', async (req, res) => {
  try {
    const entries = await prisma.billedEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(entries);
  } catch (err) {
    console.error('GET /api/billed-entries error:', err);
    res.status(500).json({ error: 'Failed to fetch billed entries' });
  }
});

app.post('/api/billed-entries', async (req, res) => {
  try {
    const { entry, activityIdsToRemove } = req.body;
    // Create billed entry and remove source activities in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.billedEntry.create({ data: entry });
      if (activityIdsToRemove?.length > 0) {
        await tx.activity.deleteMany({
          where: { id: { in: activityIdsToRemove.map(Number) } },
        });
      }
      return created;
    });
    res.json(result);
  } catch (err) {
    console.error('POST /api/billed-entries error:', err);
    res.status(500).json({ error: 'Failed to create billed entry' });
  }
});

app.put('/api/billed-entries/:id', async (req, res) => {
  try {
    const updated = await prisma.billedEntry.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/billed-entries/:id error:', err);
    res.status(500).json({ error: 'Failed to update billed entry' });
  }
});

app.delete('/api/billed-entries/:id', async (req, res) => {
  try {
    const { restoreActivities } = req.body || {};
    await prisma.$transaction(async (tx) => {
      // If restoring, get the entry first to extract original items
      if (restoreActivities) {
        const entry = await tx.billedEntry.findUnique({ where: { id: parseInt(req.params.id) } });
        if (entry?.originalItems) {
          const items = Array.isArray(entry.originalItems) ? entry.originalItems : [];
          for (const item of items) {
            await tx.activity.create({
              data: {
                type: item.type,
                date: item.date,
                time: item.time || '12:00 PM',
                subject: item.subject || '',
                preview: item.preview || '',
                correspondent: item.correspondent || '',
                matterId: item.matterId || 'Unassigned',
                user: item.user || 'Steven Moore',
                duration: item.duration || '0.10',
                rate: item.rate || 350,
                itemLink: item.itemLink || null,
                gmailMessageId: item.gmailMessageId || null,
              },
            });
          }
        }
      }
      await tx.billedEntry.delete({ where: { id: parseInt(req.params.id) } });
    });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/billed-entries/:id error:', err);
    res.status(500).json({ error: 'Failed to delete billed entry' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  SMART RULES
// ═══════════════════════════════════════════════════════════════════

app.get('/api/smart-rules', async (req, res) => {
  try {
    const rules = await prisma.smartRule.findMany({ orderBy: { id: 'asc' } });
    res.json(rules);
  } catch (err) {
    console.error('GET /api/smart-rules error:', err);
    res.status(500).json({ error: 'Failed to fetch smart rules' });
  }
});

app.post('/api/smart-rules', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    for (const item of items) {
      const created = await prisma.smartRule.create({
        data: { matterId: item.matterId, triggers: item.triggers },
      });
      results.push(created);
    }
    res.json(results);
  } catch (err) {
    console.error('POST /api/smart-rules error:', err);
    res.status(500).json({ error: 'Failed to create smart rule' });
  }
});

app.put('/api/smart-rules/:id', async (req, res) => {
  try {
    const updated = await prisma.smartRule.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/smart-rules/:id error:', err);
    res.status(500).json({ error: 'Failed to update smart rule' });
  }
});

app.delete('/api/smart-rules/:id', async (req, res) => {
  try {
    await prisma.smartRule.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/smart-rules/:id error:', err);
    res.status(500).json({ error: 'Failed to delete smart rule' });
  }
});

// Bulk replace all smart rules (used for import)
app.put('/api/smart-rules', async (req, res) => {
  try {
    const rules = req.body;
    await prisma.$transaction(async (tx) => {
      await tx.smartRule.deleteMany();
      for (const rule of rules) {
        await tx.smartRule.create({
          data: { matterId: rule.matterId, triggers: rule.triggers },
        });
      }
    });
    const updated = await prisma.smartRule.findMany({ orderBy: { id: 'asc' } });
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/smart-rules error:', err);
    res.status(500).json({ error: 'Failed to replace smart rules' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  CAST MAPPINGS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/cast-mappings', async (req, res) => {
  try {
    const mappings = await prisma.castMapping.findMany({ orderBy: { id: 'asc' } });
    res.json(mappings);
  } catch (err) {
    console.error('GET /api/cast-mappings error:', err);
    res.status(500).json({ error: 'Failed to fetch cast mappings' });
  }
});

app.post('/api/cast-mappings', async (req, res) => {
  try {
    const created = await prisma.castMapping.create({ data: req.body });
    res.json(created);
  } catch (err) {
    console.error('POST /api/cast-mappings error:', err);
    res.status(500).json({ error: 'Failed to create cast mapping' });
  }
});

app.put('/api/cast-mappings/:id', async (req, res) => {
  try {
    const updated = await prisma.castMapping.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/cast-mappings/:id error:', err);
    res.status(500).json({ error: 'Failed to update cast mapping' });
  }
});

app.delete('/api/cast-mappings/:id', async (req, res) => {
  try {
    await prisma.castMapping.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/cast-mappings/:id error:', err);
    res.status(500).json({ error: 'Failed to delete cast mapping' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/settings', async (req, res) => {
  try {
    await ensureSettings();
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    // Don't expose tokens to frontend
    const { gmailTokens, ...safe } = settings;
    res.json({ ...safe, gmailConnected: !!gmailTokens });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    await ensureSettings();
    const { gmailConnected, ...data } = req.body;
    const updated = await prisma.settings.update({
      where: { id: 1 },
      data,
    });
    const { gmailTokens, ...safe } = updated;
    res.json({ ...safe, gmailConnected: !!gmailTokens });
  } catch (err) {
    console.error('PUT /api/settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  GMAIL INTEGRATION
// ═══════════════════════════════════════════════════════════════════

// Step 1: Generate auth URL and redirect
app.get('/api/gmail/auth', (req, res) => {
  const client = createOAuth2Client();
  if (!client) {
    return res.status(400).json({ error: 'Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
  }
  const url = getAuthUrl(client);
  res.json({ url });
});

// Step 2: OAuth callback — exchange code for tokens
app.get('/api/gmail/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const client = createOAuth2Client();
    const tokens = await getTokensFromCode(client, code);

    // Get user's email for sender detection
    client.setCredentials(tokens);
    const profile = await getProfile(client);

    await ensureSettings();
    await prisma.settings.update({
      where: { id: 1 },
      data: {
        gmailTokens: tokens,
        gmailEmail: profile.emailAddress,
      },
    });

    // Redirect back to the app
    res.redirect('/?gmail=connected');
  } catch (err) {
    console.error('Gmail OAuth callback error:', err);
    res.status(500).send('Failed to complete Gmail authentication');
  }
});

// Step 3: Disconnect Gmail
app.post('/api/gmail/disconnect', async (req, res) => {
  try {
    await ensureSettings();
    await prisma.settings.update({
      where: { id: 1 },
      data: { gmailTokens: null, gmailEmail: null, gmailSyncedAt: null },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Gmail disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

// Step 4: Sync — fetch new messages from Gmail
app.post('/api/gmail/sync', async (req, res) => {
  try {
    await ensureSettings();
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });

    if (!settings?.gmailTokens) {
      return res.status(400).json({ error: 'Gmail not connected' });
    }

    const client = createOAuth2Client();
    if (!client) {
      return res.status(400).json({ error: 'Google OAuth credentials not configured' });
    }
    client.setCredentials(settings.gmailTokens);

    // If token is expired, refresh it
    const tokenInfo = settings.gmailTokens;
    if (tokenInfo.expiry_date && Date.now() >= tokenInfo.expiry_date) {
      const { credentials } = await client.refreshAccessToken();
      await prisma.settings.update({
        where: { id: 1 },
        data: { gmailTokens: credentials },
      });
      client.setCredentials(credentials);
    }

    // Fetch smart rules for auto-assignment
    const smartRules = await prisma.smartRule.findMany();

    // Sync messages (from last sync date or last 7 days)
    const after = settings.gmailSyncedAt
      ? settings.gmailSyncedAt.toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const activities = await syncMessages(client, {
      maxResults: 100,
      after,
      inboundRate: settings.inboundRate,
      outboundRate: settings.outboundRate,
      hourlyRate: settings.hourlyRate,
      userEmail: settings.gmailEmail || '',
    });

    // Apply smart rules to each activity
    for (const activity of activities) {
      const match = matchActivityToMatter(activity, smartRules);
      if (match) {
        activity.matterId = match;
      }
    }

    // Insert new activities (skip duplicates via gmailMessageId unique constraint)
    let insertedCount = 0;
    for (const activity of activities) {
      try {
        await prisma.activity.create({ data: activity });
        insertedCount++;
      } catch (err) {
        // Skip duplicates (unique constraint on gmailMessageId)
        if (err.code !== 'P2002') {
          console.error('Failed to insert activity:', err);
        }
      }
    }

    // Update sync timestamp
    await prisma.settings.update({
      where: { id: 1 },
      data: { gmailSyncedAt: new Date() },
    });

    res.json({
      fetched: activities.length,
      inserted: insertedCount,
      skipped: activities.length - insertedCount,
    });
  } catch (err) {
    console.error('Gmail sync error:', err);
    res.status(500).json({ error: 'Gmail sync failed: ' + err.message });
  }
});

// Gmail status
app.get('/api/gmail/status', async (req, res) => {
  try {
    await ensureSettings();
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json({
      connected: !!settings?.gmailTokens,
      email: settings?.gmailEmail || null,
      lastSynced: settings?.gmailSyncedAt || null,
    });
  } catch (err) {
    console.error('Gmail status error:', err);
    res.status(500).json({ error: 'Failed to get Gmail status' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  APPLY SMART RULES (re-run matching on all unassigned activities)
// ═══════════════════════════════════════════════════════════════════

app.post('/api/apply-smart-rules', async (req, res) => {
  try {
    const rules = await prisma.smartRule.findMany();
    const unassigned = await prisma.activity.findMany({
      where: { matterId: 'Unassigned' },
    });

    let count = 0;
    for (const activity of unassigned) {
      const match = matchActivityToMatter(activity, rules);
      if (match) {
        await prisma.activity.update({
          where: { id: activity.id },
          data: { matterId: match },
        });
        count++;
      }
    }

    res.json({ updated: count });
  } catch (err) {
    console.error('Apply smart rules error:', err);
    res.status(500).json({ error: 'Failed to apply smart rules' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  SPA FALLBACK (must be last)
// ═══════════════════════════════════════════════════════════════════

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ─── Start server ──────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await prisma.$connect();
    await ensureSettings();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.log('Server running without database — set DATABASE_URL to enable persistence');
  }
});
