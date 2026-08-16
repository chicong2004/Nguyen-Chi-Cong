// Universal Cross-Device Cloud Sync Service for Mobile Phone & PC Synchronization
const CLOUD_KV_URL = 'https://kvdb.io/A9N2uX8d9zS9wK3pQ1m7/app_global_sync_v2';

export async function pushGlobalCloudData(data: { users: any[]; checkins: any[] }): Promise<void> {
  try {
    await fetch(CLOUD_KV_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.warn("Global Cloud push notice:", err);
  }
}

export async function pullGlobalCloudData(): Promise<{ users: any[]; checkins: any[] } | null> {
  try {
    const res = await fetch(CLOUD_KV_URL);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.users)) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Global Cloud pull notice:", err);
  }
  return null;
}
