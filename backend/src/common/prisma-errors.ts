import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

export const handlePrismaError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new ConflictException("Cette donnée existe déjà.");
    }

    if (error.code === "P2003") {
      throw new BadRequestException(
        "Référence invalide : vérifiez l'école, la classe, le niveau ou l'année scolaire.",
      );
    }

    if (error.code === "P2025") {
      throw new NotFoundException("Élément introuvable.");
    }
  }

  throw error;
};
