/**
 * MK Academy educational MOCK implementation of selected Salesforce Data SDK APIs.
 * Deliberately aliases @salesforce/platform-sdk/data in Vite.
 * It is NOT Salesforce software, authentication, or the real SDK.
 * Deliberate subset: gql, createDataSDK, graphql.query, graphql.mutate,
 * query result .refresh() and .subscribe(). No real reactive cache.
 */
import {request} from '../lib/api.js';

// Identity template tag analogous to the official gql utility.
export function gql(strings, ...values) {
  return strings.reduce((text, segment, i) => text + segment + (i < values.length ? values[i] : ''), '');
}

const observers = new Set();
const calls = [];
export function getMockSDKHistory() { return calls.slice(); }
export function clearMockSDKHistory() { calls.splice(0); for (const listener of observers) listener(); }
export function subscribeMockSDKHistory(listener) { observers.add(listener); return () => observers.delete(listener); }
function trace(kind, document, variables, result) {
  calls.unshift({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    at: new Date().toISOString(), kind,
    operation: document.match(/\b(?:query|mutation)\s+(\w+)/)?.[1] ?? 'Anonymous',
    document, variables: variables ?? {},
    errors: result?.errors || [], data: result?.data ?? null
  });
  if (calls.length > 25) calls.pop();
  for (const listener of observers) listener();
}
async function dispatch(kind, document, variables) {
  if (typeof document !== 'string' || !document.trim()) {
    throw new Error('GraphQL document must be a non-empty string.');
  }
  // request() routes to the existing Node classroom server, with x-demo-user.
  // This is NOT how the actual Salesforce Data SDK authenticates.
  try {
    const result = await request('/graphql', {
      method: 'POST',
      body: {query: document, variables: variables || {}}
    });
    trace(kind, document, variables, result);
    return result;
  } catch (error) {
    // Transport errors reject; GraphQL errors remain in the result.errors envelope.
    trace(kind, document, variables, {errors: [{message: error.message}], data: null});
    throw error;
  }
}

export async function createDataSDK() {
  return {
    apiVersion: 'MOCK-TRAINING',
    graphql: {
      async query({query, variables, operationName} = {}) {
        let snapshot = await dispatch('query', query, variables);
        const subscriptions = new Set();
        // Real Salesforce has additional caching/refresh semantics;
        // here refresh triggers another local HTTP request.
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
      async mutate({mutation, variables, operationName} = {}) {
        return dispatch('mutation', mutation, variables);
      }
    }
  };
}
