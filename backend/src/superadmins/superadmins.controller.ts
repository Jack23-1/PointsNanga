import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateSuperAdminDto } from "./dto/create-superadmin.dto";
import { UpdateSuperAdminDto } from "./dto/update-superadmin.dto";
import { SuperAdminsService } from "./superadmins.service";

@Controller("superadmins")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("super_admin")
export class SuperAdminsController {
  constructor(private readonly superAdminsService: SuperAdminsService) {}

  @Get()
  findAll() {
    return this.superAdminsService.findAll();
  }

  @Post()
  create(
    @Body() createSuperAdminDto: CreateSuperAdminDto,
    @Req() request: Request & { user?: { sub?: string } },
  ) {
    return this.superAdminsService.create(
      createSuperAdminDto,
      request.user?.sub,
    );
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateSuperAdminDto: UpdateSuperAdminDto,
    @Req() request: Request & { user?: { sub?: string } },
  ) {
    return this.superAdminsService.update(
      id,
      updateSuperAdminDto,
      request.user?.sub,
    );
  }

  @Delete(":id")
  remove(
    @Param("id") id: string,
    @Req() request: Request & { user?: { sub?: string } },
  ) {
    return this.superAdminsService.remove(id, request.user?.sub);
  }
}
