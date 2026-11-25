import { Module } from '@nestjs/common';
import { ApiController } from './api.controller.js';
import { CrmService } from './crm.service.js';
import { DatabaseService } from './database.service.js';
import { GraphqlService } from './graphql.service.js';

export class AppModule {}

Module({
  controllers: [ApiController],
  providers: [CrmService, DatabaseService, GraphqlService]
})(AppModule);
