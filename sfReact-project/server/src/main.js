import 'reflect-metadata';
import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
const app = await NestFactory.create(AppModule);
app.enableCors({
  origin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-demo-user']
});
app.useBodyParser('json', { limit: '1mb' });
const port = 4102;
await app.listen(port, '127.0.0.1');
console.log(`CRM API listening at http://127.0.0.1:${port}/api`);
