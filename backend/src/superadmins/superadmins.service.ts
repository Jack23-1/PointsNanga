import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSuperAdminDto } from "./dto/create-superadmin.dto";
import { UpdateSuperAdminDto } from "./dto/update-superadmin.dto";

@Injectable()
export class SuperAdminsService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublicSuperAdmin(superAdmin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    hasFullAccess: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: superAdmin.id,
      email: superAdmin.email,
      firstName: superAdmin.firstName,
      lastName: superAdmin.lastName,
      isActive: superAdmin.isActive,
      hasFullAccess: superAdmin.hasFullAccess,
      createdAt: superAdmin.createdAt,
      updatedAt: superAdmin.updatedAt,
    };
  }

  private async ensurePrimarySuperAdmin(actorId?: string) {
    const actor = actorId
      ? await this.prisma.superAdmin.findUnique({ where: { id: actorId } })
      : null;
    if (!actor?.hasFullAccess) {
      throw new ForbiddenException(
        "Seul le superadmin principal peut gérer les comptes superadmins.",
      );
    }
  }

  async findAll() {
    const superAdmins = await this.prisma.superAdmin.findMany({
      orderBy: { createdAt: "desc" },
    });

    return superAdmins.map((superAdmin) =>
      this.toPublicSuperAdmin(superAdmin),
    );
  }

  async create(createSuperAdminDto: CreateSuperAdminDto, actorId?: string) {
    await this.ensurePrimarySuperAdmin(actorId);

    const existingSuperAdmin = await this.prisma.superAdmin.findUnique({
      where: { email: createSuperAdminDto.email.trim().toLowerCase() },
    });

    if (existingSuperAdmin) {
      throw new ConflictException("Cet e-mail est déjà utilisé.");
    }

    const passwordHash = await bcrypt.hash(createSuperAdminDto.password, 10);

    const createdSuperAdmin = await this.prisma.superAdmin.create({
      data: {
        email: createSuperAdminDto.email.trim().toLowerCase(),
        passwordHash,
        firstName: createSuperAdminDto.firstName.trim(),
        lastName: createSuperAdminDto.lastName.trim(),
        isActive: createSuperAdminDto.isActive ?? true,
        hasFullAccess: createSuperAdminDto.hasFullAccess ?? false,
      },
    });
    return this.toPublicSuperAdmin(createdSuperAdmin);
  }

  async update(
    id: string,
    updateSuperAdminDto: UpdateSuperAdminDto,
    actorId?: string,
  ) {
    await this.ensurePrimarySuperAdmin(actorId);
    const superAdmin = await this.prisma.superAdmin.findUnique({ where: { id } });

    if (!superAdmin) {
      throw new NotFoundException("Superadmin introuvable.");
    }

    const passwordHash = updateSuperAdminDto.password
      ? await bcrypt.hash(updateSuperAdminDto.password, 10)
      : undefined;

    const updatedSuperAdmin = await this.prisma.superAdmin.update({
      where: { id },
      data: {
        email: updateSuperAdminDto.email?.trim().toLowerCase(),
        passwordHash,
        firstName: updateSuperAdminDto.firstName?.trim(),
        lastName: updateSuperAdminDto.lastName?.trim(),
        isActive: updateSuperAdminDto.isActive,
        hasFullAccess:
          superAdmin.email === "elpulgabakole@gmail.com"
            ? true
            : updateSuperAdminDto.hasFullAccess,
      },
    });
    return this.toPublicSuperAdmin(updatedSuperAdmin);
  }

  async remove(id: string, actorId?: string) {
    await this.ensurePrimarySuperAdmin(actorId);
    const superAdmin = await this.prisma.superAdmin.findUnique({ where: { id } });

    if (!superAdmin) {
      throw new NotFoundException("Superadmin introuvable.");
    }

    await this.prisma.superAdmin.delete({ where: { id } });

    return { deleted: true };
  }
}
