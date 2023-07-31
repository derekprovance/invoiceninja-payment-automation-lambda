import pino from 'pino'

export const logger = pino({
  name: 'venmo',
  level: process.env.LOG_LEVEL || 'info',
})
