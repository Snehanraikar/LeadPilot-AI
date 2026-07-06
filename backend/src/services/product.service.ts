import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { CreateProductDto, UpdateProductDto } from '../validators/product.validator';

export class ProductService {
  async list(orgId: string, includeInactive = false) {
    return prisma.product.findMany({
      where: { organizationId: orgId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string, orgId: string) {
    const product = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  async create(orgId: string, dto: CreateProductDto) {
    return prisma.product.create({ data: { ...dto, organizationId: orgId } });
  }

  async update(id: string, orgId: string, dto: UpdateProductDto) {
    await this.getById(id, orgId);
    return prisma.product.update({ where: { id }, data: dto });
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.getById(id, orgId);
    await prisma.product.update({ where: { id }, data: { isActive: false } });
  }
}
