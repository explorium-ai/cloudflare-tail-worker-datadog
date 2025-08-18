
export interface Env {
	/** Datadog API key for authentication */
	DATADOG_API_KEY: string;

	/** Service name for tagging logs */
	SERVICE_NAME: string;
	/** Environment name for tagging logs (e.g., production, staging) */
	ENVIRONMENT?: string;
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
		const baseTimestamp = new Date(event.eventTimestamp || Date.now()).getTime();
		const baseTags = [
			`service:${env.SERVICE_NAME}`,
			`source:cloudflare-tail-worker`,
			env.ENVIRONMENT ? `env:${env.ENVIRONMENT}` : 'env:dev'
		].join(',');

		// Create a log entry for the main event
		const mainLog: DatadogLogEntry = {
			timestamp: baseTimestamp,
			status: event.outcome || 'unknown',
			message: `Cloudflare Worker execution - ${event.outcome || 'completed'}`,
			service: env.SERVICE_NAME,
			ddsource: 'cloudflare',
			ddtags: `${baseTags},log_type:main_event`,
			hostname: 'cloudflare-worker',
			event_type: 'cloudflare_trace',
			worker_name: env.SERVICE_NAME,
			script_name: event.scriptName || env.SERVICE_NAME,
			cpu_time_ms: event.cpuTime,
			wall_time_ms: event.wallTime,
			entrypoint: event.entrypoint,
			script_version: event.scriptVersion,
			dispatch_namespace: event.dispatchNamespace
		};

		// Add event-specific fields based on event type
		if (event.event && 'request' in event.event) {
			// This is a fetch event
			const fetchEvent = event.event as any;
			mainLog.ray_id = fetchEvent.rayID;
			mainLog.request_method = fetchEvent.request?.method;
			mainLog.request_url = fetchEvent.request?.url;
			mainLog.response_status = fetchEvent.response?.status;
		}
		datadogLogs.push(mainLog);

		// Create separate log entries for each log in the Logs array
		if (event.logs && Array.isArray(event.logs)) {
			event.logs.forEach(logEntry => {
				const logTimestamp = logEntry.timestamp || baseTimestamp;
				const logMessage = Array.isArray(logEntry.message) 
					? logEntry.message.join(' ') 
					: String(logEntry.message || '');

				const workerLog: DatadogLogEntry = {
					timestamp: logTimestamp,
					status: logEntry.level || 'info',
					message: logMessage,
					service: env.SERVICE_NAME,
					ddsource: 'cloudflare',
					ddtags: `${baseTags},log_type:worker_log,log_level:${logEntry.level || 'info'}`,
					hostname: 'cloudflare-worker',
					event_type: 'cloudflare_worker_log',
					worker_name: env.SERVICE_NAME,
					script_name: event.scriptName || env.SERVICE_NAME,
					log_level: logEntry.level,
					parent_event_timestamp: baseTimestamp
				};

				// Add ray_id if this is a fetch event
				if (event.event && 'request' in event.event) {
					const fetchEvent = event.event as any;
					workerLog.ray_id = fetchEvent.rayID;
				}

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
			if (!env.DATADOG_API_KEY) {
				console.error('DATADOG_API_KEY is required');
				return;
			}
			if (!env.SERVICE_NAME) {
				console.error('SERVICE_NAME is required');
				return;
			}

			// Transform events to Datadog format
			const datadogLogs = transformToDatadogLogs(events, env);
			
			// Datadog logs intake URL
			const datadogUrl = `https://http-intake.logs.datadoghq.com/v1/input/${env.DATADOG_API_KEY}`;

			// Send logs to Datadog
			const response = await fetch(datadogUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'DD-API-KEY': env.DATADOG_API_KEY
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