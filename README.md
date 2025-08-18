# Datadog Cloudflare Tail Worker

A Cloudflare Worker that receives tail events from other Cloudflare Workers and forwards them to Datadog for monitoring and logging.

## Features

- ✅ Real-time log forwarding to Datadog
- ✅ Configurable Datadog sites (US, EU, etc.)
- ✅ Structured logging with proper tagging
- ✅ Error handling and validation
- ✅ TypeScript support
- ✅ Environment-based configuration

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Set up the following secrets using Wrangler:

```bash
# Required: Your Datadog API key
wrangler secret put DD_API_KEY
```

### 3. Configure Environment Variables

Update `wrangler.jsonc` with your specific values:

```json
{
  "vars": {
    "SERVICE_NAME": "your-service-name",
    "ENVIRONMENT": "production",
    "DATADOG_SITE": "datadoghq.com"
  }
}
```



### 4. Deploy

```bash
npm run deploy
```

### 5. Configure Tail Workers

Set up your other Cloudflare Workers to send tail events to this worker. Add the following to your main worker's `wrangler.toml`:

```toml
[[tail_consumers]]
service = "mcp-tail-worker"
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DD_API_KEY` | ✅ | Your Datadog API key (secret) | `abc123...` |
| `SERVICE_NAME` | ✅ | Service name for tagging | `my-api-service` |
| `ENVIRONMENT` | ❌ | Environment tag | `production` |

## Log Structure

The worker transforms Cloudflare trace events into structured Datadog logs with the following format:

```json
{
  "timestamp": 1640995200000,
  "status": "ok",
  "message": "Cloudflare Worker execution - ok",
  "service": "my-service",
  "ddsource": "cloudflare",
  "ddtags": "service:my-service,source:cloudflare-worker,env:production",
  "hostname": "cloudflare-worker",
  "event_type": "cloudflare_trace",
  "worker_name": "my-service",
  "script_name": "my-service"
}
```

## Development

### Run Tests

```bash
npm test
```

### Local Development

```bash
npm run dev
```

### Type Generation

```bash
npm run cf-typegen
```

## Monitoring

Once deployed, you can monitor your logs in Datadog by:

1. Going to the Logs section in Datadog
2. Filtering by source: `cloudflare`
3. Using tags like `service:your-service-name` or `env:production`

## Troubleshooting

### Common Issues

1. **No logs appearing in Datadog**
   - Verify your `DD_API_KEY` is correct
   - Ensure the tail consumer is properly configured

2. **Authentication errors**
   - Double-check your API key has the correct permissions
   - Verify you're using the correct Datadog API endpoint

3. **Missing trace events**
   - Ensure your source workers are generating trace events
   - Check that the tail consumer binding is properly set up

### Debugging

Enable debug logging by checking the Cloudflare Workers logs:

```bash
wrangler tail
```

## License

MIT