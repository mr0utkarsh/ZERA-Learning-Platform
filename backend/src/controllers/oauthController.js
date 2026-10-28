const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const config = require('../config');
const { signToken, setAuthCookie } = require('../middleware/auth');
const { Role, AccountStatus } = require('../utils/enums');

const STATE_COOKIE = 'zera_oauth_state';
const STATE_MAX_AGE = 10 * 60 * 1000;
const PROVIDERS = {
  google: {
    clientId: () => config.oauth.google.clientId,
    clientSecret: () => config.oauth.google.clientSecret,
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    callbackPath: '/api/auth/oauth/google/callback',
  },
  github: {
    clientId: () => config.oauth.github.clientId,
    clientSecret: () => config.oauth.github.clientSecret,
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    callbackPath: '/api/auth/oauth/github/callback',
  },
};

const frontend = (path) => `${config.frontendUrl.replace(/\/$/, '')}${path}`;
const callbackUrl = (provider) => `${config.backendUrl.replace(/\/$/, '')}${PROVIDERS[provider].callbackPath}`;
const isConfigured = (provider) => Boolean(PROVIDERS[provider]?.clientId() && PROVIDERS[provider]?.clientSecret());

function providers(req, res) {
  return res.json({ success: true, data: { providers: Object.fromEntries(Object.keys(PROVIDERS).map((name) => [name, isConfigured(name)])) } });
}

function setStateCookie(res, state) {
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: config.isProduction(),
    sameSite: 'lax',
    maxAge: STATE_MAX_AGE,
    path: '/api/auth/oauth',
  });
}

function clearStateCookie(res) {
  res.clearCookie(STATE_COOKIE, {
    httpOnly: true,
    secure: config.isProduction(),
    sameSite: 'lax',
    path: '/api/auth/oauth',
  });
}

function redirectError(res, code) {
  return res.redirect(302, `${frontend('/login')}?oauth_error=${encodeURIComponent(code)}`);
}

function start(req, res) {
  const providerName = req.params.provider;
  const provider = PROVIDERS[providerName];
  if (!provider) return redirectError(res, 'unsupported_provider');
  if (!isConfigured(providerName)) return redirectError(res, 'not_configured');

  const state = crypto.randomBytes(32).toString('hex');
  setStateCookie(res, state);
  const params = new URLSearchParams({
    client_id: provider.clientId(),
    redirect_uri: callbackUrl(providerName),
    response_type: 'code',
    scope: providerName === 'google' ? 'openid email profile' : 'read:user user:email',
    state,
  });
  if (providerName === 'google') params.set('prompt', 'select_account');
  return res.redirect(302, `${provider.authorizeUrl}?${params.toString()}`);
}

async function exchangeCode(providerName, code) {
  const provider = PROVIDERS[providerName];
  const form = new URLSearchParams({
    client_id: provider.clientId(),
    client_secret: provider.clientSecret(),
    code,
    redirect_uri: callbackUrl(providerName),
  });
  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'ZERA-Learning-Platform',
    },
    body: form,
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`${providerName} token exchange failed (${response.status})`);
  const token = await response.json();
  if (!token.access_token) throw new Error(`${providerName} did not return an access token`);
  return token.access_token;
}

async function fetchJson(url, accessToken, providerName) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'ZERA-Learning-Platform',
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`${providerName} profile request failed (${response.status})`);
  return response.json();
}

async function googleProfile(accessToken) {
  const user = await fetchJson('https://openidconnect.googleapis.com/v1/userinfo', accessToken, 'google');
  if (!user.email || user.email_verified !== true) throw new Error('Google did not return a verified email address');
  return { email: user.email, name: user.name || user.given_name || user.email.split('@')[0] };
}

async function githubProfile(accessToken) {
  const [user, emails] = await Promise.all([
    fetchJson('https://api.github.com/user', accessToken, 'github'),
    fetchJson('https://api.github.com/user/emails', accessToken, 'github'),
  ]);
  const email = Array.isArray(emails) ? (emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified)) : null;
  if (!email?.email) throw new Error('GitHub did not return a verified email address');
  return { email: email.email, name: user.name || user.login || email.email.split('@')[0] };
}

async function findOrCreateStudent(profile) {
  const email = String(profile.email).trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    if (user.role !== Role.STUDENT || user.status !== AccountStatus.ACTIVE) throw new Error('account_unavailable');
    if (!user.emailVerified) user = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    return user;
  }

  const randomPassword = crypto.randomBytes(48).toString('hex');
  const passwordHash = await bcrypt.hash(randomPassword, 12);
  try {
    return await prisma.user.create({
      data: {
        name: String(profile.name || email.split('@')[0]).trim().slice(0, 80),
        email,
        passwordHash,
        emailVerified: true,
        role: Role.STUDENT,
        status: AccountStatus.ACTIVE,
      },
    });
  } catch (error) {
    // A concurrent callback may have created the account after the lookup.
    if (error.code !== 'P2002') throw error;
    user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== Role.STUDENT || user.status !== AccountStatus.ACTIVE) throw new Error('account_unavailable');
    return user;
  }
}

async function callback(req, res) {
  const providerName = req.params.provider;
  const provider = PROVIDERS[providerName];
  clearStateCookie(res);
  if (!provider || !isConfigured(providerName)) return redirectError(res, 'not_configured');
  if (req.query.error) return redirectError(res, 'cancelled');

  const state = String(req.query.state || '');
  const cookieState = String(req.cookies?.[STATE_COOKIE] || '');
  if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(cookieState) || !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(cookieState))) {
    return redirectError(res, 'invalid_state');
  }
  const code = String(req.query.code || '');
  if (!code || code.length > 2048) return redirectError(res, 'failed');

  try {
    const accessToken = await exchangeCode(providerName, code);
    const profile = providerName === 'google' ? await googleProfile(accessToken) : await githubProfile(accessToken);
    const user = await findOrCreateStudent(profile);
    setAuthCookie(res, signToken(user));
    return res.redirect(302, frontend('/dashboard'));
  } catch (error) {
    if (error.message === 'account_unavailable') return redirectError(res, 'account_unavailable');
    console.error(`[auth] ${providerName} OAuth callback failed:`, error.message);
    return redirectError(res, 'failed');
  }
}

module.exports = { providers, start, callback };
