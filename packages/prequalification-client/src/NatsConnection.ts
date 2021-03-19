import { Client, connect } from 'nats';

export interface NatsUrl {
  host: string;
  port: number;
}

/**
 * Creates and monitors a NATS connection
 * Event handling code taken from: https://docs.nats.io/developing-with-nats/events/events
 */
export class NatsConnection {
  private static readonly logPrefix = '[NATS Connection]';
  private readonly createSubscriptions: (Client) => void;
  private readonly natsUrl: NatsUrl;
  private natsClient: Client;

  constructor({ createSubscriptions, natsUrl }: { createSubscriptions: (Client) => void; natsUrl: NatsUrl }) {
    this.createSubscriptions = createSubscriptions;
    this.natsUrl = natsUrl;
    this.natsClient = this.connect();
  }

  private connect(): Client {
    const url = `${this.natsUrl.host}:${this.natsUrl.port}`;
    console.log(`[NATS] Connecting to ${url}`);
    const nc = connect({ url: `nats://${url}` });

    nc.on('error', (err) => {
      console.error(`${NatsConnection.logPrefix} error occured`, err);
      this.reconnect();
    });
    nc.on('connect', () => {
      console.log(`${NatsConnection.logPrefix} client connected. Creating subscriptions.`);
      this.createSubscriptions(nc);
    });

    nc.on('disconnect', () => {
      console.log(`${NatsConnection.logPrefix} client disconnected`);
    });

    nc.on('reconnecting', () => {
      console.log(`${NatsConnection.logPrefix} client reconnecting`);
    });

    nc.on('reconnect', () => {
      console.log(`${NatsConnection.logPrefix} client reconnected`);
    });

    nc.on('close', () => {
      console.log(`${NatsConnection.logPrefix} client closed`);
      this.reconnect();
    });

    nc.on('permission_error', (err) => {
      console.error(`${NatsConnection.logPrefix} permission_error`, err);
    });
    return nc;
  }

  private reconnect() {
    console.log(`${NatsConnection.logPrefix} draining and closing client`);
    this.natsClient.removeAllListeners();
    this.natsClient.drain();
    this.natsClient.close();

    // Set timeout to space out reconnection attempts to as to not overwhelm NATS server
    setTimeout(() => {
      console.log(`${NatsConnection.logPrefix} reconnecting client`);
      this.natsClient = this.connect();
    }, 5 * 1000);
  }
}
