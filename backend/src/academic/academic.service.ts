import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { randomInt } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { handlePrismaError } from "../common/prisma-errors";
import { generateStudentMatricule } from "../students/student-matricule";
import {
  AssignStudentDto,
  CreateClassDto,
  CreateCourseAssignmentDto,
  CreateCourseDto,
  CreateOptionDto,
  CreateSchoolDto,
  CreateSchoolYearDto,
  CreateStudentDto,
  CreateTeacherDto,
  UpdateClassDto,
  UpdateCourseDto,
  UpdateOptionDto,
  UpdateSchoolDto,
  UpdateStudentDto,
  UpdateTeacherDto,
} from "./dto/academic.dto";

const toBigInt = (id: number | string) => BigInt(id);
const clean = (value?: string | null) => value?.trim() || undefined;
const uppercaseName = (value: string) => value.trim().toLocaleUpperCase("fr");
const capitalizeFirstName = (value: string) => {
  const normalized = value.trim().toLocaleLowerCase("fr");
  return normalized
    ? `${normalized.charAt(0).toLocaleUpperCase("fr")}${normalized.slice(1)}`
    : normalized;
};
const statusFromBoolean = (isActive?: boolean) =>
  isActive === false ? "INACTIF" : "ACTIF";
const SCHOOL_CODE_CHARACTERS = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const generateSchoolCode = () =>
  `PG${Array.from(
    { length: 9 },
    () => SCHOOL_CODE_CHARACTERS[randomInt(SCHOOL_CODE_CHARACTERS.length)],
  ).join("")}`;
const SCHOOL_PASSWORD_CHARACTERS =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const generateSchoolPassword = () =>
  Array.from(
    { length: 12 },
    () =>
      SCHOOL_PASSWORD_CHARACTERS[
        randomInt(SCHOOL_PASSWORD_CHARACTERS.length)
      ],
  ).join("");
