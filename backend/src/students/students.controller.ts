import { BadRequestException, Controller, Get, Param } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { StudentsService } from "./students.service";

@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get("by-matricule/:matricule")
  @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 10, ttl: 60000, blockDuration: 60000 } })
  findByMatricule(@Param("matricule") matricule: string) {
    if (!/^[A-Za-z0-9-]{3,50}$/.test(matricule)) {
      throw new BadRequestException("Matricule invalide.");
    }
    return this.studentsService.findByMatricule(matricule);
  }
}
