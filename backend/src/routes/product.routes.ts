import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProductSchema, updateProductSchema, createPurchaseSchema } from '../validators/product.validator';
import { ProductService } from '../services/product.service';
import { PurchaseService } from '../services/purchase.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';

const router = Router();
const productSvc = new ProductService();
const purchaseSvc = new PurchaseService();

router.use(authenticate);

// Products
router.get('/products', async (req, res) => {
  const products = await productSvc.list(req.user!.orgId, req.query.includeInactive === 'true');
  sendSuccess(res, products);
});

router.post('/products', validate(createProductSchema), async (req, res) => {
  const product = await productSvc.create(req.user!.orgId, req.body);
  sendCreated(res, product);
});

router.patch('/products/:id', validate(updateProductSchema), async (req, res) => {
  const product = await productSvc.update(req.params.id, req.user!.orgId, req.body);
  sendSuccess(res, product);
});

router.delete('/products/:id', async (req, res) => {
  await productSvc.delete(req.params.id, req.user!.orgId);
  sendNoContent(res);
});

// Purchases
router.get('/leads/:leadId/purchases', async (req, res) => {
  const purchases = await purchaseSvc.listForLead(req.params.leadId, req.user!.orgId);
  sendSuccess(res, purchases);
});

router.post('/leads/:leadId/purchases', validate(createPurchaseSchema), async (req, res) => {
  const purchase = await purchaseSvc.create(req.params.leadId, req.user!.orgId, req.body);
  sendCreated(res, purchase);
});

// Replenishments due — leads whose next purchase/refill window is coming up
router.get('/purchases/replenishments-due', async (req, res) => {
  const withinDays = Number(req.query.withinDays) || 14;
  const purchases = await purchaseSvc.getReplenishmentsDue(req.user!.orgId, withinDays);
  sendSuccess(res, purchases);
});

export default router;
