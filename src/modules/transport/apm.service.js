// ── APM Connect GPS Tracking Service ──────────────────────────────────────────
// Handles authentication (with auto-refresh) and vehicle tracking data fetch.

const APM_BASE = "/apm-api";
const APM_CREDENTIALS = {
  Username: "schoolpsf",
  Password: "A@123",
};

let _token = null;
let _tokenExpiry = null;
let _tokenPromise = null; // prevents parallel login calls

async function authenticate() {
  // If a login is already in flight, wait for it
  if (_tokenPromise) return _tokenPromise;

  _tokenPromise = (async () => {
    try {
      const res = await fetch(`${APM_BASE}/AuthenticationAPI/LoginAPI`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(APM_CREDENTIALS),
      });
      if (!res.ok) throw new Error(`APM login failed: ${res.status}`);
      const data = await res.json();
      _token = data.token;
      // Expire 60s early to avoid edge-case failures
      _tokenExpiry = new Date(data.validtill).getTime() - 60_000;
      return _token;
    } finally {
      _tokenPromise = null;
    }
  })();

  return _tokenPromise;
}

async function getToken() {
  if (_token && _tokenExpiry && Date.now() < _tokenExpiry) return _token;
  return authenticate();
}

/**
 * Fetch live vehicle tracking data from APM Connect.
 * Automatically handles token refresh on 401.
 */
export async function getAPMTrackingData() {
  const token = await getToken();

  let res = await fetch(`${APM_BASE}/TrackingAPI/gettrackingdevicedata`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // Token might have expired between getToken() and the request — retry once
  if (res.status === 401) {
    _token = null;
    _tokenExpiry = null;
    const freshToken = await authenticate();
    res = await fetch(`${APM_BASE}/TrackingAPI/gettrackingdevicedata`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${freshToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  if (!res.ok) throw new Error(`APM tracking fetch failed: ${res.status}`);
  return res.json();
}
