import morgan from 'morgan';
import { env } from '../../config/env';

const developmentFormat =
  ':method :url :status :res[content-length] - :response-time ms';

const productionFormat = ':remote-addr - :method :url :status :response-time ms';

export const requestLogger = morgan(
  env.isDevelopment ? developmentFormat : productionFormat,
);
