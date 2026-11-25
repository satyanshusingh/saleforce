import { GraphQLError, buildSchema, graphql } from 'graphql';
import { Inject, Injectable } from '@nestjs/common';
import { CrmService } from './crm.service.js';
import { resources } from './model.js';

const singulars = Object.fromEntries(Object.entries(resources).map(([key, config]) => [key, config.singular]));
const gqlField = (field) => field[0].toUpperCase() + field.slice(1);
const apiField = (field) => field[0].toLowerCase() + field.slice(1);
const scalarType = (meta) => meta.type === 'number' ? 'NumberValue' : 'StringValue';
const inputType = (meta) => meta.type === 'number' ? 'Float' : 'String';

function buildSchemaText() {
  const recordTypes = Object.entries(resources).map(([resource, config]) => {
    const singular = config.singular;
    const fields = Object.entries(config.fields)
      .map(([name, meta]) => `  ${gqlField(name)}: ${scalarType(meta)}`)
      .join('\n');
    const caseNumber = resource === 'cases' ? '\n  CaseNumber: NumberValue' : '';
    return `
type ${singular}Node {
  Id: ID!
${fields}${caseNumber}
}
type ${singular}Edge { node: ${singular}Node!, cursor: String! }
type ${singular}Connection { totalCount: Int!, edges: [${singular}Edge!]!, pageInfo: PageInfo! }
input ${singular}Fields {
${Object.entries(config.fields).map(([name, meta]) => `  ${gqlField(name)}: ${inputType(meta)}`).join('\n')}
}
input ${singular}CreateInput { ${singular}: ${singular}Fields! }
input ${singular}UpdateInput { Id: ID!, ${singular}: ${singular}Fields! }
input ${singular}DeleteInput { Id: ID! }
type ${singular}MutationPayload { Record: ${singular}Node, success: Boolean, deletedId: ID }
`;
  }).join('\n');
  const queryFields = Object.values(resources).map(({ singular }) => `  ${singular}(first: Int = 20): ${singular}Connection!`).join('\n');
  const mutationFields = Object.values(resources).flatMap(({ singular }) => [
    `  ${singular}Create(input: ${singular}CreateInput!): ${singular}MutationPayload!`,
    `  ${singular}Update(input: ${singular}UpdateInput!): ${singular}MutationPayload!`,
    `  ${singular}Delete(input: ${singular}DeleteInput!): ${singular}MutationPayload!`
  ]).concat('  LeadConvert(id: ID!): OperationPayload!').join('\n');

  return `
type StringValue { value: String, displayValue: String }
type NumberValue { value: Float, displayValue: String }
type PageInfo { hasNextPage: Boolean! }
type OperationPayload { success: Boolean! }
${recordTypes}
type RecordQuery {
${queryFields}
}
type UiApiQuery { query: RecordQuery! }
type UiApiMutation {
${mutationFields}
}
type Query { uiapi: UiApiQuery! }
type Mutation { uiapi: UiApiMutation! }
`;
}

const schema = buildSchema(buildSchemaText());

function toNode(resource, record) {
  const config = resources[resource];
  const node = { Id: record.id };
  for (const [field, meta] of Object.entries(config.fields)) {
    const value = record[field] ?? null;
    node[gqlField(field)] = { value, displayValue: value == null ? '' : String(value) };
  }
  if (resource === 'cases') {
    const value = record.caseNumber ?? null;
    node.CaseNumber = { value, displayValue: value == null ? '' : String(value) };
  }
  return node;
}

function fromInput(resource, input) {
  return Object.fromEntries(Object.entries(input || {}).map(([key, value]) => {
    const field = apiField(key);
    const meta = resources[resource].fields[field];
    return [field, meta?.type === 'number' && value != null ? Number(value) : value];
  }));
}

function connectionFor(resource, rows, first) {
  const limit = Math.min(200, Math.max(0, Number(first ?? 20)));
  return {
    totalCount: rows.length,
    edges: rows.slice(0, limit).map((row) => ({ node: toNode(resource, row), cursor: row.id })),
    pageInfo: { hasNextPage: rows.length > limit }
  };
}

function makeRoot(crm, user) {
  const query = {};
  const mutations = {};

  for (const [resource, config] of Object.entries(resources)) {
    const { singular } = config;
    query[singular] = async ({ first }) => connectionFor(resource, await crm.list(user, resource), first);
    mutations[`${singular}Create`] = async ({ input }) => {
      const record = await crm.create(user, resource, fromInput(resource, input[singular]));
      return { Record: toNode(resource, record), success: true };
    };
    mutations[`${singular}Update`] = async ({ input }) => {
      const record = await crm.update(user, resource, input.Id, fromInput(resource, input[singular]));
      return { Record: toNode(resource, record), success: true };
    };
    mutations[`${singular}Delete`] = async ({ input }) => {
      const result = await crm.remove(user, resource, input.Id);
      return { deletedId: result.deletedId, success: true };
    };
  }

  mutations.LeadConvert = async ({ id }) => {
    await crm.convertLead(user, id);
    return { success: true };
  };

  return { uiapi: { query, ...mutations } };
}

schema.getType('AccountNode').getFields().AnnualRevenue.resolve = (node, _args, context) => {
  if (['sales', 'support'].includes(context.user.role)) {
    throw new GraphQLError('Field-level security: AnnualRevenue is not accessible');
  }
  return node.AnnualRevenue;
};

export class GraphqlService {
  constructor(crm) {
    this.crm = crm;
  }

  async execute(user, body = {}) {
    return graphql({
      schema,
      source: body.query,
      rootValue: makeRoot(this.crm, user),
      contextValue: { user },
      variableValues: body.variables || {},
      operationName: body.operationName
    });
  }
}

Inject(CrmService)(GraphqlService, undefined, 0);
Injectable()(GraphqlService);
