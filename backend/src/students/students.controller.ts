import { BadRequestException, Controller, Get, Param } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { StudentsService } from "./students.service";

@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get("by-matricule/:matricule")
  @SkipThrottle({ short: true, long: true })
  findByMatricule(@Param("matricule") matricule: string) {
    if (!/^[A-Za-z0-9-]{3,50}$/.test(matricule)) {
      throw new BadRequestException("Matricule invalide.");
    }
    return this.studentsService.findByMatricule(matricule);
  }
}
