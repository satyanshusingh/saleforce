import { All, Body, Controller, Inject, Req, Res } from '@nestjs/common';
import { CrmService } from './crm.service.js';
import { GraphqlService } from './graphql.service.js';
import { resources } from './model.js';

export class ApiController {
  constructor(crm, graphql) {
    this.crm = crm;
    this.graphql = graphql;
  }

  async handle(request, response) {
    try {
      const user = await this.crm.getUser(request.headers['x-demo-user'] || 'u1');
      const url = new URL(request.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean).slice(1);
      const [path, id, action] = parts;
      const method = request.method;
      let result;
      let status = 200;

      if (path === 'health' && method === 'GET') {
        await this.crm.query('SELECT 1');
        result = { status: 'ok', dataReady: true };
      }
      else if (path === 'graphql' && method === 'POST') result = await this.graphql.execute(user, request.body);
      else if (path === 'session' && method === 'GET') result = { user, availableUsers: await this.crm.security(user).then((data) => data.roles) };
      else if (path === 'metadata' && method === 'GET') result = { resources, roles: (await this.crm.security(user)).allPermissions };
      else if (path === 'overview' && method === 'GET') result = await this.crm.overview(user);
      else if (path === 'security' && method === 'GET') result = await this.crm.security(user);
      else if (path === 'audit' && method === 'GET') result = await this.crm.audit(user);
      else if (resources[path] && path === 'leads' && id && action === 'convert' && method === 'POST') {
        result = await this.crm.convertLead(user, id);
      } else if (resources[path] && method === 'GET') {
        result = id ? await this.crm.getOne(user, path, id) : await this.crm.list(user, path, url.searchParams.get('q') || '');
      } else if (resources[path] && !id && method === 'POST') {
        result = await this.crm.create(user, path, request.body);
        status = 201;
      } else if (resources[path] && id && method === 'PATCH') {
        result = await this.crm.update(user, path, id, request.body);
      } else if (resources[path] && id && method === 'DELETE') {
        result = await this.crm.remove(user, path, id);
      } else {
        throw Object.assign(new Error('API endpoint not found'), { status: 404 });
      }
      response.status(status).json(result);
    } catch (error) {
      response.status(error.status || 500).json({ error: error.message || 'Unexpected server error' });
    }
  }
}

Controller('api')(ApiController);
All('{*path}')(ApiController.prototype, 'handle', Object.getOwnPropertyDescriptor(ApiController.prototype, 'handle'));
Req()(ApiController.prototype, 'handle', 0);
Res()(ApiController.prototype, 'handle', 1);
Inject(CrmService)(ApiController, undefined, 0);
Inject(GraphqlService)(ApiController, undefined, 1);
