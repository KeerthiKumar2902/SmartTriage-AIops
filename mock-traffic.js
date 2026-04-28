import axios from 'axios';

const logs = [
  {
    service_affected: "frontend-web",
    raw_log: {
      "level": "error",
      "message": "connect() failed (111: Connection refused) while connecting to upstream",
      "upstream": "http://10.0.0.5:8080",
      "request": "GET /api/users HTTP/1.1",
      "status_code": 502,
      "component": "nginx"
    }
  },
  {
    service_affected: "payment-worker",
    raw_log: {
      "level": "fatal",
      "message": "OOMKilled",
      "container_id": "k8s_payment-worker_default_44ab",
      "reason": "Memory cgroup out of memory: Killed process 1234 (node) total-vm:850000kB, anon-rss:512000kB",
      "component": "kubernetes"
    }
  },
  {
    service_affected: "user-database",
    raw_log: {
      "level": "error",
      "message": "remaining connection slots are reserved for non-replication superuser connections",
      "client_address": "10.0.1.20",
      "user": "app_user",
      "component": "postgresql"
    }
  }
];

async function simulateTraffic() {
  const randomLog = logs[Math.floor(Math.random() * logs.length)];
  
  console.log(`Sending log for service: ${randomLog.service_affected}`);
  
  try {
    const response = await axios.post('http://localhost:8080/api/v1/incidents/triage', randomLog);
    console.log(`Incident created with ID: ${response.data.id}`);
  } catch (error) {
    console.error('Failed to send mock traffic:', error.message);
  }
}

simulateTraffic();
