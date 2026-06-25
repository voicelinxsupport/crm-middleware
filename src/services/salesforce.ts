import axios from 'axios';
import { getUserToken, saveUserToken, UserToken } from '../db/database';

const SF_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID!;
const SF_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET!;
const SF_CALLBACK_URL = process.env.SALESFORCE_CALLBACK_URL!;

const TOKEN_URL = 'https://login.salesforce.com/services/oauth2/token';
const AUTH_URL = 'https://login.salesforce.com/services/oauth2/authorize';

export function buildLoginUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SF_CLIENT_ID,
    redirect_uri: SF_CALLBACK_URL,
    scope: 'openid email refresh_token offline_access api',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  instance_url: string;
  email?: string;
}> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: SF_CLIENT_ID,
    client_secret: SF_CLIENT_SECRET,
    redirect_uri: SF_CALLBACK_URL,
  });
  const resp = await axios.post(TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return resp.data;
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  instance_url: string;
}> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SF_CLIENT_ID,
    client_secret: SF_CLIENT_SECRET,
  });
  const resp = await axios.post(TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return resp.data;
}

export async function sfRequest(
  clientId: string,
  userId: string,
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  data?: object
): Promise<any> {
  let tokenRow = await getUserToken(clientId, userId);
  if (!tokenRow) throw new Error('Kullanıcı giriş yapmamış');

  const now = Math.floor(Date.now() / 1000);
  if (tokenRow.expires_at && tokenRow.expires_at < now && tokenRow.refresh_token) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    tokenRow = { ...tokenRow, access_token: refreshed.access_token, instance_url: refreshed.instance_url, expires_at: now + 3600 };
    await saveUserToken(tokenRow);
  }

  const resp = await axios({
    method, data,
    url: `${tokenRow.instance_url}${path}`,
    headers: { Authorization: `Bearer ${tokenRow.access_token}`, 'Content-Type': 'application/json' },
  });
  return resp.data;
}

export async function searchByPhone(clientId: string, userId: string, phone: string, objectTypes: string[]): Promise<any[]> {
  const objects = objectTypes.length > 0 ? objectTypes : ['Contact', 'Lead', 'Account'];
  const clean = phone.replace(/^\+/, '').replace(/^0/, '');
  const results: any[] = [];
  for (const obj of objects) {
    try {
      const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone, MobilePhone FROM ${obj} WHERE Phone LIKE '%${clean}%' OR MobilePhone LIKE '%${clean}%' LIMIT 10`;
      const data = await sfRequest(clientId, userId, 'get', `/services/data/v60.0/query?q=${encodeURIComponent(soql)}`);
      for (const r of data.records || []) {
        results.push({ id: r.Id, type: obj, title: r.Name || `${r.FirstName || ''} ${r.LastName || ''}`.trim(), emails: r.Email ? [r.Email] : [], phones: [r.Phone, r.MobilePhone].filter(Boolean), last_modified_timestamp: Math.floor(Date.now() / 1000) });
      }
    } catch (err) { console.error(`Search error ${obj}:`, err); }
  }
  return results;
}

export async function searchByEmail(clientId: string, userId: string, email: string, objectTypes: string[]): Promise<any[]> {
  const objects = objectTypes.length > 0 ? objectTypes : ['Contact', 'Lead'];
  const results: any[] = [];
  for (const obj of objects) {
    try {
      const soql = `SELECT Id, FirstName, LastName, Name, Email, Phone FROM ${obj} WHERE Email = '${email}' LIMIT 10`;
      const data = await sfRequest(clientId, userId, 'get', `/services/data/v60.0/query?q=${encodeURIComponent(soql)}`);
      for (const r of data.records || []) {
        results.push({ id: r.Id, type: obj, title: r.Name || `${r.FirstName || ''} ${r.LastName || ''}`.trim(), emails: r.Email ? [r.Email] : [], phones: [r.Phone].filter(Boolean), last_modified_timestamp: Math.floor(Date.now() / 1000) });
      }
    } catch (err) { console.error(`Search error ${obj}:`, err); }
  }
  return results;
}

export async function searchByText(clientId: string, userId: string, query: string, objectTypes: string[]): Promise<any[]> {
  const objects = objectTypes.length > 0 ? objectTypes : ['Contact', 'Lead', 'Account'];
  const returning = objects.map(o => `${o}(Id, Name, Email, Phone)`).join(', ');
  try {
    const sosl = `FIND {${query}*} IN ALL FIELDS RETURNING ${returning} LIMIT 20`;
    const data = await sfRequest(clientId, userId, 'get', `/services/data/v60.0/search?q=${encodeURIComponent(sosl)}`);
    return (data.searchRecords || []).map((r: any) => ({
      id: r.Id, type: r.attributes?.type || 'Unknown', title: r.Name || '',
      emails: r.Email ?
