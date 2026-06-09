import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jwt-simple';
import crypto from 'crypto';
import { eq, and, gt, desc } from 'drizzle-orm';
import { getDb, users } from '@career-copilot/db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const db = getDb(process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/career_copilot');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeToken(userId: string) {
  return jwt.encode({ userId, iat: Date.now() }, JWT_SECRET);
}

function safeUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    email_verified: u.email_verified,
    oauth_provider: u.oauth_provider,
    created_at: u.created_at,
    streak_days: u.streak_days,
    xp_total: u.xp_total,
  };
}

/** Send a verification email.
 *  Requires EMAIL_FROM + one of: RESEND_API_KEY or SMTP_* env vars.
 *  Falls back to console.log in development so the app works without email config. */
async function sendVerificationEmail(email: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    // Resend (https://resend.com) — install with: npm i resend
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Career Copilot <noreply@careercopilot.ai>',
        to: email,
        subject: 'Verify your Career Copilot account',
        html: verifyEmailHtml(link),
      });
    } catch (e) {
      console.error('[EMAIL] Resend error:', e);
    }
  } else {
    // Development fallback — log the link so you can click it manually
    console.log(`\n[EMAIL] Verification link for ${email}:\n${link}\n`);
  }
}

async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Career Copilot <noreply@careercopilot.ai>',
        to: email,
        subject: 'Reset your Career Copilot password',
        html: resetEmailHtml(link),
      });
    } catch (e) {
      console.error('[EMAIL] Resend error:', e);
    }
  } else {
    console.log(`\n[EMAIL] Password reset link for ${email}:\n${link}\n`);
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

function verifyEmailHtml(link: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#09090b;color:#fafafa;border-radius:12px">
      <h2 style="margin:0 0 8px;font-size:20px">Verify your email</h2>
      <p style="color:#a1a1aa;margin:0 0 24px;font-size:14px">Click the button below to activate your Career Copilot account.</p>
      <a href="${link}" style="display:inline-block;background:#fafafa;color:#09090b;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none">Verify Email</a>
      <p style="color:#52525b;margin:24px 0 0;font-size:12px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    </div>`;
}

function resetEmailHtml(link: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#09090b;color:#fafafa;border-radius:12px">
      <h2 style="margin:0 0 8px;font-size:20px">Reset your password</h2>
      <p style="color:#a1a1aa;margin:0 0 24px;font-size:14px">Click the button below to set a new password. This link expires in 1 hour.</p>
      <a href="${link}" style="display:inline-block;background:#fafafa;color:#09090b;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none">Reset Password</a>
      <p style="color:#52525b;margin:24px 0 0;font-size:12px">If you didn't request this, ignore this email. Your password won't change.</p>
    </div>`;
}

// ── Register ──────────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const verify_token = crypto.randomBytes(32).toString('hex');
    const verify_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const [user] = await db.insert(users).values({
      email: email.toLowerCase(),
      password_hash,
      name,
      email_verified: false,
      verify_token,
      verify_token_expires,
    }).returning();

    await sendVerificationEmail(user.email, verify_token);

    const token = makeToken(user.id);
    res.json({ user: safeUser(user), token, requiresVerification: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = makeToken(user.id);
    res.json({ user: safeUser(user), token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Verify email ──────────────────────────────────────────────────────────────

router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });
  const { sql } = await import('drizzle-orm');

  try {
    const now = new Date();
    const [user] = await db.select().from(users).where(
      and(eq(users.verify_token, token), gt(users.verify_token_expires!, now))
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    await db.execute(
      sql`UPDATE users SET email_verified = true, verify_token = NULL, verify_token_expires = NULL WHERE id = ${user.id}`
    );

    const authToken = makeToken(user.id);
    res.json({ success: true, user: safeUser({ ...user, email_verified: true }), token: authToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Resend verification ───────────────────────────────────────────────────────

router.post('/resend-verification', authenticate, async (req: any, res) => {
  const { sql } = await import('drizzle-orm');
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId));
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email_verified) return res.status(400).json({ error: 'Email already verified' });

    const verify_token = crypto.randomBytes(32).toString('hex');
    const verify_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.execute(
      sql`UPDATE users SET verify_token = ${verify_token}, verify_token_expires = ${verify_token_expires} WHERE id = ${user.id}`
    );
    await sendVerificationEmail(user.email, verify_token);

    res.json({ success: true });
  } catch (error) {
    console.error('[RESEND-VERIFY]', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Forgot password ───────────────────────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const { sql } = await import('drizzle-orm');

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!user) return res.json({ success: true }); // prevent enumeration

    const reset_token = crypto.randomBytes(32).toString('hex');
    const reset_token_expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.execute(
      sql`UPDATE users SET reset_token = ${reset_token}, reset_token_expires = ${reset_token_expires} WHERE id = ${user.id}`
    );
    await sendPasswordResetEmail(user.email, reset_token);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Reset password ────────────────────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const { sql } = await import('drizzle-orm');

  try {
    const now = new Date();
    const [user] = await db.select().from(users).where(
      and(eq(users.reset_token, token), gt(users.reset_token_expires!, now))
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    await db.execute(
      sql`UPDATE users SET password_hash = ${password_hash}, reset_token = NULL, reset_token_expires = NULL, email_verified = true WHERE id = ${user.id}`
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── OAuth callback (Google / GitHub) ─────────────────────────────────────────
// These routes are called by your OAuth provider after the user authorises.
// Set up OAuth apps at:
//   Google:  https://console.cloud.google.com/apis/credentials
//   GitHub:  https://github.com/settings/developers
// Then set env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

router.get('/oauth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('[OAUTH] Google returned error:', error);
    return res.redirect(`${APP_URL}/login?error=oauth_failed`);
  }
  if (!code) return res.redirect(`${APP_URL}/login?error=oauth_failed`);

  try {
    const apiBaseUrl = (process.env.API_URL || 'http://localhost:4000').replace(/\/+$/, '');
    const redirectUri = `${apiBaseUrl}/api/v1/auth/oauth/google/callback`;
    console.log('[OAUTH] Google Callback redirectUri constructed:', redirectUri);
    console.log('[OAUTH] Google Callback process.env.API_URL:', process.env.API_URL);

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json() as any;

    if (tokenData.error) {
      console.error('[OAUTH] Google token exchange failed:', tokenData.error, tokenData.error_description);
      return res.redirect(`${APP_URL}/login?error=oauth_failed`);
    }

    // Get user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json() as any;

    const user = await upsertOAuthUser({
      email: profile.email,
      name: profile.name,
      oauth_provider: 'google',
      oauth_id: profile.id,
    });

    const token = makeToken(user.id);
    res.redirect(`${APP_URL}/auth/callback?token=${token}`);
  } catch (e) {
    console.error('[OAUTH] Google error:', e);
    res.redirect(`${APP_URL}/login?error=oauth_failed`);
  }
});

router.get('/oauth/github/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${APP_URL}/login?error=oauth_failed`);

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID || '',
        client_secret: process.env.GITHUB_CLIENT_SECRET || '',
        code,
      }),
    });
    const tokenData = await tokenRes.json() as any;

    const profileRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json() as any;

    // GitHub may not expose email — fetch it separately
    let email = profile.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const emails = await emailsRes.json() as any[];
      email = emails.find((e: any) => e.primary)?.email || emails[0]?.email;
    }

    if (!email) return res.redirect(`${APP_URL}/login?error=no_email`);

    const user = await upsertOAuthUser({
      email,
      name: profile.name || profile.login,
      oauth_provider: 'github',
      oauth_id: String(profile.id),
    });

    const token = makeToken(user.id);
    res.redirect(`${APP_URL}/auth/callback?token=${token}`);
  } catch (e) {
    console.error('[OAUTH] GitHub error:', e);
    res.redirect(`${APP_URL}/login?error=oauth_failed`);
  }
});

