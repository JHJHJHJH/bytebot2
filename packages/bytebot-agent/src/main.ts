import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { webcrypto } from 'crypto';
import { json, urlencoded } from 'express';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Polyfill for crypto global (required by @nestjs/schedule)
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

async function bootstrap() {
  console.log('Starting bytebot-agent application...');

  try {
    const app = await NestFactory.create(AppModule);

    // Configure body parser with increased payload size limit (50MB)
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ limit: '50mb', extended: true }));

    // Enable CORS
    app.enableCors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    });

    // Build the OpenAPI document from controllers/DTOs
    const config = new DocumentBuilder()
      .setTitle('Bytebot Agent API')
      .setDescription('REST API for managing Bytebot agent tasks and models')
      .setVersion(process.env.npm_package_version ?? '0.0.1')
      .addTag('tasks', 'Create, run, and inspect agent tasks')
      .addTag('model-keys', 'Configure LLM provider API keys')
      .build();
    const document = SwaggerModule.createDocument(app, config);

    // Serve interactive docs at /api/docs and the raw spec at /api/docs-json
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs-json',
    });

    // Write the spec to disk so docs tooling can consume it.
    // Override the location with OPENAPI_OUTPUT; set OPENAPI_GENERATE_ONLY=true
    // to emit the spec and exit without starting the HTTP server.
    const outputPath =
      process.env.OPENAPI_OUTPUT ?? join(process.cwd(), 'openapi.json');
    writeFileSync(outputPath, JSON.stringify(document, null, 2));
    console.log(`OpenAPI spec written to ${outputPath}`);

    if (process.env.OPENAPI_GENERATE_ONLY === 'true') {
      await app.close();
      return;
    }

    await app.listen(process.env.PORT ?? 9991);
  } catch (error) {
    console.error('Error starting application:', error);
  }
}
bootstrap();
