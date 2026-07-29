import { Module } from "@nestjs/common";
import { AcademicModule } from "../academic/academic.module";
import { AuthModule } from "../auth/auth.module";
import { SchoolsController } from "./schools.controller";
import { SchoolsService } from "./schools.service";

@Module({
  imports: [AcademicModule, AuthModule],
  controllers: [SchoolsController],
  providers: [SchoolsService],
})
export class SchoolsModule {}
