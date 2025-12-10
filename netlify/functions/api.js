// netlify/functions/api.js
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL; // ใส่ URL /exec ของ Apps Script
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: CORS };
    }

    const path = event.path || '';

    if (path.endsWith('/api/dates') && event.httpMethod === 'GET') {
      const r = await fetch(`${APPS_SCRIPT_URL}?action=dates`, { cache: 'no-store' });
      const data = await r.json();
      return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
    }

    if (path.endsWith('/api/times') && event.httpMethod === 'GET') {
      const date = event.queryStringParameters?.date || '';
      const r = await fetch(`${APPS_SCRIPT_URL}?action=times&date=${encodeURIComponent(date)}`, { cache: 'no-store' });
      const data = await r.json();
      return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
    }

    if (path.endsWith('/api/book') && event.httpMethod === 'POST') {
      const r = await fetch(`${APPS_SCRIPT_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: event.body || '{}',
      });
      const data = await r.json();
      return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
    }

    return { statusCode: 404, headers: CORS, body: 'Not found' };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok:false, msg:'proxy-error' }) };
  }
};
