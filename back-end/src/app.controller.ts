import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class AppController {
  @Get()
  getStatus() {
    return {
      message: 'LexFlow Backend Running',
      status: 'OK',
    };
  }

  /**
   * GET /api/csrf-token
   * Returns the current CSRF token (set in cookie by SecurityMiddleware).
   * Frontend calls this on page load to obtain the token for subsequent
   * mutating requests (POST / PUT / PATCH / DELETE).
   */
  @Get('api/csrf-token')
  getCsrfToken(@Res() res: Response) {
    const token = (res.locals.csrfToken as string) ?? null;
    return res.status(200).json({
      success: true,
      csrfToken: token,
      token: token,
    });
  }
}
