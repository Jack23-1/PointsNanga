import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
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
  CreateHomeroomAssignmentDto,
  CreateCourseDto,
  CreateOptionDto,
  CreateSchoolDto,
  CreateSchoolYearDto,
  CreateStudentDto,
  CreateTeacherDto,
  SaveHomeroomGradesDto,
  ReplaceCourseTeacherDto,
  UpdateClassDto,
  UpdateCourseDto,
  UpdateOptionDto,
  UpdateSchoolDto,
  UpdateSchoolYearDto,
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
const ACADEMIC_PERIODS = [
  "1ère période",
  "2ème période",
  "1er semestre",
  "3ème période",
  "4ème période",
  "2ème semestre",
] as const;
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
const generateHomeroomCode = () =>
  `TIT-${Array.from({ length: 4 }, () => randomInt(1, 10)).join("")}`;
const generateHomeroomPassword = () =>
  Array.from(
    { length: 10 },
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

  async getHomeroomDashboard(homeroomId: string) {
    const id_titulaire = toBigInt(homeroomId);
    const homeroom = await this.prisma.titulaires.findFirst({
      where: { id_titulaire, statut_compte: "ACTIF" },
      include: {
        classes: { include: { ecoles: true } },
        professeurs: true,
        annees_scolaires: true,
      },
    });
    if (!homeroom) throw new NotFoundException("Compte titulaire introuvable.");

    const id_classe = homeroom.id_classe;
    const id_annee_scolaire = homeroom.id_annee_scolaire;
    const [students, courses, gradeCount, openPeriod] = await Promise.all([
      this.prisma.inscriptions.findMany({
        where: {
          id_classe,
          id_annee_scolaire,
          statut: "INSCRIT",
          eleves: { statut: "ACTIF" },
        },
        include: { eleves: true },
        orderBy: [{ numero_ordre: "asc" }, { eleves: { nom: "asc" } }],
      }),
      this.prisma.cours_classes.findMany({
        where: {
          id_classe,
          id_annee_scolaire,
          statut: "ACTIF",
        },
        include: {
          cours: true,
          affectations_professeurs: {
            where: { statut: "ACTIF" },
            include: { professeurs: true },
            take: 1,
          },
        },
        orderBy: { cours: { libelle: "asc" } },
      }),
      this.prisma.cotes.count({
        where: {
          id_titulaire,
          inscriptions: { id_classe, id_annee_scolaire },
        },
      }),
      this.prisma.periodes.findFirst({
        where: { id_annee_scolaire, est_ouverte: true, statut: "ACTIF" },
        orderBy: { numero: "asc" },
      }),
    ]);

    return {
      titular: {
        name: `${homeroom.professeurs.prenom} ${homeroom.professeurs.nom}`,
        code: homeroom.code_connexion,
      },
      school: {
        name: homeroom.classes.ecoles.nom_ecole,
        logo: homeroom.classes.ecoles.logo,
      },
      class: {
        id: id_classe.toString(),
        name: homeroom.classes.libelle,
      },
      schoolYear: homeroom.annees_scolaires.libelle,
      openPeriod: openPeriod?.libelle ?? null,
      stats: {
        students: students.length,
        courses: courses.length,
        gradesEntered: gradeCount,
      },
      courses: courses.map((item) => ({
        id: item.id_cours_classe.toString(),
        name: item.cours.libelle,
        weight: Number(item.ponderation),
        teacher: item.affectations_professeurs[0]
          ? `${item.affectations_professeurs[0].professeurs.nom} ${item.affectations_professeurs[0].professeurs.prenom}`
          : "Non attribué",
      })),
      students: students.slice(0, 8).map((item) => ({
        id: item.id_inscription.toString(),
        matricule: item.eleves.matricule,
        name: `${item.eleves.nom}${item.eleves.postnom ? ` ${item.eleves.postnom}` : ""} ${item.eleves.prenom}`,
        photo: item.eleves.photo,
        orderNumber: item.numero_ordre,
      })),
    };
  }

  async getHomeroomGradebook(homeroomId: string, selectedPeriodId?: string) {
    const id_titulaire = toBigInt(homeroomId);
    const homeroom = await this.prisma.titulaires.findFirst({
      where: { id_titulaire, statut_compte: "ACTIF" },
      include: { classes: true, annees_scolaires: true },
    });
    if (!homeroom) throw new NotFoundException("Compte titulaire introuvable.");
    await this.prisma.$transaction(
      ACADEMIC_PERIODS.map((label, index) =>
        this.prisma.periodes.upsert({
          where: {
            id_annee_scolaire_numero: {
              id_annee_scolaire: homeroom.id_annee_scolaire,
              numero: index + 1,
            },
          },
          update: { libelle: label },
          create: {
            id_annee_scolaire: homeroom.id_annee_scolaire,
            libelle: label,
            numero: index + 1,
            est_ouverte: index === 0,
          },
        }),
      ),
    );
    const periods = await this.prisma.periodes.findMany({
      where: {
        id_annee_scolaire: homeroom.id_annee_scolaire,
        statut: "ACTIF",
      },
      orderBy: { numero: "asc" },
    });
    const period = selectedPeriodId
      ? periods.find((item) => item.id_periode === toBigInt(selectedPeriodId))
      : periods.find((item) => item.est_ouverte) ?? periods[0];
    if (!period) throw new NotFoundException("Période scolaire introuvable.");
    const [students, courses, grades] = await Promise.all([
      this.prisma.inscriptions.findMany({
        where: {
          id_classe: homeroom.id_classe,
          id_annee_scolaire: homeroom.id_annee_scolaire,
          statut: "INSCRIT",
          eleves: { statut: "ACTIF" },
        },
        include: { eleves: true },
        orderBy: [{ numero_ordre: "asc" }, { eleves: { nom: "asc" } }],
      }),
      this.prisma.cours_classes.findMany({
        where: {
          id_classe: homeroom.id_classe,
          id_annee_scolaire: homeroom.id_annee_scolaire,
          statut: "ACTIF",
        },
        include: {
          cours: true,
          affectations_professeurs: {
            where: {
              id_annee_scolaire: homeroom.id_annee_scolaire,
              statut: "ACTIF",
            },
            include: { professeurs: true },
            take: 1,
          },
        },
        orderBy: { cours: { libelle: "asc" } },
      }),
      this.prisma.cotes.findMany({
            where: {
              id_titulaire,
              id_periode: period.id_periode,
              inscriptions: {
                id_classe: homeroom.id_classe,
                id_annee_scolaire: homeroom.id_annee_scolaire,
              },
            },
          }),
    ]);
    return {
      className: homeroom.classes.libelle,
      schoolYear: homeroom.annees_scolaires.libelle,
      period: {
        id: period.id_periode.toString(),
        name: period.libelle,
        isOpen: period.est_ouverte,
      },
      periods: periods.map((item) => ({
        id: item.id_periode.toString(),
        name: item.libelle,
        number: item.numero,
        isOpen: item.est_ouverte,
      })),
      students: students.map((item) => ({
        id: item.id_inscription.toString(),
        matricule: item.eleves.matricule,
        name: `${item.eleves.nom}${item.eleves.postnom ? ` ${item.eleves.postnom}` : ""} ${item.eleves.prenom}`,
        photo: item.eleves.photo,
        orderNumber: item.numero_ordre,
      })),
      courses: courses.map((item) => ({
        id: item.id_cours_classe.toString(),
        name: item.cours.libelle,
        weight: Number(item.ponderation),
        teacherName: item.affectations_professeurs[0]
          ? `${item.affectations_professeurs[0].professeurs.nom}${
              item.affectations_professeurs[0].professeurs.postnom
                ? ` ${item.affectations_professeurs[0].professeurs.postnom}`
                : ""
            } ${item.affectations_professeurs[0].professeurs.prenom}`
          : null,
      })),
      grades: grades.map((item) => ({
        enrollmentId: item.id_inscription.toString(),
        courseClassId: item.id_cours_classe.toString(),
        value: Number(item.cote_obtenue),
      })),
    };
  }

  async saveHomeroomGrades(
    homeroomId: string,
    dto: SaveHomeroomGradesDto,
  ) {
    const id_titulaire = toBigInt(homeroomId);
    const homeroom = await this.prisma.titulaires.findFirst({
      where: { id_titulaire, statut_compte: "ACTIF" },
    });
    if (!homeroom) throw new NotFoundException("Compte titulaire introuvable.");
    const period = await this.prisma.periodes.findFirst({
      where: {
        id_annee_scolaire: homeroom.id_annee_scolaire,
        ...(dto.periodId ? { id_periode: toBigInt(dto.periodId) } : {}),
        est_ouverte: true,
        statut: "ACTIF",
      },
    });
    if (!period) {
      throw new BadRequestException("Aucune période n’est ouverte pour la saisie.");
    }
    const enrollmentIds = [...new Set(dto.grades.map((item) => item.enrollmentId))];
    const courseClassIds = [...new Set(dto.grades.map((item) => item.courseClassId))];
    const [enrollments, courses] = await Promise.all([
      this.prisma.inscriptions.findMany({
        where: {
          id_inscription: { in: enrollmentIds.map(toBigInt) },
          id_classe: homeroom.id_classe,
          id_annee_scolaire: homeroom.id_annee_scolaire,
          statut: "INSCRIT",
        },
        select: { id_inscription: true },
      }),
      this.prisma.cours_classes.findMany({
        where: {
          id_cours_classe: { in: courseClassIds.map(toBigInt) },
          id_classe: homeroom.id_classe,
          id_annee_scolaire: homeroom.id_annee_scolaire,
          statut: "ACTIF",
        },
        select: { id_cours_classe: true, ponderation: true },
      }),
    ]);
    if (
      enrollments.length !== enrollmentIds.length ||
      courses.length !== courseClassIds.length
    ) {
      throw new BadRequestException("Un élève ou un cours ne correspond pas à votre classe.");
    }
    const weights = new Map(
      courses.map((item) => [
        item.id_cours_classe.toString(),
        Number(item.ponderation),
      ]),
    );
    for (const grade of dto.grades) {
      if (grade.value > (weights.get(String(grade.courseClassId)) ?? -1)) {
        throw new BadRequestException(
          "Une cote saisie dépasse la pondération du cours.",
        );
      }
    }
    await this.prisma.$transaction(
      dto.grades.map((grade) =>
        this.prisma.cotes.upsert({
          where: {
            id_inscription_id_cours_classe_id_periode: {
              id_inscription: toBigInt(grade.enrollmentId),
              id_cours_classe: toBigInt(grade.courseClassId),
              id_periode: period.id_periode,
            },
          },
          update: {
            cote_obtenue: grade.value,
            id_titulaire,
            date_mise_a_jour: new Date(),
          },
          create: {
            id_inscription: toBigInt(grade.enrollmentId),
            id_cours_classe: toBigInt(grade.courseClassId),
            id_periode: period.id_periode,
            id_titulaire,
            cote_obtenue: grade.value,
          },
        }),
      ),
    );
    return { saved: dto.grades.length };
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

  async updateClass(id: string, dto: UpdateClassDto, schoolId: string) {
    const id_classe = toBigInt(id);
    const id_ecole = toBigInt(schoolId);
    const existing = await this.prisma.classes.findFirst({
      where: { id_classe, id_ecole },
    });
    if (!existing) throw new NotFoundException("Classe introuvable.");
    try {
      const updated = await this.prisma.classes.update({
        where: { id_classe },
        data: {
          libelle: dto.label.trim(),
          date_mise_a_jour: new Date(),
        },
      });
      return { id: updated.id_classe.toString(), label: updated.libelle };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteClass(id: string, schoolId: string, requesterId: string) {
    const id_classe = toBigInt(id);
    const schoolClass = await this.prisma.classes.findFirst({
      where: { id_classe, id_ecole: toBigInt(schoolId) },
      include: {
        _count: { select: { inscriptions: true, cours_classes: true, titulaires: true } },
      },
    });
    if (!schoolClass) throw new NotFoundException("Classe introuvable.");

    const summary = {
      inscriptions: schoolClass._count.inscriptions,
      cours: schoolClass._count.cours_classes,
      titulaires: schoolClass._count.titulaires,
    };
    if (Object.values(summary).some((count) => count > 0)) {
      const request = await this.createDeletionRequest(
        "CLASS",
        id,
        schoolClass.libelle,
        schoolId,
        requesterId,
        summary,
      );
      return { deleted: false, requested: true, requestId: request.id };
    }

    await this.prisma.classes.delete({ where: { id_classe } });
    return { deleted: true, requested: false };
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

  async deleteTeacher(id: string, schoolId: string) {
    const id_professeur = toBigInt(id);
    const teacher = await this.prisma.professeurs.findFirst({
      where: { id_professeur, id_ecole: toBigInt(schoolId) },
      include: { _count: { select: { affectations_professeurs: true, titulaires: true } } },
    });
    if (!teacher) throw new NotFoundException("Professeur introuvable.");
    const hasHistory = teacher._count.affectations_professeurs > 0 || teacher._count.titulaires > 0;
    if (hasHistory) {
      await this.prisma.professeurs.update({
        where: { id_professeur },
        data: { statut: "INACTIF", date_mise_a_jour: new Date() },
      });
      return { deleted: false, archived: true };
    }
    await this.prisma.professeurs.delete({ where: { id_professeur } });
    return { deleted: true, archived: false };
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

  async updateCourse(id: string, dto: UpdateCourseDto, schoolId: string) {
    const id_cours = toBigInt(id);
    const existing = await this.prisma.cours.findFirst({
      where: { id_cours, id_ecole: toBigInt(schoolId) },
    });
    if (!existing) throw new NotFoundException("Cours introuvable.");
    try {
      const updated = await this.prisma.cours.update({
        where: { id_cours },
        data: {
          libelle: dto.label.trim(),
          date_mise_a_jour: new Date(),
        },
      });
      return { id: updated.id_cours.toString(), label: updated.libelle };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteCourse(id: string, schoolId: string) {
    const id_cours = toBigInt(id);
    const course = await this.prisma.cours.findFirst({
      where: { id_cours, id_ecole: toBigInt(schoolId) },
      include: { _count: { select: { cours_classes: true } } },
    });
    if (!course) throw new NotFoundException("Cours introuvable.");
    if (course._count.cours_classes > 0) {
      await this.prisma.cours.update({
        where: { id_cours },
        data: { statut: "INACTIF", date_mise_a_jour: new Date() },
      });
      return { deleted: false, archived: true };
    }
    await this.prisma.cours.delete({ where: { id_cours } });
    return { deleted: true, archived: false };
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
      teacherId: assignment.id_professeur.toString(),
      courseId: assignment.cours_classes.id_cours.toString(),
      classId: assignment.cours_classes.id_classe.toString(),
      teacher: `${assignment.professeurs.nom} ${assignment.professeurs.prenom}`,
      course: assignment.cours_classes.cours.libelle,
      className: assignment.cours_classes.classes.libelle,
      weight: Number(assignment.cours_classes.ponderation),
      isActive: assignment.statut === "ACTIF",
    }));
  }

  async listCourseAssignmentHistory(schoolId: string) {
    const records = await this.prisma.affectations_professeurs.findMany({
      where: { cours_classes: { classes: { id_ecole: toBigInt(schoolId) } } },
      include: {
        professeurs: true,
        cours_classes: { include: { cours: true, classes: true } },
      },
      orderBy: [{ date_affectation: "desc" }, { date_creation: "desc" }],
    });
    return records.map((record) => ({
      id: record.id_affectation_professeur.toString(),
      teacher: `${record.professeurs.nom} ${record.professeurs.prenom}`,
      course: record.cours_classes.cours.libelle,
      className: record.cours_classes.classes.libelle,
      startDate: record.date_affectation,
      endDate: record.date_fin,
      reason: record.motif_remplacement,
      isActive: record.statut === "ACTIF",
    }));
  }

  async replaceCourseTeacher(id: string, dto: ReplaceCourseTeacherDto, schoolId: string) {
    const id_affectation_professeur = toBigInt(id);
    const id_ecole = toBigInt(schoolId);
    const effectiveDate = new Date(`${dto.effectiveDate}T00:00:00.000Z`);
    const [current, replacement] = await Promise.all([
      this.prisma.affectations_professeurs.findFirst({
        where: {
          id_affectation_professeur,
          statut: "ACTIF",
          cours_classes: { classes: { id_ecole } },
        },
        include: { annees_scolaires: true },
      }),
      this.prisma.professeurs.findFirst({
        where: { id_professeur: toBigInt(dto.teacherId), id_ecole, statut: "ACTIF" },
      }),
    ]);
    if (!current) throw new NotFoundException("Attribution active introuvable.");
    if (!replacement) throw new BadRequestException("Le nouveau professeur est invalide.");
    if (current.id_professeur === replacement.id_professeur) {
      throw new BadRequestException("Choisissez un professeur différent.");
    }
    if (effectiveDate < current.date_affectation) {
      throw new BadRequestException("La date de remplacement précède le début de l’affectation.");
    }
    if (effectiveDate > current.annees_scolaires.date_fin) {
      throw new BadRequestException("La date de remplacement dépasse la fin de l’année scolaire.");
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.affectations_professeurs.update({
        where: { id_affectation_professeur },
        data: {
          statut: "INACTIF",
          date_fin: effectiveDate,
          motif_remplacement: clean(dto.reason),
        },
      });
      const created = await tx.affectations_professeurs.create({
        data: {
          id_professeur: replacement.id_professeur,
          id_cours_classe: current.id_cours_classe,
          id_annee_scolaire: current.id_annee_scolaire,
          date_affectation: effectiveDate,
          statut: "ACTIF",
        },
      });
      return { id: created.id_affectation_professeur.toString(), replaced: true };
    });
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
    const existingCourseClass = await this.prisma.cours_classes.findUnique({
      where: {
        id_cours_id_classe_id_annee_scolaire: {
          id_cours,
          id_classe,
          id_annee_scolaire: schoolYear.id_annee_scolaire,
        },
      },
      include: {
        affectations_professeurs: {
          where: { statut: "ACTIF" },
          include: { professeurs: true },
          take: 1,
        },
      },
    });
    const existingAssignment =
      existingCourseClass?.affectations_professeurs[0];
    if (existingAssignment) {
      throw new ConflictException(
        `${course.libelle} est déjà attribué à ${existingAssignment.professeurs.nom} ${existingAssignment.professeurs.prenom} dans la classe ${schoolClass.libelle}.`,
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
        const assignment = await prisma.affectations_professeurs.create({
          data: {
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

  async updateCourseAssignment(
    id: string,
    dto: CreateCourseAssignmentDto,
    schoolId: string,
  ) {
    const id_affectation_professeur = toBigInt(id);
    const id_ecole = toBigInt(schoolId);
    const id_classe = toBigInt(dto.classId);
    const id_cours = toBigInt(dto.courseId);
    const id_professeur = toBigInt(dto.teacherId);
    const current = await this.prisma.affectations_professeurs.findFirst({
      where: {
        id_affectation_professeur,
        cours_classes: { classes: { id_ecole } },
      },
      include: { cours_classes: { include: { cotes: { take: 1 } } } },
    });
    if (!current) throw new NotFoundException("Attribution introuvable.");
    const [schoolClass, course, teacher] = await Promise.all([
      this.prisma.classes.findFirst({ where: { id_classe, id_ecole, statut: "ACTIF" } }),
      this.prisma.cours.findFirst({ where: { id_cours, id_ecole, statut: "ACTIF" } }),
      this.prisma.professeurs.findFirst({ where: { id_professeur, id_ecole, statut: "ACTIF" } }),
    ]);
    if (!schoolClass || !course || !teacher) {
      throw new BadRequestException("Classe, cours ou professeur invalide.");
    }
    const changingCourseClass =
      current.cours_classes.id_cours !== id_cours ||
      current.cours_classes.id_classe !== id_classe;
    if (changingCourseClass && current.cours_classes.cotes.length > 0) {
      throw new ConflictException(
        "Cette attribution contient déjà des notes. Le cours ou la classe ne peut plus être changé.",
      );
    }
    const duplicate = await this.prisma.cours_classes.findUnique({
      where: {
        id_cours_id_classe_id_annee_scolaire: {
          id_cours,
          id_classe,
          id_annee_scolaire: current.id_annee_scolaire,
        },
      },
      include: {
        affectations_professeurs: {
          where: {
            statut: "ACTIF",
            id_affectation_professeur: { not: id_affectation_professeur },
          },
          take: 1,
        },
      },
    });
    if (duplicate?.affectations_professeurs.length) {
      throw new ConflictException(
        "Ce cours possède déjà un professeur dans cette classe.",
      );
    }
    return this.prisma.$transaction(async (prisma) => {
      const courseClass = await prisma.cours_classes.upsert({
        where: {
          id_cours_id_classe_id_annee_scolaire: {
            id_cours,
            id_classe,
            id_annee_scolaire: current.id_annee_scolaire,
          },
        },
        update: { ponderation: dto.weight, statut: "ACTIF" },
        create: {
          id_cours,
          id_classe,
          id_annee_scolaire: current.id_annee_scolaire,
          ponderation: dto.weight,
        },
      });
      await prisma.affectations_professeurs.update({
        where: { id_affectation_professeur },
        data: {
          id_professeur,
          id_cours_classe: courseClass.id_cours_classe,
        },
      });
      return { id: id_affectation_professeur.toString() };
    });
  }

  async listHomeroomAssignments(schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const schoolYear = await this.prisma.annees_scolaires.findFirst({
      where: { id_ecole, est_active: true },
      orderBy: { date_debut: "desc" },
    });
    if (!schoolYear) return [];
    const assignments = await this.prisma.titulaires.findMany({
      where: {
        id_annee_scolaire: schoolYear.id_annee_scolaire,
        statut_compte: "ACTIF",
        classes: { id_ecole },
      },
      include: { classes: true, professeurs: true },
      orderBy: { classes: { libelle: "asc" } },
    });
    return assignments.map((item) => ({
      id: item.id_titulaire.toString(),
      classId: item.id_classe.toString(),
      teacherId: item.id_professeur.toString(),
      className: item.classes.libelle,
      teacher: `${item.professeurs.nom} ${item.professeurs.prenom}`,
      loginCode: item.code_connexion,
    }));
  }

  private async homeroomContext(
    dto: CreateHomeroomAssignmentDto,
    schoolId: string,
  ) {
    const id_ecole = toBigInt(schoolId);
    const id_classe = toBigInt(dto.classId);
    const id_professeur = toBigInt(dto.teacherId);
    const [schoolClass, teacher, schoolYear, existingDirector, school] = await Promise.all([
      this.prisma.classes.findFirst({ where: { id_classe, id_ecole, statut: "ACTIF" } }),
      this.prisma.professeurs.findFirst({ where: { id_professeur, id_ecole, statut: "ACTIF" } }),
      this.prisma.annees_scolaires.findFirst({
        where: { id_ecole, est_active: true },
        orderBy: { date_debut: "desc" },
      }),
      this.prisma.directeurs.findFirst({
        where: { id_ecole, statut_compte: "ACTIF" },
        orderBy: { date_creation: "asc" },
      }),
      this.prisma.ecoles.findUnique({ where: { id_ecole } }),
    ]);
    if (!schoolClass || !teacher) {
      throw new BadRequestException("Classe ou professeur invalide.");
    }
    if (!schoolYear) {
      throw new BadRequestException("Aucune année scolaire active.");
    }
    if (!school) throw new NotFoundException("École introuvable.");
    const director =
      existingDirector ??
      (await this.prisma.directeurs.create({
        data: {
          id_ecole,
          nom: "DIRECTION",
          prenom: school.nom_ecole.slice(0, 100),
          code_connexion: `SYS-${school.code_ecole}`.slice(0, 50),
          mot_de_passe_hash: await bcrypt.hash(generateSchoolPassword(), 12),
          doit_changer_mot_de_passe: false,
        },
      }));
    return { id_ecole, id_classe, id_professeur, schoolYear, director };
  }

  async createHomeroomAssignment(
    dto: CreateHomeroomAssignmentDto,
    schoolId: string,
  ) {
    const context = await this.homeroomContext(dto, schoolId);
    const existing = await this.prisma.titulaires.findFirst({
      where: {
        id_annee_scolaire: context.schoolYear.id_annee_scolaire,
        statut_compte: "ACTIF",
        OR: [
          { id_classe: context.id_classe },
          { id_professeur: context.id_professeur },
        ],
      },
      include: { classes: true, professeurs: true },
    });
    if (existing?.id_classe === context.id_classe) {
      throw new ConflictException(
        `${existing.classes.libelle} possède déjà un titulaire.`,
      );
    }
    if (existing) {
      throw new ConflictException(
        `${existing.professeurs.nom} ${existing.professeurs.prenom} est déjà titulaire d’une classe.`,
      );
    }
    let code = generateHomeroomCode();
    while (await this.prisma.titulaires.findUnique({ where: { code_connexion: code } })) {
      code = generateHomeroomCode();
    }
    const temporaryPassword = generateHomeroomPassword();
    const assignment = await this.prisma.titulaires.create({
      data: {
        id_professeur: context.id_professeur,
        id_classe: context.id_classe,
        id_annee_scolaire: context.schoolYear.id_annee_scolaire,
        id_directeur_createur: context.director.id_directeur,
        code_connexion: code,
        mot_de_passe_hash: await bcrypt.hash(temporaryPassword, 12),
      },
    });
    return {
      id: assignment.id_titulaire.toString(),
      loginCode: code,
      temporaryPassword,
    };
  }

  async updateHomeroomAssignment(
    id: string,
    dto: CreateHomeroomAssignmentDto,
    schoolId: string,
  ) {
    const context = await this.homeroomContext(dto, schoolId);
    const id_titulaire = toBigInt(id);
    const current = await this.prisma.titulaires.findFirst({
      where: { id_titulaire, classes: { id_ecole: context.id_ecole } },
    });
    if (!current) throw new NotFoundException("Affectation titulaire introuvable.");
    const conflict = await this.prisma.titulaires.findFirst({
      where: {
        id_titulaire: { not: id_titulaire },
        id_annee_scolaire: context.schoolYear.id_annee_scolaire,
        statut_compte: "ACTIF",
        OR: [
          { id_classe: context.id_classe },
          { id_professeur: context.id_professeur },
        ],
      },
    });
    if (conflict) {
      throw new ConflictException(
        "Cette classe ou ce professeur possède déjà une affectation titulaire.",
      );
    }
    const updated = await this.prisma.titulaires.update({
      where: { id_titulaire },
      data: {
        id_classe: context.id_classe,
        id_professeur: context.id_professeur,
        date_mise_a_jour: new Date(),
      },
    });
    return { id: updated.id_titulaire.toString() };
  }

  async resetHomeroomPassword(id: string, schoolId: string, password: string) {
    const id_titulaire = toBigInt(id);
    const assignment = await this.prisma.titulaires.findFirst({
      where: {
        id_titulaire,
        classes: { id_ecole: toBigInt(schoolId) },
        statut_compte: "ACTIF",
      },
    });
    if (!assignment) {
      throw new NotFoundException("Affectation titulaire introuvable.");
    }
    await this.prisma.titulaires.update({
      where: { id_titulaire },
      data: {
        mot_de_passe_hash: await bcrypt.hash(password, 12),
        doit_changer_mot_de_passe: false,
        date_mise_a_jour: new Date(),
      },
    });
    return { updated: true, loginCode: assignment.code_connexion };
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

    if (!dto.schoolYearId) {
      throw new BadRequestException("L’année scolaire en cours est obligatoire.");
    }
    const activeSchoolYear = await this.prisma.annees_scolaires.findFirst({
      where: {
        id_annee_scolaire: toBigInt(dto.schoolYearId),
        id_ecole,
        est_active: true,
        statut: "EN_COURS",
      },
    });
    if (!activeSchoolYear) {
      throw new BadRequestException(
        "Sélectionnez l’année scolaire actuellement active.",
      );
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

  async listSchoolYears(schoolId: string) {
    const years = await this.prisma.annees_scolaires.findMany({
      where: { id_ecole: toBigInt(schoolId) },
      include: {
        periodes: { orderBy: { numero: "asc" } },
        _count: {
          select: {
            inscriptions: true,
            cours_classes: true,
            titulaires: true,
            periodes: true,
          },
        },
      },
      orderBy: { date_debut: "desc" },
    });
    return years.map((year) => ({
      id: year.id_annee_scolaire.toString(),
      label: year.libelle,
      startDate: year.date_debut.toISOString(),
      endDate: year.date_fin.toISOString(),
      isActive: year.est_active,
      status: year.statut,
      students: year._count.inscriptions,
      courses: year._count.cours_classes,
      homerooms: year._count.titulaires,
      periods: year._count.periodes,
      periodItems: year.periodes.map((period) => ({
        id: period.id_periode.toString(),
        name: period.libelle,
        number: period.numero,
        isOpen: period.est_ouverte,
      })),
    }));
  }

  async createSchoolYear(dto: CreateSchoolYearDto, schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException("La date de fin doit suivre la date de début.");
    }
    try {
      return await this.prisma.$transaction(async (prisma) => {
        if (dto.isActive) {
          await prisma.periodes.updateMany({
            where: {
              annees_scolaires: { id_ecole, est_active: true },
            },
            data: { est_ouverte: false },
          });
          await prisma.annees_scolaires.updateMany({
            where: { id_ecole, est_active: true },
            data: { est_active: false, statut: "CLOTUREE" },
          });
        }
        const year = await prisma.annees_scolaires.create({
          data: {
            id_ecole,
            libelle: dto.label.trim(),
            date_debut: startDate,
            date_fin: endDate,
            est_active: dto.isActive ?? false,
            statut: dto.isActive ? "EN_COURS" : "PLANIFIEE",
          },
        });
        await Promise.all(
          ACADEMIC_PERIODS.map((label, index) =>
            prisma.periodes.create({
              data: {
                id_annee_scolaire: year.id_annee_scolaire,
                libelle: label,
                numero: index + 1,
                est_ouverte: Boolean(dto.isActive && index === 0),
              },
            }),
          ),
        );
        return { id: year.id_annee_scolaire.toString() };
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async activateSchoolYear(id: string, schoolId: string) {
    const id_annee_scolaire = toBigInt(id);
    const id_ecole = toBigInt(schoolId);
    const year = await this.prisma.annees_scolaires.findFirst({
      where: { id_annee_scolaire, id_ecole },
    });
    if (!year) throw new NotFoundException("Année scolaire introuvable.");
    await this.prisma.$transaction([
      this.prisma.periodes.updateMany({
        where: {
          annees_scolaires: {
            id_ecole,
            est_active: true,
            NOT: { id_annee_scolaire },
          },
        },
        data: { est_ouverte: false },
      }),
      this.prisma.annees_scolaires.updateMany({
        where: { id_ecole, est_active: true, NOT: { id_annee_scolaire } },
        data: { est_active: false, statut: "CLOTUREE" },
      }),
      this.prisma.annees_scolaires.update({
        where: { id_annee_scolaire },
        data: { est_active: true, statut: "EN_COURS", date_mise_a_jour: new Date() },
      }),
      this.prisma.periodes.updateMany({
        where: { id_annee_scolaire },
        data: { est_ouverte: false },
      }),
      this.prisma.periodes.updateMany({
        where: { id_annee_scolaire, numero: 1 },
        data: { est_ouverte: true },
      }),
    ]);
    return { activated: true };
  }

  async closeSchoolYear(id: string, schoolId: string) {
    const id_annee_scolaire = toBigInt(id);
    const year = await this.prisma.annees_scolaires.findFirst({
      where: { id_annee_scolaire, id_ecole: toBigInt(schoolId) },
    });
    if (!year) throw new NotFoundException("Année scolaire introuvable.");
    await this.prisma.$transaction([
      this.prisma.annees_scolaires.update({
        where: { id_annee_scolaire },
        data: { est_active: false, statut: "CLOTUREE", date_mise_a_jour: new Date() },
      }),
      this.prisma.periodes.updateMany({
        where: { id_annee_scolaire },
        data: { est_ouverte: false },
      }),
    ]);
    return { closed: true };
  }

  async updateSchoolYear(id: string, schoolId: string, dto: UpdateSchoolYearDto) {
    const id_annee_scolaire = toBigInt(id);
    const year = await this.prisma.annees_scolaires.findFirst({
      where: { id_annee_scolaire, id_ecole: toBigInt(schoolId) },
    });
    if (!year) throw new NotFoundException("Année scolaire introuvable.");
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException("La date de fin doit suivre la date de début.");
    }
    try {
      await this.prisma.annees_scolaires.update({
        where: { id_annee_scolaire },
        data: {
          libelle: dto.label.trim(),
          date_debut: startDate,
          date_fin: endDate,
          date_mise_a_jour: new Date(),
        },
      });
      return { updated: true };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async deleteSchoolYear(id: string, schoolId: string, requesterId: string) {
    const id_annee_scolaire = toBigInt(id);
    const year = await this.prisma.annees_scolaires.findFirst({
      where: { id_annee_scolaire, id_ecole: toBigInt(schoolId) },
      include: {
        _count: {
          select: {
            inscriptions: true,
            cours_classes: true,
            titulaires: true,
            affectations_professeurs: true,
            affectations_directeurs: true,
          },
        },
      },
    });
    if (!year) throw new NotFoundException("Année scolaire introuvable.");
    if (year.est_active) {
      throw new BadRequestException("L’année active ne peut pas être supprimée.");
    }
    const summary = {
      inscriptions: year._count.inscriptions,
      cours: year._count.cours_classes,
      titulaires: year._count.titulaires,
      affectations: year._count.affectations_professeurs,
      directions: year._count.affectations_directeurs,
    };
    if (Object.values(summary).some((count) => count > 0)) {
      const request = await this.createDeletionRequest(
        "SCHOOL_YEAR",
        id,
        year.libelle,
        schoolId,
        requesterId,
        summary,
      );
      return { deleted: false, requested: true, requestId: request.id };
    }
    await this.prisma.$transaction([
      this.prisma.periodes.deleteMany({ where: { id_annee_scolaire } }),
      this.prisma.annees_scolaires.delete({ where: { id_annee_scolaire } }),
    ]);
    return { deleted: true, requested: false };
  }

  private async createDeletionRequest(
    entityType: "CLASS" | "SCHOOL_YEAR",
    entityId: string,
    entityLabel: string,
    schoolId: string,
    requesterId: string,
    dataSummary: Record<string, number>,
  ) {
    const existing = await this.prisma.deletionRequest.findFirst({
      where: { entityType, entityId, status: "PENDING" },
    });
    if (existing) return existing;
    return this.prisma.deletionRequest.create({
      data: {
        entityType,
        entityId,
        entityLabel,
        schoolId,
        requestedBy: requesterId,
        dataSummary,
      },
    });
  }

  async listDeletionRequests() {
    const requests = await this.prisma.deletionRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
    const schoolIds = [...new Set(requests.map((request) => request.schoolId))];
    const schools = await this.prisma.ecoles.findMany({
      where: { id_ecole: { in: schoolIds.map(toBigInt) } },
      select: { id_ecole: true, nom_ecole: true },
    });
    const schoolNames = new Map(schools.map((school) => [school.id_ecole.toString(), school.nom_ecole]));
    return requests.map((request) => ({
      ...request,
      schoolName: schoolNames.get(request.schoolId) ?? "École inconnue",
    }));
  }

  async reviewDeletionRequest(
    id: string,
    reviewerId: string,
    approved: boolean,
    comment?: string,
  ) {
    const request = await this.prisma.deletionRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException("Demande de suppression introuvable.");
    if (request.status !== "PENDING") {
      throw new BadRequestException("Cette demande a déjà été traitée.");
    }

    if (!approved) {
      await this.prisma.deletionRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewComment: clean(comment),
        },
      });
      return { rejected: true };
    }

    await this.prisma.$transaction(async (tx) => {
      if (request.entityType === "CLASS") {
        const classId = toBigInt(request.entityId);
        const exists = await tx.classes.findUnique({ where: { id_classe: classId } });
        if (exists) {
          await tx.cotes.deleteMany({
            where: { OR: [{ inscriptions: { id_classe: classId } }, { cours_classes: { id_classe: classId } }] },
          });
          await tx.resultats.deleteMany({ where: { inscriptions: { id_classe: classId } } });
          await tx.affectations_professeurs.deleteMany({ where: { cours_classes: { id_classe: classId } } });
          await tx.titulaires.deleteMany({ where: { id_classe: classId } });
          await tx.cours_classes.deleteMany({ where: { id_classe: classId } });
          await tx.inscriptions.deleteMany({ where: { id_classe: classId } });
          await tx.classes.delete({ where: { id_classe: classId } });
        }
      } else if (request.entityType === "SCHOOL_YEAR") {
        const yearId = toBigInt(request.entityId);
        const exists = await tx.annees_scolaires.findUnique({ where: { id_annee_scolaire: yearId } });
        if (exists) {
          await tx.cotes.deleteMany({ where: { periodes: { id_annee_scolaire: yearId } } });
          await tx.resultats.deleteMany({ where: { periodes: { id_annee_scolaire: yearId } } });
          await tx.affectations_professeurs.deleteMany({ where: { id_annee_scolaire: yearId } });
          await tx.affectations_directeurs.deleteMany({ where: { id_annee_scolaire: yearId } });
          await tx.titulaires.deleteMany({ where: { id_annee_scolaire: yearId } });
          await tx.cours_classes.deleteMany({ where: { id_annee_scolaire: yearId } });
          await tx.inscriptions.deleteMany({ where: { id_annee_scolaire: yearId } });
          await tx.periodes.deleteMany({ where: { id_annee_scolaire: yearId } });
          await tx.annees_scolaires.delete({ where: { id_annee_scolaire: yearId } });
        }
      } else {
        throw new BadRequestException("Type de suppression non pris en charge.");
      }

      await tx.deletionRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewComment: clean(comment),
        },
      });
    });
    return { approved: true, deleted: true };
  }

  async toggleSchoolPeriod(
    yearId: string,
    periodId: string,
    schoolId: string,
    isOpen: boolean,
  ) {
    const id_annee_scolaire = toBigInt(yearId);
    const id_periode = toBigInt(periodId);
    const year = await this.prisma.annees_scolaires.findFirst({
      where: {
        id_annee_scolaire,
        id_ecole: toBigInt(schoolId),
      },
    });
    if (!year) throw new NotFoundException("Année scolaire introuvable.");
    const period = await this.prisma.periodes.findFirst({
      where: { id_periode, id_annee_scolaire, statut: "ACTIF" },
    });
    if (!period) throw new NotFoundException("Période scolaire introuvable.");
    if (isOpen && !year.est_active) {
      throw new BadRequestException(
        "Activez d’abord cette année scolaire avant d’ouvrir une période.",
      );
    }
    await this.prisma.periodes.update({
      where: { id_periode },
      data: { est_ouverte: isOpen, date_mise_a_jour: new Date() },
    });
    return { updated: true };
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
