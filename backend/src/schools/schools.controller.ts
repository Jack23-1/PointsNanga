import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AcademicService } from "../academic/academic.service";
import { CreateSchoolDto, UpdateSchoolDto } from "../academic/dto/academic.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SchoolsService } from "./schools.service";

@Controller("schools")
export class SchoolsController {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly academicService: AcademicService,
  ) {}

  @Get()
  findAll() {
    return this.schoolsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateSchoolDto) {
    return this.academicService.createSchool(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(@Param("id") id: string, @Body() dto: UpdateSchoolDto) {
    return this.academicService.updateSchool(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(@Param("id") id: string) {
    return this.academicService.deleteSchool(id);
  }
}
