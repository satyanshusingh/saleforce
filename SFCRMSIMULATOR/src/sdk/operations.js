import {gql} from '@salesforce/platform-sdk/data';

// These operations intentionally match the simulator's documented GraphQL subset.
// Standard Contact read syntax is similar to Salesforce UI API GraphQL.
export const LIST_CONTACTS = gql`
  query ListContacts {
    uiapi { query { Contact(first: 50) {
      totalCount
      edges { node {
        Id
        FirstName { value }
        LastName { value }
        Email { value }
        Phone { value }
        AccountId { value }
      } }
    } } }
  }
`;
export const LIST_ACCOUNTS = gql`
  query ListAccounts {
    uiapi { query { Account(first: 50) {
      totalCount
      edges { node { Id Name { value } Industry { value } BillingCity { value } } }
    } } }
  }
`;
export const LIST_OPPORTUNITIES = gql`
  query ListOpportunities {
    uiapi { query { Opportunity(first: 50) {
      totalCount
      edges { node {
        Id Name { value } StageName { value } Amount { value }
      } }
    } } }
  }
`;
export const LIST_ACCOUNT_REVENUE = gql`
  query RestrictedAccountFields {
    uiapi { query { Account(first: 10) {
      edges { node { Id Name { value } AnnualRevenue { value } } }
    } } }
  }
`;
export const CREATE_CONTACT = gql`
  mutation CreateContact($input: ContactCreateInput!) {
    uiapi { ContactCreate(input: $input) {
      Record { Id FirstName { value } LastName { value } Email { value } Phone { value } }
    } }
  }
`;
export const UPDATE_CONTACT = gql`
  mutation UpdateContact($input: ContactUpdateInput!) {
    uiapi { ContactUpdate(input: $input) {
      Record { Id FirstName { value } LastName { value } Email { value } Phone { value } }
    } }
  }
`;
export const DELETE_CONTACT = gql`
  mutation DeleteContact($input: ContactDeleteInput!) {
    uiapi { ContactDelete(input: $input) {
      deletedId
    } }
  }
`;
// NOTE: deletedId is a classroom-only mutation response field. The genuine
// Salesforce UI API mutation selection must be validated against an org schema.
