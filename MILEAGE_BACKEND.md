# Vehicle Mileage Backend — Copy to NestJS backend

## 1. Prisma Schema — add to `schema.prisma`

```prisma
model VehicleOdometer {
  id         String   @id @default(uuid())
  deviceId   String
  plateNo    String
  odometer   Float    // cumulative km from GPS device
  date       String   // "YYYY-MM-DD" — one row per vehicle per day, upserted
  firstReading Float  // first odometer reading of the day
  lastReading  Float  // latest odometer reading of the day
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([deviceId, date])
  @@index([date])
  @@index([plateNo])
}
```

Then run: `npx prisma migrate dev --name add-vehicle-odometer`

---

## 2. Mileage Service — `src/transport/mileage.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MileageService {
  constructor(private prisma: PrismaService) {}

  /**
   * Upsert odometer snapshots — called by frontend every ~15s.
   * For each vehicle, we store the first and last reading of the day.
   */
  async pushSnapshots(snapshots: { deviceId: string; plateNo: string; odometer: number }[]) {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    const ops = snapshots.map((s) =>
      this.prisma.vehicleOdometer.upsert({
        where: { deviceId_date: { deviceId: s.deviceId, date: today } },
        create: {
          deviceId: s.deviceId,
          plateNo: s.plateNo,
          odometer: s.odometer,
          date: today,
          firstReading: s.odometer,
          lastReading: s.odometer,
        },
        update: {
          plateNo: s.plateNo,
          odometer: s.odometer,
          lastReading: s.odometer,
          // Only update firstReading if it was 0 (shouldn't happen, but safety)
        },
      }),
    );

    await Promise.all(ops);
    return { saved: snapshots.length };
  }

  /**
   * Get daily mileage for all vehicles on a given date.
   * Mileage = lastReading - firstReading
   */
  async getDailyMileage(date?: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const records = await this.prisma.vehicleOdometer.findMany({
      where: { date: targetDate },
      orderBy: { plateNo: 'asc' },
    });

    return records.map((r) => ({
      deviceId: r.deviceId,
      plateNo: r.plateNo,
      date: r.date,
      firstReading: r.firstReading,
      lastReading: r.lastReading,
      dailyKm: Math.max(0, Number((r.lastReading - r.firstReading).toFixed(2))),
    }));
  }
}
```

---

## 3. Controller endpoints — add to `src/transport/transport.controller.ts`

```typescript
import { MileageService } from './mileage.service';

// In the controller constructor:
// constructor(private mileageService: MileageService, ...) {}

@Post('mileage/snapshot')
async pushOdometer(@Body() body: { snapshots: { deviceId: string; plateNo: string; odometer: number }[] }) {
  return this.mileageService.pushSnapshots(body.snapshots);
}

@Get('mileage/daily')
async getDailyMileage(@Query('date') date?: string) {
  return this.mileageService.getDailyMileage(date);
}
```

---

## 4. Module — register in `transport.module.ts`

```typescript
import { MileageService } from './mileage.service';

@Module({
  providers: [TransportService, MileageService],
  controllers: [TransportController],
})
export class TransportModule {}
```
