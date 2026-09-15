import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ProductQueryDto } from './dto/product-query.dto';

// Internal-only surface: reachable exclusively from the API Gateway. Public
// discovery data — no authentication concept exists at this layer.
@Controller('internal/catalog')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Get('products')
  listProducts(@Query() query: ProductQueryDto) {
    return this.catalogService.listProducts(query);
  }

  @Get('products/:slug')
  findProductBySlug(@Param('slug') slug: string) {
    return this.catalogService.findProductBySlug(slug);
  }

  @Get('products/:slug/fitting-services')
  listFittingServicesForProduct(@Param('slug') slug: string) {
    return this.catalogService.listFittingServicesForProduct(slug);
  }

  @Get('fitting-services')
  listAllFittingServices() {
    return this.catalogService.listAllFittingServices();
  }
}
