const axios = require('axios');

// Sample knowledge data
const sampleKnowledgeData = [
  {
    id: 1,
    payload: {
      title: "Database Connection Timeout Troubleshooting",
      content: "Database connection timeouts are common issues that can affect application performance. Common causes include: 1) Network latency between application and database, 2) Database server overload, 3) Connection pool exhaustion, 4) Firewall or security group restrictions. Solutions: Check network connectivity, monitor database performance metrics, increase connection pool size, verify security group settings.",
      source: "opsai-documentation",
      category: "database",
      severity: "medium",
      tags: ["database", "timeout", "troubleshooting", "connection", "performance"],
      created_at: "2025-08-17T00:00:00Z",
      updated_at: "2025-08-17T00:00:00Z"
    }
  },
  {
    id: 2,
    payload: {
      title: "Kubernetes Pod CrashLoopBackOff Resolution",
      content: "Pod CrashLoopBackOff indicates that a pod is repeatedly failing to start. Common causes: 1) Application startup errors, 2) Resource constraints (CPU/memory limits), 3) Configuration issues, 4) Missing dependencies. Troubleshooting steps: Check pod logs with 'kubectl logs', verify resource limits, validate configuration files, check for missing secrets or configmaps.",
      source: "opsai-documentation",
      category: "kubernetes",
      severity: "high",
      tags: ["kubernetes", "pod", "crashloopbackoff", "troubleshooting", "deployment"],
      created_at: "2025-08-17T00:00:00Z",
      updated_at: "2025-08-17T00:00:00Z"
    }
  },
  {
    id: 3,
    payload: {
      title: "Redis Memory Usage Optimization",
      content: "Redis memory optimization is crucial for production environments. Key strategies: 1) Use appropriate data structures, 2) Set memory limits with maxmemory policy, 3) Enable compression for large values, 4) Implement TTL for temporary data, 5) Monitor memory usage with INFO memory command. Best practices: Regular monitoring, setting alerts for memory thresholds, using Redis Cluster for large datasets.",
      source: "opsai-documentation",
      category: "redis",
      severity: "medium",
      tags: ["redis", "memory", "optimization", "performance", "monitoring"],
      created_at: "2025-08-17T00:00:00Z",
      updated_at: "2025-08-17T00:00:00Z"
    }
  },
  {
    id: 4,
    payload: {
      title: "Docker Container Resource Monitoring",
      content: "Effective Docker container monitoring involves tracking: 1) CPU usage and limits, 2) Memory consumption and limits, 3) Network I/O statistics, 4) Disk I/O metrics. Tools: Docker stats command, Prometheus with cadvisor, Grafana dashboards, ELK stack for logs. Key metrics: container_cpu_usage_seconds_total, container_memory_usage_bytes, container_network_receive_bytes_total.",
      source: "opsai-documentation",
      category: "docker",
      severity: "low",
      tags: ["docker", "monitoring", "containers", "metrics", "prometheus"],
      created_at: "2025-08-17T00:00:00Z",
      updated_at: "2025-08-17T00:00:00Z"
    }
  },
  {
    id: 5,
    payload: {
      title: "Load Balancer Health Check Configuration",
      content: "Load balancer health checks are essential for high availability. Configuration includes: 1) Health check endpoint (/health), 2) Check interval (5-30 seconds), 3) Unhealthy threshold (2-3 failures), 4) Healthy threshold (2-3 successes), 5) Timeout settings (2-5 seconds). Best practices: Use lightweight health checks, implement graceful degradation, monitor health check metrics, set appropriate thresholds based on application behavior.",
      source: "opsai-documentation",
      category: "load-balancer",
      severity: "medium",
      tags: ["load-balancer", "health-check", "high-availability", "monitoring", "configuration"],
      created_at: "2025-08-17T00:00:00Z",
      updated_at: "2025-08-17T00:00:00Z"
    }
  },
  {
    id: 6,
    payload: {
      title: "MongoDB Query Performance Optimization",
      content: "MongoDB query optimization techniques: 1) Create appropriate indexes on frequently queried fields, 2) Use projection to limit returned fields, 3) Implement pagination with skip/limit, 4) Use aggregation pipeline for complex queries, 5) Monitor query performance with explain() method. Index strategies: Compound indexes for multi-field queries, text indexes for full-text search, geospatial indexes for location-based queries.",
      source: "opsai-documentation",
      category: "mongodb",
      severity: "medium",
      tags: ["mongodb", "performance", "optimization", "indexing", "queries"],
      created_at: "2025-08-17T00:00:00Z",
      updated_at: "2025-08-17T00:00:00Z"
    }
  },
  {
    id: 7,
    payload: {
      title: "Kafka Consumer Group Management",
      content: "Kafka consumer group management best practices: 1) Monitor consumer lag with consumer-group.sh script, 2) Set appropriate auto.offset.reset policy (earliest/latest), 3) Configure session.timeout.ms and heartbeat.interval.ms, 4) Implement proper error handling and retry logic, 5) Use consumer group rebalancing strategies. Monitoring: Track consumer lag, partition distribution, rebalancing events, and consumer health metrics.",
      source: "opsai-documentation",
      category: "kafka",
      severity: "medium",
      tags: ["kafka", "consumer-groups", "monitoring", "performance", "streaming"],
      created_at: "2025-08-17T00:00:00Z",
      updated_at: "2025-08-17T00:00:00Z"
    }
  },
  {
    id: 8,
    payload: {
      title: "SSL Certificate Renewal Automation",
      content: "Automated SSL certificate renewal process: 1) Use Let's Encrypt with certbot for free certificates, 2) Implement automatic renewal with cron jobs, 3) Set up monitoring for certificate expiration dates, 4) Use DNS challenges for wildcard certificates, 5) Implement certificate rotation without downtime. Tools: certbot, acme.sh, monitoring with Prometheus, alerting for expiration warnings.",
      source: "opsai-documentation",
      category: "ssl",
      severity: "high",
      tags: ["ssl", "certificates", "automation", "security", "lets-encrypt"],
      created_at: "2025-08-17T00:00:00Z",
      updated_at: "2025-08-17T00:00:00Z"
    }
  }
];

