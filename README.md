# Cloudflare to Datadog Tail Worker

Send your Cloudflare Worker logs to Datadog in real-time. This tail worker transforms and forwards logs with custom tags and structured format.

## Why This?

- **Datadog SDK doesn't work** in Cloudflare Workers (Node.js dependencies)
- **Logpush is bulky** - sends huge batches instead of individual logs
- **Need real-time logs** with custom enrichment and tagging

## Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/explorium-ai/cloudflare-tail-worker-datadog.git
   cd cloudflare-tail-worker-datadog
   npm install
   ```

2. **Set your Datadog API key**
   ```bash
   wrangler secret put DD_API_KEY
   ```

3. **Configure environment** in `wrangler.jsonc`:
   ```json
   {
     "vars": {
       "SERVICE_NAME": "your-service-name",
       "ENVIRONMENT": "production",
       "DD_SITE": "datadoghq.com"
     }
   }
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

5. **Connect your workers** - add to their `wrangler.toml`:
   ```toml
   [[tail_consumers]]
   service = "cloudflare-tail-worker-datadog"
   ```

Done! Your logs now flow to Datadog in real-time.

## Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DD_API_KEY` | ✅ | Your Datadog API key | `abc123...` |
| `SERVICE_NAME` | ✅ | Service name for tagging | `my-api-service` |
| `ENVIRONMENT` | ❌ | Environment tag (defaults to `dev`) | `production` |
| `DD_SITE` | ❌ | Datadog site (defaults to `datadoghq.com`) | `datadoghq.eu` |

## How It Works

1. Receives tail events from your Workers in real-time
2. Transforms logs into structured format with tags
3. Sends to Datadog via HTTP API
4. Adds metadata: service name, environment, timestamps

## Development

```bash
npm test          # Run tests
npm run dev       # Local development  
npm run cf-typegen # Generate types
```

## Viewing Logs in Datadog

Your logs appear in Datadog with structured tags:

**Find your logs:**
- Filter by `source:cloudflare-tail-worker` 
- Use tags like `service:your-service-name` or `env:production`

**Example queries:**
```
source:cloudflare-tail-worker AND status:error
service:my-api AND env:production  
log_level:error OR log_level:warn
```

## Troubleshooting

**No logs appearing?**
- Check API key exists: `wrangler secret list`
- Verify `[[tail_consumers]]` in your worker's `wrangler.toml`
- Ensure your workers are actually logging (`console.log`)
- Confirm correct `DD_SITE` for your region

**Debug your tail worker:**
```bash
wrangler tail cloudflare-tail-worker-datadog  # Watch live logs
wrangler list                  # Check deployment
```

## License

MIT