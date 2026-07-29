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
  user?: unknown;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException("Authentification requise.");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Session invalide ou expirée.");
    }
  }
}
