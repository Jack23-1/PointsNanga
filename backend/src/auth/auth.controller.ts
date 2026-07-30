import { Body, Controller, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { ForgotPasswordDto, LoginDto, ResetPasswordDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.login(loginDto);
    this.setAuthCookies(response, accessToken, refreshToken);
    return { user };
  }

  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException("Session expirée.");
    const result = await this.authService.refresh(refreshToken);
    response.cookie("access_token", result.accessToken, {
      ...this.cookieOptions(),
      maxAge: 15 * 60 * 1000,
    });
    return { refreshed: true };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie("access_token", this.cookieOptions());
    response.clearCookie("refresh_token", this.cookieOptions());
    return { loggedOut: true };
  }

  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie("access_token", accessToken, {
      ...this.cookieOptions(),
      maxAge: 15 * 60 * 1000,
    });
    response.cookie("refresh_token", refreshToken, {
      ...this.cookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
