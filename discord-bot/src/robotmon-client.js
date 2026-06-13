// src/robotmon-client.js
// gRPC client for Robotmon Android service

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/robotmon.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const { robotmon } = grpc.loadPackageDefinition(packageDefinition);

class RobotmonClient {
  constructor(host, port) {
    this.address = `${host}:${port}`;
    this.client = new robotmon.GrpcService(
      this.address,
      grpc.credentials.createInsecure()
    );
  }

  // Promisify a unary gRPC call
  _call(method, request) {
    return new Promise((resolve, reject) => {
      this.client[method](request, (err, response) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  }

  // Get full screenshot (returns Buffer of PNG/JPEG bytes)
  getScreenshot(cropX = 0, cropY = 0, cropWidth = 0, cropHeight = 0, resizeWidth = 0, resizeHeight = 0, quality = 80) {
    return this._call('GetScreenshot', { cropX, cropY, cropWidth, cropHeight, resizeWidth, resizeHeight, quality });
  }

  // Get screen size
  getScreenSize() {
    return this._call('GetScreenSize', {});
  }

  // Tap at (x, y), during = ms delay before tap
  tap(x, y, during = 50) {
    return this._call('Tap', { x, y, during });
  }

  // TapDown (press without release)
  tapDown(x, y, during = 50) {
    return this._call('TapDown', { x, y, during });
  }

  // TapUp (release)
  tapUp(x, y, during = 50) {
    return this._call('TapUp', { x, y, during });
  }

  // MoveTo (for swipe)
  moveTo(x, y, during = 50) {
    return this._call('MoveTo', { x, y, during });
  }

  // Swipe from (x1,y1) to (x2,y2)
  async swipe(x1, y1, x2, y2, duration = 300) {
    await this.tapDown(x1, y1, 0);
    // Move in steps
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      const ix = Math.round(x1 + (x2 - x1) * (i / steps));
      const iy = Math.round(y1 + (y2 - y1) * (i / steps));
      await this.moveTo(ix, iy, Math.round(duration / steps));
    }
    await this.tapUp(x2, y2, 0);
    return { message: 'swipe done' };
  }

  // Run a JavaScript snippet on Android
  runScript(script) {
    return this._call('RunScript', { script });
  }

  // Subscribe to log stream — calls onLog(msg) for each log line
  streamLogs(onLog, onError) {
    const call = this.client.Logs({});
    call.on('data', (response) => onLog(response.message));
    call.on('error', (err) => onError && onError(err));
    call.on('end', () => {});
    return call; // caller can call call.cancel() to stop
  }

  close() {
    grpc.closeClient(this.client);
  }
}

module.exports = RobotmonClient;
