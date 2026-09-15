import { Module } from '@nestjs/common';
import { AuthCommonModule } from '../../common/auth/auth-common.module';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [AuthCommonModule],
  controllers: [AuthController],
  providers: [AuthService, DownstreamHttpService],
})
export class AuthModule {}
