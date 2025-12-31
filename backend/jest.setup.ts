process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://stayflow:stayflow@localhost:5432/stayflow?schema=public';
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
