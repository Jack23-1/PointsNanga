import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthService } from "./auth.service";
import { RolesGuard } from "./roles.guard";
import { PrimarySuperAdminGuard } from "./primary-superadmin.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "15m",
          issuer: "pointsnanga-api",
          audience: "pointsnanga-web",
          algorithm: "HS256",
        },
        verifyOptions: {
          issuer: "pointsnanga-api",
          audience: "pointsnanga-web",
          algorithms: ["HS256"],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, PrimarySuperAdminGuard],
  exports: [JwtModule, JwtAuthGuard, RolesGuard, PrimarySuperAdminGuard],
})
export class AuthModule {}
