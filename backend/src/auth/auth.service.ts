import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(loginDto: LoginDto) {
    if (!loginDto.password) {
      throw new UnauthorizedException("Mot de passe obligatoire.");
    }

    const user = await this.validateUser(loginDto);
    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      schoolId: "schoolId" in user ? user.schoolId : undefined,
    });

    return { user, token };
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
      createdAt: superAdmin.createdAt.toISOString(),
      updatedAt: superAdmin.updatedAt.toISOString(),
    };
  }

  private async validateDirector(loginDto: LoginDto) {
    if (!loginDto.email || !loginDto.schoolName) {
      throw new BadRequestException("École et e-mail obligatoires.");
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
