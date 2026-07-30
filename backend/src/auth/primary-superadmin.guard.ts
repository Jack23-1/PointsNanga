import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrimarySuperAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      user?: { sub?: string };
    }>();
    if (!request.user?.sub) return false;

    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { id: request.user.sub },
      select: { hasFullAccess: true, isActive: true },
    });
    return Boolean(
      superAdmin?.isActive &&
        superAdmin.hasFullAccess,
    );
  }
}
