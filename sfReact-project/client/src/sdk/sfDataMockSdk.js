import { request } from '../api/client.js';

const history = [];
const historyListeners = new Set();

export function gql(strings, ...values) {
  return strings.reduce((document, part, index) => (
    document + part + (index < values.length ? values[index] : '')
  ), '');
}

export function getMockSdkHistory() {
  return history.slice();
}

export function subscribeMockSdkHistory(listener) {
  historyListeners.add(listener);
  return () => historyListeners.delete(listener);
}

function recordCall(kind, document, variables, result) {
  const operation = document.match(/\b(?:query|mutation)\s+(\w+)/)?.[1] || 'Anonymous';
  history.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind, operation, document, variables: variables || {},
    data: result?.data ?? null, errors: result?.errors || []
  });
  if (history.length > 25) history.pop();
  for (const listener of historyListeners) listener();
}

async function dispatch(kind, document, variables) {
  if (typeof document !== 'string' || !document.trim()) {
    throw new Error('GraphQL document must be a non-empty string.');
  }
  try {
    const result = await request('/graphql', {
      method: 'POST',
      body: { query: document, variables: variables || {} }
    });
    recordCall(kind, document, variables, result);
    return result;
  } catch (error) {
    recordCall(kind, document, variables, { errors: [{ message: error.message }] });
    throw error;
  }
}

export async function createDataSDK() {
  return {
    apiVersion: 'MOCK-TRAINING',
    graphql: {
      async query({ query, variables } = {}) {
        let snapshot = await dispatch('query', query, variables);
        const subscriptions = new Set();
        return {
          get data() { return snapshot.data; },
          get errors() { return snapshot.errors; },
          async refresh() {
            snapshot = await dispatch('query/refresh', query, variables);
            for (const callback of subscriptions) callback(snapshot);
            return snapshot;
          },
          subscribe(callback) {
            if (typeof callback !== 'function') throw new TypeError('Subscriber must be a function');
            subscriptions.add(callback);
            return () => subscriptions.delete(callback);
          }
        };
      },
      async mutate({ mutation, variables } = {}) {
        return dispatch('mutation', mutation, variables);
      }
    }
  };
}
