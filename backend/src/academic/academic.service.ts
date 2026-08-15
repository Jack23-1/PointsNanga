import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { randomInt } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { filter, map, merge, Subject, timer } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";
import { handlePrismaError } from "../common/prisma-errors";
import { generateStudentMatricule } from "../students/student-matricule";
import {
  AssignStudentDto,
  BulkToggleResultVisibilityDto,
  BulkCreateClassesDto,
  BulkCreateCoursesDto,
  BulkCreateTeachersDto,
  CreateClassDto,
  CreateCourseAssignmentDto,
  CopyCourseAssignmentsDto,
  CreateHomeroomAssignmentDto,
  CreateCourseDto,
  CreateOptionDto,
  CreateSchoolDto,
  CreateSchoolYearDto,
  CreateStudentDto,
  CreateTeacherDto,
  SaveHomeroomGradesDto,
  ReplaceCourseTeacherDto,
  ReenrollStudentsDto,
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
const STUDENT_RESULT_PERIODS = {
  P1: 1,
  P2: 2,
  S1: 3,
  P3: 4,
  P4: 5,
  S2: 6,
} as const;
const RESULT_APPRECIATIONS = new Set([
  "bonne",
  "mauvaise",
  "mediocre",
  "excellente",
]);
const roundToTwoDecimals = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
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
const HOMEROOM_CODE_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const generateHomeroomCode = () =>
  `TIT-${Array.from(
    { length: 6 },
    () =>
      HOMEROOM_CODE_CHARACTERS[
        randomInt(HOMEROOM_CODE_CHARACTERS.length)
      ],
  ).join("")}`;
const generateTeacherCode = () =>
  `ENS-${Array.from(
    { length: 6 },
    () => HOMEROOM_CODE_CHARACTERS[randomInt(HOMEROOM_CODE_CHARACTERS.length)],
  ).join("")}`;
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
  private readonly gradeSubmissionEvents$ = new Subject<{
    schoolId: string;
    titularId: string;
    submissionId: string;
    action: "submitted" | "approved" | "reopened" | "rejected" | "teacher_submitted" | "teacher_revision" | "teacher_revision_accepted";
    comment?: string;
    assignmentId?: string;
    periodId?: string;
    courseName?: string;
  }>();

  constructor(private readonly prisma: PrismaService) {}

  private async buildUniqueClassCode(
    id_ecole: bigint,
    label: string,
    reservedCodes = new Set<string>(),
  ) {
    const baseCode = classCodeBase(label);
    let code = baseCode;
    let suffix = 1;
    while (
      reservedCodes.has(code) ||
      (await this.prisma.classes.findUnique({
        where: { id_ecole_code_classe: { id_ecole, code_classe: code } },
        select: { id_classe: true },
      }))
    ) {
      suffix += 1;
      code = `${baseCode.slice(0, 25)}-${suffix}`;
    }
    reservedCodes.add(code);
    return code;
  }

  private async buildUniqueCourseCode(
    id_ecole: bigint,
    label: string,
    reservedCodes = new Set<string>(),
  ) {
    const baseCode = classCodeBase(label);
    let code = baseCode;
    let suffix = 1;
    while (
      reservedCodes.has(code) ||
      (await this.prisma.cours.findUnique({
        where: { id_ecole_code_cours: { id_ecole, code_cours: code } },
        select: { id_cours: true },
      }))
    ) {
      suffix += 1;
      code = `${baseCode.slice(0, 25)}-${suffix}`;
    }
    reservedCodes.add(code);
    return code;
  }

  streamGradeSubmissionEvents(schoolId: string) {
    return merge(
      this.gradeSubmissionEvents$.pipe(
        filter((event) => event.schoolId === schoolId),
        map((event) => ({ data: event })),
      ),
      timer(0, 25000).pipe(
        map(() => ({ data: { action: "heartbeat" } })),
      ),
    );
  }

  streamHomeroomGradeSubmissionEvents(titularId: string) {
    return merge(
      this.gradeSubmissionEvents$.pipe(
        filter((event) => event.titularId === titularId),
        map((event) => ({ data: event })),
      ),
      timer(0, 25000).pipe(
        map(() => ({ data: { action: "heartbeat" } })),
      ),
    );
  }

  async getAdminGradeSummary() {
    const [totalStudents, activeStudents, totalGrades] = await Promise.all([
      this.prisma.eleves.count(),
      this.prisma.eleves.count({ where: { statut: "ACTIF" } }),
      this.prisma.cotes.count(),
    ]);
    return { totalStudents, activeStudents, totalGrades };
  }

  async getAdminGradeStudents() {
    const students = await this.prisma.eleves.findMany({
      include: {
        ecoles: { select: { nom_ecole: true } },
        inscriptions: {
          include: {
            classes: { select: { id_classe: true, libelle: true } },
            annees_scolaires: {
              include: { periodes: { where: { statut: "ACTIF" }, orderBy: { numero: "asc" } } },
            },
            cotes: { select: { id_periode: true } },
            resultats: { select: { id_periode: true, statut: true } },
          },
          orderBy: { date_inscription: "desc" },
          take: 1,
        },
      },
      orderBy: [{ nom: "asc" }, { postnom: "asc" }, { prenom: "asc" }],
    });
    return students.map((student) => {
      const enrollment = student.inscriptions[0];
      const gradedPeriodIds = new Set(
        enrollment?.cotes.map((grade) => grade.id_periode.toString()) ?? [],
      );
      const publishedPeriodIds = new Set(
        enrollment?.resultats
          .filter((result) => result.statut === "PUBLIE" || result.statut === "VERROUILLE")
          .map((result) => result.id_periode.toString()) ?? [],
      );
      const periods = (enrollment?.annees_scolaires.periodes ?? []).map((period) => ({
        id: period.id_periode.toString(),
        name: period.libelle,
        isOpen: period.est_ouverte,
      }));
      const periodStatuses = Object.fromEntries(
        (enrollment?.annees_scolaires.periodes ?? []).map((period) => [
          period.id_periode.toString(),
          publishedPeriodIds.has(period.id_periode.toString()),
        ]),
      );
      return {
        id: student.id_eleve.toString(),
        schoolId: student.id_ecole.toString(),
        classId: enrollment?.id_classe.toString() ?? null,
        enrollmentId: enrollment?.id_inscription.toString() ?? null,
        matricule: student.matricule,
        lastName: student.nom,
        postName: student.postnom ?? "",
        firstName: student.prenom,
        school: student.ecoles.nom_ecole,
        className: enrollment?.classes.libelle ?? "Non affecté",
        periods,
        periodStatuses,
        hasGrades: gradedPeriodIds.size > 0,
      };
    });
  }

  async setStudentResultVisibility(enrollmentId: string, periodId: string, isVisible: boolean) {
    const id_inscription = toBigInt(enrollmentId);
    const id_periode = toBigInt(periodId);
    const enrollment = await this.prisma.inscriptions.findFirst({
      where: {
        id_inscription,
        annees_scolaires: { periodes: { some: { id_periode } } },
      },
      select: { id_annee_scolaire: true },
    });
    if (!enrollment) {
      throw new BadRequestException("L’élève et la période ne correspondent pas à la même année scolaire.");
    }
    const period = await this.prisma.periodes.findFirst({
      where: {
        id_periode,
        id_annee_scolaire: enrollment.id_annee_scolaire,
        statut: "ACTIF",
      },
      select: { est_ouverte: true },
    });
    if (!period) {
      throw new BadRequestException("Période scolaire introuvable.");
    }
    if (isVisible && !period.est_ouverte) {
      throw new BadRequestException(
        "Cette période est fermée. Ouvrez-la avant de rendre les résultats disponibles.",
      );
    }
    await this.prisma.resultats.upsert({
      where: { id_inscription_id_periode: { id_inscription, id_periode } },
      update: {
        statut: isVisible ? "PUBLIE" : "BROUILLON",
        date_publication: isVisible ? new Date() : null,
        date_mise_a_jour: new Date(),
      },
      create: {
        id_inscription,
        id_periode,
        statut: isVisible ? "PUBLIE" : "BROUILLON",
        date_publication: isVisible ? new Date() : null,
      },
    });
    return { isVisible };
  }

  async setBulkResultVisibility(
    periodId: string,
    dto: BulkToggleResultVisibilityDto,
  ) {
    if (!dto.schoolId && !dto.classId) {
      throw new BadRequestException(
        "Sélectionnez une école ou une classe avant l’action groupée.",
      );
    }

    const id_periode = toBigInt(periodId);
    const period = await this.prisma.periodes.findFirst({
      where: { id_periode, statut: "ACTIF" },
      select: { id_annee_scolaire: true, est_ouverte: true },
    });
    if (!period) {
      throw new BadRequestException("Période scolaire introuvable.");
    }
    if (dto.isVisible && !period.est_ouverte) {
      throw new BadRequestException(
        "Cette période est fermée. Ouvrez-la avant de rendre les résultats disponibles.",
      );
    }

    const id_ecole = dto.schoolId ? toBigInt(dto.schoolId) : undefined;
    const id_classe = dto.classId ? toBigInt(dto.classId) : undefined;
    const enrollments = await this.prisma.inscriptions.findMany({
      where: {
        id_annee_scolaire: period.id_annee_scolaire,
        statut: "INSCRIT",
        ...(id_classe ? { id_classe } : {}),
        eleves: {
          statut: "ACTIF",
          ...(id_ecole ? { id_ecole } : {}),
        },
      },
      select: { id_inscription: true },
    });

    const enrollmentIds = enrollments.map((item) => item.id_inscription);
    if (enrollmentIds.length === 0) {
      return { isVisible: dto.isVisible, affectedCount: 0 };
    }

    const publishedAt = dto.isVisible ? new Date() : null;
    const existingResults = await this.prisma.resultats.findMany({
      where: {
        id_periode,
        id_inscription: { in: enrollmentIds },
      },
      select: { id_inscription: true },
    });
    const existingEnrollmentIds = new Set(
      existingResults.map((result) => result.id_inscription.toString()),
    );
    const missingEnrollmentIds = enrollmentIds.filter(
      (id_inscription) => !existingEnrollmentIds.has(id_inscription.toString()),
    );

    await this.prisma.$transaction([
      ...(missingEnrollmentIds.length > 0
        ? [
            this.prisma.resultats.createMany({
              data: missingEnrollmentIds.map((id_inscription) => ({
                id_inscription,
                id_periode,
                statut: dto.isVisible ? "PUBLIE" : "BROUILLON",
                date_publication: publishedAt,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
      this.prisma.resultats.updateMany({
        where: {
          id_periode,
          id_inscription: { in: enrollmentIds },
        },
        data: {
          statut: dto.isVisible ? "PUBLIE" : "BROUILLON",
          date_publication: publishedAt,
          date_mise_a_jour: new Date(),
        },
      }),
    ]);

    return { isVisible: dto.isVisible, affectedCount: enrollmentIds.length };
  }

  async getStudentResult(
    studentId: string,
    schoolId: string,
    requestedPeriodCode: string,
  ) {
    const periodCode = requestedPeriodCode.trim().toUpperCase();
    const periodNumber =
      STUDENT_RESULT_PERIODS[
        periodCode as keyof typeof STUDENT_RESULT_PERIODS
      ];
    if (!periodNumber) {
      throw new BadRequestException(
        "Sélectionnez une période scolaire valide.",
      );
    }

    const id_eleve = toBigInt(studentId);
    const id_ecole = toBigInt(schoolId);
    const student = await this.prisma.eleves.findFirst({
      where: { id_eleve, id_ecole, statut: "ACTIF" },
      include: {
        ecoles: {
          select: {
            nom_ecole: true,
            logo: true,
          },
        },
        inscriptions: {
          where: {
            statut: "INSCRIT",
            classes: { id_ecole },
            annees_scolaires: {
              id_ecole,
              est_active: true,
              statut: "EN_COURS",
            },
          },
          include: {
            classes: { select: { libelle: true } },
            annees_scolaires: { select: { libelle: true } },
          },
          orderBy: { date_inscription: "desc" },
          take: 1,
        },
      },
    });
    if (!student) {
      throw new NotFoundException("Élève actif introuvable.");
    }

    const studentDetails = {
      id: student.id_eleve.toString(),
      matricule: student.matricule,
      fullName: [student.nom, student.postnom, student.prenom]
        .filter(Boolean)
        .join(" "),
      lastName: student.nom,
      postName: student.postnom ?? "",
      firstName: student.prenom,
      photoUrl: student.photo,
      schoolName: student.ecoles.nom_ecole,
      schoolLogoUrl: student.ecoles.logo,
    };
    const enrollment = student.inscriptions[0];
    if (!enrollment) {
      return {
        available: false,
        status: "NO_ACTIVE_ENROLLMENT",
        message:
          "Aucune inscription active n’a été trouvée pour l’année scolaire en cours.",
        student: studentDetails,
      };
    }

    const period = await this.prisma.periodes.findFirst({
      where: {
        id_annee_scolaire: enrollment.id_annee_scolaire,
        numero: periodNumber,
        statut: "ACTIF",
      },
    });
    const context = {
      className: enrollment.classes.libelle,
      schoolYear: enrollment.annees_scolaires.libelle,
    };
    if (!period) {
      return {
        available: false,
        status: "PERIOD_NOT_CONFIGURED",
        message: "Cette période n’est pas configurée pour l’année scolaire en cours.",
        student: studentDetails,
        ...context,
      };
    }
    const periodDetails = {
      id: period.id_periode.toString(),
      code: periodCode,
      name: period.libelle,
      number: period.numero,
      isOpen: period.est_ouverte,
    };

    const titular = await this.prisma.titulaires.findFirst({
      where: {
        id_classe: enrollment.id_classe,
        id_annee_scolaire: enrollment.id_annee_scolaire,
        statut_compte: "ACTIF",
        classes: { id_ecole },
      },
      include: {
        professeurs: {
          select: { nom: true, postnom: true, prenom: true },
        },
      },
    });
    if (!titular) {
      return {
        available: false,
        status: "NO_ACTIVE_HOMEROOM_TEACHER",
        message:
          "Aucun titulaire actif n’est associé à cette classe pour l’année en cours.",
        student: studentDetails,
        ...context,
        period: periodDetails,
      };
    }

    const submission = await this.prisma.gradeSubmission.findUnique({
      where: {
        titularId_periodId: {
          titularId: titular.id_titulaire,
          periodId: period.id_periode,
        },
      },
    });
    if (submission?.status !== "APPROVED") {
      return {
        available: false,
        status: "GRID_NOT_APPROVED",
        message:
          submission?.status === "REOPENED"
            ? "La grille a été rouverte pour correction par le directeur."
            : "La grille de cette période n’a pas encore été approuvée par le directeur.",
        student: studentDetails,
        ...context,
        period: periodDetails,
      };
    }

    const publication = await this.prisma.resultats.findUnique({
      where: {
        id_inscription_id_periode: {
          id_inscription: enrollment.id_inscription,
          id_periode: period.id_periode,
        },
      },
      select: {
        statut: true,
        date_publication: true,
        total_obtenu: true,
        total_ponderation: true,
        pourcentage: true,
        rang: true,
        conduite: true,
        application: true,
      },
    });
    if (!publication || !["PUBLIE", "VERROUILLE"].includes(publication.statut)) {
      return {
        available: false,
        status: "RESULT_NOT_PUBLISHED",
        message:
          "Le super-admin n’a pas encore rendu vos résultats disponibles pour cette période.",
        student: studentDetails,
        ...context,
        period: periodDetails,
      };
    }

    const [courseAssignments, grades] = await Promise.all([
      this.prisma.cours_classes.findMany({
        where: {
          id_classe: enrollment.id_classe,
          id_annee_scolaire: enrollment.id_annee_scolaire,
          statut: "ACTIF",
          cours: { statut: "ACTIF" },
        },
        include: {
          cours: { select: { libelle: true, code_cours: true } },
          affectations_professeurs: {
            where: { statut: "ACTIF" },
            include: {
              professeurs: {
                select: { nom: true, postnom: true, prenom: true },
              },
            },
            orderBy: { date_affectation: "desc" },
            take: 1,
          },
        },
        orderBy: { cours: { libelle: "asc" } },
      }),
      this.prisma.cotes.findMany({
        where: {
          id_inscription: enrollment.id_inscription,
          id_periode: period.id_periode,
          id_titulaire: titular.id_titulaire,
        },
        select: { id_cours_classe: true, cote_obtenue: true },
      }),
    ]);
    const gradeByCourse = new Map(
      grades.map((grade) => [
        grade.id_cours_classe.toString(),
        Number(grade.cote_obtenue),
      ]),
    );
    const missingGrades = courseAssignments.filter(
      (course) => !gradeByCourse.has(course.id_cours_classe.toString()),
    ).length;
    if (!courseAssignments.length || missingGrades > 0) {
      return {
        available: false,
        status: "RESULT_INCOMPLETE",
        message: "Les cotes de cette période sont incomplètes.",
        student: studentDetails,
        ...context,
        period: periodDetails,
      };
    }

    const courses = courseAssignments.map((assignment) => {
      const weight = Number(assignment.ponderation);
      const grade = gradeByCourse.get(assignment.id_cours_classe.toString()) ?? 0;
      return {
        id: assignment.id_cours_classe.toString(),
        name: assignment.cours.libelle,
        code: assignment.cours.code_cours,
        teacherName: assignment.affectations_professeurs[0]
          ? [
              assignment.affectations_professeurs[0].professeurs.nom,
              assignment.affectations_professeurs[0].professeurs.postnom,
              assignment.affectations_professeurs[0].professeurs.prenom,
            ]
              .filter(Boolean)
              .join(" ")
          : "Non renseigné",
        grade,
        weight,
      };
    });
    const storedTotalWeight = Number(publication.total_ponderation);
    if (storedTotalWeight <= 0) {
      return {
        available: false,
        status: "INVALID_TOTAL_WEIGHT",
        message: "La pondération totale de cette grille est invalide.",
        student: studentDetails,
        ...context,
        period: periodDetails,
      };
    }
    const homeroomTeacherName = [
      titular.professeurs.nom,
      titular.professeurs.postnom,
      titular.professeurs.prenom,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      available: true,
      status: "AVAILABLE",
      student: studentDetails,
      ...context,
      period: periodDetails,
      homeroomTeacherName,
      publishedAt: publication.date_publication,
      summary: {
        totalObtained: Number(publication.total_obtenu),
        totalWeight: storedTotalWeight,
        percentage: Number(publication.pourcentage),
        rank: publication.rang,
        conduite: publication.conduite,
        application: publication.application,
      },
      courses,
    };
  }

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
    const [students, courses, grades, results, submission, teacherSubmissions] = await Promise.all([
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
              id_periode: period.id_periode,
              inscriptions: {
                id_classe: homeroom.id_classe,
                id_annee_scolaire: homeroom.id_annee_scolaire,
              },
            },
          }),
      this.prisma.resultats.findMany({
        where: {
          id_periode: period.id_periode,
          inscriptions: {
            id_classe: homeroom.id_classe,
            id_annee_scolaire: homeroom.id_annee_scolaire,
            statut: "INSCRIT",
            eleves: { statut: "ACTIF" },
          },
        },
        select: {
          id_inscription: true,
          total_obtenu: true,
          total_ponderation: true,
          pourcentage: true,
          rang: true,
          conduite: true,
          application: true,
        },
      }),
      this.prisma.gradeSubmission.findUnique({
        where: {
          titularId_periodId: {
            titularId: id_titulaire,
            periodId: period.id_periode,
          },
        },
      }),
      this.prisma.teacherGradeSubmission.findMany({
        where: { titularId: id_titulaire, periodId: period.id_periode, status: { in: ["SUBMITTED", "REVISION_PENDING"] } },
        select: { assignmentId: true, status: true },
      }),
    ]);
    const submittedAssignmentIds = teacherSubmissions.map((item) => item.assignmentId);
    const submittedCourseClasses = submittedAssignmentIds.length
      ? await this.prisma.affectations_professeurs.findMany({
          where: { id_affectation_professeur: { in: submittedAssignmentIds } },
          select: {
            id_affectation_professeur: true,
            id_cours_classe: true,
            cours_classes: { select: { ponderation: true, cours: { select: { libelle: true } } } },
            professeurs: { select: { nom: true, postnom: true, prenom: true } },
          },
        })
      : [];
    const visibleTeacherCourseIds = new Set(submittedCourseClasses.map((item) => item.id_cours_classe.toString()));
    const pendingAssignmentIds = new Set(teacherSubmissions.filter((item) => item.status === "REVISION_PENDING").map((item) => item.assignmentId.toString()));
    const pendingDrafts = pendingAssignmentIds.size
      ? await this.prisma.teacherGradeDraft.findMany({
          where: { assignmentId: { in: [...pendingAssignmentIds].map(toBigInt) }, periodId: period.id_periode },
        })
      : [];
    const studentByEnrollment = new Map(students.map((item) => [item.id_inscription.toString(), item]));
    const currentGradeByEnrollmentAndCourse = new Map(grades.map((item) => [`${item.id_inscription}-${item.id_cours_classe}`, Number(item.cote_obtenue)]));
    const resultByEnrollment = new Map(
      results.map((item) => [item.id_inscription.toString(), item]),
    );
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
      pendingTeacherRevisions: submittedCourseClasses
        .filter((item) => pendingAssignmentIds.has(item.id_affectation_professeur.toString()))
        .map((item) => ({
          assignmentId: item.id_affectation_professeur.toString(),
          periodId: period.id_periode.toString(),
          className: homeroom.classes.libelle,
          courseName: item.cours_classes.cours.libelle,
          weight: Number(item.cours_classes.ponderation),
          teacherName: `${item.professeurs.nom}${item.professeurs.postnom ? ` ${item.professeurs.postnom}` : ""} ${item.professeurs.prenom}`,
          changes: pendingDrafts
            .filter((draft) => draft.assignmentId === item.id_affectation_professeur)
            .map((draft) => {
              const student = studentByEnrollment.get(draft.enrollmentId.toString());
              const oldValue = currentGradeByEnrollmentAndCourse.get(`${draft.enrollmentId}-${item.id_cours_classe}`) ?? null;
              return {
                enrollmentId: draft.enrollmentId.toString(),
                studentName: student ? `${student.eleves.nom}${student.eleves.postnom ? ` ${student.eleves.postnom}` : ""} ${student.eleves.prenom}` : "Élève inconnu",
                matricule: student?.eleves.matricule ?? "—",
                oldValue,
                newValue: Number(draft.value),
              };
            })
            .filter((change) => change.oldValue !== change.newValue),
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
      grades: grades.filter((item) =>
        !item.id_professeur_saisie ||
        item.id_titulaire === id_titulaire ||
        visibleTeacherCourseIds.has(item.id_cours_classe.toString()),
      ).map((item) => ({
        enrollmentId: item.id_inscription.toString(),
        courseClassId: item.id_cours_classe.toString(),
        value: Number(item.cote_obtenue),
      })),
      results: students.map((item) => {
        const result = resultByEnrollment.get(item.id_inscription.toString());
        return {
          enrollmentId: item.id_inscription.toString(),
          totalObtained: result ? Number(result.total_obtenu) : 0,
          totalWeight: result ? Number(result.total_ponderation) : 0,
          percentage: result ? Number(result.pourcentage) : 0,
          rank: result?.rang ?? null,
          conduite: result?.conduite ?? null,
          application: result?.application ?? null,
        };
      }),
      submissionStatus: submission?.status ?? null,
      rejectionComment: submission?.rejectionComment ?? null,
      rejectedAt: submission?.rejectedAt ?? null,
    };
  }

  async getTeacherGradeAssignments(professorId: string) {
    const id_professeur = toBigInt(professorId);
    const professor = await this.prisma.professeurs.findFirst({
      where: { id_professeur, statut: "ACTIF", statut_compte: "ACTIF" },
      select: { id_ecole: true },
    });
    if (!professor) throw new NotFoundException("Compte professeur introuvable.");
    const titular = await this.prisma.titulaires.findFirst({
      where: { id_professeur, statut_compte: "ACTIF", annees_scolaires: { est_active: true, statut: "EN_COURS" } },
      select: { id_classe: true },
    });
    const assignments = await this.prisma.affectations_professeurs.findMany({
      where: {
        id_professeur,
        statut: "ACTIF",
        annees_scolaires: { est_active: true, statut: "EN_COURS" },
        cours_classes: {
          statut: "ACTIF",
          classes: { statut: "ACTIF" },
        },
      },
      include: {
        cours_classes: { include: { cours: true, classes: true } },
        annees_scolaires: { include: { periodes: { where: { statut: "ACTIF" }, orderBy: { numero: "asc" } } } },
      },
      orderBy: [{ cours_classes: { classes: { libelle: "asc" } } }, { cours_classes: { cours: { libelle: "asc" } } }],
    });
    return assignments.map((item) => ({
      id: item.id_affectation_professeur.toString(),
      classId: item.cours_classes.id_classe.toString(),
      className: item.cours_classes.classes.libelle,
      courseClassId: item.id_cours_classe.toString(),
      courseName: item.cours_classes.cours.libelle,
      weight: Number(item.cours_classes.ponderation),
      schoolYear: item.annees_scolaires.libelle,
      isHomeroomClass: Boolean(titular && item.cours_classes.id_classe === titular.id_classe),
      periods: item.annees_scolaires.periodes.map((period) => ({
        id: period.id_periode.toString(),
        name: period.libelle,
        number: period.numero,
        isOpen: period.est_ouverte,
      })),
    }));
  }

  private async teacherAssignmentContext(professorId: string, assignmentId: string) {
    if (!assignmentId) throw new BadRequestException("Sélectionnez une classe et un cours.");
    const assignment = await this.prisma.affectations_professeurs.findFirst({
      where: {
        id_affectation_professeur: toBigInt(assignmentId),
        id_professeur: toBigInt(professorId),
        statut: "ACTIF",
        cours_classes: { statut: "ACTIF" },
      },
      include: {
        professeurs: { include: { ecoles: true } },
        cours_classes: { include: { cours: true, classes: true } },
        annees_scolaires: true,
      },
    });
    if (!assignment) throw new ForbiddenException("Ce cours ne vous est pas attribué.");
    return assignment;
  }

  async getTeacherGradebook(professorId: string, assignmentId: string, selectedPeriodId?: string) {
    const assignment = await this.teacherAssignmentContext(professorId, assignmentId);
    const periods = await this.prisma.periodes.findMany({
      where: { id_annee_scolaire: assignment.id_annee_scolaire, statut: "ACTIF" },
      orderBy: { numero: "asc" },
    });
    const period = selectedPeriodId
      ? periods.find((item) => item.id_periode === toBigInt(selectedPeriodId))
      : periods.find((item) => item.est_ouverte) ?? periods[0];
    if (!period) throw new NotFoundException("Période scolaire introuvable.");
    const titular = await this.prisma.titulaires.findFirst({
      where: { id_classe: assignment.cours_classes.id_classe, id_annee_scolaire: assignment.id_annee_scolaire, statut_compte: "ACTIF" },
      select: { id_titulaire: true },
    });
    const [students, grades, drafts, titularSubmission, teacherSubmission] = await Promise.all([
      this.prisma.inscriptions.findMany({
        where: { id_classe: assignment.cours_classes.id_classe, id_annee_scolaire: assignment.id_annee_scolaire, statut: "INSCRIT", eleves: { statut: "ACTIF" } },
        include: { eleves: true },
        orderBy: [{ numero_ordre: "asc" }, { eleves: { nom: "asc" } }],
      }),
      this.prisma.cotes.findMany({
        where: { id_cours_classe: assignment.id_cours_classe, id_periode: period.id_periode },
      }),
      this.prisma.teacherGradeDraft.findMany({
        where: { assignmentId: assignment.id_affectation_professeur, periodId: period.id_periode },
      }),
      this.prisma.gradeSubmission.findFirst({
        where: { periodId: period.id_periode, ...(titular ? { titularId: titular.id_titulaire } : { titularId: BigInt(-1) }) },
      }),
      this.prisma.teacherGradeSubmission.findUnique({
        where: { assignmentId_periodId: { assignmentId: assignment.id_affectation_professeur, periodId: period.id_periode } },
      }),
    ]);
    return {
      assignmentId: assignment.id_affectation_professeur.toString(),
      schoolName: assignment.professeurs.ecoles.nom_ecole,
      className: assignment.cours_classes.classes.libelle,
      course: { id: assignment.id_cours_classe.toString(), name: assignment.cours_classes.cours.libelle, weight: Number(assignment.cours_classes.ponderation) },
      schoolYear: assignment.annees_scolaires.libelle,
      period: { id: period.id_periode.toString(), name: period.libelle, isOpen: period.est_ouverte },
      periods: periods.map((item) => ({ id: item.id_periode.toString(), name: item.libelle, number: item.numero, isOpen: item.est_ouverte })),
      isLocked: ["SUBMITTED", "APPROVED"].includes(titularSubmission?.status ?? ""),
      submissionStatus: teacherSubmission?.status ?? null,
      students: students.map((item) => ({ id: item.id_inscription.toString(), matricule: item.eleves.matricule, name: `${item.eleves.nom}${item.eleves.postnom ? ` ${item.eleves.postnom}` : ""} ${item.eleves.prenom}`, orderNumber: item.numero_ordre })),
      grades: (drafts.length ? drafts.map((item) => ({ enrollmentId: item.enrollmentId, value: item.value })) : grades.map((item) => ({ enrollmentId: item.id_inscription, value: item.cote_obtenue }))).map((item) => ({ enrollmentId: item.enrollmentId.toString(), value: Number(item.value) })),
    };
  }

  async saveTeacherGrades(professorId: string, assignmentId: string, dto: SaveHomeroomGradesDto) {
    const assignment = await this.teacherAssignmentContext(professorId, assignmentId);
    if (!dto.periodId) throw new BadRequestException("Sélectionnez une période.");
    const period = await this.prisma.periodes.findFirst({
      where: { id_periode: toBigInt(dto.periodId), id_annee_scolaire: assignment.id_annee_scolaire, statut: "ACTIF" },
    });
    if (!period || !period.est_ouverte) throw new BadRequestException("Cette période n’est pas ouverte pour la saisie.");
    const titular = await this.prisma.titulaires.findFirst({
      where: { id_classe: assignment.cours_classes.id_classe, id_annee_scolaire: assignment.id_annee_scolaire, statut_compte: "ACTIF" },
      select: { id_titulaire: true },
    });
    const submission = titular
      ? await this.prisma.gradeSubmission.findUnique({
          where: { titularId_periodId: { titularId: titular.id_titulaire, periodId: period.id_periode } },
        })
      : null;
    if (["SUBMITTED", "APPROVED"].includes(submission?.status ?? "")) {
      throw new ForbiddenException("La grille de cette classe est déjà verrouillée.");
    }
    const enrollments = await this.prisma.inscriptions.findMany({
      where: { id_inscription: { in: dto.grades.map((item) => toBigInt(item.enrollmentId)) }, id_classe: assignment.cours_classes.id_classe, id_annee_scolaire: assignment.id_annee_scolaire, statut: "INSCRIT" },
      select: { id_inscription: true },
    });
    if (enrollments.length !== new Set(dto.grades.map((item) => String(item.enrollmentId))).size) {
      throw new BadRequestException("Un élève ne correspond pas à cette classe.");
    }
    const weight = Number(assignment.cours_classes.ponderation);
    if (dto.grades.some((item) => item.courseClassId !== Number(assignment.id_cours_classe) || item.value < 0 || item.value > weight)) {
      throw new BadRequestException("Une cote est invalide ou dépasse la pondération.");
    }
    const existingDraftCount = await this.prisma.teacherGradeDraft.count({
      where: { assignmentId: assignment.id_affectation_professeur, periodId: period.id_periode },
    });
    if (existingDraftCount === 0) {
      const currentGrades = await this.prisma.cotes.findMany({
        where: { id_cours_classe: assignment.id_cours_classe, id_periode: period.id_periode },
        select: { id_inscription: true, cote_obtenue: true },
      });
      if (currentGrades.length) {
        await this.prisma.teacherGradeDraft.createMany({
          data: currentGrades.map((grade) => ({ assignmentId: assignment.id_affectation_professeur, periodId: period.id_periode, enrollmentId: grade.id_inscription, value: grade.cote_obtenue })),
          skipDuplicates: true,
        });
      }
    }
    await this.prisma.$transaction(dto.grades.map((grade) =>
      this.prisma.teacherGradeDraft.upsert({
        where: { assignmentId_periodId_enrollmentId: { assignmentId: assignment.id_affectation_professeur, periodId: period.id_periode, enrollmentId: toBigInt(grade.enrollmentId) } },
        update: { value: grade.value },
        create: { assignmentId: assignment.id_affectation_professeur, periodId: period.id_periode, enrollmentId: toBigInt(grade.enrollmentId), value: grade.value },
      }),
    ));
    return { saved: dto.grades.length };
  }

  async submitTeacherGrades(professorId: string, assignmentId: string, periodId: string) {
    const assignment = await this.teacherAssignmentContext(professorId, assignmentId);
    if (!periodId) throw new BadRequestException("Sélectionnez une période.");
    const period = await this.prisma.periodes.findFirst({
      where: { id_periode: toBigInt(periodId), id_annee_scolaire: assignment.id_annee_scolaire, statut: "ACTIF", est_ouverte: true },
    });
    if (!period) throw new BadRequestException("Cette période n’est pas ouverte.");
    const titular = await this.prisma.titulaires.findFirst({
      where: { id_classe: assignment.cours_classes.id_classe, id_annee_scolaire: assignment.id_annee_scolaire, statut_compte: "ACTIF" },
      include: { classes: true },
    });
    if (!titular) throw new BadRequestException("Cette classe n’a pas encore de titulaire.");
    const students = await this.prisma.inscriptions.count({
      where: { id_classe: assignment.cours_classes.id_classe, id_annee_scolaire: assignment.id_annee_scolaire, statut: "INSCRIT", eleves: { statut: "ACTIF" } },
    });
    const grades = await this.prisma.teacherGradeDraft.count({
      where: { assignmentId: assignment.id_affectation_professeur, periodId: period.id_periode },
    });
    if (!students || grades !== students) {
      throw new BadRequestException(`Toutes les cotes sont obligatoires avant l’envoi (${grades}/${students} remplies).`);
    }
    const previousSubmission = await this.prisma.teacherGradeSubmission.findUnique({
      where: { assignmentId_periodId: { assignmentId: assignment.id_affectation_professeur, periodId: period.id_periode } },
    });
    const isRevision = Boolean(previousSubmission);
    if (!isRevision) await this.applyTeacherDraftToGradebook(assignment.id_affectation_professeur, period.id_periode, titular.id_titulaire);
    const submission = await this.prisma.teacherGradeSubmission.upsert({
      where: { assignmentId_periodId: { assignmentId: assignment.id_affectation_professeur, periodId: period.id_periode } },
      update: { status: "REVISION_PENDING", professorId: assignment.id_professeur, titularId: titular.id_titulaire, submittedAt: new Date() },
      create: { assignmentId: assignment.id_affectation_professeur, periodId: period.id_periode, professorId: assignment.id_professeur, titularId: titular.id_titulaire },
    });
    this.gradeSubmissionEvents$.next({
      schoolId: assignment.professeurs.id_ecole.toString(), titularId: titular.id_titulaire.toString(), submissionId: submission.id,
      action: isRevision ? "teacher_revision" : "teacher_submitted", assignmentId: assignment.id_affectation_professeur.toString(), periodId: period.id_periode.toString(), courseName: assignment.cours_classes.cours.libelle,
    });
    return { submitted: true, revisionPending: isRevision };
  }

  private async applyTeacherDraftToGradebook(assignmentId: bigint, periodId: bigint, titularId: bigint) {
    const [assignment, drafts] = await Promise.all([
      this.prisma.affectations_professeurs.findUnique({ where: { id_affectation_professeur: assignmentId } }),
      this.prisma.teacherGradeDraft.findMany({ where: { assignmentId, periodId } }),
    ]);
    if (!assignment) throw new NotFoundException("Affectation professeur introuvable.");
    await this.prisma.$transaction(drafts.map((draft) => this.prisma.cotes.upsert({
      where: { id_inscription_id_cours_classe_id_periode: { id_inscription: draft.enrollmentId, id_cours_classe: assignment.id_cours_classe, id_periode: periodId } },
      update: { cote_obtenue: draft.value, id_titulaire: null, id_professeur_saisie: assignment.id_professeur, date_mise_a_jour: new Date() },
      create: { id_inscription: draft.enrollmentId, id_cours_classe: assignment.id_cours_classe, id_periode: periodId, id_professeur_saisie: assignment.id_professeur, cote_obtenue: draft.value },
    })));
  }

  async acceptTeacherGradeRevision(homeroomId: string, assignmentId: string, periodId: string) {
    const id_titulaire = toBigInt(homeroomId);
    const id_assignment = toBigInt(assignmentId);
    const id_period = toBigInt(periodId);
    const submission = await this.prisma.teacherGradeSubmission.findUnique({
      where: { assignmentId_periodId: { assignmentId: id_assignment, periodId: id_period } },
    });
    if (!submission || submission.titularId !== id_titulaire || submission.status !== "REVISION_PENDING") {
      throw new BadRequestException("Aucune modification de cotes n’attend votre acceptation.");
    }
    await this.applyTeacherDraftToGradebook(id_assignment, id_period, id_titulaire);
    await this.prisma.teacherGradeSubmission.update({ where: { id: submission.id }, data: { status: "SUBMITTED" } });
    return { accepted: true };
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
        statut: "ACTIF",
      },
    });
    if (!period) throw new BadRequestException("Période scolaire introuvable.");
    const lockedSubmission = await this.prisma.gradeSubmission.findUnique({
      where: {
        titularId_periodId: {
          titularId: id_titulaire,
          periodId: period.id_periode,
        },
      },
    });
    if (["SUBMITTED", "APPROVED"].includes(lockedSubmission?.status ?? "")) {
      throw new ForbiddenException(
        "Les cotes ont déjà été validées. Seul le directeur peut autoriser une modification.",
      );
    }
    if (
      !period.est_ouverte &&
      !["REOPENED", "REJECTED"].includes(lockedSubmission?.status ?? "")
    ) {
      throw new BadRequestException("Cette période n’est pas ouverte pour la saisie.");
    }
    const appreciations = dto.appreciations ?? [];
    for (const appreciation of appreciations) {
      if (
        appreciation.conduite &&
        !RESULT_APPRECIATIONS.has(appreciation.conduite)
      ) {
        throw new BadRequestException("La conduite sélectionnée est invalide.");
      }
      if (
        appreciation.application &&
        !RESULT_APPRECIATIONS.has(appreciation.application)
      ) {
        throw new BadRequestException("L’application sélectionnée est invalide.");
      }
    }
    const enrollmentIds = [
      ...new Set([
        ...dto.grades.map((item) => item.enrollmentId),
        ...appreciations.map((item) => item.enrollmentId),
      ]),
    ];
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
    const appreciationByEnrollment = new Map(
      appreciations.map((item) => [String(item.enrollmentId), item]),
    );
    await this.prisma.$transaction(async (tx) => {
      for (const grade of dto.grades) {
        await tx.cotes.upsert({
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
            id_professeur_saisie: homeroom.id_professeur,
            date_mise_a_jour: new Date(),
          },
          create: {
            id_inscription: toBigInt(grade.enrollmentId),
            id_cours_classe: toBigInt(grade.courseClassId),
            id_periode: period.id_periode,
            id_titulaire,
            id_professeur_saisie: homeroom.id_professeur,
            cote_obtenue: grade.value,
          },
        });
      }

      const [classEnrollments, classCourses, classGrades] = await Promise.all([
        tx.inscriptions.findMany({
          where: {
            id_classe: homeroom.id_classe,
            id_annee_scolaire: homeroom.id_annee_scolaire,
            statut: "INSCRIT",
            eleves: { statut: "ACTIF" },
          },
          select: { id_inscription: true },
        }),
        tx.cours_classes.findMany({
          where: {
            id_classe: homeroom.id_classe,
            id_annee_scolaire: homeroom.id_annee_scolaire,
            statut: "ACTIF",
          },
          select: { id_cours_classe: true, ponderation: true },
        }),
        tx.cotes.findMany({
          where: {
            id_periode: period.id_periode,
            inscriptions: {
              id_classe: homeroom.id_classe,
              id_annee_scolaire: homeroom.id_annee_scolaire,
              statut: "INSCRIT",
              eleves: { statut: "ACTIF" },
            },
            cours_classes: { statut: "ACTIF" },
          },
          select: {
            id_inscription: true,
            id_cours_classe: true,
            cote_obtenue: true,
          },
        }),
      ]);
      const totalWeight = classCourses.reduce(
        (sum, course) => sum + Number(course.ponderation),
        0,
      );
      const gradeByEnrollmentAndCourse = new Map(
        classGrades.map((grade) => [
          `${grade.id_inscription}:${grade.id_cours_classe}`,
          Number(grade.cote_obtenue),
        ]),
      );
      const summaries = classEnrollments.map((enrollment) => {
        const totalObtained = classCourses.reduce(
          (sum, course) =>
            sum +
            (gradeByEnrollmentAndCourse.get(
              `${enrollment.id_inscription}:${course.id_cours_classe}`,
            ) ?? 0),
          0,
        );
        const percentage =
          totalWeight > 0 ? roundToTwoDecimals((totalObtained / totalWeight) * 100) : 0;
        return {
          enrollmentId: enrollment.id_inscription,
          totalObtained: roundToTwoDecimals(totalObtained),
          totalWeight: roundToTwoDecimals(totalWeight),
          percentage,
          rank: 0,
        };
      });
      const sortedSummaries = [...summaries].sort(
        (left, right) => right.percentage - left.percentage,
      );
      let lastPercentage: number | null = null;
      let currentRank = 0;
      sortedSummaries.forEach((summary, index) => {
        if (lastPercentage === null || summary.percentage !== lastPercentage) {
          currentRank = index + 1;
          lastPercentage = summary.percentage;
        }
        summary.rank = currentRank;
      });

      for (const summary of summaries) {
        const appreciation = appreciationByEnrollment.get(
          summary.enrollmentId.toString(),
        );
        await tx.resultats.upsert({
          where: {
            id_inscription_id_periode: {
              id_inscription: summary.enrollmentId,
              id_periode: period.id_periode,
            },
          },
          update: {
            total_obtenu: new Prisma.Decimal(summary.totalObtained),
            total_ponderation: new Prisma.Decimal(summary.totalWeight),
            pourcentage: new Prisma.Decimal(summary.percentage),
            rang: summary.rank,
            ...(appreciation
              ? {
                  conduite: appreciation.conduite ?? null,
                  application: appreciation.application ?? null,
                }
              : {}),
            date_calcul: new Date(),
            date_mise_a_jour: new Date(),
          },
          create: {
            id_inscription: summary.enrollmentId,
            id_periode: period.id_periode,
            total_obtenu: new Prisma.Decimal(summary.totalObtained),
            total_ponderation: new Prisma.Decimal(summary.totalWeight),
            pourcentage: new Prisma.Decimal(summary.percentage),
            rang: summary.rank,
            conduite: appreciation?.conduite ?? null,
            application: appreciation?.application ?? null,
          },
        });
      }
    });
    return { saved: dto.grades.length };
  }

  async submitHomeroomGrades(titularId: string, periodId: string) {
    if (!periodId) throw new BadRequestException("Sélectionnez une période.");
    const id_titulaire = toBigInt(titularId);
    const id_periode = toBigInt(periodId);
    const [titular, period, currentSubmission] = await Promise.all([
      this.prisma.titulaires.findFirst({
        where: {
          id_titulaire,
          statut_compte: "ACTIF",
        },
        include: { classes: { select: { id_ecole: true } } },
      }),
      this.prisma.periodes.findFirst({ where: { id_periode, statut: "ACTIF" } }),
      this.prisma.gradeSubmission.findUnique({
        where: { titularId_periodId: { titularId: id_titulaire, periodId: id_periode } },
      }),
    ]);
    if (!titular || !period || period.id_annee_scolaire !== titular.id_annee_scolaire) {
      throw new BadRequestException("Cette période ne correspond pas au titulaire.");
    }
    if (
      !period.est_ouverte &&
      !["REOPENED", "REJECTED"].includes(currentSubmission?.status ?? "")
    ) {
      throw new BadRequestException("Cette période n’est pas ouverte pour le titulaire.");
    }
    const [studentCount, courseCount, gradeCount, completedAppreciationCount] = await Promise.all([
      this.prisma.inscriptions.count({
        where: {
          id_classe: titular.id_classe,
          id_annee_scolaire: titular.id_annee_scolaire,
          statut: "INSCRIT",
          eleves: { statut: "ACTIF" },
        },
      }),
      this.prisma.cours_classes.count({
        where: {
          id_classe: titular.id_classe,
          id_annee_scolaire: titular.id_annee_scolaire,
          statut: "ACTIF",
        },
      }),
      this.prisma.cotes.count({
        where: {
          id_periode,
          inscriptions: {
            id_classe: titular.id_classe,
            id_annee_scolaire: titular.id_annee_scolaire,
            statut: "INSCRIT",
            eleves: { statut: "ACTIF" },
          },
          cours_classes: { statut: "ACTIF" },
        },
      }),
      this.prisma.resultats.count({
        where: {
          id_periode,
          conduite: { not: null },
          application: { not: null },
          inscriptions: {
            id_classe: titular.id_classe,
            id_annee_scolaire: titular.id_annee_scolaire,
            statut: "INSCRIT",
            eleves: { statut: "ACTIF" },
          },
        },
      }),
    ]);
    const expectedGradeCount = studentCount * courseCount;
    if (expectedGradeCount === 0) {
      throw new BadRequestException("La classe doit contenir des élèves et des cours avant la validation.");
    }
    if (gradeCount !== expectedGradeCount) {
      const missing = Math.max(expectedGradeCount - gradeCount, 0);
      throw new BadRequestException(
        `Validation impossible : ${missing} cote${missing > 1 ? "s sont manquantes" : " est manquante"}.`,
      );
    }
    if (completedAppreciationCount !== studentCount) {
      const missing = Math.max(studentCount - completedAppreciationCount, 0);
      throw new BadRequestException(
        `Validation impossible : Conduite et Application doivent être remplies pour ${missing} élève${missing > 1 ? "s" : ""}.`,
      );
    }
    const submission = await this.prisma.gradeSubmission.upsert({
      where: { titularId_periodId: { titularId: id_titulaire, periodId: id_periode } },
      update: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        rejectionComment: null,
        rejectedAt: null,
      },
      create: { titularId: id_titulaire, periodId: id_periode },
    });
    this.gradeSubmissionEvents$.next({
      schoolId: titular.classes.id_ecole.toString(),
      titularId: id_titulaire.toString(),
      submissionId: submission.id,
      action: "submitted",
    });
    return { submitted: true, submittedAt: submission.submittedAt };
  }

  async listGradeSubmissions(schoolId: string) {
    const titulars = await this.prisma.titulaires.findMany({
      where: { classes: { id_ecole: toBigInt(schoolId) } },
      include: { classes: true, professeurs: true },
    });
    const titularMap = new Map(titulars.map((item) => [item.id_titulaire.toString(), item]));
    const submissions = await this.prisma.gradeSubmission.findMany({
      where: { titularId: { in: titulars.map((item) => item.id_titulaire) } },
      orderBy: { submittedAt: "desc" },
    });
    const periods = await this.prisma.periodes.findMany({
      where: { id_periode: { in: submissions.map((item) => item.periodId) } },
    });
    const periodMap = new Map(periods.map((item) => [item.id_periode.toString(), item.libelle]));
    return submissions.map((submission) => {
      const titular = titularMap.get(submission.titularId.toString());
      return {
        id: submission.id,
        className: titular?.classes.libelle ?? "Classe inconnue",
        teacherName: titular ? `${titular.professeurs.nom} ${titular.professeurs.prenom}` : "Titulaire inconnu",
        periodName: periodMap.get(submission.periodId.toString()) ?? "Période inconnue",
        submittedAt: submission.submittedAt,
        status: submission.status,
        rejectionComment: submission.rejectionComment,
        rejectedAt: submission.rejectedAt,
      };
    });
  }

  async reopenGradeSubmission(id: string, schoolId: string) {
    const submission = await this.prisma.gradeSubmission.findUnique({ where: { id } });
    if (!submission || submission.status !== "APPROVED") {
      throw new NotFoundException("Validation de cotes active introuvable.");
    }
    const titular = await this.prisma.titulaires.findFirst({
      where: {
        id_titulaire: submission.titularId,
        classes: { id_ecole: toBigInt(schoolId) },
      },
    });
    if (!titular) throw new NotFoundException("Cette validation n’appartient pas à votre école.");
    await this.prisma.gradeSubmission.update({
      where: { id },
      data: { status: "REOPENED" },
    });
    this.gradeSubmissionEvents$.next({
      schoolId,
      titularId: submission.titularId.toString(),
      submissionId: id,
      action: "reopened",
    });
    return { reopened: true };
  }

  async approveGradeSubmission(id: string, schoolId: string) {
    const submission = await this.prisma.gradeSubmission.findUnique({ where: { id } });
    if (!submission || submission.status !== "SUBMITTED") {
      throw new NotFoundException("Envoi de cotes en attente introuvable.");
    }
    const titular = await this.prisma.titulaires.findFirst({
      where: { id_titulaire: submission.titularId, classes: { id_ecole: toBigInt(schoolId) } },
    });
    if (!titular) throw new NotFoundException("Cet envoi n’appartient pas à votre école.");
    await this.prisma.gradeSubmission.update({
      where: { id },
      data: { status: "APPROVED" },
    });
    this.gradeSubmissionEvents$.next({
      schoolId,
      titularId: submission.titularId.toString(),
      submissionId: id,
      action: "approved",
    });
    return { approved: true };
  }

  async rejectGradeSubmission(id: string, schoolId: string, comment: string) {
    const submission = await this.prisma.gradeSubmission.findUnique({ where: { id } });
    if (!submission || submission.status !== "SUBMITTED") {
      throw new NotFoundException("Envoi de cotes en attente introuvable.");
    }
    const titular = await this.prisma.titulaires.findFirst({
      where: {
        id_titulaire: submission.titularId,
        classes: { id_ecole: toBigInt(schoolId) },
      },
    });
    if (!titular) throw new NotFoundException("Cet envoi n’appartient pas à votre école.");

    const rejectionComment = comment.trim();
    await this.prisma.gradeSubmission.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionComment,
        rejectedAt: new Date(),
      },
    });
    this.gradeSubmissionEvents$.next({
      schoolId,
      titularId: submission.titularId.toString(),
      submissionId: id,
      action: "rejected",
      comment: rejectionComment,
    });
    return { rejected: true, comment: rejectionComment };
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
        const initialPassword = clean(dto.password) ?? generateSchoolPassword();
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

  async updateSchoolStatus(id: string, isActive: boolean) {
    await this.ensureSchool(id);
    const updatedSchool = await this.prisma.ecoles.update({
      where: { id_ecole: toBigInt(id) },
      data: {
        statut: statusFromBoolean(isActive),
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
      logo: updatedSchool.logo,
      isActive: updatedSchool.statut === "ACTIF",
      createdAt: updatedSchool.date_creation.toISOString(),
      updatedAt: updatedSchool.date_mise_a_jour.toISOString(),
    };
  }

  async resetSchoolPassword(id: string, password: string) {
    await this.ensureSchool(id);

    await this.prisma.ecoles.update({
      where: { id_ecole: toBigInt(id) },
      data: {
        mot_de_passe_hash: await bcrypt.hash(password, 12),
        date_mise_a_jour: new Date(),
      },
    });

    return { updated: true };
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
      const code = await this.buildUniqueClassCode(id_ecole, dto.label);

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

  async createClasses(dto: BulkCreateClassesDto, schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const reservedCodes = new Set<string>();
    const classes = [];
    for (const item of dto.classes) {
      const normalizedLabel = item.label.trim().replace(/\s+/g, " ");
      classes.push({
        id_ecole,
        libelle: normalizedLabel,
        code_classe: await this.buildUniqueClassCode(
          id_ecole,
          normalizedLabel,
          reservedCodes,
        ),
      });
    }
    if (classes.length === 0) {
      throw new BadRequestException("Aucune classe à ajouter.");
    }
    try {
      const result = await this.prisma.classes.createMany({ data: classes });
      return { createdCount: result.count };
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
      hasAccount: Boolean(teacher.matricule && teacher.mot_de_passe_hash),
    }));
  }

  async createTeacher(dto: CreateTeacherDto, schoolId: string) {
    try {
      let matricule = generateTeacherCode();
      while (await this.prisma.professeurs.findUnique({ where: { matricule } })) {
        matricule = generateTeacherCode();
      }
      const temporaryPassword = generateHomeroomPassword();
      const teacher = await this.prisma.professeurs.create({
        data: {
          id_ecole: toBigInt(schoolId),
          matricule,
          mot_de_passe_hash: await bcrypt.hash(temporaryPassword, 12),
          nom: uppercaseName(dto.lastName),
          prenom: capitalizeFirstName(dto.firstName),
          sexe: clean(dto.gender),
          telephone: clean(dto.phone),
          photo: clean(dto.photo),
        },
      });
      return { id: teacher.id_professeur.toString(), matricule, temporaryPassword };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async createTeachers(dto: BulkCreateTeachersDto, schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    if (dto.teachers.length === 0) {
      throw new BadRequestException("Aucun professeur à ajouter.");
    }
    try {
      const credentials: Array<{ id: string; name: string; matricule: string; temporaryPassword: string }> = [];
      for (const item of dto.teachers) {
        let matricule = generateTeacherCode();
        while (await this.prisma.professeurs.findUnique({ where: { matricule } })) matricule = generateTeacherCode();
        const temporaryPassword = generateHomeroomPassword();
        const teacher = await this.prisma.professeurs.create({ data: {
          id_ecole, matricule, mot_de_passe_hash: await bcrypt.hash(temporaryPassword, 12),
          nom: uppercaseName(item.lastName), prenom: capitalizeFirstName(item.firstName),
          sexe: clean(item.gender), telephone: clean(item.phone), photo: clean(item.photo),
        } });
        credentials.push({ id: teacher.id_professeur.toString(), name: `${teacher.nom} ${teacher.prenom}`, matricule, temporaryPassword });
      }
      return { createdCount: credentials.length, credentials };
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

  async resetTeacherPassword(id: string, schoolId: string, password: string) {
    const id_professeur = toBigInt(id);
    const teacher = await this.prisma.professeurs.findFirst({
      where: { id_professeur, id_ecole: toBigInt(schoolId), statut: "ACTIF" },
    });
    if (!teacher) throw new NotFoundException("Professeur introuvable.");
    let matricule = teacher.matricule;
    if (!matricule) {
      matricule = generateTeacherCode();
      while (await this.prisma.professeurs.findUnique({ where: { matricule } })) matricule = generateTeacherCode();
    }
    await this.prisma.professeurs.update({
      where: { id_professeur },
      data: { matricule, mot_de_passe_hash: await bcrypt.hash(password, 12), doit_changer_mot_de_passe: false, statut_compte: "ACTIF", date_mise_a_jour: new Date() },
    });
    const titular = await this.prisma.titulaires.findFirst({ where: { id_professeur, statut_compte: "ACTIF" } });
    if (titular) await this.prisma.titulaires.update({ where: { id_titulaire: titular.id_titulaire }, data: { code_connexion: matricule, mot_de_passe_hash: await bcrypt.hash(password, 12), doit_changer_mot_de_passe: false } });
    return { updated: true, matricule };
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
    const code = await this.buildUniqueCourseCode(id_ecole, dto.label);
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

  async createCourses(dto: BulkCreateCoursesDto, schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const reservedCodes = new Set<string>();
    const courses = [];
    for (const item of dto.courses) {
      const normalizedLabel = item.label.trim().replace(/\s+/g, " ");
      courses.push({
        id_ecole,
        libelle: normalizedLabel,
        code_cours: await this.buildUniqueCourseCode(
          id_ecole,
          normalizedLabel,
          reservedCodes,
        ),
      });
    }
    if (courses.length === 0) {
      throw new BadRequestException("Aucun cours à ajouter.");
    }
    try {
      const result = await this.prisma.cours.createMany({ data: courses });
      return { createdCount: result.count };
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
    const activeYear = await this.prisma.annees_scolaires.findFirst({
      where: { id_ecole, est_active: true, statut: "EN_COURS" },
      orderBy: { date_debut: "desc" },
    });
    if (!activeYear) return [];
    const assignments = await this.prisma.affectations_professeurs.findMany({
      where: {
        statut: "ACTIF",
        id_annee_scolaire: activeYear.id_annee_scolaire,
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
      schoolYear: activeYear.libelle,
      isActive: assignment.statut === "ACTIF",
    }));
  }

  async listCourseAssignmentHistory(schoolId: string) {
    const records = await this.prisma.affectations_professeurs.findMany({
      where: { cours_classes: { classes: { id_ecole: toBigInt(schoolId) } } },
      include: {
        professeurs: true,
        cours_classes: { include: { cours: true, classes: true } },
        annees_scolaires: true,
      },
      orderBy: [{ date_affectation: "desc" }, { date_creation: "desc" }],
    });
    return records.map((record) => ({
      id: record.id_affectation_professeur.toString(),
      teacher: `${record.professeurs.nom} ${record.professeurs.prenom}`,
      course: record.cours_classes.cours.libelle,
      className: record.cours_classes.classes.libelle,
      schoolYear: record.annees_scolaires.libelle,
      schoolYearStatus: record.annees_scolaires.statut,
      startDate: record.date_affectation,
      endDate: record.date_fin,
      reason: record.motif_remplacement,
      isActive: record.statut === "ACTIF",
    }));
  }

  async previewCourseAssignmentsCopy(sourceYearId: string, schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const sourceYear = await this.prisma.annees_scolaires.findFirst({
      where: { id_annee_scolaire: toBigInt(sourceYearId), id_ecole },
    });
    const targetYear = await this.prisma.annees_scolaires.findFirst({
      where: { id_ecole, est_active: true, statut: "EN_COURS" },
    });
    if (!sourceYear || !targetYear) throw new BadRequestException("Année source ou année actuelle introuvable.");
    if (sourceYear.id_annee_scolaire === targetYear.id_annee_scolaire) throw new BadRequestException("Choisissez une année différente de l’année actuelle.");
    const assignments = await this.prisma.affectations_professeurs.findMany({
      where: { id_annee_scolaire: sourceYear.id_annee_scolaire, statut: "ACTIF", cours_classes: { classes: { id_ecole } } },
      include: { professeurs: true, cours_classes: { include: { cours: true, classes: true } } },
      orderBy: [{ cours_classes: { classes: { libelle: "asc" } } }, { cours_classes: { cours: { libelle: "asc" } } }],
    });
    return {
      sourceYear: { id: sourceYear.id_annee_scolaire.toString(), label: sourceYear.libelle },
      targetYear: { id: targetYear.id_annee_scolaire.toString(), label: targetYear.libelle },
      assignments: assignments.map((item) => ({
        sourceAssignmentId: item.id_affectation_professeur.toString(),
        classId: item.cours_classes.id_classe.toString(), className: item.cours_classes.classes.libelle,
        courseId: item.cours_classes.id_cours.toString(), courseName: item.cours_classes.cours.libelle,
        teacherId: item.id_professeur.toString(), teacherName: `${item.professeurs.nom} ${item.professeurs.prenom}`,
        weight: Number(item.cours_classes.ponderation),
      })),
    };
  }

  async copyCourseAssignments(dto: CopyCourseAssignmentsDto, schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const [sourceYear, targetYear] = await Promise.all([
      this.prisma.annees_scolaires.findFirst({ where: { id_annee_scolaire: toBigInt(dto.sourceYearId), id_ecole } }),
      this.prisma.annees_scolaires.findFirst({ where: { id_ecole, est_active: true, statut: "EN_COURS" } }),
    ]);
    if (!sourceYear || !targetYear || sourceYear.id_annee_scolaire === targetYear.id_annee_scolaire) throw new BadRequestException("Années scolaires invalides.");
    const unique = new Map<string, CreateCourseAssignmentDto>();
    dto.assignments.forEach((item) => unique.set(`${item.classId}:${item.courseId}`, item));
    let created = 0;
    let skipped = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const item of unique.values()) {
        const [schoolClass, course, teacher] = await Promise.all([
          tx.classes.findFirst({ where: { id_classe: toBigInt(item.classId), id_ecole, statut: "ACTIF" } }),
          tx.cours.findFirst({ where: { id_cours: toBigInt(item.courseId), id_ecole, statut: "ACTIF" } }),
          tx.professeurs.findFirst({ where: { id_professeur: toBigInt(item.teacherId), id_ecole, statut: "ACTIF" } }),
        ]);
        if (!schoolClass || !course || !teacher) throw new BadRequestException("Une classe, un cours ou un professeur sélectionné est invalide.");
        const courseClass = await tx.cours_classes.upsert({
          where: { id_cours_id_classe_id_annee_scolaire: { id_cours: course.id_cours, id_classe: schoolClass.id_classe, id_annee_scolaire: targetYear.id_annee_scolaire } },
          update: { ponderation: item.weight, statut: "ACTIF", date_mise_a_jour: new Date() },
          create: { id_cours: course.id_cours, id_classe: schoolClass.id_classe, id_annee_scolaire: targetYear.id_annee_scolaire, ponderation: item.weight },
        });
        const existing = await tx.affectations_professeurs.findFirst({ where: { id_cours_classe: courseClass.id_cours_classe, id_annee_scolaire: targetYear.id_annee_scolaire, statut: "ACTIF" } });
        if (existing) { skipped += 1; continue; }
        await tx.affectations_professeurs.create({ data: { id_professeur: teacher.id_professeur, id_cours_classe: courseClass.id_cours_classe, id_annee_scolaire: targetYear.id_annee_scolaire } });
        created += 1;
      }
    });
    return { created, skipped, targetYear: targetYear.libelle };
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
      loginCode: item.professeurs.matricule,
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
    let teacher = await this.prisma.professeurs.findUnique({ where: { id_professeur: context.id_professeur } });
    if (!teacher) throw new NotFoundException("Professeur introuvable.");
    let code = teacher.matricule;
    let temporaryPassword: string | null = null;
    if (!code || !teacher.mot_de_passe_hash) {
      code = generateTeacherCode();
      while (await this.prisma.professeurs.findUnique({ where: { matricule: code! } })) code = generateTeacherCode();
      temporaryPassword = generateHomeroomPassword();
      teacher = await this.prisma.professeurs.update({
        where: { id_professeur: context.id_professeur },
        data: { matricule: code, mot_de_passe_hash: await bcrypt.hash(temporaryPassword, 12) },
      });
    }
    const internalTitularCode = `TITULAR-${context.id_professeur}-${context.schoolYear.id_annee_scolaire}`;
    const assignment = await this.prisma.titulaires.create({
      data: {
        id_professeur: context.id_professeur,
        id_classe: context.id_classe,
        id_annee_scolaire: context.schoolYear.id_annee_scolaire,
        id_directeur_createur: context.director.id_directeur,
        code_connexion: internalTitularCode.slice(0, 50),
        mot_de_passe_hash: teacher.mot_de_passe_hash!,
      },
    });
    return {
      id: assignment.id_titulaire.toString(),
      loginCode: teacher.matricule,
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
    if (current.id_classe !== context.id_classe) {
      const gradeCount = await this.prisma.cotes.count({
        where: {
          inscriptions: {
            id_classe: current.id_classe,
            id_annee_scolaire: current.id_annee_scolaire,
          },
        },
      });
      if (gradeCount > 0) {
        throw new ConflictException(
          "Cette grille contient déjà des cotes. Sa classe ne peut pas être changée : remplacez uniquement le titulaire.",
        );
      }
    }
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

  async deleteHomeroomAssignmentWithGradebook(id: string, schoolId: string) {
    const id_titulaire = toBigInt(id);
    const assignment = await this.prisma.titulaires.findFirst({
      where: {
        id_titulaire,
        classes: { id_ecole: toBigInt(schoolId) },
      },
      include: { classes: true },
    });
    if (!assignment) throw new NotFoundException("Affectation titulaire introuvable.");

    const summary = await this.prisma.$transaction(async (tx) => {
      const enrollmentWhere = {
        id_classe: assignment.id_classe,
        id_annee_scolaire: assignment.id_annee_scolaire,
      };
      const [deletedResults, deletedGrades, deletedSubmissions] = await Promise.all([
        tx.resultats.deleteMany({ where: { inscriptions: enrollmentWhere } }),
        tx.cotes.deleteMany({ where: { inscriptions: enrollmentWhere } }),
        tx.gradeSubmission.deleteMany({ where: { titularId: id_titulaire } }),
      ]);
      await tx.titulaires.delete({ where: { id_titulaire } });
      return {
        grades: deletedGrades.count,
        results: deletedResults.count,
        submissions: deletedSubmissions.count,
      };
    });

    return {
      deleted: true,
      className: assignment.classes.libelle,
      ...summary,
    };
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
    const professor = await this.prisma.professeurs.findUnique({
      where: { id_professeur: assignment.id_professeur },
    });
    if (!professor?.matricule) throw new NotFoundException("Compte professeur introuvable.");
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction([
      this.prisma.titulaires.update({
        where: { id_titulaire },
        data: {
          mot_de_passe_hash: passwordHash,
          doit_changer_mot_de_passe: false,
          date_mise_a_jour: new Date(),
        },
      }),
      this.prisma.professeurs.update({
        where: { id_professeur: assignment.id_professeur },
        data: {
          matricule: professor.matricule,
          mot_de_passe_hash: passwordHash,
          statut_compte: "ACTIF",
          doit_changer_mot_de_passe: false,
          date_mise_a_jour: new Date(),
        },
      }),
    ]);
    return { updated: true, loginCode: professor.matricule };
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

  async previewStudentReenrollment(sourceYearId: string, schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const [sourceYear, targetYear] = await Promise.all([
      this.prisma.annees_scolaires.findFirst({ where: { id_annee_scolaire: toBigInt(sourceYearId), id_ecole } }),
      this.prisma.annees_scolaires.findFirst({ where: { id_ecole, est_active: true, statut: "EN_COURS" } }),
    ]);
    if (!sourceYear || !targetYear || sourceYear.id_annee_scolaire === targetYear.id_annee_scolaire) throw new BadRequestException("Année source ou année actuelle invalide.");
    const enrollments = await this.prisma.inscriptions.findMany({
      where: { id_annee_scolaire: sourceYear.id_annee_scolaire, statut: "INSCRIT", eleves: { id_ecole, statut: "ACTIF" } },
      include: { eleves: true, classes: true },
      orderBy: [{ classes: { libelle: "asc" } }, { numero_ordre: "asc" }, { eleves: { nom: "asc" } }],
    });
    return { sourceYear: { id: sourceYear.id_annee_scolaire.toString(), label: sourceYear.libelle }, targetYear: { id: targetYear.id_annee_scolaire.toString(), label: targetYear.libelle }, students: enrollments.map((item) => ({ enrollmentId: item.id_inscription.toString(), studentId: item.id_eleve.toString(), matricule: item.eleves.matricule, name: `${item.eleves.nom}${item.eleves.postnom ? ` ${item.eleves.postnom}` : ""} ${item.eleves.prenom}`, sourceClass: item.classes.libelle, classId: item.id_classe.toString(), orderNumber: item.numero_ordre })) };
  }

  async reenrollStudents(dto: ReenrollStudentsDto, schoolId: string) {
    const id_ecole = toBigInt(schoolId);
    const [sourceYear, targetYear] = await Promise.all([
      this.prisma.annees_scolaires.findFirst({ where: { id_annee_scolaire: toBigInt(dto.sourceYearId), id_ecole } }),
      this.prisma.annees_scolaires.findFirst({ where: { id_ecole, est_active: true, statut: "EN_COURS" } }),
    ]);
    if (!sourceYear || !targetYear || sourceYear.id_annee_scolaire === targetYear.id_annee_scolaire) throw new BadRequestException("Années scolaires invalides.");
    let created = 0; let skipped = 0;
    const uniqueStudents = new Map(dto.students.map((item) => [item.studentId, item]));
    await this.prisma.$transaction(async (tx) => {
      for (const item of uniqueStudents.values()) {
        const [student, schoolClass] = await Promise.all([
          tx.eleves.findFirst({ where: { id_eleve: toBigInt(item.studentId), id_ecole, statut: "ACTIF", inscriptions: { some: { id_annee_scolaire: sourceYear.id_annee_scolaire } } } }),
          tx.classes.findFirst({ where: { id_classe: toBigInt(item.classId), id_ecole, statut: "ACTIF" } }),
        ]);
        if (!student || !schoolClass) throw new BadRequestException("Un élève ou une classe sélectionnée est invalide.");
        const exists = await tx.inscriptions.findUnique({ where: { id_eleve_id_annee_scolaire: { id_eleve: student.id_eleve, id_annee_scolaire: targetYear.id_annee_scolaire } } });
        if (exists) { skipped += 1; continue; }
        const occupiedOrder = item.orderNumber
          ? await tx.inscriptions.findFirst({ where: { id_classe: schoolClass.id_classe, id_annee_scolaire: targetYear.id_annee_scolaire, numero_ordre: item.orderNumber }, select: { id_inscription: true } })
          : null;
        await tx.inscriptions.create({ data: { id_eleve: student.id_eleve, id_classe: schoolClass.id_classe, id_annee_scolaire: targetYear.id_annee_scolaire, numero_ordre: occupiedOrder ? null : item.orderNumber, statut: "INSCRIT" } });
        created += 1;
      }
    });
    return { created, skipped, targetYear: targetYear.libelle };
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

  async importStudents(rows: CreateStudentDto[], schoolId: string) {
    if (!rows.length) throw new BadRequestException("Le fichier ne contient aucun élève.");
    const id_ecole = toBigInt(schoolId);
    const classIds = [...new Set(rows.map((row) => String(row.classId)))];
    const yearIds = [...new Set(rows.map((row) => String(row.schoolYearId ?? "")))];
    if (classIds.length !== 1 || yearIds.length !== 1 || !yearIds[0]) {
      throw new BadRequestException("Tous les élèves importés doivent appartenir à la même classe et à la même année scolaire.");
    }
    const id_classe = toBigInt(classIds[0]);
    const id_annee_scolaire = toBigInt(yearIds[0]);
    const [schoolClass, schoolYear, existingStudents] = await Promise.all([
      this.prisma.classes.findFirst({ where: { id_classe, id_ecole, statut: "ACTIF" } }),
      this.prisma.annees_scolaires.findFirst({
        where: { id_annee_scolaire, id_ecole, est_active: true, statut: "EN_COURS" },
      }),
      this.prisma.eleves.findMany({
        where: { id_ecole },
        select: { nom: true, postnom: true, prenom: true, date_naissance: true },
      }),
    ]);
    if (!schoolClass) throw new BadRequestException("La classe sélectionnée est invalide.");
    if (!schoolYear) throw new BadRequestException("L’année scolaire sélectionnée n’est pas active.");

    const identityKey = (row: { lastName: string; postName?: string | null; firstName: string; birthDate?: string | Date | null }) =>
      [
        uppercaseName(row.lastName),
        row.postName ? uppercaseName(row.postName) : "",
        capitalizeFirstName(row.firstName).toLocaleUpperCase("fr"),
        row.birthDate ? new Date(row.birthDate).toISOString().slice(0, 10) : "",
      ].join("|");
    const identities = new Set(
      existingStudents.map((student) => identityKey({
        lastName: student.nom,
        postName: student.postnom,
        firstName: student.prenom,
        birthDate: student.date_naissance,
      })),
    );
    const rejected: Array<{ row: number; reason: string }> = [];
    const created: Array<{ row: number; matricule: string }> = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const key = identityKey(row);
      if (identities.has(key)) {
        rejected.push({ row: rowNumber, reason: "Doublon détecté dans cette école." });
        continue;
      }
      try {
        let matricule = generateStudentMatricule();
        while (await this.prisma.eleves.findUnique({ where: { matricule }, select: { id_eleve: true } })) {
          matricule = generateStudentMatricule();
        }
        await this.prisma.$transaction(async (tx) => {
          const student = await tx.eleves.create({
            data: {
              id_ecole,
              matricule,
              nom: uppercaseName(row.lastName),
              postnom: row.postName ? uppercaseName(row.postName) : undefined,
              prenom: capitalizeFirstName(row.firstName),
              sexe: clean(row.gender),
              date_naissance: row.birthDate ? new Date(row.birthDate) : undefined,
              lieu_naissance: clean(row.birthPlace),
              adresse: clean(row.address),
              nom_tuteur: clean(row.guardianName),
              telephone_tuteur: clean(row.guardianPhone),
            },
          });
          await tx.inscriptions.create({
            data: { id_eleve: student.id_eleve, id_classe, id_annee_scolaire },
          });
        });
        identities.add(key);
        created.push({ row: rowNumber, matricule });
      } catch {
        rejected.push({ row: rowNumber, reason: "Enregistrement impossible pour cette ligne." });
      }
    }
    return { total: rows.length, imported: created.length, rejected, created };
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
    if (year.statut === "ARCHIVEE") {
      throw new BadRequestException(
        "Une année archivée ne peut plus être rouverte.",
      );
    }
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
    if (year.statut === "ARCHIVEE") {
      throw new BadRequestException("Cette année est déjà archivée.");
    }
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

  async archiveSchoolYear(id: string, schoolId: string) {
    const id_annee_scolaire = toBigInt(id);
    const year = await this.prisma.annees_scolaires.findFirst({
      where: { id_annee_scolaire, id_ecole: toBigInt(schoolId) },
      include: {
        periodes: true,
        _count: {
          select: {
            inscriptions: true,
            cours_classes: true,
            titulaires: true,
          },
        },
      },
    });
    if (!year) throw new NotFoundException("Année scolaire introuvable.");
    if (year.est_active || year.statut === "EN_COURS") {
      throw new BadRequestException(
        "Clôturez d’abord cette année scolaire avant de l’archiver.",
      );
    }
    if (year.statut === "PLANIFIEE") {
      throw new BadRequestException(
        "Une année planifiée ne peut pas être archivée.",
      );
    }
    if (year.statut === "ARCHIVEE") {
      return { archived: true, alreadyArchived: true };
    }
    const openPeriods = year.periodes.filter((period) => period.est_ouverte);
    if (openPeriods.length > 0) {
      throw new BadRequestException(
        "Fermez toutes les périodes avant d’archiver cette année.",
      );
    }

    await this.prisma.annees_scolaires.update({
      where: { id_annee_scolaire },
      data: {
        est_active: false,
        statut: "ARCHIVEE",
        date_mise_a_jour: new Date(),
      },
    });

    return {
      archived: true,
      students: year._count.inscriptions,
      courses: year._count.cours_classes,
      homerooms: year._count.titulaires,
    };
  }

  async updateSchoolYear(id: string, schoolId: string, dto: UpdateSchoolYearDto) {
    const id_annee_scolaire = toBigInt(id);
    const year = await this.prisma.annees_scolaires.findFirst({
      where: { id_annee_scolaire, id_ecole: toBigInt(schoolId) },
    });
    if (!year) throw new NotFoundException("Année scolaire introuvable.");
    if (year.statut === "ARCHIVEE") {
      throw new BadRequestException(
        "Une année archivée est consultable uniquement.",
      );
    }
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
    if (year.statut === "ARCHIVEE") {
      throw new BadRequestException(
        "Une année archivée ne peut pas être supprimée depuis la bibliothèque.",
      );
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
    if (year.statut === "ARCHIVEE") {
      throw new BadRequestException(
        "Une année archivée est consultable uniquement.",
      );
    }
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

  async getAcademicLibrary(
    schoolId: string,
    filters: {
      yearId?: string;
      classId?: string;
      periodId?: string;
      search?: string;
    },
  ) {
    const id_ecole = toBigInt(schoolId);
    const archivedYears = await this.prisma.annees_scolaires.findMany({
      where: { id_ecole, statut: "ARCHIVEE" },
      include: {
        periodes: { orderBy: { numero: "asc" } },
        _count: {
          select: {
            inscriptions: true,
            cours_classes: true,
            titulaires: true,
          },
        },
      },
      orderBy: { date_debut: "desc" },
    });

    const selectedYear =
      archivedYears.find(
        (year) => year.id_annee_scolaire.toString() === filters.yearId,
      ) ?? archivedYears[0];

    if (!selectedYear) {
      return {
        summary: {
          archivedYears: 0,
          students: 0,
          classes: 0,
          bulletins: 0,
        },
        selectedYearId: null,
        selectedClassId: null,
        selectedPeriodId: null,
        years: [],
        classes: [],
        periods: [],
        courses: [],
        students: [],
        grades: [],
      };
    }

    const id_annee_scolaire = selectedYear.id_annee_scolaire;
    const classes = await this.prisma.classes.findMany({
      where: {
        id_ecole,
        OR: [
          { inscriptions: { some: { id_annee_scolaire } } },
          { cours_classes: { some: { id_annee_scolaire } } },
        ],
      },
      select: {
        id_classe: true,
        libelle: true,
        inscriptions: {
          where: { id_annee_scolaire },
          select: { id_inscription: true },
        },
      },
      orderBy: { libelle: "asc" },
    });

    const selectedClass =
      classes.find((schoolClass) => schoolClass.id_classe.toString() === filters.classId) ??
      classes[0];
    const selectedPeriod =
      selectedYear.periodes.find(
        (period) => period.id_periode.toString() === filters.periodId,
      ) ?? selectedYear.periodes[0];
    const normalizedSearch = clean(filters.search);

    const students = selectedClass
      ? await this.prisma.inscriptions.findMany({
          where: {
            id_annee_scolaire,
            id_classe: selectedClass.id_classe,
            ...(normalizedSearch
              ? {
                  eleves: {
                    OR: [
                      { matricule: { contains: normalizedSearch, mode: "insensitive" } },
                      { nom: { contains: normalizedSearch, mode: "insensitive" } },
                      { postnom: { contains: normalizedSearch, mode: "insensitive" } },
                      { prenom: { contains: normalizedSearch, mode: "insensitive" } },
                    ],
                  },
                }
              : {}),
          },
          include: {
            classes: true,
            eleves: true,
            resultats: selectedPeriod
              ? {
                  where: { id_periode: selectedPeriod.id_periode },
                }
              : false,
          },
          orderBy: [{ numero_ordre: "asc" }, { eleves: { nom: "asc" } }],
        })
      : [];

    const courses = selectedClass
      ? await this.prisma.cours_classes.findMany({
          where: {
            id_annee_scolaire,
            id_classe: selectedClass.id_classe,
          },
          include: {
            cours: true,
            affectations_professeurs: {
              where: { id_annee_scolaire },
              include: { professeurs: true },
              orderBy: { date_affectation: "desc" },
            },
          },
          orderBy: { cours: { libelle: "asc" } },
        })
      : [];

    const enrollmentIds = students.map((student) => student.id_inscription);
    const courseClassIds = courses.map((course) => course.id_cours_classe);
    const grades =
      selectedPeriod && enrollmentIds.length && courseClassIds.length
        ? await this.prisma.cotes.findMany({
            where: {
              id_periode: selectedPeriod.id_periode,
              id_inscription: { in: enrollmentIds },
              id_cours_classe: { in: courseClassIds },
            },
            select: {
              id_inscription: true,
              id_cours_classe: true,
              cote_obtenue: true,
            },
          })
        : [];

    const bulletins = selectedPeriod
      ? await this.prisma.resultats.count({
          where: {
            id_periode: selectedPeriod.id_periode,
            inscriptions: { id_annee_scolaire },
          },
        })
      : 0;

    return {
      summary: {
        archivedYears: archivedYears.length,
        students: selectedYear._count.inscriptions,
        classes: classes.length,
        bulletins,
      },
      selectedYearId: selectedYear.id_annee_scolaire.toString(),
      selectedClassId: selectedClass?.id_classe.toString() ?? null,
      selectedPeriodId: selectedPeriod?.id_periode.toString() ?? null,
      years: archivedYears.map((year) => ({
        id: year.id_annee_scolaire.toString(),
        label: year.libelle,
        startDate: year.date_debut.toISOString(),
        endDate: year.date_fin.toISOString(),
        students: year._count.inscriptions,
        courses: year._count.cours_classes,
        homerooms: year._count.titulaires,
        periods: year.periodes.length,
      })),
      classes: classes.map((schoolClass) => ({
        id: schoolClass.id_classe.toString(),
        name: schoolClass.libelle,
        students: schoolClass.inscriptions.length,
      })),
      periods: selectedYear.periodes.map((period) => ({
        id: period.id_periode.toString(),
        name: period.libelle,
        number: period.numero,
      })),
      courses: courses.map((course) => {
        const teacher = course.affectations_professeurs[0]?.professeurs;
        return {
          id: course.id_cours_classe.toString(),
          name: course.cours.libelle,
          weight: Number(course.ponderation),
          teacherName: teacher
            ? `${teacher.nom}${teacher.postnom ? ` ${teacher.postnom}` : ""} ${teacher.prenom}`
            : "—",
        };
      }),
      students: students.map((student) => {
        const result = student.resultats[0];
        return {
          enrollmentId: student.id_inscription.toString(),
          orderNumber: student.numero_ordre,
          matricule: student.eleves.matricule,
          name: `${student.eleves.nom}${student.eleves.postnom ? ` ${student.eleves.postnom}` : ""} ${student.eleves.prenom}`,
          className: student.classes.libelle,
          photo: student.eleves.photo,
          totalObtained: result ? Number(result.total_obtenu) : 0,
          totalWeight: result ? Number(result.total_ponderation) : 0,
          percentage: result ? Number(result.pourcentage) : 0,
          rank: result?.rang ?? null,
          conduite: result?.conduite ?? null,
          application: result?.application ?? null,
        };
      }),
      grades: grades.map((grade) => ({
        enrollmentId: grade.id_inscription.toString(),
        courseClassId: grade.id_cours_classe.toString(),
        value: Number(grade.cote_obtenue),
      })),
    };
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
