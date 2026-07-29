import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const schools = await this.prisma.ecoles.findMany({
      orderBy: { nom_ecole: "asc" },
    });

    return schools.map((school) => ({
      id: school.id_ecole.toString(),
      name: school.nom_ecole,
      code: school.code_ecole,
      address: school.adresse,
      phone: school.telephone,
      email: school.email,
      logo: school.logo,
      isActive: school.statut === "ACTIF",
      createdAt: school.date_creation.toISOString(),
      updatedAt: school.date_mise_a_jour.toISOString(),
    }));
  }
}
