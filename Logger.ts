import pino from 'pino'
import { config } from './config'

export const logger = pino({
  name: config.paymentProcessor,
  level: config.logLevel,
})
