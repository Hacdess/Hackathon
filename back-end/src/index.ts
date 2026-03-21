import { createApp } from './app'
import { env, validateEnv } from './config/env'
import { closePool } from './db/postgres'
import { initializeDatabase } from './db/init'

async function bootstrap() {
  validateEnv()
  await initializeDatabase()

  const app = createApp()

  const server = app.listen(env.port, env.host, () => {
    console.log(`Backend is running at http://${env.host}:${env.port}`)
  })

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down backend...`)
    server.close(async () => {
      await closePool()
      process.exit(0)
    })
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
}

void bootstrap().catch((error) => {
  console.error('Failed to start backend:', error)
  process.exit(1)
})
