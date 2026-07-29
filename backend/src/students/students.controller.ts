import { Controller, Get, Param } from "@nestjs/common";
import { StudentsService } from "./students.service";

@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get("by-matricule/:matricule")
  findByMatricule(@Param("matricule") matricule: string) {
    return this.studentsService.findByMatricule(matricule);
  }
}
