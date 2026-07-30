import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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
      if (!loginDto.schoolName) {
        throw new BadRequestException(
          "Nom de l’école, code établissement et mot de passe obligatoires.",
        );
      }

      const school = await this.prisma.ecoles.findUnique({
        where: { code_ecole: loginDto.matricule.trim().toUpperCase() },
      });

      if (
        !school ||
        school.nom_ecole !== loginDto.schoolName.trim() ||
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

    if (!loginDto.email || !loginDto.schoolName) {
      throw new BadRequestException("Code établissement obligatoire.");
    }

    const director = await this.prisma.directeurs.findFirst({
      where: {
        email: loginDto.email.trim().toLowerCase(),
        ecoles: { nom_ecole: loginDto.schoolName },
      },
      include: { ecoles: true },
    });

    if (!director || director.statut_compte !== "ACTIF") {
      throw new UnauthorizedException("Identifiants invalides.");
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
    if (!loginDto.matricule || !loginDto.schoolName) {
      throw new BadRequestException("École et matricule obligatoires.");
    }

    const titulaire = await this.prisma.titulaires.findFirst({
      where: {
        code_connexion: loginDto.matricule.trim(),
        professeurs: { ecoles: { nom_ecole: loginDto.schoolName } },
      },
      include: { professeurs: true, classes: true },
    });

    if (!titulaire || titulaire.statut_compte !== "ACTIF") {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      titulaire.mot_de_passe_hash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    await this.prisma.titulaires.update({
      where: { id_titulaire: titulaire.id_titulaire },
      data: { derniere_connexion: new Date() },
    });

    return {
      id: titulaire.id_titulaire.toString(),
      email: titulaire.code_connexion,
      firstName: titulaire.professeurs.prenom,
      lastName: titulaire.professeurs.nom,
      role: "teacher" as const,
      schoolId: titulaire.professeurs.id_ecole.toString(),
      classId: titulaire.id_classe.toString(),
      createdAt: titulaire.date_creation.toISOString(),
      updatedAt: titulaire.date_mise_a_jour.toISOString(),
    };
  }

  private async validateStudent(loginDto: LoginDto) {
    if (!loginDto.matricule) {
      throw new BadRequestException("Matricule obligatoire.");
    }

    const student = await this.prisma.eleves.findFirst({
      where: {
        matricule: loginDto.matricule.trim(),
        ...(loginDto.schoolName
          ? { ecoles: { nom_ecole: loginDto.schoolName } }
          : {}),
      },
      include: {
        inscriptions: {
          orderBy: { date_inscription: "desc" },
          take: 1,
        },
      },
    });

    if (!student || student.statut !== "ACTIF") {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    if (student.matricule !== loginDto.password) {
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
