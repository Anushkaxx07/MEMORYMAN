import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { fetchProcessData, killProcess } = require('./api-handler.cjs')

function sysscopeApiPlugin() {
  return {
    name: 'sysscope-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

        if (url.pathname === '/api/processes') {
          try {
            const data = await fetchProcessData()
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
          }
          return
        }

        if (url.pathname === '/api/kill' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { pid } = JSON.parse(body || '{}')
              if (pid === undefined || pid === null) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                return res.end(JSON.stringify({ error: 'PID is required' }))
              }
              const result = await killProcess(pid)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        if (url.pathname === '/api/export') {
          try {
            const data = await fetchProcessData()
            let csv = 'PID,Process Name,Memory (MB)\n'
            for (const p of data.processes) {
              csv += `${p.pid},"${p.name.replace(/"/g, '""')}",${p.memoryMB.toFixed(2)}\n`
            }
            res.setHeader('Content-Type', 'text/csv')
            res.setHeader('Content-Disposition', 'attachment; filename="sysscope_processes.csv"')
            res.end(csv)
          } catch (err) {
            res.statusCode = 500
            res.end(`Error generating CSV: ${err.message}`)
          }
          return
        }

        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), sysscopeApiPlugin()],
  server: {
    port: 5173,
    open: false
  }
})
