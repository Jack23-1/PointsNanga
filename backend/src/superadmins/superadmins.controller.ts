import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateSuperAdminDto } from "./dto/create-superadmin.dto";
import { UpdateSuperAdminDto } from "./dto/update-superadmin.dto";
import { SuperAdminsService } from "./superadmins.service";

@Controller("superadmins")
@UseGuards(JwtAuthGuard)
export class SuperAdminsController {
  constructor(private readonly superAdminsService: SuperAdminsService) {}

  @Get()
  findAll() {
    return this.superAdminsService.findAll();
  }

  @Post()
  create(@Body() createSuperAdminDto: CreateSuperAdminDto) {
    return this.superAdminsService.create(createSuperAdminDto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateSuperAdminDto: UpdateSuperAdminDto,
  ) {
    return this.superAdminsService.update(id, updateSuperAdminDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.superAdminsService.remove(id);
  }
}