const classCodeBase = (label: string) =>
  label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20) || "CLASSE";

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  async getDirectorDashboard(schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const school = await this.prisma.ecoles.findUnique({
      where: { id_ecole },
      select: {
        id_ecole: true,
        nom_ecole: true,
        code_ecole: true,
        adresse: true,
        ville: true,
        telephone: true,
        logo: true,
      },
    });

    if (!school) {
      throw new NotFoundException("École introuvable.");
    }

    const activeSchoolYear = await this.prisma.annees_scolaires.findFirst({
      where: { id_ecole, est_active: true },
      orderBy: { date_debut: "desc" },
      select: {
        id_annee_scolaire: true,
        libelle: true,
        date_debut: true,
        date_fin: true,
      },
    });

    const [studentCount, teacherCount, courseCount, classes] =
      await Promise.all([
        this.prisma.eleves.count({
          where: { id_ecole, statut: "ACTIF" },
        }),
        this.prisma.professeurs.count({
          where: { id_ecole, statut: "ACTIF" },
        }),
        this.prisma.cours.count({
          where: { id_ecole, statut: "ACTIF" },
        }),
        this.prisma.classes.findMany({
          where: { id_ecole, statut: "ACTIF" },
          orderBy: { libelle: "asc" },
          select: {
            id_classe: true,
            libelle: true,
            code_classe: true,
            capacite: true,
            options_scolaires: { select: { libelle: true } },
            _count: {
              select: {
                inscriptions: {
                  where: activeSchoolYear
                    ? {
                        id_annee_scolaire:
                          activeSchoolYear.id_annee_scolaire,
                        statut: "INSCRIT",
                      }
                    : { id_inscription: { equals: -1n } },
                },
              },
            },
          },
        }),
      ]);

    return {
      school: {
        id: school.id_ecole.toString(),
        name: school.nom_ecole,
        code: school.code_ecole,
        address: school.adresse,
        city: school.ville,
        phone: school.telephone,
        logo: school.logo,
      },
      activeSchoolYear: activeSchoolYear
        ? {
            id: activeSchoolYear.id_annee_scolaire.toString(),
            label: activeSchoolYear.libelle,
            startsAt: activeSchoolYear.date_debut.toISOString(),
            endsAt: activeSchoolYear.date_fin.toISOString(),
          }
        : null,
      counts: {
        students: studentCount,
        classes: classes.length,
        teachers: teacherCount,
        courses: courseCount,
      },
      classes: classes.map((schoolClass) => ({
        id: schoolClass.id_classe.toString(),
        name: schoolClass.libelle,
        code: schoolClass.code_classe,
        option: schoolClass.options_scolaires?.libelle ?? null,
        capacity: schoolClass.capacite,
        students: schoolClass._count.inscriptions,
      })),
    };
  }

  private async generateUniqueSchoolCode() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = generateSchoolCode();
      const existingSchool = await this.prisma.ecoles.findUnique({
        where: { code_ecole: code },
        select: { id_ecole: true },
      });

      if (!existingSchool) return code;
    }

    throw new Error("Impossible de générer un code école unique.");
  }

  async listSchools() {
    const schools = await this.prisma.ecoles.findMany({
      orderBy: { date_creation: "desc" },
    });

    return schools.map((school) => ({
      id: school.id_ecole.toString(),
      name: school.nom_ecole,
      code: school.code_ecole,
      establishmentCode: school.code_etablissement,
      address: school.adresse,
      city: school.ville,
      phone: school.telephone,
      logo: school.logo,
      isActive: school.statut === "ACTIF",
      createdAt: school.date_creation.toISOString(),
      updatedAt: school.date_mise_a_jour.toISOString(),
    }));
  }

  async createSchool(dto: CreateSchoolDto) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const initialPassword = generateSchoolPassword();
        const school = await this.prisma.ecoles.create({
          data: {
            nom_ecole: dto.name.trim(),
            code_ecole: await this.generateUniqueSchoolCode(),
            code_etablissement: clean(dto.establishmentCode)?.toUpperCase(),
            mot_de_passe_hash: await bcrypt.hash(initialPassword, 12),
            adresse: dto.address.trim(),
            ville: dto.city.trim(),
            telephone: dto.phone.trim(),
            logo: clean(dto.logo),
            statut: statusFromBoolean(dto.isActive),
          },
        });
        return {
          ...(await this.findSchool(school.id_ecole.toString())),
          initialPassword,
        };
      } catch (error) {
        const isSchoolCodeCollision =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002";

        if (!isSchoolCodeCollision || attempt === 4) {
          handlePrismaError(error);
        }
      }
    }
  }

  async updateSchool(id: string, dto: UpdateSchoolDto) {
    await this.ensureSchool(id);
    try {
      const updatedSchool = await this.prisma.ecoles.update({
        where: { id_ecole: toBigInt(id) },
        data: {
          nom_ecole: dto.name.trim(),
          code_etablissement: clean(dto.establishmentCode)?.toUpperCase(),
          adresse: dto.address.trim(),
          ville: dto.city.trim(),
          telephone: dto.phone.trim(),
          logo: clean(dto.logo),
          statut: statusFromBoolean(dto.isActive),
        },
      });
      return {
        id: updatedSchool.id_ecole.toString(),
        name: updatedSchool.nom_ecole,
        code: updatedSchool.code_ecole,
        establishmentCode: updatedSchool.code_etablissement,
        address: updatedSchool.adresse,
        city: updatedSchool.ville,
        phone: updatedSchool.telephone,
        isActive: updatedSchool.statut === "ACTIF",
        updatedAt: updatedSchool.date_mise_a_jour.toISOString(),
      };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async resetSchoolPassword(id: string) {
    await this.ensureSchool(id);
    const initialPassword = generateSchoolPassword();

    await this.prisma.ecoles.update({
      where: { id_ecole: toBigInt(id) },
      data: {
        mot_de_passe_hash: await bcrypt.hash(initialPassword, 12),
        date_mise_a_jour: new Date(),
      },
    });

    return { initialPassword };
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
      include: {
        options_scolaires: true,
        _count: { select: { inscriptions: true } },
      },
      orderBy: { libelle: "asc" },
    });
    return classes.map((item) => ({
      id: item.id_classe.toString(),
      schoolId: item.id_ecole.toString(),
      optionId: item.id_option?.toString(),
      label: item.libelle,
      code: item.code_classe,
      capacity: item.capacite,
      students: item._count.inscriptions,
      option: item.options_scolaires?.libelle,
      isActive: item.statut === "ACTIF",
    }));
  }

  async createClass(dto: CreateClassDto, schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const normalizedLabel = dto.label.trim().replace(/\s+/g, " ");
    try {
      const baseCode = classCodeBase(dto.label);
      let code = baseCode;
      let suffix = 1;
      while (
        await this.prisma.classes.findUnique({
          where: {
            id_ecole_code_classe: { id_ecole, code_classe: code },
          },
          select: { id_classe: true },
        })
      ) {
        suffix += 1;
        code = `${baseCode.slice(0, 25)}-${suffix}`;
      }

      const schoolClass = await this.prisma.classes.create({
        data: {
          id_ecole,
          libelle: normalizedLabel,
          code_classe: code,
        },
      });
      return {
        id: schoolClass.id_classe.toString(),
        label: schoolClass.libelle,
        code: schoolClass.code_classe,
      };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateClass(id: string, dto: UpdateClassDto) {
    try {
      return await this.prisma.classes.update({
        where: { id_classe: toBigInt(id) },
        data: {
          id_ecole: dto.schoolId ? toBigInt(dto.schoolId) : undefined,
          libelle: dto.label.trim(),
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
      where: {
        statut: "ACTIF",
        ...(schoolId ? { id_ecole: toBigInt(schoolId) } : {}),
      },
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
      photo: teacher.photo,
      email: teacher.email,
      address: teacher.adresse,
      specialty: teacher.specialite,
      isActive: teacher.statut === "ACTIF",
    }));
  }

  async createTeacher(dto: CreateTeacherDto, schoolId: string) {
    try {
      const teacher = await this.prisma.professeurs.create({
        data: {
          id_ecole: toBigInt(schoolId),
          nom: uppercaseName(dto.lastName),
          prenom: capitalizeFirstName(dto.firstName),
          sexe: clean(dto.gender),
          telephone: clean(dto.phone),
          photo: clean(dto.photo),
        },
      });
      return { id: teacher.id_professeur.toString() };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateTeacher(id: string, dto: UpdateTeacherDto) {
    try {
      return await this.prisma.professeurs.update({
        where: { id_professeur: toBigInt(id) },
        data: {
          id_ecole: dto.schoolId ? toBigInt(dto.schoolId) : undefined,
          nom: uppercaseName(dto.lastName),
          prenom: capitalizeFirstName(dto.firstName),
          sexe: clean(dto.gender),
          telephone: clean(dto.phone),
          photo: clean(dto.photo),
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
      where: {
        statut: "ACTIF",
        ...(schoolId ? { id_ecole: toBigInt(schoolId) } : {}),
      },
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

  async createCourse(dto: CreateCourseDto, schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const baseCode = classCodeBase(dto.label);
    let code = baseCode;
    let suffix = 1;
    while (
      await this.prisma.cours.findUnique({
        where: { id_ecole_code_cours: { id_ecole, code_cours: code } },
        select: { id_cours: true },
      })
    ) {
      suffix += 1;
      code = `${baseCode.slice(0, 25)}-${suffix}`;
    }
    try {
      const course = await this.prisma.cours.create({
        data: {
          id_ecole,
          libelle: dto.label.trim(),
          code_cours: code,
        },
      });
      return { id: course.id_cours.toString() };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    try {
      return await this.prisma.cours.update({
        where: { id_cours: toBigInt(id) },
        data: {
          id_ecole: dto.schoolId ? toBigInt(dto.schoolId) : undefined,
          libelle: dto.label.trim(),
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

  async listCourseAssignments(schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const assignments = await this.prisma.affectations_professeurs.findMany({
      where: {
        statut: "ACTIF",
        cours_classes: { classes: { id_ecole } },
      },
      include: {
        professeurs: true,
        cours_classes: { include: { cours: true, classes: true } },
      },
      orderBy: { date_creation: "desc" },
    });
    return assignments.map((assignment) => ({
      id: assignment.id_affectation_professeur.toString(),
      teacher: `${assignment.professeurs.nom} ${assignment.professeurs.prenom}`,
      course: assignment.cours_classes.cours.libelle,
      className: assignment.cours_classes.classes.libelle,
      weight: Number(assignment.cours_classes.ponderation),
      isActive: assignment.statut === "ACTIF",
    }));
  }

  async createCourseAssignment(
    dto: CreateCourseAssignmentDto,
    schoolId: string,
  ) {
    const id_ecole = toBigInt(schoolId);
    const id_classe = toBigInt(dto.classId);
    const id_cours = toBigInt(dto.courseId);
    const id_professeur = toBigInt(dto.teacherId);
    const [schoolClass, course, teacher] = await Promise.all([
      this.prisma.classes.findFirst({ where: { id_classe, id_ecole, statut: "ACTIF" } }),
      this.prisma.cours.findFirst({ where: { id_cours, id_ecole, statut: "ACTIF" } }),
      this.prisma.professeurs.findFirst({ where: { id_professeur, id_ecole, statut: "ACTIF" } }),
    ]);
    if (!schoolClass || !course || !teacher) {
      throw new BadRequestException(
        "La classe, le cours ou le professeur n'appartient pas à votre établissement.",
      );
    }
    let schoolYear = await this.prisma.annees_scolaires.findFirst({
      where: { id_ecole, est_active: true },
      orderBy: { date_debut: "desc" },
    });
    if (!schoolYear) {
      throw new BadRequestException(
        "Ajoutez d'abord un élève afin d'initialiser l'année scolaire.",
      );
    }
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const courseClass = await prisma.cours_classes.upsert({
          where: {
            id_cours_id_classe_id_annee_scolaire: {
              id_cours,
              id_classe,
              id_annee_scolaire: schoolYear!.id_annee_scolaire,
            },
          },
          update: {
            ponderation: dto.weight,
            statut: "ACTIF",
            date_mise_a_jour: new Date(),
          },
          create: {
            id_cours,
            id_classe,
            id_annee_scolaire: schoolYear!.id_annee_scolaire,
            ponderation: dto.weight,
          },
        });
        const assignment = await prisma.affectations_professeurs.upsert({
          where: {
            id_cours_classe_id_annee_scolaire: {
              id_cours_classe: courseClass.id_cours_classe,
              id_annee_scolaire: schoolYear!.id_annee_scolaire,
            },
          },
          update: { id_professeur, statut: "ACTIF" },
          create: {
            id_professeur,
            id_cours_classe: courseClass.id_cours_classe,
            id_annee_scolaire: schoolYear!.id_annee_scolaire,
          },
        });
        return { id: assignment.id_affectation_professeur.toString() };
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async listStudents(schoolId?: string) {
    const students = await this.prisma.eleves.findMany({
      where: {
        statut: "ACTIF",
        ...(schoolId ? { id_ecole: toBigInt(schoolId) } : {}),
      },
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
      classId: student.inscriptions[0]?.id_classe.toString(),
      className: student.inscriptions[0]?.classes.libelle ?? "—",
      status: student.statut === "ACTIF" ? "Actif" : "En attente",
    }));
  }

  async createStudent(dto: CreateStudentDto, schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const id_classe = toBigInt(dto.classId);
    const schoolClass = await this.prisma.classes.findFirst({
      where: { id_classe, id_ecole, statut: "ACTIF" },
    });

    if (!schoolClass) {
      throw new BadRequestException(
        "La classe sélectionnée n'appartient pas à votre établissement.",
      );
    }

    let activeSchoolYear = await this.prisma.annees_scolaires.findFirst({
      where: { id_ecole, est_active: true },
      orderBy: { date_debut: "desc" },
    });
    if (!activeSchoolYear) {
      const today = new Date();
      const startYear =
        today.getUTCMonth() >= 8
          ? today.getUTCFullYear()
          : today.getUTCFullYear() - 1;
      const label = `${startYear}-${startYear + 1}`;
      activeSchoolYear = await this.prisma.annees_scolaires.upsert({
        where: { id_ecole_libelle: { id_ecole, libelle: label } },
        update: { est_active: true, statut: "EN_COURS" },
        create: {
          id_ecole,
          libelle: label,
          date_debut: new Date(Date.UTC(startYear, 8, 1)),
          date_fin: new Date(Date.UTC(startYear + 1, 7, 31)),
          est_active: true,
          statut: "EN_COURS",
        },
      });
    }

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const matricule = generateStudentMatricule();
      const exists = await this.prisma.eleves.findUnique({
        where: { matricule },
        select: { id_eleve: true },
      });
      if (exists) continue;

      try {
        return await this.prisma.$transaction(async (prisma) => {
          const student = await prisma.eleves.create({
            data: {
              id_ecole,
              matricule,
              nom: uppercaseName(dto.lastName),
              postnom: dto.postName ? uppercaseName(dto.postName) : undefined,
              prenom: capitalizeFirstName(dto.firstName),
              sexe: clean(dto.gender),
              date_naissance: dto.birthDate
                ? new Date(dto.birthDate)
                : undefined,
              adresse: clean(dto.address),
              telephone_tuteur: clean(dto.guardianPhone),
              photo: clean(dto.photo),
            },
          });
          await prisma.inscriptions.create({
            data: {
              id_eleve: student.id_eleve,
              id_classe,
              id_annee_scolaire: activeSchoolYear.id_annee_scolaire,
            },
          });
          return {
            id: student.id_eleve.toString(),
            matricule: student.matricule,
          };
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          String(error.meta?.target).includes("matricule")
        ) {
          continue;
        }
        handlePrismaError(error);
      }
    }

    throw new BadRequestException(
      "Impossible de générer un matricule unique. Réessayez.",
    );
  }

  async updateStudent(id: string, dto: UpdateStudentDto, schoolId: string) {
    const id_eleve = toBigInt(id);
    const id_ecole = toBigInt(schoolId);
    const id_classe = toBigInt(dto.classId);
    const [student, schoolClass] = await Promise.all([
      this.prisma.eleves.findFirst({ where: { id_eleve, id_ecole } }),
      this.prisma.classes.findFirst({
        where: { id_classe, id_ecole, statut: "ACTIF" },
      }),
    ]);
    if (!student) throw new NotFoundException("Élève introuvable.");
    if (!schoolClass) {
      throw new BadRequestException(
        "La classe sélectionnée n'appartient pas à votre établissement.",
      );
    }

    try {
      return await this.prisma.$transaction(async (prisma) => {
        const updated = await prisma.eleves.update({
          where: { id_eleve },
          data: {
            nom: uppercaseName(dto.lastName),
            postnom: dto.postName ? uppercaseName(dto.postName) : undefined,
            prenom: capitalizeFirstName(dto.firstName),
            sexe: clean(dto.gender),
            date_naissance: dto.birthDate ? new Date(dto.birthDate) : null,
            adresse: clean(dto.address),
            telephone_tuteur: clean(dto.guardianPhone),
            photo: clean(dto.photo),
            date_mise_a_jour: new Date(),
          },
        });
        const enrollment = await prisma.inscriptions.findFirst({
          where: { id_eleve },
          orderBy: { date_inscription: "desc" },
        });
        if (enrollment) {
          await prisma.inscriptions.update({
            where: { id_inscription: enrollment.id_inscription },
            data: { id_classe, date_mise_a_jour: new Date() },
          });
        }
        return { id: updated.id_eleve.toString() };
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteStudent(
    id: string,
    schoolId: string,
    confirmation?: { directorId: string; password: string },
  ) {
    const id_eleve = toBigInt(id);
    const id_ecole = toBigInt(schoolId);
    if (confirmation) {
      const isSchoolAccount = confirmation.directorId.startsWith("school-");
      const account = isSchoolAccount
        ? await this.prisma.ecoles.findFirst({
            where: { id_ecole, statut: "ACTIF" },
            select: { mot_de_passe_hash: true },
          })
        : await this.prisma.directeurs.findFirst({
            where: {
              id_directeur: toBigInt(confirmation.directorId),
              id_ecole,
              statut_compte: "ACTIF",
            },
            select: { mot_de_passe_hash: true },
          });
      if (
        !account?.mot_de_passe_hash ||
        !(await bcrypt.compare(
          confirmation.password,
          account.mot_de_passe_hash,
        ))
      ) {
        throw new UnauthorizedException("Mot de passe incorrect.");
      }
    }
    const student = await this.prisma.eleves.findFirst({
      where: { id_eleve, id_ecole },
    });
    if (!student) throw new NotFoundException("Élève introuvable.");
    try {
      await this.prisma.eleves.update({
        where: { id_eleve },
        data: { statut: "INACTIF", date_mise_a_jour: new Date() },
      });
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
