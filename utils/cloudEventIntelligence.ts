/**
 * Cloud event intelligence — runs in the caregiver app against Firebase telemetry.
 *
 * The cane buzzer stays on-device (no internet delay). This layer re-scores
 * fall / obstacle / motion using multiple uploaded sensors before the app
 * creates a notification.
 */

const OBSTACLE_MAX_CM = 100;
const OBSTACLE_MIN_CM = 5;

export type CloudSensorSample = {
  obstacle: boolean;
  motion: boolean;
  fall: boolean;
  sos: boolean;
  frontCm?: number;
  upperCm?: number;
  holeCm?: number;
  accel?: number;
  gyro?: number;
  gps?: boolean;
};

export type CloudDecision = {
  obstacle: boolean;
  fall: boolean;
  motion: boolean;
  sos: boolean;
  risk: number;
  reason: string;
};

function inRange(cm?: number) {
  return typeof cm === 'number' && cm >= OBSTACLE_MIN_CM && cm <= OBSTACLE_MAX_CM;
}

function validReading(cm?: number) {
  return typeof cm === 'number' && cm > 0;
}

export function analyzeCaneEvent(sample: CloudSensorSample): CloudDecision {
  const frontHit = inRange(sample.frontCm);
  const upperHit = inRange(sample.upperCm);
  const hasRange = validReading(sample.frontCm) || validReading(sample.upperCm);

  let obstacle = sample.obstacle;
  let obstacleReason = 'Device obstacle flag';
  if (hasRange) {
    if (frontHit && upperHit) {
      obstacle = true;
      obstacleReason = 'Cloud fusion: front and upper ultrasonic';
    } else if (sample.obstacle && (frontHit || upperHit)) {
      obstacle = true;
      obstacleReason = frontHit
        ? 'Cloud confirm: front ultrasonic'
        : 'Cloud confirm: upper ultrasonic';
    } else {
      obstacle = false;
      obstacleReason = 'Cloud filter: ultrasonic not in 100 cm';
    }
  }

  const accel = sample.accel;
  const gyro = sample.gyro;
  let fall = sample.fall;
  let fallReason = 'Device fall flag';
  if (sample.fall && typeof accel === 'number') {
    const stillAfterHit = accel >= 7.5 && accel <= 12.5 && (gyro == null || gyro < 1.2);
    const violent = accel < 4 || accel > 16;
    fall = stillAfterHit || violent;
    fallReason = fall
      ? 'Cloud confirm: IMU free-fall/impact pattern'
      : 'Cloud filter: IMU does not look like a fall';
  }

  const motion = sample.motion && !fall;
  const sos = sample.sos;

  let risk = 0;
  if (sos) risk += 40;
  if (fall) risk += 35;
  if (obstacle) risk += 15;
  if (motion) risk += 10;
  if (risk > 100) risk = 100;

  const reason = sos
    ? 'SOS'
    : fall
      ? fallReason
      : obstacle
        ? obstacleReason
        : motion
          ? 'Nearby motion'
          : 'No cloud alarm';

  return { obstacle, fall, motion, sos, risk, reason };
}
