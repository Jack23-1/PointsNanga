import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

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
  constructor(private readonly jwtService: JwtService) {}

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
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Session invalide ou expirée.");
    }
  }
}
