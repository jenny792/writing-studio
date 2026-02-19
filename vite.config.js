import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      {
        name: 'claude-proxy',
        configureServer(server) {
          server.middlewares.use('/api/claude', (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              return res.end('Method Not Allowed')
            }

            let body = ''
            req.on('data', chunk => { body += chunk.toString() })
            req.on('end', async () => {
              try {
                const apiKey = env.ANTHROPIC_API_KEY
                if (!apiKey) {
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  return res.end(JSON.stringify({
                    error: { message: 'ANTHROPIC_API_KEY saknas — skapa en .env-fil med din nyckel' }
                  }))
                }

                const upstream = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                  },
                  body
                })

                const data = await upstream.json()
                res.statusCode = upstream.status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              } catch (err) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: { message: err.message } }))
              }
            })
          })
        }
      }
    ]
  }
})
