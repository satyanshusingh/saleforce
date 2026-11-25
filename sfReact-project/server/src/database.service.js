import { Injectable } from '@nestjs/common';
import mysql from 'mysql2/promise';

export class DatabaseService {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sfReact_project',
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true
    });
  }

  async query(sql, values = []) {
    return this.pool.execute(sql, values);
  }

  async close() {
    await this.pool.end();
  }
}

Injectable()(DatabaseService);
