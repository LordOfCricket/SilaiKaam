import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { FitProfileModule } from './modules/fit-profile/fit-profile.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { ExistingGarmentModule } from './modules/existing-garment/existing-garment.module';
import { CustomStitchingModule } from './modules/custom-stitching/custom-stitching.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    AuthModule,
    CustomersModule,
    FitProfileModule,
    MarketplaceModule,
    ExistingGarmentModule,
    CustomStitchingModule,
    CartModule,
    OrdersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
