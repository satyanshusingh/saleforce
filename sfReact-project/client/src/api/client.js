let activeDemoUserId = 'u1';

export function setCurrentDemoUser(userId) {
  activeDemoUserId = userId;
}

export async function api(path, { userId, ...options } = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-demo-user': userId } : {}),
      ...options?.headers
    }
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}

export function request(path, { body, ...options } = {}) {
  return api(path, {
    ...options,
    userId: activeDemoUserId,
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) })
  });
}
