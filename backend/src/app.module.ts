import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import * as Joi from "joi";
import { AcademicModule } from "./academic/academic.module";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SchoolsModule } from "./schools/schools.module";
import { StudentsModule } from "./students/students.module";
import { SuperAdminsModule } from "./superadmins/superadmins.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationOptions: { abortEarly: false },
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
        PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string().uri({ scheme: ["postgresql", "postgres"] }).required(),
        FRONTEND_URL: Joi.string().uri({ scheme: ["http", "https"] }).required(),
        JWT_SECRET: Joi.string().when("NODE_ENV", {
          is: "production",
          then: Joi.string().min(32).required(),
          otherwise: Joi.string().min(16).required(),
        }),
        STUDENT_RESULTS_PASSWORD: Joi.string().when("NODE_ENV", {
          is: "production",
          then: Joi.string().min(12).max(72).required(),
          otherwise: Joi.string().min(8).max(72).optional(),
        }),
        GMAIL_USER: Joi.string().email().optional(),
        GMAIL_APP_PASSWORD: Joi.string().min(12).optional(),
      }),
    }),
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1000, limit: 20 },
      { name: "long", ttl: 60000, limit: 300 },
    ]),
    PrismaModule,
    AcademicModule,
    AuthModule,
    SchoolsModule,
    StudentsModule,
    SuperAdminsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
