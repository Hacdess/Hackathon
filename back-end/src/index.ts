import { createApp } from './app'
import { env } from './config/env'
import { initializeDatabase } from './db/init'

async function bootstrap() {
  await initializeDatabase()

  const app = createApp()

  app.listen(env.port, () => {
    console.log(`Backend is running at http://localhost:${env.port}`)
  })
}

void bootstrap().catch((error) => {
  console.error('Failed to start backend:', error)
  process.exit(1)
})
