import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeStudentMatricule } from "../students/student-matricule";
import { LoginDto } from "./dto/login.dto";

const STUDENT_RESULTS_PASSWORD = "POINTSNANGA";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async resolveSchool(role: "director" | "teacher", identifier: string) {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) return { school: null };

    if (role === "director") {
      const school = await this.prisma.ecoles.findUnique({
        where: { code_ecole: normalizedIdentifier.toUpperCase() },
        select: { nom_ecole: true, logo: true },
      });

      return {
        school: school
          ? { name: school.nom_ecole, logo: school.logo }
          : null,
      };
    }

    const professor = await this.prisma.professeurs.findUnique({
      where: { matricule: normalizedIdentifier.toUpperCase() },
      select: {
        ecoles: { select: { nom_ecole: true, logo: true } },
        titulaires: { where: { statut_compte: "ACTIF", annees_scolaires: { est_active: true } }, select: { classes: { select: { libelle: true } } }, take: 1 },
      },
    });

    return {
      school: professor
        ? {
            name: professor.ecoles.nom_ecole,
            logo: professor.ecoles.logo,
            className: professor.titulaires[0]?.classes.libelle ?? null,
          }
        : null,
    };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { email: normalizedEmail },
    });

    if (superAdmin?.isActive) {
      const token = randomBytes(32).toString("hex");
      const resetTokenHash = createHash("sha256").update(token).digest("hex");
      const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await this.prisma.superAdmin.update({
        where: { id: superAdmin.id },
        data: { resetTokenHash, resetTokenExpiresAt },
      });

      const frontendUrl =
        this.config.get<string>("FRONTEND_URL") ?? "http://localhost:5173";
      const resetUrl = `${frontendUrl}/admin/reset-password?token=${token}`;
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: this.config.getOrThrow<string>("GMAIL_USER"),
          pass: this.config.getOrThrow<string>("GMAIL_APP_PASSWORD"),
        },
      });
      await transporter.sendMail({
        from: `"PointsNanga" <${this.config.getOrThrow<string>("GMAIL_USER")}>`,
        to: superAdmin.email,
        subject: "Réinitialisation de votre mot de passe PointsNanga",
        text: `Utilisez ce lien dans les 30 prochaines minutes : ${resetUrl}`,
        html: `<p>Bonjour ${superAdmin.firstName},</p><p>Utilisez le lien suivant dans les 30 prochaines minutes pour réinitialiser votre mot de passe :</p><p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p><p>Si vous n’avez pas demandé cette action, ignorez cet e-mail.</p>`,
      });
    }

    return {
      message:
        "Si cette adresse correspond à un compte actif, un lien a été envoyé.",
    };
  }

  async resetPassword(token: string, password: string) {
    const resetTokenHash = createHash("sha256").update(token).digest("hex");
    const superAdmin = await this.prisma.superAdmin.findFirst({
      where: {
        resetTokenHash,
        resetTokenExpiresAt: { gt: new Date() },
        isActive: true,
      },
    });

    if (!superAdmin) {
      throw new BadRequestException("Lien invalide ou expiré.");
    }

    await this.prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });

    return { message: "Mot de passe réinitialisé avec succès." };
  }

  async login(loginDto: LoginDto) {
    if (!loginDto.password) {
      throw new UnauthorizedException("Mot de passe obligatoire.");
    }

    const user = await this.validateUser(loginDto);
    const payload = {
      sub: user.id,
      role: user.role,
      schoolId: "schoolId" in user ? user.schoolId : undefined,
      titularId: "titularId" in user ? user.titularId : undefined,
    };
    const accessToken = await this.jwtService.signAsync({
      ...payload,
      tokenType: "access",
    });
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, tokenType: "refresh" },
      { expiresIn: "7d" },
    );

    return { user, accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    let payload: {
      sub: string;
      role: string;
      schoolId?: string;
      titularId?: string;
      tokenType?: string;
    };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException("Session expirée.");
    }
    if (payload.tokenType !== "refresh") {
      throw new UnauthorizedException("Jeton de renouvellement invalide.");
    }

    const accessToken = await this.jwtService.signAsync({
      sub: payload.sub,
      role: payload.role,
      schoolId: payload.schoolId,
      titularId: payload.titularId,
      tokenType: "access",
    });
    return { accessToken };
  }

  private validateUser(loginDto: LoginDto) {
    switch (loginDto.role) {
      case "super_admin":
        return this.validateSuperAdmin(loginDto);
      case "director":
        return this.validateDirector(loginDto);
      case "teacher":
        return this.validateTeacher(loginDto);
      case "student":
        return this.validateStudent(loginDto);
    }
  }

  private async validateSuperAdmin(loginDto: LoginDto) {
    if (!loginDto.email) {
      throw new BadRequestException("E-mail administrateur obligatoire.");
    }

    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { email: loginDto.email.trim().toLowerCase() },
    });

    if (!superAdmin) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    if (!superAdmin.isActive) {
      throw new UnauthorizedException("Ce compte superadmin est suspendu.");
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      superAdmin.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    return {
      id: superAdmin.id,
      email: superAdmin.email,
      firstName: superAdmin.firstName,
      lastName: superAdmin.lastName,
      role: "super_admin" as const,
      hasFullAccess: superAdmin.hasFullAccess,
      createdAt: superAdmin.createdAt.toISOString(),
      updatedAt: superAdmin.updatedAt.toISOString(),
    };
  }

  private async validateDirector(loginDto: LoginDto) {
    if (loginDto.matricule) {
      const school = await this.prisma.ecoles.findUnique({
        where: { code_ecole: loginDto.matricule.trim().toUpperCase() },
      });

      if (
        !school ||
        school.statut !== "ACTIF" ||
        !school.mot_de_passe_hash ||
        !(await bcrypt.compare(loginDto.password, school.mot_de_passe_hash))
      ) {
        throw new UnauthorizedException("Identifiants invalides.");
      }

      return {
        id: `school-${school.id_ecole.toString()}`,
        email: school.code_ecole,
        firstName: "Direction",
        lastName: school.nom_ecole,
        role: "director" as const,
        schoolId: school.id_ecole.toString(),
        schoolLogo: school.logo,
        createdAt: school.date_creation.toISOString(),
        updatedAt: school.date_mise_a_jour.toISOString(),
      };
    }

    if (!loginDto.email) {
      throw new BadRequestException("Code établissement obligatoire.");
    }

    const director = await this.prisma.directeurs.findFirst({
      where: {
        email: loginDto.email.trim().toLowerCase(),
      },
      include: { ecoles: true },
    });

    if (!director || director.statut_compte !== "ACTIF") {
      throw new UnauthorizedException("Identifiants invalides.");
    }
    if (director.ecoles.statut !== "ACTIF") {
      throw new UnauthorizedException("Cette école est suspendue.");
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      director.mot_de_passe_hash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    await this.prisma.directeurs.update({
      where: { id_directeur: director.id_directeur },
      data: { derniere_connexion: new Date() },
    });

    return {
      id: director.id_directeur.toString(),
      email: director.email ?? director.code_connexion,
      firstName: director.prenom,
      lastName: director.nom,
      role: "director" as const,
      schoolId: director.id_ecole.toString(),
      createdAt: director.date_creation.toISOString(),
      updatedAt: director.date_mise_a_jour.toISOString(),
    };
  }

  private async validateTeacher(loginDto: LoginDto) {
    if (!loginDto.matricule) {
      throw new BadRequestException("Matricule obligatoire.");
    }

    const professor = await this.prisma.professeurs.findUnique({
      where: { matricule: loginDto.matricule.trim().toUpperCase() },
      include: {
        ecoles: true,
        titulaires: {
          where: { statut_compte: "ACTIF", annees_scolaires: { est_active: true } },
          include: { classes: true },
          take: 1,
        },
      },
    });

    if (!professor || professor.statut !== "ACTIF" || professor.statut_compte !== "ACTIF" || !professor.mot_de_passe_hash) {
      throw new UnauthorizedException("Identifiants invalides.");
    }
    if (professor.ecoles.statut !== "ACTIF") {
      throw new UnauthorizedException("Cette école est suspendue.");
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      professor.mot_de_passe_hash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    await this.prisma.professeurs.update({
      where: { id_professeur: professor.id_professeur },
      data: { derniere_connexion: new Date() },
    });

    const titulaire = professor.titulaires[0];

    return {
      id: professor.id_professeur.toString(),
      email: professor.matricule!,
      firstName: professor.prenom,
      lastName: professor.nom,
      role: "teacher" as const,
      schoolId: professor.id_ecole.toString(),
      titularId: titulaire?.id_titulaire.toString(),
      classId: titulaire?.id_classe.toString(),
      isHomeroom: Boolean(titulaire),
      createdAt: professor.date_creation.toISOString(),
      updatedAt: professor.date_mise_a_jour.toISOString(),
    };
  }

  private async validateStudent(loginDto: LoginDto) {
    if (!loginDto.matricule) {
      throw new BadRequestException("Matricule obligatoire.");
    }

    const normalizedMatricule = normalizeStudentMatricule(loginDto.matricule);
    const student = await this.prisma.eleves.findFirst({
      where: {
        matricule: normalizedMatricule,
        ...(loginDto.schoolName
          ? { ecoles: { nom_ecole: loginDto.schoolName } }
          : {}),
      },
      include: {
        ecoles: true,
        inscriptions: {
          orderBy: { date_inscription: "desc" },
          take: 1,
        },
      },
    });

    if (!student || student.statut !== "ACTIF") {
      throw new UnauthorizedException("Identifiants invalides.");
    }
    if (student.ecoles.statut !== "ACTIF") {
      throw new UnauthorizedException("Cette école est suspendue.");
    }

    if (loginDto.password !== STUDENT_RESULTS_PASSWORD) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    return {
      id: student.id_eleve.toString(),
      email: student.matricule,
      firstName: student.prenom,
      lastName: student.nom,
      role: "student" as const,
      schoolId: student.id_ecole.toString(),
      classId: student.inscriptions[0]?.id_classe.toString(),
      createdAt: student.date_creation.toISOString(),
      updatedAt: student.date_mise_a_jour.toISOString(),
    };
  }
}
