import { gql } from '@salesforce/platform-sdk/data';
import { displayColumns, resourceFields } from '../data/resourceFields.js';

const singulars = {
  leads: 'Lead', accounts: 'Account', contacts: 'Contact',
  opportunities: 'Opportunity', cases: 'Case', tasks: 'Task'
};
const gqlField = (field) => field[0].toUpperCase() + field.slice(1);

export function listOperation(resource, role) {
  const singular = singulars[resource];
  const fields = new Set([...Object.keys(resourceFields[resource].fields), ...displayColumns[resource]]);
  if (resource === 'accounts' && ['sales', 'support'].includes(role)) fields.delete('annualRevenue');
  const selection = ['Id', ...[...fields].map((field) => `${gqlField(field)} { value }`)].join('\n');
  return gql`
    query List${singular}s($first: Int!) {
      uiapi { query { ${singular}(first: $first) {
        totalCount
        edges { node { ${selection} } }
      } } }
    }
  `;
}

export const entityTypes = singulars;
