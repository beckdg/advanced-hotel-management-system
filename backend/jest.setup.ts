process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://stayflow:stayflow@localhost:5432/stayflow?schema=public';
process.env.NODE_ENV = 'test';