async function upsertOAuthUser(data: {
  email: string; name: string; oauth_provider: string; oauth_id: string;
}) {
  // Use raw SQL to avoid drizzle ORM query-builder issues with nullable columns
  const { sql } = await import('drizzle-orm');
  const emailLower = data.email.toLowerCase();

  // Try to find existing user
  const existing = await db.select().from(users).where(eq(users.email, emailLower));

  if (existing.length > 0) {
    // Raw update to avoid drizzle WHERE clause generation bug
    const result = await db.execute(
      sql`UPDATE users SET oauth_provider = ${data.oauth_provider}, oauth_id = ${data.oauth_id}, email_verified = true WHERE id = ${existing[0].id} RETURNING id, email, name, email_verified, oauth_provider`
    );
    return (result as any).rows[0];
  }

  // Raw insert for new OAuth user
  const result = await db.execute(
    sql`INSERT INTO users (email, name, oauth_provider, oauth_id, email_verified) VALUES (${emailLower}, ${data.name}, ${data.oauth_provider}, ${data.oauth_id}, true) RETURNING id, email, name, email_verified, oauth_provider`
  );
  return (result as any).rows[0];
}

// ── PATCH /me — update profile ────────────────────────────────────────────────

router.patch('/me', authenticate, async (req: any, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const { sql } = await import('drizzle-orm');
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name !== undefined && newPassword) {
      return res.status(400).json({ error: 'Send name and password updates separately' });
    }

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Name cannot be empty' });
      await db.execute(sql`UPDATE users SET name = ${name.trim()} WHERE id = ${req.userId}`);
    } else if (newPassword) {
      if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      if (!user.password_hash) return res.status(400).json({ error: 'Use OAuth to manage your password' });
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
      const password_hash = await bcrypt.hash(newPassword, 12);
      await db.execute(sql`UPDATE users SET password_hash = ${password_hash} WHERE id = ${req.userId}`);
    } else {
      return res.status(400).json({ error: 'No changes provided' });
    }

    const result = await db.execute(
      sql`SELECT id, email, name, email_verified, oauth_provider, created_at, streak_days, xp_total FROM users WHERE id = ${req.userId}`
    );
    const updated = (result as any).rows?.[0];
    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      email_verified: updated.email_verified,
      oauth_provider: updated.oauth_provider,
      created_at: updated.created_at,
      streak_days: updated.streak_days,
      xp_total: updated.xp_total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /me — delete account ───────────────────────────────────────────────

