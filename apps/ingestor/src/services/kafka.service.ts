import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Consumer, KafkaMessage } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'opsai-ingestor',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      retry: {
        initialRetryTime: 100,
        retries: 8,
        factor: 2,
        maxRetryTime: 30000,
      },
      connectionTimeout: 30000,
      authenticationTimeout: 30000,
      requestTimeout: 30000,
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        factor: 2,
        maxRetryTime: 30000,
      },
    });
    
    this.consumer = this.kafka.consumer({ 
      groupId: process.env.KAFKA_GROUP_ID || 'opsai-ingestor-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      rebalanceTimeout: 60000,
    });
  }

  async onModuleInit() {
    try {
      await this.connect();
      
      // Wait a bit for Redpanda to be fully ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Initialize default topics
      await this.initializeDefaultTopics();
      
      this.logger.log('Kafka service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka service:', error);
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
      this.logger.log('Connected to Kafka');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka:', error);
      this.isConnected = false;
      throw error;
    }
  }

  private async disconnect() {
    try {
      if (this.producer) {
        await this.producer.disconnect();
      }
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      this.isConnected = false;
      this.logger.log('Disconnected from Kafka');
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka:', error);
    }
  }

  async sendMessage(topic: string, message: any): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Kafka not connected, attempting to reconnect...');
      await this.connect();
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: message.eventId || Date.now().toString(),
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
          },
        ],
      });

      this.logger.debug(`Message sent to topic ${topic}: ${JSON.stringify(message)}`);
    } catch (error) {
      this.logger.error(`Failed to send message to topic ${topic}:`, error);
      throw error;
    }
  }

  async subscribeToTopic(topic: string, callback: (message: KafkaMessage) => Promise<void>): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Kafka not connected, attempting to reconnect...');
      await this.connect();
    }

    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            this.logger.debug(`Received message from topic ${topic} [${partition}]: ${message.value?.toString()}`);
            await callback(message);
          } catch (error) {
            this.logger.error(`Error processing message from topic ${topic}:`, error);
          }
        },
      });

      this.logger.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }

  async createTopic(topic: string, partitions: number = 1, replicationFactor: number = 1): Promise<void> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      await admin.createTopics({
        topics: [
          {
            topic,
            numPartitions: partitions,
            replicationFactor,
          },
        ],
      });

      await admin.disconnect();
      this.logger.log(`Topic ${topic} created successfully`);
    } catch (error) {
      this.logger.error(`Failed to create topic ${topic}:`, error);
      throw error;
    }
  }

  async ensureTopicExists(topic: string, partitions: number = 3, replicationFactor: number = 1): Promise<void> {
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const admin = this.kafka.admin();
        await admin.connect();
        
        // Check if topic exists
        const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
        
        if (metadata.topics.length === 0) {
          // Topic doesn't exist, create it
          await admin.createTopics({
            topics: [
              {
                topic,
                numPartitions: partitions,
                replicationFactor,
              },
            ],
          });
          this.logger.log(`Topic ${topic} created successfully`);
        } else {
          this.logger.log(`Topic ${topic} already exists`);
        }

        await admin.disconnect();
        return; // Success, exit the retry loop
        
      } catch (error) {
        lastError = error;
        this.logger.warn(`Attempt ${attempt}/${maxRetries} failed to ensure topic ${topic} exists:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          this.logger.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // All retries failed
    this.logger.error(`Failed to ensure topic ${topic} exists after ${maxRetries} attempts:`, lastError);
    throw lastError;
  }

  async initializeDefaultTopics(): Promise<void> {
    const defaultTopics = [
      { name: 'opsai-events', partitions: 3, replication: 1 },
      { name: 'opsai-incidents', partitions: 3, replication: 1 },
      { name: 'opsai-knowledge', partitions: 3, replication: 1 },
      { name: 'opsai-dlq', partitions: 1, replication: 1 },
    ];

    this.logger.log('Initializing default Kafka topics...');
    
    const results = await Promise.allSettled(
      defaultTopics.map(async (topic) => {
        try {
          await this.ensureTopicExists(topic.name, topic.partitions, topic.replication);
          return { name: topic.name, status: 'success' };
        } catch (error) {
          this.logger.error(`Failed to initialize topic ${topic.name}:`, error);
          return { name: topic.name, status: 'failed', error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 'success').length;
    const failed = results.length - successful;
    
    this.logger.log(`Topic initialization completed: ${successful} successful, ${failed} failed`);
    
    if (failed > 0) {
      this.logger.warn('Some topics failed to initialize. The service will continue but some functionality may be limited.');
    }
  }

  async getTopicMetadata(topic: string): Promise<any> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
      
      await admin.disconnect();
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to get metadata for topic ${topic}:`, error);
      throw error;
    }
  }

  async getConsumerGroupInfo(): Promise<any> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const groups = await admin.listGroups();
      const groupIds = groups.groups.map(group => group.groupId);
      
      if (groupIds.length > 0) {
        const groupInfo = await admin.describeGroups(groupIds);
        await admin.disconnect();
        return groupInfo;
      }
      
      await admin.disconnect();
      return { groups: [] };
    } catch (error) {
      this.logger.error('Failed to get consumer group info:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      clientId: 'opsai-ingestor', // Fixed client ID
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    };
  }
}
