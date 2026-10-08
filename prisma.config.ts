import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Railway no expone variables de entorno en la fase de build por defecto, 
    // así que ponemos un fallback para que prisma generate no falle.
    url: process.env.DATABASE_URL || 'mysql://dummy:dummy@localhost/dummy',
  },
})
