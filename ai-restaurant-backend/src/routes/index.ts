// Create route stubs that reference services
// This allows the server to start without errors

export { default as elevenLabsRouter } from './elevenlabs';
export { default as reservationsRouter } from './reservations';
export { default as availabilityRouter } from './availability';
export { default as callLogsRouter } from './callLogs';
export { default as outboundRouter } from './outbound';
export { default as webhooksRouter } from './webhooks';
export { default as healthRouter } from './health';