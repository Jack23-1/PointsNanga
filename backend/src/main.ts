import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as cookieParser from "cookie-parser";
import helmet from "helmet";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { SafeHttpExceptionFilter } from "./common/http-exception.filter";
import { AppModule } from "./app.module";

const isLocalFrontendOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" || !["5173", "5174"].includes(url.port)) {
      return false;
    }

    const host = url.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^fe80:/i.test(host)
    );
  } catch {
    return false;
  }
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>("NODE_ENV") === "production";
  if (isProduction) app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("X-Request-Id", randomUUID());
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  }));
  app.useBodyParser("json", { limit: "5mb" });
  app.useBodyParser("urlencoded", { limit: "100kb", extended: false, parameterLimit: 100 });
  app.use(cookieParser());
  const frontendUrl = config.get<string>("FRONTEND_URL") ?? "http://localhost:5173";
  const allowedOrigins = new Set(isProduction ? [frontendUrl] : [
    frontendUrl, "http://localhost:5173", "http://localhost:5174",
    "http://127.0.0.1:5173", "http://127.0.0.1:5174",
  ]);
  const isAllowedOrigin = (origin?: string) => Boolean(
    origin && (allowedOrigins.has(origin) || (!isProduction && isLocalFrontendOrigin(origin))),
  );

  app.use((request: Request, response: Response, next: NextFunction) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return next();
    const origin = request.get("origin");
    if (isAllowedOrigin(origin) || (!isProduction && !origin)) return next();
    response.status(403).json({ statusCode: 403, message: "Origine de requête non autorisée." });
  });

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      forbidUnknownValues: true,
      stopAtFirstError: false,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new SafeHttpExceptionFilter());

  const port = config.get<number>("PORT") ?? 3000;
  await app.listen(port, isProduction ? "127.0.0.1" : "0.0.0.0");
}

void bootstrap();
