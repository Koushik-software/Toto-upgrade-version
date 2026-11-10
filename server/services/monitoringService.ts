import os from 'os';
import { getActiveSseClientCount } from './realtimeDispatchService';

const serverStartTime = Date.now();

export function getSystemMetrics(engineState?: any) {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  const memUsage = process.memoryUsage();
  
  const rides = engineState?.rides ? Object.values(engineState.rides) : [];
  const drivers = engineState?.drivers ? Object.values(engineState.drivers) : [];

  const activeRides = rides.filter((r: any) => 
    !['CLOSED', 'CUSTOMER_CANCELLED', 'DRIVER_CANCELLED', 'COMPLETED', 'EXPIRED'].includes(r.status)
  ).length;

  const onlineCaptains = drivers.filter((d: any) => d.status === 'ONLINE' || d.availability === 'AVAILABLE').length;

  return {
    status: 'healthy',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      cpuCount: os.cpus().length,
      freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
      totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
      processMemoryMb: {
        rss: Math.round(memUsage.rss / (1024 * 1024)),
        heapTotal: Math.round(memUsage.heapTotal / (1024 * 1024)),
        heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024))
      }
    },
    realtime: {
      connectedSseClients: getActiveSseClientCount()
    },
    operations: {
      totalRidesTracked: rides.length,
      activeRidesCount: activeRides,
      totalDriversRegistered: drivers.length,
      onlineCaptainsCount: onlineCaptains
    }
  };
}
