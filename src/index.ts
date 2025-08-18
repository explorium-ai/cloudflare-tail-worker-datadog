
export interface Env {
	/** Datadog API key for authentication */
	DD_API_KEY: string;
	/** Service name for tagging logs */
	SERVICE_NAME: "mcp-tail-worker";
	/** Environment name for tagging logs (e.g., production, staging) */
	ENVIRONMENT?: string;
	/** Datadog site (e.g., datadoghq.com, datadoghq.eu, us3.datadoghq.com) */
	DD_SITE?: string;
}

/**
 * Datadog log entry structure
 */
interface DatadogLogEntry {
	timestamp: number;
	status: string;
	message: string;
	service: string;
	ddsource: string;
	ddtags: string;
	hostname: string;
	/** Additional structured data */
	[key: string]: unknown;
}

/**
 * Transforms Cloudflare trace items into Datadog log format
 * Flattens the Logs array so each log entry becomes a separate Datadog log
 */
function transformToDatadogLogs(events: TraceItem[], env: Env): DatadogLogEntry[] {
	const datadogLogs: DatadogLogEntry[] = [];

	events.forEach(event => {
		const baseTags = [
			`service:${event.scriptName || env.SERVICE_NAME}`,
			`source:cloudflare-tail-worker`,
			env.ENVIRONMENT ? `env:${env.ENVIRONMENT}` : 'env:dev'
		].join(',');

		// Create separate log entries for each log in the Logs array
		if (event.logs && Array.isArray(event.logs)) {
			event.logs.forEach(logEntry => {
				const logMessage = Array.isArray(logEntry.message) 
					? logEntry.message.join(' ') 
					: String(logEntry.message || '');

				const workerLog: DatadogLogEntry = {
					timestamp: logEntry.timestamp,
					status: logEntry.level || 'info',
					message: logMessage,
					service: event.scriptName || env.SERVICE_NAME,
					ddsource: 'cloudflare-tail-worker',
					ddtags: `${baseTags}`,
					hostname: event.scriptName || env.SERVICE_NAME,
					worker_name: env.SERVICE_NAME,
					script_name: event.scriptName || env.SERVICE_NAME,
					log_level: logEntry.level,
				};

				datadogLogs.push(workerLog);
			});
		}
	});

	return datadogLogs;
}

export default {
	async tail(events: TraceItem[], env: Env): Promise<void> {
		try {
			// Validate required environment variables
			if (!env.DD_API_KEY) {
				console.error('DD_API_KEY is required');
				return;
			}
			if (!env.SERVICE_NAME) {
				console.error('SERVICE_NAME is required');
				return;
			}

			// Transform events to Datadog format
			const datadogLogs = transformToDatadogLogs(events, env);
			
		    // Determine Datadog site - default to US1 (datadoghq.com)
			const ddSite = env.DD_SITE || 'datadoghq.com';
			
			// Datadog logs intake URL (v2 API) - configurable by site
			const datadogUrl = `https://http-intake.logs.${ddSite}/api/v2/logs`;


			
			// Send logs to Datadog
			const response = await fetch(datadogUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'DD-API-KEY': env.DD_API_KEY
				},
				body: JSON.stringify(datadogLogs)
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`Failed to send logs to Datadog: ${response.status} ${response.statusText}`, errorText);
				return;
			}

			console.log(`Successfully sent ${datadogLogs.length} log entries to Datadog`);
		} catch (error) {
			console.error('Error in tail worker:', error);
		}
	}
};
