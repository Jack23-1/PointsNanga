import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSuperAdminDto } from "./dto/create-superadmin.dto";
import { UpdateSuperAdminDto } from "./dto/update-superadmin.dto";

@Injectable()
export class SuperAdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const superAdmins = await this.prisma.superAdmin.findMany({
      orderBy: { createdAt: "desc" },
    });

    return superAdmins.map((superAdmin) => ({
      id: superAdmin.id,
      email: superAdmin.email,
      passwordHash: superAdmin.passwordHash,
      firstName: superAdmin.firstName,
      lastName: superAdmin.lastName,
      isActive: superAdmin.isActive,
      createdAt: superAdmin.createdAt,
      updatedAt: superAdmin.updatedAt,
    }));
  }

  async create(createSuperAdminDto: CreateSuperAdminDto) {
    const existingSuperAdmin = await this.prisma.superAdmin.findUnique({
      where: { email: createSuperAdminDto.email.trim().toLowerCase() },
    });

    if (existingSuperAdmin) {
      throw new ConflictException("Cet e-mail est déjà utilisé.");
    }

    const passwordHash = await bcrypt.hash(createSuperAdminDto.password, 10);

    return this.prisma.superAdmin.create({
      data: {
        email: createSuperAdminDto.email.trim().toLowerCase(),
        passwordHash,
        firstName: createSuperAdminDto.firstName.trim(),
        lastName: createSuperAdminDto.lastName.trim(),
        isActive: createSuperAdminDto.isActive ?? true,
      },
    });
  }

  async update(id: string, updateSuperAdminDto: UpdateSuperAdminDto) {
    const superAdmin = await this.prisma.superAdmin.findUnique({ where: { id } });

    if (!superAdmin) {
      throw new NotFoundException("Superadmin introuvable.");
    }

    const passwordHash = updateSuperAdminDto.password
      ? await bcrypt.hash(updateSuperAdminDto.password, 10)
      : undefined;

    return this.prisma.superAdmin.update({
      where: { id },
      data: {
        email: updateSuperAdminDto.email?.trim().toLowerCase(),
        passwordHash,
        firstName: updateSuperAdminDto.firstName?.trim(),
        lastName: updateSuperAdminDto.lastName?.trim(),
        isActive: updateSuperAdminDto.isActive,
      },
    });
  }

  async remove(id: string) {
    const superAdmin = await this.prisma.superAdmin.findUnique({ where: { id } });

    if (!superAdmin) {
      throw new NotFoundException("Superadmin introuvable.");
    }

    await this.prisma.superAdmin.delete({ where: { id } });

    return { deleted: true };
  }
}
