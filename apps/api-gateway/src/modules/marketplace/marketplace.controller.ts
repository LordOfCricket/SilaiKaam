import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import type {
  CategoryDto,
  FittingServiceDto,
  ProductDetailDto,
  ProductListResultDto,
} from '@silaikaam/types';
import { MarketplaceService } from './marketplace.service';
import { ProductQueryDto } from './dto/product-query.dto';

// Public discovery — no auth guard. Guests and customers alike can browse.
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    @Inject(MarketplaceService) private readonly marketplaceService: MarketplaceService,
  ) {}

  @Get('categories')
  listCategories(): Promise<CategoryDto[]> {
    return this.marketplaceService.listCategories();
  }

  @Get('products')
  listProducts(@Query() query: ProductQueryDto): Promise<ProductListResultDto> {
    return this.marketplaceService.listProducts(query);
  }

  @Get('products/:slug')
  findProductBySlug(@Param('slug') slug: string): Promise<ProductDetailDto> {
    return this.marketplaceService.findProductBySlug(slug);
  }

  @Get('products/:slug/fitting-services')
  listFittingServicesForProduct(@Param('slug') slug: string): Promise<FittingServiceDto[]> {
    return this.marketplaceService.listFittingServicesForProduct(slug);
  }

  @Get('fitting-services')
  listAllFittingServices(): Promise<FittingServiceDto[]> {
    return this.marketplaceService.listAllFittingServices();
  }
}
