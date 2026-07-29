import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SuperAdminsController } from "./superadmins.controller";
import { SuperAdminsService } from "./superadmins.service";

@Module({
  imports: [AuthModule],
  controllers: [SuperAdminsController],
  providers: [SuperAdminsService],
})
export class SuperAdminsModule {}