router.delete('/me', authenticate, async (req: any, res) => {
  const { password } = req.body;
  const { sql } = await import('drizzle-orm');
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.password_hash) {
      if (!password) return res.status(400).json({ error: 'Password confirmation required' });
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(400).json({ error: 'Incorrect password' });
    }

    // Raw SQL delete — cascade handled by FK constraints
    await db.execute(sql`DELETE FROM users WHERE id = ${req.userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /me/resumes — all resumes for settings ────────────────────────────────

router.get('/me/resumes', authenticate, async (req: any, res) => {
  const { resumes: resumesTable } = await import('@career-copilot/db');
  try {
    const all = await db.select().from(resumesTable)
      .where(eq(resumesTable.user_id, req.userId));
    res.json(all.sort((a, b) =>
      new Date(b.uploaded_at!).getTime() - new Date(a.uploaded_at!).getTime()
    ));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /me/stats — interview + career stats ──────────────────────────────────

router.get('/me/stats', authenticate, async (req: any, res) => {
  const { interviews: interviewsTable, resumes: resumesTable } = await import('@career-copilot/db');
  try {
    const allInterviews = await db.select().from(interviewsTable)
      .where(eq(interviewsTable.user_id, req.userId));
    const allResumes = await db.select().from(resumesTable)
      .where(eq(resumesTable.user_id, req.userId));

    const scores = allInterviews.map(i => i.overall_pct || 0).filter(s => s > 0);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const bestScore = scores.length ? Math.max(...scores) : 0;

    res.json({
      totalInterviews: allInterviews.length,
      avgInterviewScore: avgScore,
      bestInterviewScore: bestScore,
      totalResumes: allResumes.length,
      activeResume: allResumes.find(r => r.is_active) || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── /me ───────────────────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: any, res) => {
  const { sql } = await import('drizzle-orm');
  try {
    const result = await db.execute(
      sql`SELECT id, email, name, email_verified, oauth_provider, created_at, streak_days, xp_total FROM users WHERE id = ${req.userId}`
    );
    const user = (result as any).rows?.[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.email_verified,
      oauth_provider: user.oauth_provider,
      created_at: user.created_at,
      streak_days: user.streak_days,
      xp_total: user.xp_total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Auth middleware ───────────────────────────────────────────────────────────

export function authenticate(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.decode(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export default router;
