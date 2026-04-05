# Vehicle Tracking Backend — Driver Mapping + Trip History

Copy these to your NestJS backend to enable persistent driver-vehicle mapping and trip/ignition history.

---

## 1. Prisma Schema — add to `schema.prisma`

```prisma
model VehicleDriverMapping {
  id          String   @id @default(uuid())
  plateNo     String   @unique       // APM vehicle plate number
  driverName  String
  driverPhone String?
  licenseNo   String?
  assignedAt  DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([plateNo])
}

model VehicleTripLog {
  id         String   @id @default(uuid())
  plateNo    String
  deviceId   String
  event      String                // IGNITION_ON, IGNITION_OFF, TRIP_START, TRIP_END
  driverName String?               // snapshot of driver at time of event
  latitude   Float?
  longitude  Float?
  speed      Float?
  odometer   Float?
  timestamp  DateTime @default(now())

  @@index([plateNo, timestamp])
  @@index([deviceId, timestamp])
  @@index([event])
}
```

Then run: `npx prisma migrate dev --name add-vehicle-tracking`

---

## 2. DTOs — `src/transport/dto/vehicle-tracking.dto.ts`

```typescript
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertVehicleDriverDto {
  @IsString()
  plateNo: string;

  @IsString()
  driverName: string;

  @IsOptional()
  @IsString()
  driverPhone?: string;

  @IsOptional()
  @IsString()
  licenseNo?: string;
}

export class TripEventDto {
  @IsString()
  plateNo: string;

  @IsString()
  deviceId: string;

  @IsString()
  event: string; // IGNITION_ON | IGNITION_OFF

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  odometer?: number;
}

export class PushTripEventsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TripEventDto)
  events: TripEventDto[];
}
```

---

## 3. Service — `src/transport/vehicle-tracking.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertVehicleDriverDto, TripEventDto } from './dto/vehicle-tracking.dto';

@Injectable()
export class VehicleTrackingService {
  constructor(private prisma: PrismaService) {}

  // ── Driver-Vehicle Mapping ──────────────────────────

  async upsertDriverMapping(dto: UpsertVehicleDriverDto) {
    return this.prisma.vehicleDriverMapping.upsert({
      where: { plateNo: dto.plateNo },
      create: {
        plateNo: dto.plateNo,
        driverName: dto.driverName,
        driverPhone: dto.driverPhone,
        licenseNo: dto.licenseNo,
      },
      update: {
        driverName: dto.driverName,
        driverPhone: dto.driverPhone,
        licenseNo: dto.licenseNo,
      },
    });
  }

  async getAllDriverMappings() {
    return this.prisma.vehicleDriverMapping.findMany({
      orderBy: { plateNo: 'asc' },
    });
  }

  async removeDriverMapping(plateNo: string) {
    return this.prisma.vehicleDriverMapping.delete({
      where: { plateNo },
    }).catch(() => null); // Ignore if not found
  }

  // ── Trip / Ignition Event Log ───────────────────────

  async pushTripEvents(events: TripEventDto[]) {
    if (!events.length) return { count: 0 };

    const data = events.map((e) => ({
      plateNo: e.plateNo,
      deviceId: e.deviceId,
      event: e.event,
      driverName: e.driverName || null,
      latitude: e.latitude || null,
      longitude: e.longitude || null,
      speed: e.speed || null,
      odometer: e.odometer || null,
    }));

    const result = await this.prisma.vehicleTripLog.createMany({ data });
    return { count: result.count };
  }

