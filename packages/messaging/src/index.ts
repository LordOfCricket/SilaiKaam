import amqp, { type AmqpConnectionManager, type ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';

export interface RabbitMQConnectionOptions {
  url: string;
  connectionName?: string;
}

export function createRabbitMQConnection({
  url,
  connectionName,
}: RabbitMQConnectionOptions): AmqpConnectionManager {
  return amqp.connect([url], {
    connectionOptions: { clientProperties: { connection_name: connectionName } },
  });
}

export function createChannel(
  connection: AmqpConnectionManager,
  setup?: (channel: ConfirmChannel) => Promise<void>,
): ChannelWrapper {
  return connection.createChannel({
    json: true,
    setup: setup ?? (async () => undefined),
  });
}

export async function publish(
  channel: ChannelWrapper,
  exchange: string,
  routingKey: string,
  message: unknown,
): Promise<void> {
  await channel.publish(exchange, routingKey, message);
}
