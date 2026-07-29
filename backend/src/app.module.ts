import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
    }),
    PrismaModule,
    AcademicModule,
    AuthModule,
    SchoolsModule,
    StudentsModule,
    SuperAdminsModule,
  ],
})
export class AppModule {}