  async getTripHistory(params: {
    plateNo?: string;
    deviceId?: string;
    event?: string;
    from?: string; // ISO date
    to?: string;   // ISO date
    limit?: number;
  }) {
    const where: any = {};
    if (params.plateNo) where.plateNo = params.plateNo;
    if (params.deviceId) where.deviceId = params.deviceId;
    if (params.event) where.event = params.event;
    if (params.from || params.to) {
      where.timestamp = {};
      if (params.from) where.timestamp.gte = new Date(params.from);
      if (params.to) where.timestamp.lte = new Date(params.to);
    }

    return this.prisma.vehicleTripLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: params.limit || 100,
    });
  }

  async getDailyTripSummary(date?: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const startOfDay = new Date(targetDate + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDate + 'T23:59:59.999Z');

    const events = await this.prisma.vehicleTripLog.findMany({
      where: {
        timestamp: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by plateNo and compute summary
    const byPlate: Record<string, any[]> = {};
    events.forEach((e) => {
      if (!byPlate[e.plateNo]) byPlate[e.plateNo] = [];
      byPlate[e.plateNo].push(e);
    });

    return Object.entries(byPlate).map(([plateNo, evts]) => {
      const ignOnCount = evts.filter((e) => e.event === 'IGNITION_ON').length;
      const firstIgnOn = evts.find((e) => e.event === 'IGNITION_ON');
      const lastIgnOff = [...evts].reverse().find((e) => e.event === 'IGNITION_OFF');
      return {
        plateNo,
        date: targetDate,
        ignitionOnCount: ignOnCount,
        firstStartTime: firstIgnOn?.timestamp || null,
        lastStopTime: lastIgnOff?.timestamp || null,
        driverName: firstIgnOn?.driverName || evts[0]?.driverName || null,
        totalEvents: evts.length,
      };
    });
  }
}
```

---

## 4. Controller — add to `src/transport/transport.controller.ts`

```typescript
import { Controller, Post, Get, Delete, Body, Param, Query } from '@nestjs/common';
import { VehicleTrackingService } from './vehicle-tracking.service';
import { UpsertVehicleDriverDto, PushTripEventsDto } from './dto/vehicle-tracking.dto';

// Add these routes to your existing transport controller, or create a new one:

// ── Driver-Vehicle Mapping ────────────────────────

@Post('vehicle-drivers')
upsertDriverMapping(@Body() dto: UpsertVehicleDriverDto) {
  return this.vehicleTrackingService.upsertDriverMapping(dto);
}

@Get('vehicle-drivers')
getAllDriverMappings() {
  return this.vehicleTrackingService.getAllDriverMappings();
}

@Delete('vehicle-drivers/:plateNo')
removeDriverMapping(@Param('plateNo') plateNo: string) {
  return this.vehicleTrackingService.removeDriverMapping(plateNo);
}

// ── Trip / Ignition Event Log ──────────────────────

@Post('trip-events')
pushTripEvents(@Body() dto: PushTripEventsDto) {
  return this.vehicleTrackingService.pushTripEvents(dto.events);
}

@Get('trip-events')
getTripHistory(
  @Query('plateNo') plateNo?: string,
  @Query('deviceId') deviceId?: string,
  @Query('event') event?: string,
  @Query('from') from?: string,
  @Query('to') to?: string,
  @Query('limit') limit?: string,
) {
  return this.vehicleTrackingService.getTripHistory({
    plateNo, deviceId, event, from, to,
    limit: limit ? parseInt(limit) : undefined,
  });
}

@Get('trip-summary')
getDailyTripSummary(@Query('date') date?: string) {
  return this.vehicleTrackingService.getDailyTripSummary(date);
}
```

---

## 5. Module Registration

In `transport.module.ts`, add `VehicleTrackingService` to providers and inject into the controller.

---

## API Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/transport/vehicle-drivers` | Assign/update driver to vehicle (upsert by plateNo) |
| GET | `/transport/vehicle-drivers` | Get all driver-vehicle mappings |
| DELETE | `/transport/vehicle-drivers/:plateNo` | Remove driver from vehicle |
| POST | `/transport/trip-events` | Push ignition/trip events (batch) |
| GET | `/transport/trip-events?plateNo=&from=&to=` | Get trip/ignition history |
| GET | `/transport/trip-summary?date=` | Get daily summary per vehicle |
