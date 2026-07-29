import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByMatricule(matricule: string) {
    const student = await this.prisma.eleves.findFirst({
      where: {
        matricule: matricule.trim(),
        statut: "ACTIF",
      },
      include: {
        ecoles: true,
        inscriptions: {
          orderBy: { date_inscription: "desc" },
          take: 1,
          include: { classes: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundException("Élève introuvable.");
    }

    const inscription = student.inscriptions[0];

    return {
      id: student.id_eleve.toString(),
      matricule: student.matricule,
      lastName: student.nom,
      postName: student.postnom ?? "",
      firstName: student.prenom,
      className: inscription?.classes.libelle ?? "—",
      schoolName: student.ecoles.nom_ecole,
      schoolLogoUrl: student.ecoles.logo,
      photoUrl: student.photo,
    };
  }
}