// Generate random vectors (simulate embedding)
function generateRandomVector(size = 1536) {
  return Array.from({ length: size }, () => Math.random() - 0.5);
}

// Add data to Qdrant
async function addSampleData() {
  const qdrantUrl = 'http://localhost:6333';
  const collectionName = 'opsai-knowledge';
  
  try {
    console.log('🚀 Starting to add sample knowledge data...');
    
    // Prepare data points
    const points = sampleKnowledgeData.map(item => ({
      id: item.id,
      vector: generateRandomVector(),
      payload: item.payload
    }));
    
    // Batch add data
    const response = await axios.put(
      `${qdrantUrl}/collections/${collectionName}/points`,
      {
        points: points
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.status === 'ok') {
      console.log('✅ Successfully added sample knowledge data!');
      console.log(`📊 Added ${points.length} knowledge entries`);
      
      // Display added data
      console.log('\n📚 Added knowledge entries:');
      sampleKnowledgeData.forEach(item => {
        console.log(`  - ${item.payload.title} (${item.payload.category})`);
      });
      
      // Verify data
      await verifyData();
      
    } else {
      console.error('❌ Failed to add data:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error adding data:', error.message);
          if (error.response) {
        console.error('Response details:', error.response.data);
      }
  }
}

// Verify if data was added successfully
async function verifyData() {
  const qdrantUrl = 'http://localhost:6333';
  const collectionName = 'opsai-knowledge';
  
  try {
    console.log('\n🔍 Verifying data addition...');
    
    const response = await axios.get(`${qdrantUrl}/collections/${collectionName}`);
    
    if (response.data.status === 'ok') {
      const collection = response.data.result;
      console.log(`✅ Collection status: ${collection.status}`);
      console.log(`📊 Total points: ${collection.points_count}`);
      console.log(`🔢 Indexed vectors: ${collection.indexed_vectors_count}`);
      
              if (collection.points_count > 0) {
          console.log('🎉 Knowledge base data added successfully! Now you can test search functionality.');
        }
    }
    
      } catch (error) {
      console.error('❌ Error verifying data:', error.message);
    }
}

// Run script
if (require.main === module) {
  addSampleData();
}

module.exports = { addSampleData, sampleKnowledgeData };
