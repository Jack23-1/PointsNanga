import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { handlePrismaError } from "../common/prisma-errors";
import {
  AssignStudentDto,
  CreateClassDto,
  CreateCourseDto,
  CreateLevelDto,
  CreateOptionDto,
  CreateSchoolDto,
  CreateSchoolYearDto,
  CreateStudentDto,
  CreateTeacherDto,
  UpdateClassDto,
  UpdateCourseDto,
  UpdateLevelDto,
  UpdateOptionDto,
  UpdateSchoolDto,
  UpdateStudentDto,
  UpdateTeacherDto,
} from "./dto/academic.dto";

const toBigInt = (id: number | string) => BigInt(id);
const clean = (value?: string | null) => value?.trim() || undefined;
const statusFromBoolean = (isActive?: boolean) =>
  isActive === false ? "INACTIF" : "ACTIF";

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  async listSchools() {
    const schools = await this.prisma.ecoles.findMany({
      orderBy: { date_creation: "desc" },
    });

    return schools.map((school) => ({
      id: school.id_ecole.toString(),
      name: school.nom_ecole,
      code: school.code_ecole,
      address: school.adresse,
      phone: school.telephone,
      email: school.email,
      logo: school.logo,
      city: school.adresse ?? "",
      country: "RDC",
      directorId: "",
      isActive: school.statut === "ACTIF",
      createdAt: school.date_creation.toISOString(),
      updatedAt: school.date_mise_a_jour.toISOString(),
    }));
  }

  async createSchool(dto: CreateSchoolDto) {
    try {
      const school = await this.prisma.ecoles.create({
        data: {
          nom_ecole: dto.name.trim(),
          code_ecole: dto.code.trim().toUpperCase(),
          adresse: clean(dto.address),
          telephone: clean(dto.phone),
          email: clean(dto.email)?.toLowerCase(),
          logo: clean(dto.logo),
          statut: statusFromBoolean(dto.isActive),
        },
      });
      return this.findSchool(school.id_ecole.toString());
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateSchool(id: string, dto: UpdateSchoolDto) {
    await this.ensureSchool(id);
    try {
      await this.prisma.ecoles.update({
        where: { id_ecole: toBigInt(id) },
        data: {
          nom_ecole: dto.name.trim(),
          code_ecole: dto.code.trim().toUpperCase(),
          adresse: clean(dto.address),
          telephone: clean(dto.phone),
          email: clean(dto.email)?.toLowerCase(),
          logo: clean(dto.logo),
          statut: statusFromBoolean(dto.isActive),
        },
      });
      return this.findSchool(id);
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteSchool(id: string) {
    await this.ensureSchool(id);
    try {
      await this.prisma.ecoles.delete({ where: { id_ecole: toBigInt(id) } });
      return { deleted: true };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findSchool(id: string) {
    const school = await this.prisma.ecoles.findUnique({
      where: { id_ecole: toBigInt(id) },
    });
    if (!school) throw new NotFoundException("École introuvable.");
    return (await this.listSchools()).find((item) => item.id === id);
  }

  async listLevels(schoolId?: string) {
    const levels = await this.prisma.niveaux.findMany({
      where: schoolId ? { id_ecole: toBigInt(schoolId) } : undefined,
      orderBy: [{ id_ecole: "asc" }, { ordre: "asc" }],
    });
    return levels.map((level) => ({
      id: level.id_niveau.toString(),
      schoolId: level.id_ecole.toString(),
      label: level.libelle,
      order: level.ordre,
      description: level.description,
      isActive: level.statut === "ACTIF",
    }));
  }

  async createLevel(dto: CreateLevelDto) {
    try {
      return await this.prisma.niveaux.create({
        data: {
          id_ecole: toBigInt(dto.schoolId),
          libelle: dto.label.trim(),
          ordre: dto.order,
          description: clean(dto.description),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateLevel(id: string, dto: UpdateLevelDto) {
    try {
      return await this.prisma.niveaux.update({
        where: { id_niveau: toBigInt(id) },
        data: {
          id_ecole: toBigInt(dto.schoolId),
          libelle: dto.label.trim(),
          ordre: dto.order,
          description: clean(dto.description),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteLevel(id: string) {
    try {
      await this.prisma.niveaux.delete({ where: { id_niveau: toBigInt(id) } });
      return { deleted: true };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async listOptions(schoolId?: string) {
    const options = await this.prisma.options_scolaires.findMany({
      where: schoolId ? { id_ecole: toBigInt(schoolId) } : undefined,
      orderBy: { libelle: "asc" },
    });
    return options.map((option) => ({
      id: option.id_option.toString(),
      schoolId: option.id_ecole.toString(),
      label: option.libelle,
      code: option.code_option,
      description: option.description,
      isActive: option.statut === "ACTIF",
    }));
  }

  async createOption(dto: CreateOptionDto) {
    try {
      return await this.prisma.options_scolaires.create({
        data: {
          id_ecole: toBigInt(dto.schoolId),
          libelle: dto.label.trim(),
          code_option: clean(dto.code)?.toUpperCase(),
          description: clean(dto.description),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateOption(id: string, dto: UpdateOptionDto) {
    try {
      return await this.prisma.options_scolaires.update({
        where: { id_option: toBigInt(id) },
        data: {
          id_ecole: toBigInt(dto.schoolId),
          libelle: dto.label.trim(),
          code_option: clean(dto.code)?.toUpperCase(),
          description: clean(dto.description),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteOption(id: string) {
    try {
      await this.prisma.options_scolaires.delete({
        where: { id_option: toBigInt(id) },
      });
      return { deleted: true };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async listClasses(schoolId?: string) {
    const classes = await this.prisma.classes.findMany({
      where: schoolId ? { id_ecole: toBigInt(schoolId) } : undefined,
      include: { niveaux: true, options_scolaires: true },
      orderBy: { libelle: "asc" },
    });
    return classes.map((item) => ({
      id: item.id_classe.toString(),
      schoolId: item.id_ecole.toString(),
      levelId: item.id_niveau.toString(),
      optionId: item.id_option?.toString(),
      label: item.libelle,
      code: item.code_classe,
      capacity: item.capacite,
      level: item.niveaux.libelle,
      option: item.options_scolaires?.libelle,
      isActive: item.statut === "ACTIF",
    }));
  }

  async createClass(dto: CreateClassDto) {
    try {
      return await this.prisma.classes.create({
        data: {
          id_ecole: toBigInt(dto.schoolId),
          id_niveau: toBigInt(dto.levelId),
          id_option: dto.optionId ? toBigInt(dto.optionId) : undefined,
          libelle: dto.label.trim(),
          code_classe: dto.code.trim().toUpperCase(),
          capacite: dto.capacity,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateClass(id: string, dto: UpdateClassDto) {
    try {
      return await this.prisma.classes.update({
        where: { id_classe: toBigInt(id) },
        data: {
          id_ecole: toBigInt(dto.schoolId),
          id_niveau: toBigInt(dto.levelId),
          id_option: dto.optionId ? toBigInt(dto.optionId) : null,
          libelle: dto.label.trim(),
          code_classe: dto.code.trim().toUpperCase(),
          capacite: dto.capacity,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteClass(id: string) {
    try {
      await this.prisma.classes.delete({ where: { id_classe: toBigInt(id) } });
      return { deleted: true };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async listTeachers(schoolId?: string) {
    const teachers = await this.prisma.professeurs.findMany({
      where: schoolId ? { id_ecole: toBigInt(schoolId) } : undefined,
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });
    return teachers.map((teacher) => ({
      id: teacher.id_professeur.toString(),
      schoolId: teacher.id_ecole.toString(),
      matricule: teacher.matricule,
      lastName: teacher.nom,
      postName: teacher.postnom,
      firstName: teacher.prenom,
      gender: teacher.sexe,
      phone: teacher.telephone,
      email: teacher.email,
      address: teacher.adresse,
      specialty: teacher.specialite,
      isActive: teacher.statut === "ACTIF",
    }));
  }

  async createTeacher(dto: CreateTeacherDto) {
    try {
      return await this.prisma.professeurs.create({
        data: {
          id_ecole: toBigInt(dto.schoolId),
          matricule: clean(dto.matricule),
          nom: dto.lastName.trim(),
          postnom: clean(dto.postName),
          prenom: dto.firstName.trim(),
          sexe: clean(dto.gender),
          telephone: clean(dto.phone),
          email: clean(dto.email)?.toLowerCase(),
          adresse: clean(dto.address),
          specialite: clean(dto.specialty),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateTeacher(id: string, dto: UpdateTeacherDto) {
    try {
      return await this.prisma.professeurs.update({
        where: { id_professeur: toBigInt(id) },
        data: {
          id_ecole: toBigInt(dto.schoolId),
          matricule: clean(dto.matricule),
          nom: dto.lastName.trim(),
          postnom: clean(dto.postName),
          prenom: dto.firstName.trim(),
          sexe: clean(dto.gender),
          telephone: clean(dto.phone),
          email: clean(dto.email)?.toLowerCase(),
          adresse: clean(dto.address),
          specialite: clean(dto.specialty),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteTeacher(id: string) {
    try {
      await this.prisma.professeurs.delete({
        where: { id_professeur: toBigInt(id) },
      });
      return { deleted: true };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async listCourses(schoolId?: string) {
    const courses = await this.prisma.cours.findMany({
      where: schoolId ? { id_ecole: toBigInt(schoolId) } : undefined,
      orderBy: { libelle: "asc" },
    });
    return courses.map((course) => ({
      id: course.id_cours.toString(),
      schoolId: course.id_ecole.toString(),
      label: course.libelle,
      code: course.code_cours,
      description: course.description,
      isActive: course.statut === "ACTIF",
    }));
  }

  async createCourse(dto: CreateCourseDto) {
    try {
      return await this.prisma.cours.create({
        data: {
          id_ecole: toBigInt(dto.schoolId),
          libelle: dto.label.trim(),
          code_cours: clean(dto.code)?.toUpperCase(),
          description: clean(dto.description),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    try {
      return await this.prisma.cours.update({
        where: { id_cours: toBigInt(id) },
        data: {
          id_ecole: toBigInt(dto.schoolId),
          libelle: dto.label.trim(),
          code_cours: clean(dto.code)?.toUpperCase(),
          description: clean(dto.description),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteCourse(id: string) {
    try {
      await this.prisma.cours.delete({ where: { id_cours: toBigInt(id) } });
      return { deleted: true };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async listStudents(schoolId?: string) {
    const students = await this.prisma.eleves.findMany({
      where: schoolId ? { id_ecole: toBigInt(schoolId) } : undefined,
      include: {
        inscriptions: {
          orderBy: { date_inscription: "desc" },
          take: 1,
          include: { classes: true },
        },
      },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });
    return students.map((student) => ({
      id: student.id_eleve.toString(),
      key: student.id_eleve.toString(),
      schoolId: student.id_ecole.toString(),
      matricule: student.matricule,
      lastName: student.nom,
      postName: student.postnom,
      firstName: student.prenom,
      name: `${student.nom} ${student.postnom ?? ""} ${student.prenom}`.replace(/\s+/g, " ").trim(),
      gender: student.sexe,
      birthDate: student.date_naissance?.toISOString(),
      birthPlace: student.lieu_naissance,
      detail: student.telephone_tuteur
        ? `${student.adresse ?? "—"} · ${student.telephone_tuteur}`
        : (student.adresse ?? "—"),
      address: student.adresse,
      guardianName: student.nom_tuteur,
      guardianPhone: student.telephone_tuteur,
      photo: student.photo,
      className: student.inscriptions[0]?.classes.libelle ?? "—",
      status: student.statut === "ACTIF" ? "Actif" : "En attente",
    }));
  }

  async createStudent(dto: CreateStudentDto) {
    try {
      return await this.prisma.eleves.create({
        data: {
          id_ecole: toBigInt(dto.schoolId),
          matricule: dto.matricule.trim().toUpperCase(),
          nom: dto.lastName.trim(),
          postnom: clean(dto.postName),
          prenom: dto.firstName.trim(),
          sexe: clean(dto.gender),
          date_naissance: dto.birthDate ? new Date(dto.birthDate) : undefined,
          lieu_naissance: clean(dto.birthPlace),
          adresse: clean(dto.address),
          nom_tuteur: clean(dto.guardianName),
          telephone_tuteur: clean(dto.guardianPhone),
          photo: clean(dto.photo),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateStudent(id: string, dto: UpdateStudentDto) {
    try {
      return await this.prisma.eleves.update({
        where: { id_eleve: toBigInt(id) },
        data: {
          id_ecole: toBigInt(dto.schoolId),
          matricule: dto.matricule.trim().toUpperCase(),
          nom: dto.lastName.trim(),
          postnom: clean(dto.postName),
          prenom: dto.firstName.trim(),
          sexe: clean(dto.gender),
          date_naissance: dto.birthDate ? new Date(dto.birthDate) : null,
          lieu_naissance: clean(dto.birthPlace),
          adresse: clean(dto.address),
          nom_tuteur: clean(dto.guardianName),
          telephone_tuteur: clean(dto.guardianPhone),
          photo: clean(dto.photo),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteStudent(id: string) {
    try {
      await this.prisma.eleves.delete({ where: { id_eleve: toBigInt(id) } });
      return { deleted: true };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async createSchoolYear(dto: CreateSchoolYearDto) {
    try {
      return await this.prisma.annees_scolaires.create({
        data: {
          id_ecole: toBigInt(dto.schoolId),
          libelle: dto.label.trim(),
          date_debut: new Date(dto.startDate),
          date_fin: new Date(dto.endDate),
          est_active: dto.isActive ?? false,
          statut: dto.isActive ? "EN_COURS" : "PLANIFIEE",
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async assignStudent(dto: AssignStudentDto) {
    try {
      return await this.prisma.inscriptions.create({
        data: {
          id_eleve: toBigInt(dto.studentId),
          id_classe: toBigInt(dto.classId),
          id_annee_scolaire: toBigInt(dto.schoolYearId),
          numero_ordre: dto.orderNumber ? Number(dto.orderNumber) : undefined,
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  private async ensureSchool(id: string) {
    const school = await this.prisma.ecoles.findUnique({
      where: { id_ecole: toBigInt(id) },
    });
    if (!school) throw new NotFoundException("École introuvable.");
  }
}
