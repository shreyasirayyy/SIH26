import pino from 'pino'; import { app } from './app.js'; import { env } from './config/env.js';
const logger=pino({level:env.LOG_LEVEL}); app.listen(env.PORT,()=>logger.info({port:env.PORT},'SAATH backend listening'));
