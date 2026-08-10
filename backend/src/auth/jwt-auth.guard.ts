import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";

type HttpRequest = {
  headers: {
    authorization?: string;
  };
  cookies?: {
    access_token?: string;
  };
  user?: unknown;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const authorization = request.headers.authorization;
    const token =
      request.cookies?.access_token ??
      (authorization?.startsWith("Bearer ")
        ? authorization.slice(7)
        : undefined);

    if (!token) {
      throw new UnauthorizedException("Authentification requise.");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (payload.tokenType && payload.tokenType !== "access") {
        throw new Error("Type de jeton invalide.");
      }
      if (payload.role !== "super_admin" && payload.schoolId) {
        const school = await this.prisma.ecoles.findUnique({
          where: { id_ecole: BigInt(payload.schoolId) },
          select: { statut: true },
        });
        if (!school || school.statut !== "ACTIF") {
          throw new UnauthorizedException(
            "Votre école est suspendue. Accès aux données indisponible.",
          );
        }
      }
      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Session invalide ou expirée.");
    }
  }
}
